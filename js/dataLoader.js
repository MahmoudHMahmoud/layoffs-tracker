// ============================================
// DATA LOADER — CSV fetch, parse, clean, index
// ============================================

import { formatMonthKey } from './utils/formatters.js';

let rawData = [];
let indexes = {};

export async function loadData() {
  const res = await fetch('./data/Cleaned_tech_layoffs.csv');
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  rawData = parsed.data.map(cleanRow).filter(r => r !== null);
  indexes = buildIndexes(rawData);
  return { data: rawData, indexes };
}

function cleanRow(row) {
  const laidOff = parseFloat(row.Laid_Off);
  if (isNaN(laidOff) || laidOff <= 0) return null; // skip invalid
  const date = row.Date_layoffs ? new Date(row.Date_layoffs) : null;
  if (!date || isNaN(date)) return null;

  return {
    id: parseInt(row.Nr) || 0,
    company: (row.Company || '').trim(),
    locationHQ: (row.Location_HQ || '').trim(),
    region: (row.Region || '').trim(),
    usState: (row.USState || '').trim(),
    country: (row.Country || '').trim(),
    continent: (row.Continent || '').trim(),
    laidOff: laidOff,
    date: date,
    dateStr: row.Date_layoffs,
    percentage: parseFloat(row.Percentage) || null,
    sizeBefore: parseFloat(row.Company_Size_before_Layoffs) || null,
    sizeAfter: parseFloat(row.Company_Size_after_layoffs) || null,
    industry: (row.Industry || 'Other').trim(),
    stage: (row.Stage || 'Unknown').trim() || 'Unknown',
    fundingMil: parseFloat(row.Money_Raised_in__mil) || null,
    year: parseInt(row.Year) || date.getFullYear(),
    month: formatMonthKey(row.Date_layoffs),
    quarter: `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`,
    lat: parseFloat(row.latitude) || null,
    lng: parseFloat(row.longitude) || null
  };
}

function buildIndexes(data) {
  const byCompany = {};
  const byCountry = {};
  const byIndustry = {};
  const byStage = {};
  const byYear = {};
  const byMonth = {};
  const byContinent = {};
  const companies = new Set();
  const countries = new Set();
  const industries = new Set();
  const stages = new Set();
  const years = new Set();

  data.forEach(r => {
    // By company
    if (!byCompany[r.company]) byCompany[r.company] = [];
    byCompany[r.company].push(r);
    companies.add(r.company);

    // By country
    if (!byCountry[r.country]) byCountry[r.country] = [];
    byCountry[r.country].push(r);
    countries.add(r.country);

    // By industry
    if (!byIndustry[r.industry]) byIndustry[r.industry] = [];
    byIndustry[r.industry].push(r);
    industries.add(r.industry);

    // By stage
    if (!byStage[r.stage]) byStage[r.stage] = [];
    byStage[r.stage].push(r);
    stages.add(r.stage);

    // By year
    if (!byYear[r.year]) byYear[r.year] = [];
    byYear[r.year].push(r);
    years.add(r.year);

    // By month
    if (r.month) {
      if (!byMonth[r.month]) byMonth[r.month] = [];
      byMonth[r.month].push(r);
    }

    // By continent
    if (!byContinent[r.continent]) byContinent[r.continent] = [];
    byContinent[r.continent].push(r);
  });

  return {
    byCompany, byCountry, byIndustry, byStage, byYear, byMonth, byContinent,
    lists: {
      companies: [...companies].sort(),
      countries: [...countries].sort(),
      industries: [...industries].sort(),
      stages: [...stages].sort(),
      years: [...years].sort()
    }
  };
}

export function getData() { return rawData; }
export function getIndexes() { return indexes; }

export function rebuildIndexes(data) {
  indexes = buildIndexes(data);
  return indexes;
}

export function cleanAndIndex(csvRows) {
  const data = csvRows.map(cleanRow).filter(r => r !== null);
  const idx = buildIndexes(data);
  return { data, indexes: idx };
}

// Aggregation helpers
export function sumLayoffs(data) {
  return data.reduce((s, r) => s + r.laidOff, 0);
}

export function avgLayoffs(data) {
  if (!data.length) return 0;
  return sumLayoffs(data) / data.length;
}

export function uniqueCount(data, key) {
  return new Set(data.map(r => r[key])).size;
}

export function groupBy(data, key) {
  const map = {};
  data.forEach(r => {
    const k = r[key];
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  return map;
}

export function topN(data, key, n, valueKey = 'laidOff') {
  const grouped = groupBy(data, key);
  return Object.entries(grouped)
    .map(([k, rows]) => ({ name: k, total: rows.reduce((s, r) => s + r[valueKey], 0), count: rows.length, rows }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

export function getMonthlyTimeSeries(data) {
  const monthly = {};
  data.forEach(r => {
    if (r.month) {
      if (!monthly[r.month]) monthly[r.month] = { total: 0, count: 0 };
      monthly[r.month].total += r.laidOff;
      monthly[r.month].count++;
    }
  });
  const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
  return { keys: sorted.map(([k]) => k), totals: sorted.map(([, v]) => v.total), counts: sorted.map(([, v]) => v.count) };
}

export function getYearlyTimeSeries(data) {
  const yearly = {};
  data.forEach(r => {
    if (!yearly[r.year]) yearly[r.year] = { total: 0, count: 0 };
    yearly[r.year].total += r.laidOff;
    yearly[r.year].count++;
  });
  const sorted = Object.entries(yearly).sort(([a], [b]) => parseInt(a) - parseInt(b));
  return { keys: sorted.map(([k]) => k), totals: sorted.map(([, v]) => v.total), counts: sorted.map(([, v]) => v.count) };
}

export function rollingAverage(data, window) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((s, v) => s + v, 0) / slice.length);
  }
  return result;
}
