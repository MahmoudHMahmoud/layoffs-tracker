// ============================================
// ANALYTICS ENGINE — Advanced analytics
// ============================================

import { sumLayoffs, groupBy } from './dataLoader.js';

// Pearson correlation coefficient
export function pearsonCorrelation(x, y) {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;
  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
  const sumX2 = x.reduce((s, v) => s + v * v, 0);
  const sumY2 = y.reduce((s, v) => s + v * v, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

// Linear regression: returns {slope, intercept, r2}
export function linearRegression(x, y) {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
  const sumX2 = x.reduce((s, v) => s + v * v, 0);
  const meanY = sumY / n;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const ssRes = y.reduce((s, v, i) => s + Math.pow(v - (slope * x[i] + intercept), 2), 0);
  const ssTot = y.reduce((s, v) => s + Math.pow(v - meanY, 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

// Project future values using linear regression
export function trendForecast(values, periodsAhead = 3) {
  const x = values.map((_, i) => i);
  const { slope, intercept } = linearRegression(x, values);
  const forecast = [];
  for (let i = 0; i < periodsAhead; i++) {
    forecast.push(Math.max(0, Math.round(slope * (values.length + i) + intercept)));
  }
  return forecast;
}

// Get trend line values for existing data
export function getTrendLine(values) {
  const x = values.map((_, i) => i);
  const { slope, intercept } = linearRegression(x, values);
  return x.map(xi => Math.max(0, slope * xi + intercept));
}

// IQR-based outlier detection
export function detectOutliers(data, key = 'laidOff') {
  const values = data.map(r => r[key]).filter(v => v != null).sort((a, b) => a - b);
  if (values.length < 4) return { outliers: [], bounds: {} };

  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  return {
    outliers: data.filter(r => r[key] != null && (r[key] < lower || r[key] > upper)),
    bounds: { q1, q3, iqr, lower, upper }
  };
}

// Layoff Risk Score: composite metric
export function calculateRiskScore(companyData) {
  if (!companyData.length) return 0;

  const frequency = Math.min(companyData.length / 5, 1); // More events = higher risk
  const totalLaidOff = sumLayoffs(companyData);
  const severityMax = Math.max(...companyData.map(r => r.percentage || 0));
  const severity = Math.min(severityMax / 100, 1);

  const now = new Date();
  const mostRecent = new Date(Math.max(...companyData.map(r => r.date.getTime())));
  const daysSince = (now - mostRecent) / (1000 * 60 * 60 * 24);
  const recency = Math.max(0, 1 - daysSince / 1095); // Decay over 3 years

  const scale = Math.min(totalLaidOff / 10000, 1);

  return Math.round((frequency * 30 + severity * 25 + recency * 25 + scale * 20));
}

// Rank entities by multiple metrics
export function rankEntities(data, groupKey) {
  const grouped = groupBy(data, groupKey);
  return Object.entries(grouped)
    .map(([name, rows]) => {
      const total = sumLayoffs(rows);
      const avgSize = total / rows.length;
      const maxSingle = Math.max(...rows.map(r => r.laidOff));
      const avgPct = rows.filter(r => r.percentage).length
        ? rows.filter(r => r.percentage).reduce((s, r) => s + r.percentage, 0) / rows.filter(r => r.percentage).length
        : null;
      return { name, total, count: rows.length, avgSize, maxSingle, avgPct };
    })
    .sort((a, b) => b.total - a.total);
}

// Standard deviation
export function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// Volatility index for an entity
export function volatilityIndex(data, groupKey) {
  const grouped = groupBy(data, groupKey);
  return Object.entries(grouped)
    .filter(([, rows]) => rows.length >= 3)
    .map(([name, rows]) => {
      const values = rows.map(r => r.laidOff);
      return { name, volatility: stdDev(values), mean: values.reduce((s, v) => s + v, 0) / values.length, count: rows.length };
    })
    .sort((a, b) => b.volatility - a.volatility);
}
