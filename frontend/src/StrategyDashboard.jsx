import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { STATIC_DATA } from './constants.js';
import { useTheme } from './theme.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import {
  formatNumber,
  formatBtc,
  calculateWaterfall,
  calculateCostOfCapital,
  calculateNavBleed,
  generateScenarioData,
} from './calculations.js';
import { fetchAllPrices } from './api.js';
import {
  Card,
  Metric,
  Toggle,
  CapitalStructureChart,
  ScenarioChart,
  CapitalStackTable,
  ScenarioTable,
} from './components.jsx';

const CostOfCapitalSection = ({ costData, btcPrice, btcHoldings, usdReserve, theme }) => (
  <Card>
    <h3 style={{ color: theme.textPrimary, marginBottom: '10px', fontSize: '13px', fontWeight: '600' }}>
      Cost of Capital (Annual)
    </h3>
    <Metric
      label="Total Annual Cost"
      value={formatNumber(costData.totalAnnualCost)}
      subValue={`${((costData.totalAnnualCost / usdReserve) * 100).toFixed(1)}% of $1.44B reserve`}
      subValue2={`${((costData.totalAnnualCost / (btcHoldings * btcPrice)) * 100).toFixed(2)}% of BTC value`}
      color={theme.red}
    />
    <div style={{ marginTop: '12px', fontSize: '10px' }}>
      {costData.breakdown.map(item => (
        <div
          key={item.name}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '4px 0',
            color: theme.textSecondary,
          }}
        >
          <span>{item.name} ({item.rate})</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNumber(item.amount)}</span>
        </div>
      ))}
    </div>
  </Card>
);

const NavBleedSection = ({ navBleed, btcPrice, theme }) => (
  <Card>
    <h3 style={{ color: theme.textPrimary, marginBottom: '10px', fontSize: '13px', fontWeight: '600' }}>
      NAV Bleed (Preferred)
    </h3>
    <Metric
      label="Total Bleed"
      value={formatNumber(navBleed.totalBleed)}
      subValue={`${navBleed.bleedPct.toFixed(1)}% discount to par`}
      subValue2={formatBtc(navBleed.totalBleed / btcPrice) + ' opportunity cost'}
      color={theme.red}
    />
    <div style={{ marginTop: '8px', fontSize: '10px', color: theme.textSecondary }}>
      Notional: {formatNumber(navBleed.totalNotional)} • Proceeds: {formatNumber(navBleed.totalProceeds)}
    </div>
  </Card>
);

