import { COLORS } from './constants.js';

/**
 * Formats a number as currency with appropriate suffix (B, M, K)
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted currency string
 */
export const formatNumber = (num, decimals = 0) => {
  if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(decimals)}`;
};

/**
 * Formats a BTC amount with appropriate units
 * @param {number} num - The BTC amount to format
 * @returns {string} Formatted BTC string
 */
export const formatBtc = (num) => {
  if (Math.abs(num) >= 1000) return `₿${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (Math.abs(num) >= 1) return `₿${num.toFixed(4)}`;
  if (Math.abs(num) >= 0.00001) return `₿${num.toFixed(8)}`;
  return `${Math.round(num * 100000000).toLocaleString()} sats`;
};

/**
 * Calculates the waterfall distribution of BTC across the capital structure
 * @param {Object} params - Calculation parameters
 * @param {number} params.btcPrice - Current BTC price in USD
 * @param {number} params.mstrPrice - Current MSTR stock price
 * @param {number} params.btcHoldings - Total BTC holdings
 * @param {Array} params.debtData - Array of convertible note data
 * @param {Object} params.preferredData - Object containing preferred stock data
 * @param {number} params.commonSharesBasic - Basic common shares outstanding (in thousands)
 * @param {number} params.eurUsdRate - EUR/USD exchange rate (default: 1.05)
 * @param {Object} params.stockPrices - Object containing stock prices for preferred securities
 * @param {boolean} params.treatItmAsEquity - Whether to treat in-the-money converts as equity
 * @returns {Object} Waterfall calculation results
 */
