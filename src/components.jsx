import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, ReferenceLine } from 'recharts';
import { COLORS, STATIC_DATA } from './constants.js';
import { formatNumber, formatBtc, calculateWaterfall } from './calculations.js';

export const Card = ({ children, style = {} }) => (
  <div style={{
    backgroundColor: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: '12px',
    padding: '16px',
    ...style,
  }}>
    {children}
  </div>
);

export const Metric = ({ label, value, subValue, subValue2, color = COLORS.textPrimary, large = false }) => (
  <div style={{ marginBottom: large ? '0' : '12px' }}>
    <div style={{
      color: COLORS.textSecondary,
      fontSize: '10px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '4px',
    }}>
      {label}
    </div>
    <div style={{
      color,
      fontSize: large ? '24px' : '18px',
      fontWeight: '700',
      fontFamily: "'JetBrains Mono', monospace",
      lineHeight: 1.2,
    }}>
      {value}
    </div>
    {subValue && (
      <div style={{ color: COLORS.textSecondary, fontSize: '11px', marginTop: '2px' }}>
        {subValue}
      </div>
    )}
    {subValue2 && (
      <div style={{ color: COLORS.textSecondary, fontSize: '10px', marginTop: '1px' }}>
        {subValue2}
      </div>
    )}
  </div>
);

export const Toggle = ({ checked, onChange, label }) => (
  <label style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '12px',
    color: COLORS.textSecondary,
  }}>
    <div style={{
      width: '36px',
      height: '20px',
      backgroundColor: checked ? COLORS.green : COLORS.cardBorder,
      borderRadius: '10px',
      position: 'relative',
      transition: 'background-color 0.2s',
      flexShrink: 0,
    }}>
      <div style={{
        width: '16px',
        height: '16px',
        backgroundColor: COLORS.textPrimary,
        borderRadius: '50%',
        position: 'absolute',
        top: '2px',
        left: checked ? '18px' : '2px',
        transition: 'left 0.2s',
      }} />
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ display: 'none' }}
    />
    <span style={{ lineHeight: 1.3 }}>{label}</span>
  </label>
);

export const CapitalStructureChart = ({ data, btcHoldings }) => {
  const chartData = data.map(item => ({
    name: item.name,
    btcClaim: item.claimBtc,
    color: item.color,
    dynamicLiqPref: item.dynamicLiqPref,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.cardBorder} horizontal={true} vertical={false} />
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toFixed(0)}
            stroke={COLORS.textSecondary}
            fontSize={10}
            axisLine={{ stroke: COLORS.cardBorder }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke={COLORS.textSecondary}
            fontSize={11}
            axisLine={{ stroke: COLORS.cardBorder }}
            tickLine={false}
            width={55}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: COLORS.cardBg,
              border: `1px solid ${COLORS.cardBorder}`,
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [formatBtc(value), 'BTC Claim']}
            labelStyle={{ color: COLORS.textPrimary }}
          />
          <Bar
            dataKey="btcClaim"
            radius={[0, 4, 4, 0]}
            barSize={24}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px 16px',
        marginTop: '8px',
        fontSize: '10px',
      }}>
        {data.map(item => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              backgroundColor: item.color,
              borderRadius: '2px',
              flexShrink: 0,
            }} />
            <span style={{ color: COLORS.textSecondary }}>
              {item.name}: {formatBtc(item.claimBtc)}
              {item.dynamicLiqPref && <span style={{ color: COLORS.yellow }}> ⚡</span>}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '6px', fontSize: '9px', color: COLORS.textSecondary }}>
        ⚡ = Dynamic liq pref: max($100, prior close, 10-day avg)
      </div>
    </div>
  );
};

