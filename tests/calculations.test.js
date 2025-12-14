import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatBtc,
  calculateWaterfall,
  calculateCostOfCapital,
  calculateNavBleed,
  generateScenarioData,
} from '../src/calculations.js';

describe('formatNumber', () => {
  it('should format billions correctly', () => {
    expect(formatNumber(1500000000)).toBe('$1.50B');
    expect(formatNumber(49346000000)).toBe('$49.35B');
  });

  it('should format millions correctly', () => {
    expect(formatNumber(1500000)).toBe('$1.50M');
    expect(formatNumber(50000000)).toBe('$50.00M');
  });

  it('should format thousands correctly', () => {
    expect(formatNumber(5000)).toBe('$5.0K');
    expect(formatNumber(15500)).toBe('$15.5K');
  });

  it('should format small numbers correctly', () => {
    expect(formatNumber(500)).toBe('$500');
    expect(formatNumber(99)).toBe('$99');
  });

  it('should handle negative numbers', () => {
    expect(formatNumber(-1500000000)).toBe('$-1.50B');
    expect(formatNumber(-5000)).toBe('$-5.0K');
  });
});

describe('formatBtc', () => {
  it('should format large BTC amounts', () => {
    expect(formatBtc(660624)).toBe('₿660,624');
    expect(formatBtc(1000)).toBe('₿1,000');
  });

  it('should format BTC with 4 decimals for amounts >= 1', () => {
    expect(formatBtc(1.23456789)).toBe('₿1.2346');
    expect(formatBtc(10.5)).toBe('₿10.5000');
  });

  it('should format BTC with 8 decimals for small amounts', () => {
    expect(formatBtc(0.00012345)).toBe('₿0.00012345');
    expect(formatBtc(0.001)).toBe('₿0.00100000');
  });

  it('should format very small amounts as satoshis', () => {
    expect(formatBtc(0.000001)).toBe('100 sats');
    expect(formatBtc(0.00000001)).toBe('1 sats');
  });
});