export function calculateWaterfall({
  btcPrice,
  mstrPrice,
  btcHoldings,
  debtData,
  preferredData,
  commonSharesBasic,
  eurUsdRate = 1.05,
  stockPrices = {},
  treatItmAsEquity = true,
}) {
  const results = {
    btcPrice,
    mstrPrice,
    totalBtcValue: btcHoldings * btcPrice,
    waterfall: [],
    btcPerShare: 0,
    usdPerShare: 0,
    satoshisPerShare: 0,
    residualBtc: 0,
    totalCommonShares: commonSharesBasic * 1000,
    seniorClaimsBtc: 0,
    seniorClaimsUsd: 0,
    inMoneyConverts: [],
    outOfMoneyConverts: [],
    strkConverted: false,
    additionalSharesFromConverts: 0,
    additionalSharesFromStrk: 0,
  };

  let remainingBtc = btcHoldings;
  let debtClaimUsd = 0;
  let additionalSharesFromConverts = 0;

  debtData.forEach(note => {
    const isItm = mstrPrice >= note.conversionPrice;
    if (isItm) {
      results.inMoneyConverts.push({
        ...note,
        moneyness: ((mstrPrice / note.conversionPrice) - 1) * 100,
      });
      if (treatItmAsEquity) {
        additionalSharesFromConverts += note.sharesIfConverted;
      } else {
        debtClaimUsd += note.principal;
      }
    } else {
      results.outOfMoneyConverts.push({
        ...note,
        moneyness: ((mstrPrice / note.conversionPrice) - 1) * 100,
      });
      debtClaimUsd += note.principal;
    }
  });

  const debtClaimBtc = debtClaimUsd / btcPrice;
  remainingBtc -= debtClaimBtc;

  results.waterfall.push({
    name: 'Debt',
    fullName: 'Convertible Debt',
    claimUsd: debtClaimUsd,
    claimBtc: debtClaimBtc,
    color: COLORS.red,
  });

  const strfPrice = stockPrices.STRF?.price || 100;
  const strf10dAvg = stockPrices.STRF?.avg10d || 100;
  const strfLiqPref = Math.max(100, strfPrice, strf10dAvg);
  const strfClaimUsd = preferredData.STRF.shares * strfLiqPref;
  const strfClaimBtc = strfClaimUsd / btcPrice;
  remainingBtc -= strfClaimBtc;

  results.waterfall.push({
    name: 'STRF',
    fullName: preferredData.STRF.description,
    shares: preferredData.STRF.shares,
    liqPref: strfLiqPref,
    claimUsd: strfClaimUsd,
    claimBtc: strfClaimBtc,
    color: COLORS.purple,
    dynamicLiqPref: true,
  });

  const strcClaimUsd = preferredData.STRC.shares * 100;
  const strcClaimBtc = strcClaimUsd / btcPrice;
  remainingBtc -= strcClaimBtc;

  results.waterfall.push({
    name: 'STRC',
    fullName: preferredData.STRC.description,
    shares: preferredData.STRC.shares,
    liqPref: 100,
    claimUsd: strcClaimUsd,
    claimBtc: strcClaimBtc,
    color: COLORS.blue,
  });

  const streClaimUsd = preferredData.STRE.shares * 100 * eurUsdRate;
  const streClaimBtc = streClaimUsd / btcPrice;
  remainingBtc -= streClaimBtc;

  results.waterfall.push({
    name: 'STRE',
    fullName: preferredData.STRE.description,
    shares: preferredData.STRE.shares,
    liqPref: 100 * eurUsdRate,
    claimUsd: streClaimUsd,
    claimBtc: streClaimBtc,
    color: COLORS.cyan,
    isEuro: true,
  });

  const strkPrice = stockPrices.STRK?.price || 100;
  const strk10dAvg = stockPrices.STRK?.avg10d || 100;
  const strkLiqPref = Math.max(100, strkPrice, strk10dAvg);
  const strkConversionValue = mstrPrice / 10;

  let strkClaimUsd = 0;
  let strkClaimBtc = 0;
  let additionalSharesFromStrk = 0;

  if (strkConversionValue > strkLiqPref) {
    results.strkConverted = true;
    additionalSharesFromStrk = preferredData.STRK.shares / 10;
  } else {
    strkClaimUsd = preferredData.STRK.shares * strkLiqPref;
    strkClaimBtc = strkClaimUsd / btcPrice;
    remainingBtc -= strkClaimBtc;
  }

  results.waterfall.push({
    name: 'STRK',
    fullName: preferredData.STRK.description,
    shares: preferredData.STRK.shares,
    liqPref: results.strkConverted ? 0 : strkLiqPref,
    claimUsd: strkClaimUsd,
    claimBtc: strkClaimBtc,
    color: COLORS.yellow,
    dynamicLiqPref: true,
    converted: results.strkConverted,
  });

  const strdClaimUsd = preferredData.STRD.shares * 100;
  const strdClaimBtc = strdClaimUsd / btcPrice;
  remainingBtc -= strdClaimBtc;

  results.waterfall.push({
    name: 'STRD',
    fullName: preferredData.STRD.description,
    shares: preferredData.STRD.shares,
    liqPref: 100,
    claimUsd: strdClaimUsd,
    claimBtc: strdClaimBtc,
    color: COLORS.green,
  });

  results.residualBtc = Math.max(0, remainingBtc);
  results.seniorClaimsBtc = btcHoldings - results.residualBtc;
  results.seniorClaimsUsd = results.seniorClaimsBtc * btcPrice;

  results.additionalSharesFromConverts = treatItmAsEquity ? additionalSharesFromConverts : 0;
  results.additionalSharesFromStrk = additionalSharesFromStrk;
  results.totalCommonShares = (commonSharesBasic * 1000) +
    results.additionalSharesFromConverts +
    results.additionalSharesFromStrk;

  if (results.residualBtc > 0 && results.totalCommonShares > 0) {
    results.btcPerShare = results.residualBtc / results.totalCommonShares;
    results.usdPerShare = results.btcPerShare * btcPrice;
    results.satoshisPerShare = Math.round(results.btcPerShare * 100000000);
  }

  results.waterfall.push({
    name: 'Common',
    fullName: 'Common Equity',
    shares: results.totalCommonShares,
    claimUsd: results.residualBtc * btcPrice,
    claimBtc: results.residualBtc,
    color: COLORS.btcOrange,
    btcPerShare: results.btcPerShare,
    satoshisPerShare: results.satoshisPerShare,
  });

  return results;
}