export const ScenarioChart = ({ data, currentBtcPrice }) => (
  <ResponsiveContainer width="100%" height={220}>
    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.cardBorder} />
      <XAxis
        dataKey="btcPrice"
        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}K`}
        stroke={COLORS.textSecondary}
        fontSize={10}
      />
      <YAxis
        yAxisId="left"
        tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
        stroke={COLORS.btcOrange}
        fontSize={10}
      />
      <YAxis
        yAxisId="right"
        orientation="right"
        tickFormatter={(val) => `${val.toFixed(0)}%`}
        stroke={COLORS.red}
        fontSize={10}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: '8px',
          fontSize: '11px',
        }}
        formatter={(value, name) => {
          if (name === 'satoshisPerShare') return [`${value.toLocaleString()} sats`, 'Sats/Share'];
          if (name === 'seniorClaimsPct') return [`${value.toFixed(1)}%`, 'Senior Claims %'];
          return [value, name];
        }}
        labelFormatter={(val) => `BTC: $${val.toLocaleString()}`}
      />
      <ReferenceLine
        x={currentBtcPrice}
        stroke={COLORS.btcOrange}
        strokeDasharray="5 5"
        yAxisId="left"
      />
      <Line
        yAxisId="left"
        type="monotone"
        dataKey="satoshisPerShare"
        stroke={COLORS.btcOrange}
        strokeWidth={2}
        dot={false}
      />
      <Line
        yAxisId="right"
        type="monotone"
        dataKey="seniorClaimsPct"
        stroke={COLORS.red}
        strokeWidth={2}
        dot={false}
        strokeDasharray="5 5"
      />
    </LineChart>
  </ResponsiveContainer>
);

export const CapitalStackTable = ({ waterfall }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '500px' }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
          <th style={{ textAlign: 'left', padding: '8px 4px', color: COLORS.textSecondary }}>Security</th>
          <th style={{ textAlign: 'right', padding: '8px 4px', color: COLORS.textSecondary }}>Shares</th>
          <th style={{ textAlign: 'right', padding: '8px 4px', color: COLORS.textSecondary }}>Liq Pref</th>
          <th style={{ textAlign: 'right', padding: '8px 4px', color: COLORS.textSecondary }}>USD Claim</th>
          <th style={{ textAlign: 'right', padding: '8px 4px', color: COLORS.textSecondary }}>BTC Claim</th>
          <th style={{ textAlign: 'right', padding: '8px 4px', color: COLORS.textSecondary }}>% Total</th>
        </tr>
      </thead>
      <tbody>
        {waterfall.map((item, index) => (
          <tr
            key={item.name}
            style={{
              borderBottom: `1px solid ${COLORS.cardBorder}`,
              backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
            }}
          >
            <td style={{ padding: '8px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: item.color, flexShrink: 0,
                }} />
                <span>{item.name}</span>
                {item.dynamicLiqPref && <span style={{ color: COLORS.yellow, fontSize: '10px' }}>⚡</span>}
                {item.converted && <span style={{ color: COLORS.green, fontSize: '9px' }}>(Conv)</span>}
              </div>
            </td>
            <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: "'JetBrains Mono', monospace" }}>
              {item.shares ? `${(item.shares / 1e6).toFixed(2)}M` : '-'}
            </td>
            <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: "'JetBrains Mono', monospace" }}>
              {item.liqPref > 0 ? `$${item.liqPref.toFixed(0)}` : '-'}
            </td>
            <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: "'JetBrains Mono', monospace" }}>
              {formatNumber(item.claimUsd)}
            </td>
            <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: "'JetBrains Mono', monospace" }}>
              {formatBtc(item.claimBtc)}
            </td>
            <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: "'JetBrains Mono', monospace", color: COLORS.textSecondary }}>
              {((item.claimBtc / STATIC_DATA.btcHoldings) * 100).toFixed(1)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const ScenarioTable = ({ currentBtcPrice, currentResult, baseData, stockPrices, eurUsdRate, treatItmAsEquity }) => {
  const percentChanges = [-30, -20, -10, 0, 10, 15, 20, 25, 30, 50, 100];

  const scenarioData = percentChanges.map(pct => {
    const targetPrice = currentBtcPrice * (1 + pct / 100);
    const result = calculateWaterfall({
      btcPrice: targetPrice,
      mstrPrice: currentResult.mstrPrice,
      btcHoldings: baseData.btcHoldings,
      debtData: baseData.convertibleNotes,
      preferredData: baseData.preferredStock,
      commonSharesBasic: baseData.basicSharesOutstanding,
      eurUsdRate,
      stockPrices,
      treatItmAsEquity,
    });

    const satsChange = currentResult.satoshisPerShare > 0
      ? ((result.satoshisPerShare - currentResult.satoshisPerShare) / currentResult.satoshisPerShare) * 100
      : 0;

    const seniorClaimsPct = (result.seniorClaimsBtc / baseData.btcHoldings) * 100;

    return { pct, btcPrice: targetPrice, ...result, satsChange, seniorClaimsPct };
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
            <th style={{ textAlign: 'center', padding: '6px 4px', color: COLORS.textSecondary }}>BTC Δ</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', color: COLORS.textSecondary }}>BTC Price</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', color: COLORS.textSecondary }}>Sats/Share</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', color: COLORS.textSecondary }}>$/Share</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', color: COLORS.textSecondary }}>Sats Δ</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', color: COLORS.textSecondary }}>Senior %</th>
          </tr>
        </thead>
        <tbody>
          {scenarioData.map((row, index) => (
            <tr
              key={row.pct}
              style={{
                borderBottom: `1px solid ${COLORS.cardBorder}`,
                backgroundColor: row.pct === 0 ? 'rgba(247, 147, 26, 0.15)' : 'transparent',
              }}
            >
              <td style={{
                textAlign: 'center', padding: '6px 4px',
                color: row.pct > 0 ? COLORS.green : row.pct < 0 ? COLORS.red : COLORS.textPrimary,
                fontWeight: row.pct === 0 ? '700' : '400',
              }}>
                {row.pct > 0 ? '+' : ''}{row.pct}%
              </td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: "'JetBrains Mono', monospace" }}>
                ${row.btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: "'JetBrains Mono', monospace", color: COLORS.btcOrange, fontWeight: '600' }}>
                {row.satoshisPerShare.toLocaleString()}
              </td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: "'JetBrains Mono', monospace" }}>
                ${row.usdPerShare.toFixed(2)}
              </td>
              <td style={{
                textAlign: 'right', padding: '6px 4px', fontFamily: "'JetBrains Mono', monospace",
                color: row.satsChange > 0 ? COLORS.green : row.satsChange < 0 ? COLORS.red : COLORS.textSecondary,
                fontSize: '10px',
              }}>
                {row.satsChange > 0 ? '+' : ''}{row.satsChange.toFixed(1)}%
              </td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: "'JetBrains Mono', monospace", color: COLORS.textSecondary }}>
                {row.seniorClaimsPct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