describe('calculateWaterfall', () => {
  const mockDebtData = [
    {
      name: '2028 Convert',
      principal: 1010000000,
      coupon: 0.00625,
      conversionPrice: 183.19,
      sharesIfConverted: 5513000,
    },
    {
      name: '2029 Convert',
      principal: 3000000000,
      coupon: 0,
      conversionPrice: 672.40,
      sharesIfConverted: 4462000,
    },
  ];

  const mockPreferredData = {
    STRF: {
      shares: 12680000,
      dividendRate: 0.10,
      liqPref: 100,
      hasDynamicLiqPref: true,
      description: 'Senior Preferred (10%)',
    },
    STRC: {
      shares: 29590000,
      dividendRate: 0.1075,
      liqPref: 100,
      hasDynamicLiqPref: false,
      description: 'Variable Rate (~10.75%)',
    },
    STRE: {
      shares: 8590000,
      dividendRate: 0.10,
      liqPref: 100,
      hasDynamicLiqPref: false,
      isEuro: true,
      description: 'Euro Preferred (10%)',
    },
    STRK: {
      shares: 13970000,
      dividendRate: 0.08,
      liqPref: 100,
      hasDynamicLiqPref: true,
      convertible: true,
      conversionRatio: 0.1,
      description: 'Convertible (8%, @$1000)',
    },
    STRD: {
      shares: 13000000,
      dividendRate: 0.10,
      liqPref: 100,
      hasDynamicLiqPref: false,
      description: 'High-Yield (10% non-cum)',
    },
  };

  it('should calculate waterfall with basic inputs', () => {
    const result = calculateWaterfall({
      btcPrice: 100000,
      mstrPrice: 420,
      btcHoldings: 660624,
      debtData: mockDebtData,
      preferredData: mockPreferredData,
      commonSharesBasic: 300800,
      eurUsdRate: 1.05,
      stockPrices: {},
      treatItmAsEquity: true,
    });

    expect(result).toBeDefined();
    expect(result.btcPrice).toBe(100000);
    expect(result.mstrPrice).toBe(420);
    expect(result.totalBtcValue).toBe(66062400000);
    expect(result.waterfall).toHaveLength(7); // Debt, STRF, STRC, STRE, STRK, STRD, Common
  });

  it('should identify in-the-money converts correctly', () => {
    const result = calculateWaterfall({
      btcPrice: 100000,
      mstrPrice: 420,
      btcHoldings: 660624,
      debtData: mockDebtData,
      preferredData: mockPreferredData,
      commonSharesBasic: 300800,
      treatItmAsEquity: true,
    });

    // MSTR = 420, so 2028 Convert (183.19) should be ITM
    expect(result.inMoneyConverts.length).toBeGreaterThan(0);
    expect(result.inMoneyConverts[0].name).toBe('2028 Convert');
  });

  it('should treat ITM converts as equity when flag is true', () => {
    const resultWithEquity = calculateWaterfall({
      btcPrice: 100000,
      mstrPrice: 420,
      btcHoldings: 660624,
      debtData: mockDebtData,
      preferredData: mockPreferredData,
      commonSharesBasic: 300800,
      treatItmAsEquity: true,
    });

    const resultWithDebt = calculateWaterfall({
      btcPrice: 100000,
      mstrPrice: 420,
      btcHoldings: 660624,
      debtData: mockDebtData,
      preferredData: mockPreferredData,
      commonSharesBasic: 300800,
      treatItmAsEquity: false,
    });

    // With ITM as equity, common shares should be higher
    expect(resultWithEquity.totalCommonShares).toBeGreaterThan(resultWithDebt.totalCommonShares);
    expect(resultWithEquity.additionalSharesFromConverts).toBeGreaterThan(0);
  });

  it('should calculate BTC per share correctly', () => {
    const result = calculateWaterfall({
      btcPrice: 100000,
      mstrPrice: 420,
      btcHoldings: 660624,
      debtData: mockDebtData,
      preferredData: mockPreferredData,
      commonSharesBasic: 300800,
      treatItmAsEquity: true,
    });

    expect(result.btcPerShare).toBeGreaterThan(0);
    expect(result.satoshisPerShare).toBe(Math.round(result.btcPerShare * 100000000));
    expect(result.usdPerShare).toBe(result.btcPerShare * result.btcPrice);
  });

  it('should handle STRK conversion when MSTR >= $1000', () => {
    const result = calculateWaterfall({
      btcPrice: 100000,
      mstrPrice: 1200,
      btcHoldings: 660624,
      debtData: mockDebtData,
      preferredData: mockPreferredData,
      commonSharesBasic: 300800,
      treatItmAsEquity: true,
    });

    // MSTR/10 = 120 > 100, so STRK should convert
    expect(result.strkConverted).toBe(true);
    expect(result.additionalSharesFromStrk).toBeGreaterThan(0);
  });

  it('should apply dynamic liquidation preference for STRF', () => {
    const stockPrices = {
      STRF: { price: 110, avg10d: 105 },
    };

    const result = calculateWaterfall({
      btcPrice: 100000,
      mstrPrice: 420,
      btcHoldings: 660624,
      debtData: mockDebtData,
      preferredData: mockPreferredData,
      commonSharesBasic: 300800,
      stockPrices,
    });

    const strfEntry = result.waterfall.find(w => w.name === 'STRF');
    expect(strfEntry.liqPref).toBe(110); // max(100, 110, 105)
  });

  it('should calculate residual BTC correctly', () => {
    const result = calculateWaterfall({
      btcPrice: 100000,
      mstrPrice: 420,
      btcHoldings: 660624,
      debtData: mockDebtData,
      preferredData: mockPreferredData,
      commonSharesBasic: 300800,
    });

    expect(result.residualBtc).toBeGreaterThanOrEqual(0);
    expect(result.seniorClaimsBtc + result.residualBtc).toBeCloseTo(660624, 0);
  });
});