/**
 * Calculates the annual cost of capital from preferred dividends and debt interest
 * @param {Object} preferredData - Object containing preferred stock data
 * @param {Array} debtData - Array of convertible note data
 * @param {number} eurUsdRate - EUR/USD exchange rate (default: 1.05)
 * @returns {Object} Cost of capital breakdown and total
 */
export function calculateCostOfCapital(preferredData, debtData, eurUsdRate = 1.05) {
  let totalAnnualCost = 0;
  const breakdown = [];

  Object.entries(preferredData).forEach(([ticker, data]) => {
    let dividend = data.shares * data.dividendRate * 100;
    if (data.isEuro) dividend *= eurUsdRate;
    breakdown.push({
      name: `${ticker}`,
      amount: dividend,
      rate: `${(data.dividendRate * 100).toFixed(1)}%`,
      type: 'preferred',
    });
    totalAnnualCost += dividend;
  });

  debtData.forEach(note => {
    const interest = note.principal * note.coupon;
    if (interest > 0) {
      breakdown.push({
        name: note.name.replace(' Convert', ''),
        amount: interest,
        rate: `${(note.coupon * 100).toFixed(3)}%`,
        type: 'debt',
      });
      totalAnnualCost += interest;
    }
  });

  return { totalAnnualCost, breakdown };
}

/**
 * Calculates the NAV bleed from preferred stock issuance
 * @param {Object} preferredData - Object containing preferred stock data
 * @returns {Object} NAV bleed metrics
 */
export function calculateNavBleed(preferredData) {
  let totalNotional = 0;
  let totalProceeds = 0;

  Object.entries(preferredData).forEach(([ticker, data]) => {
    totalNotional += data.notional;
    totalProceeds += data.grossProceeds || (data.shares * (data.ipoPrice || 100));
  });

  return {
    totalNotional,
    totalProceeds,
    totalBleed: totalNotional - totalProceeds,
    bleedPct: ((totalNotional - totalProceeds) / totalNotional) * 100,
  };
}

/**
 * Generates scenario data for a range of BTC prices
 * @param {Object} baseData - Base static data
 * @param {Array} btcPriceRange - Array of BTC prices to simulate
 * @param {number} mstrPrice - Current MSTR stock price
 * @param {Object} stockPrices - Current stock prices
 * @param {number} eurUsdRate - EUR/USD exchange rate
 * @param {boolean} treatItmAsEquity - Whether to treat ITM converts as equity
 * @returns {Array} Array of scenario results
 */
export function generateScenarioData(baseData, btcPriceRange, mstrPrice, stockPrices, eurUsdRate, treatItmAsEquity) {
  return btcPriceRange.map(btcPrice => {
    const result = calculateWaterfall({
      btcPrice,
      mstrPrice,
      btcHoldings: baseData.btcHoldings,
      debtData: baseData.convertibleNotes,
      preferredData: baseData.preferredStock,
      commonSharesBasic: baseData.basicSharesOutstanding,
      eurUsdRate,
      stockPrices,
      treatItmAsEquity,
    });
    return {
      btcPrice,
      btcPerShare: result.btcPerShare,
      satoshisPerShare: result.satoshisPerShare,
      usdPerShare: result.usdPerShare,
      residualBtc: result.residualBtc,
      seniorClaimsBtc: result.seniorClaimsBtc,
      seniorClaimsPct: (result.seniorClaimsBtc / baseData.btcHoldings) * 100,
      totalCommonShares: result.totalCommonShares,
    };
  });
}