const ConvertiblesTable = ({ notes, mstrPrice, theme }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
          <th style={{ textAlign: 'left', padding: '6px 4px', color: theme.textSecondary }}>Note</th>
          <th style={{ textAlign: 'right', padding: '6px 4px', color: theme.textSecondary }}>Principal</th>
          <th style={{ textAlign: 'right', padding: '6px 4px', color: theme.textSecondary }}>Coupon</th>
          <th style={{ textAlign: 'right', padding: '6px 4px', color: theme.textSecondary }}>Conv Price</th>
          <th style={{ textAlign: 'right', padding: '6px 4px', color: theme.textSecondary }}>Shares</th>
          <th style={{ textAlign: 'right', padding: '6px 4px', color: theme.textSecondary }}>Status</th>
          <th style={{ textAlign: 'right', padding: '6px 4px', color: theme.textSecondary }}>Moneyness</th>
        </tr>
      </thead>
      <tbody>
        {notes.map(note => {
          const isItm = mstrPrice >= note.conversionPrice;
          const moneyness = ((mstrPrice / note.conversionPrice) - 1) * 100;
          return (
            <tr key={note.name} style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
              <td style={{ padding: '6px 4px' }}>{note.name}</td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: "'JetBrains Mono', monospace" }}>
                {formatNumber(note.principal)}
              </td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: "'JetBrains Mono', monospace" }}>
                {(note.coupon * 100).toFixed(3)}%
              </td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: "'JetBrains Mono', monospace" }}>
                ${note.conversionPrice.toFixed(2)}
              </td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: "'JetBrains Mono', monospace" }}>
                {(note.sharesIfConverted / 1e6).toFixed(2)}M
              </td>
              <td style={{
                textAlign: 'right',
                padding: '6px 4px',
                color: isItm ? theme.green : theme.textSecondary,
                fontWeight: isItm ? '600' : '400',
              }}>
                {isItm ? 'ITM' : 'OTM'}
              </td>
              <td style={{
                textAlign: 'right',
                padding: '6px 4px',
                fontFamily: "'JetBrains Mono', monospace",
                color: moneyness > 0 ? theme.green : theme.red,
              }}>
                {moneyness > 0 ? '+' : ''}{moneyness.toFixed(1)}%
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default function StrategyDashboard() {
  const { theme } = useTheme();
  const [prices, setPrices] = useState({ btc: 100000, mstr: 420, eurUsd: 1.05 });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [treatItmAsEquity, setTreatItmAsEquity] = useState(true);

  useEffect(() => {
    async function loadPrices() {
      const result = await fetchAllPrices();
      if (result.btc && result.mstr) {
        setPrices({
          btc: result.btc,
          mstr: result.mstr,
          eurUsd: result.eurUsd,
          STRF: result.STRF,
          STRC: result.STRC,
          STRK: result.STRK,
          STRD: result.STRD,
          STRE: result.STRE,
        });
      }
      setErrors(result.errors);
      setLoading(false);
    }
    loadPrices();
  }, []);

  const waterfallResult = useMemo(() => {
    return calculateWaterfall({
      btcPrice: prices.btc,
      mstrPrice: prices.mstr,
      btcHoldings: STATIC_DATA.btcHoldings,
      debtData: STATIC_DATA.convertibleNotes,
      preferredData: STATIC_DATA.preferredStock,
      commonSharesBasic: STATIC_DATA.basicSharesOutstanding,
      eurUsdRate: prices.eurUsd,
      stockPrices: prices,
      treatItmAsEquity,
    });
  }, [prices, treatItmAsEquity]);

  const scenarioData = useMemo(() => {
    const btcPrices = [];
    for (let i = 30000; i <= 250000; i += 5000) btcPrices.push(i);
    return generateScenarioData(STATIC_DATA, btcPrices, prices.mstr, prices, prices.eurUsd, treatItmAsEquity);
  }, [prices, treatItmAsEquity]);

  const costOfCapital = useMemo(() => {
    return calculateCostOfCapital(STATIC_DATA.preferredStock, STATIC_DATA.convertibleNotes, prices.eurUsd);
  }, [prices.eurUsd]);

  const navBleed = useMemo(() => {
    return calculateNavBleed(STATIC_DATA.preferredStock);
  }, []);

  const simpleBtcPerShare = STATIC_DATA.btcHoldings / (STATIC_DATA.basicSharesOutstanding * 1000);
  const simpleSatsPerShare = Math.round(simpleBtcPerShare * 100000000);
  const difference = waterfallResult.satoshisPerShare - simpleSatsPerShare;
  const differencePct = (difference / simpleSatsPerShare) * 100;

  if (loading) {
    return (
      <div style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: theme.darkBg,
        color: theme.textPrimary,
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <ThemeToggle />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: theme.btcOrange }}>Loading prices...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: theme.darkBg,
      color: theme.textPrimary,
      minHeight: '100vh',
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      <ThemeToggle />
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: theme.btcOrange,
          margin: '0 0 4px 0',
        }}>
          Strategy BTC Dashboard
        </h1>
        <p style={{ fontSize: '11px', color: theme.textSecondary, margin: 0 }}>
          Calculating BTC/share after senior claims (debt, preferred)
        </p>
        {errors.length > 0 && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: 'rgba(248, 81, 73, 0.1)',
            border: `1px solid ${theme.red}33`,
            borderRadius: '6px',
            fontSize: '10px',
            color: theme.red,
          }}>
            API Errors: {errors.join(', ')}
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <Card style={{ background: `linear-gradient(135deg, ${theme.cardBg}, rgba(247, 147, 26, 0.15))` }}>
          <Metric
            label="BTC/Share"
            value={`${waterfallResult.satoshisPerShare.toLocaleString()} sats`}
            subValue={`₿${waterfallResult.btcPerShare.toFixed(8)}`}
            color={theme.btcOrange}
            large
          />
        </Card>
        <Card>
          <Metric
            label="USD Value/Share"
            value={`$${waterfallResult.usdPerShare.toFixed(2)}`}
            subValue={`@ $${prices.btc.toLocaleString()} BTC`}
            color={theme.green}
            large
          />
        </Card>
        <Card>
          <Metric
            label="Simple BTC/Share"
            value={`${simpleSatsPerShare.toLocaleString()} sats`}
            subValue="(Ignores cap structure)"
            color={theme.textSecondary}
            large
          />
        </Card>
        <Card>
          <Metric
            label="Difference"
            value={`${differencePct.toFixed(1)}%`}
            subValue={`${difference > 0 ? '+' : ''}${difference.toLocaleString()} sats`}
            color={difference < 0 ? theme.red : theme.green}
            large
          />
        </Card>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <Card style={{ padding: '12px' }}><Metric label="BTC Price" value={`$${prices.btc.toLocaleString()}`} /></Card>
        <Card style={{ padding: '12px' }}><Metric label="MSTR Price" value={`$${prices.mstr.toFixed(2)}`} /></Card>
        <Card style={{ padding: '12px' }}><Metric label="Total BTC" value={`₿${STATIC_DATA.btcHoldings.toLocaleString()}`} /></Card>
        <Card style={{ padding: '12px' }}>
          <Metric
            label="Senior Claims"
            value={`${((waterfallResult.seniorClaimsBtc / STATIC_DATA.btcHoldings) * 100).toFixed(1)}%`}
            subValue={formatBtc(waterfallResult.seniorClaimsBtc)}
          />
        </Card>
        <Card style={{ padding: '12px' }}><Metric label="Residual BTC" value={formatBtc(waterfallResult.residualBtc)} /></Card>
        <Card style={{ padding: '12px' }}><Metric label="Outstanding Shares" value={`${(waterfallResult.totalCommonShares / 1e6).toFixed(1)}M`} /></Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <Card>
          <h3 style={{ color: theme.textPrimary, marginBottom: '12px', fontSize: '13px', fontWeight: '600' }}>
            Capital Structure
          </h3>
          <CapitalStructureChart data={waterfallResult.waterfall} btcHoldings={STATIC_DATA.btcHoldings} />
        </Card>

        <Card>
          <h3 style={{ color: theme.textPrimary, marginBottom: '12px', fontSize: '13px', fontWeight: '600' }}>
            Sats/Share & Senior % vs BTC Price
          </h3>
          <ScenarioChart data={scenarioData} currentBtcPrice={prices.btc} />
          <div style={{ marginTop: '6px', fontSize: '9px', color: theme.textSecondary }}>
            <span style={{ color: theme.btcOrange }}>━</span> Sats/Share &nbsp;
            <span style={{ color: theme.red }}>┅</span> Senior Claims %
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <Card>
          <h3 style={{ color: theme.textPrimary, marginBottom: '12px', fontSize: '13px', fontWeight: '600' }}>
            Capital Stack Detail
          </h3>
          <CapitalStackTable waterfall={waterfallResult.waterfall} />

          {treatItmAsEquity && waterfallResult.inMoneyConverts.length > 0 && (
            <div style={{
              marginTop: '10px',
              padding: '8px 10px',
              backgroundColor: 'rgba(63, 185, 80, 0.1)',
              borderRadius: '6px',
              fontSize: '10px',
              border: `1px solid ${theme.green}33`,
            }}>
              <span style={{ color: theme.green }}>✓</span> ITM converts as equity: {' '}
              {waterfallResult.inMoneyConverts.map(c => c.name.replace(' Convert', '')).join(', ')}
            </div>
          )}

          <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${theme.cardBorder}`,
          }}>
            <Toggle
              checked={treatItmAsEquity}
              onChange={(e) => setTreatItmAsEquity(e.target.checked)}
              label="Treat ITM converts as equity (adds to shares, removes from debt)"
            />
            <div style={{ fontSize: '10px', color: theme.textSecondary, marginTop: '6px' }}>
              {waterfallResult.inMoneyConverts.length} of {STATIC_DATA.convertibleNotes.length} converts ITM @ MSTR ${prices.mstr.toFixed(0)}
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <CostOfCapitalSection
            costData={costOfCapital}
            btcPrice={prices.btc}
            btcHoldings={STATIC_DATA.btcHoldings}
            usdReserve={STATIC_DATA.usdReserve}
            theme={theme}
          />
          <NavBleedSection
            navBleed={navBleed}
            btcPrice={prices.btc}
            theme={theme}
          />
        </div>
      </div>

      <Card style={{ marginBottom: '16px' }}>
        <h3 style={{ color: theme.textPrimary, marginBottom: '10px', fontSize: '13px', fontWeight: '600' }}>
          Scenario Analysis: BTC Price Changes
        </h3>
        <ScenarioTable
          currentBtcPrice={prices.btc}
          currentResult={waterfallResult}
          baseData={STATIC_DATA}
          stockPrices={prices}
          eurUsdRate={prices.eurUsd}
          treatItmAsEquity={treatItmAsEquity}
        />
      </Card>

      <Card style={{ marginBottom: '16px' }}>
        <h3 style={{ color: theme.textPrimary, marginBottom: '10px', fontSize: '13px', fontWeight: '600' }}>
          Convertible Notes Status
        </h3>
        <ConvertiblesTable notes={STATIC_DATA.convertibleNotes} mstrPrice={prices.mstr} theme={theme} />
      </Card>

      <div style={{
        textAlign: 'center',
        padding: '12px',
        color: theme.textSecondary,
        fontSize: '9px',
        borderTop: `1px solid ${theme.cardBorder}`,
      }}>
        <p style={{ margin: '0 0 4px 0' }}>
          Data: Strategy.com (12/07/2025) • CoinGecko (BTC) • Polygon.io (stocks) • USD Reserve: $1.44B
        </p>
      </div>
    </div>
  );
}