describe('calculateCostOfCapital', () => {
  const mockPreferredData = {
    STRF: {
      shares: 12680000,
      dividendRate: 0.10,
      description: 'Senior Preferred (10%)',
    },
    STRC: {
      shares: 29590000,
      dividendRate: 0.1075,
      description: 'Variable Rate (~10.75%)',
    },
    STRE: {
      shares: 8590000,
      dividendRate: 0.10,
      isEuro: true,
      description: 'Euro Preferred (10%)',
    },
  };

  const mockDebtData = [
    { name: '2028 Convert', principal: 1010000000, coupon: 0.00625 },
    { name: '2029 Convert', principal: 3000000000, coupon: 0 },
  ];

  it('should calculate total annual cost correctly', () => {
    const result = calculateCostOfCapital(mockPreferredData, mockDebtData, 1.05);

    expect(result.totalAnnualCost).toBeGreaterThan(0);
    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it('should include preferred dividends in breakdown', () => {
    const result = calculateCostOfCapital(mockPreferredData, mockDebtData);

    const preferredItems = result.breakdown.filter(item => item.type === 'preferred');
    expect(preferredItems.length).toBe(3); // STRF, STRC, STRE
  });

  it('should include debt interest in breakdown', () => {
    const result = calculateCostOfCapital(mockPreferredData, mockDebtData);

    const debtItems = result.breakdown.filter(item => item.type === 'debt');
    expect(debtItems.length).toBe(1); // Only 2028 has coupon > 0
  });

  it('should apply EUR/USD rate to Euro preferred', () => {
    const eurRate = 1.10;
    const result = calculateCostOfCapital(mockPreferredData, mockDebtData, eurRate);

    const streItem = result.breakdown.find(item => item.name === 'STRE');
    const expectedDividend = 8590000 * 0.10 * 100 * eurRate;
    expect(streItem.amount).toBeCloseTo(expectedDividend, 0);
  });

  it('should format rates correctly', () => {
    const result = calculateCostOfCapital(mockPreferredData, mockDebtData);

    const strfItem = result.breakdown.find(item => item.name === 'STRF');
    expect(strfItem.rate).toBe('10.0%');
  });
});

describe('calculateNavBleed', () => {
  const mockPreferredData = {
    STRF: {
      notional: 1268000000,
      grossProceeds: 1078000000,
      shares: 12680000,
      ipoPrice: 85,
    },
    STRC: {
      notional: 2959000000,
      grossProceeds: 2663000000,
      shares: 29590000,
      ipoPrice: 90,
    },
  };

  it('should calculate total bleed correctly', () => {
    const result = calculateNavBleed(mockPreferredData);

    const expectedBleed = (1268000000 - 1078000000) + (2959000000 - 2663000000);
    expect(result.totalBleed).toBe(expectedBleed);
  });

  it('should calculate bleed percentage correctly', () => {
    const result = calculateNavBleed(mockPreferredData);

    const totalNotional = 1268000000 + 2959000000;
    const totalProceeds = 1078000000 + 2663000000;
    const expectedPct = ((totalNotional - totalProceeds) / totalNotional) * 100;

    expect(result.bleedPct).toBeCloseTo(expectedPct, 2);
  });

  it('should return correct totals', () => {
    const result = calculateNavBleed(mockPreferredData);

    expect(result.totalNotional).toBe(1268000000 + 2959000000);
    expect(result.totalProceeds).toBe(1078000000 + 2663000000);
  });

  it('should use IPO price if grossProceeds missing', () => {
    const dataWithoutProceeds = {
      STRF: {
        notional: 1268000000,
        shares: 12680000,
        ipoPrice: 85,
      },
    };

    const result = calculateNavBleed(dataWithoutProceeds);

    const expectedProceeds = 12680000 * 85;
    expect(result.totalProceeds).toBe(expectedProceeds);
  });
});

describe('generateScenarioData', () => {
  const mockBaseData = {
    btcHoldings: 660624,
    basicSharesOutstanding: 300800,
    convertibleNotes: [
      {
        name: '2028 Convert',
        principal: 1010000000,
        coupon: 0.00625,
        conversionPrice: 183.19,
        sharesIfConverted: 5513000,
      },
    ],
    preferredStock: {
      STRF: { shares: 12680000, dividendRate: 0.10, liqPref: 100, hasDynamicLiqPref: true },
      STRC: { shares: 29590000, dividendRate: 0.1075, liqPref: 100, hasDynamicLiqPref: false },
      STRE: { shares: 8590000, dividendRate: 0.10, liqPref: 100, isEuro: true },
      STRK: { shares: 13970000, dividendRate: 0.08, liqPref: 100, hasDynamicLiqPref: true },
      STRD: { shares: 13000000, dividendRate: 0.10, liqPref: 100, hasDynamicLiqPref: false },
    },
  };

  it('should generate data for each BTC price', () => {
    const btcPrices = [50000, 75000, 100000, 125000, 150000];
    const result = generateScenarioData(
      mockBaseData,
      btcPrices,
      420,
      {},
      1.05,
      true
    );

    expect(result).toHaveLength(btcPrices.length);
    expect(result[0].btcPrice).toBe(50000);
    expect(result[4].btcPrice).toBe(150000);
  });

  it('should calculate metrics for each scenario', () => {
    const btcPrices = [100000];
    const result = generateScenarioData(
      mockBaseData,
      btcPrices,
      420,
      {},
      1.05,
      true
    );

    expect(result[0]).toHaveProperty('btcPerShare');
    expect(result[0]).toHaveProperty('satoshisPerShare');
    expect(result[0]).toHaveProperty('usdPerShare');
    expect(result[0]).toHaveProperty('residualBtc');
    expect(result[0]).toHaveProperty('seniorClaimsBtc');
    expect(result[0]).toHaveProperty('seniorClaimsPct');
    expect(result[0]).toHaveProperty('totalCommonShares');
  });

  it('should show increasing sats/share as BTC price increases', () => {
    const btcPrices = [50000, 100000, 150000];
    const result = generateScenarioData(
      mockBaseData,
      btcPrices,
      420,
      {},
      1.05,
      true
    );

    // As BTC price increases, senior claims (fixed in USD) take less BTC
    // So common gets more BTC, increasing sats/share
    expect(result[2].satoshisPerShare).toBeGreaterThan(result[0].satoshisPerShare);
  });

  it('should calculate senior claims percentage correctly', () => {
    const btcPrices = [100000];
    const result = generateScenarioData(
      mockBaseData,
      btcPrices,
      420,
      {},
      1.05,
      true
    );

    const expectedPct = (result[0].seniorClaimsBtc / mockBaseData.btcHoldings) * 100;
    expect(result[0].seniorClaimsPct).toBeCloseTo(expectedPct, 2);
  });
});

