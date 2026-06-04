// ============================================
// INSIGHTS ENGINE — Auto-generate insights
// ============================================

import { sumLayoffs, groupBy, topN, getMonthlyTimeSeries } from './dataLoader.js';
import { formatNumber, formatPercent, monthKeyToLabel } from './utils/formatters.js';

export function generateOverviewInsights(data) {
  const insights = [];
  if (!data.length) return insights;

  const total = sumLayoffs(data);
  const byYear = groupBy(data, 'year');
  const yearTotals = Object.entries(byYear)
    .map(([y, rows]) => ({ year: y, total: sumLayoffs(rows) }))
    .sort((a, b) => b.total - a.total);

  // Worst year
  if (yearTotals.length) {
    const worst = yearTotals[0];
    const pct = ((worst.total / total) * 100).toFixed(1);
    insights.push({
      type: 'danger',
      text: `<strong>${worst.year}</strong> was the hardest year with <strong>${formatNumber(worst.total)}</strong> layoffs (${pct}% of total), suggesting a massive industry correction.`
    });
  }

  // Top industry
  const topInd = topN(data, 'industry', 1);
  if (topInd.length) {
    insights.push({
      type: 'warning',
      text: `The <strong>${topInd[0].name}</strong> sector leads with <strong>${formatNumber(topInd[0].total)}</strong> layoffs across ${topInd[0].count} events — indicating systemic challenges in this space.`
    });
  }

  // Top company
  const topCo = topN(data, 'company', 1);
  if (topCo.length) {
    insights.push({
      type: 'info',
      text: `<strong>${topCo[0].name}</strong> had the highest layoffs at <strong>${formatNumber(topCo[0].total)}</strong> workers, with ${topCo[0].count} separate layoff events.`
    });
  }

  // Repeat offenders
  const byCompany = groupBy(data, 'company');
  const repeaters = Object.entries(byCompany).filter(([, rows]) => rows.length >= 3);
  if (repeaters.length) {
    insights.push({
      type: 'warning',
      text: `<strong>${repeaters.length} companies</strong> had 3 or more layoff rounds, suggesting ongoing restructuring rather than one-time cuts.`
    });
  }

  // Geographic concentration
  const topCountry = topN(data, 'country', 1);
  if (topCountry.length) {
    const pct = ((topCountry[0].total / total) * 100).toFixed(1);
    insights.push({
      type: 'info',
      text: `<strong>${pct}%</strong> of all layoffs occurred in <strong>${topCountry[0].name}</strong>, reflecting the concentration of tech companies in this region.`
    });
  }

  return insights;
}

export function generateTimeInsights(data) {
  const insights = [];
  if (!data.length) return insights;

  const ts = getMonthlyTimeSeries(data);
  if (!ts.keys.length) return insights;

  // Find peak month
  const maxIdx = ts.totals.indexOf(Math.max(...ts.totals));
  const peakMonth = ts.keys[maxIdx];
  insights.push({
    type: 'danger',
    text: `Layoffs peaked in <strong>${monthKeyToLabel(peakMonth)}</strong> with <strong>${formatNumber(ts.totals[maxIdx])}</strong> workers laid off — the single worst month in the dataset.`
  });

  // Detect waves (months with >2x average)
  const avg = ts.totals.reduce((s, v) => s + v, 0) / ts.totals.length;
  const waves = ts.keys.filter((_, i) => ts.totals[i] > avg * 2);
  if (waves.length) {
    insights.push({
      type: 'warning',
      text: `<strong>${waves.length} months</strong> saw layoffs more than 2x the average, indicating distinct "waves" of job cuts rather than a steady trend.`
    });
  }

  // Q1 pattern check (seasonality)
  const q1Months = ts.keys.filter(k => {
    const m = parseInt(k.split('-')[1]);
    return m >= 1 && m <= 3;
  });
  const q1Total = q1Months.reduce((s, k) => s + (ts.totals[ts.keys.indexOf(k)] || 0), 0);
  const q1Pct = (q1Total / sumLayoffs(data)) * 100;
  if (q1Pct > 30) {
    insights.push({
      type: 'info',
      text: `<strong>${q1Pct.toFixed(1)}%</strong> of layoffs occur in Q1 (Jan–Mar), suggesting a strong seasonal pattern tied to post-year budget reviews.`
    });
  }

  // Year-over-year trend
  const byYear = groupBy(data, 'year');
  const years = Object.keys(byYear).sort();
  if (years.length >= 2) {
    const last = sumLayoffs(byYear[years[years.length - 1]]);
    const prev = sumLayoffs(byYear[years[years.length - 2]]);
    if (prev > 0) {
      const change = ((last - prev) / prev * 100).toFixed(1);
      const direction = change > 0 ? 'increased' : 'decreased';
      insights.push({
        type: change > 0 ? 'danger' : 'success',
        text: `Layoffs ${direction} by <strong>${Math.abs(change)}%</strong> from ${years[years.length - 2]} to ${years[years.length - 1]}.`
      });
    }
  }

  return insights;
}

export function generateCompanyInsights(data) {
  const insights = [];
  if (!data.length) return insights;

  const byCompany = groupBy(data, 'company');

  // Companies with most events
  const repeatOffenders = Object.entries(byCompany)
    .map(([name, rows]) => ({ name, count: rows.length, total: sumLayoffs(rows) }))
    .sort((a, b) => b.count - a.count);

  if (repeatOffenders.length && repeatOffenders[0].count > 1) {
    const top = repeatOffenders[0];
    insights.push({
      type: 'warning',
      text: `<strong>${top.name}</strong> had <strong>${top.count} separate layoff rounds</strong>, totaling ${formatNumber(top.total)} workers — indicating ongoing instability.`
    });
  }

  // Largest single layoff
  const sorted = [...data].sort((a, b) => b.laidOff - a.laidOff);
  if (sorted.length) {
    const biggest = sorted[0];
    insights.push({
      type: 'danger',
      text: `The single largest layoff event was <strong>${formatNumber(biggest.laidOff)} workers</strong> at <strong>${biggest.company}</strong> in ${monthKeyToLabel(biggest.month)}.`
    });
  }

  // Company shutdowns (100%)
  const shutdowns = data.filter(r => r.percentage === 100);
  if (shutdowns.length) {
    insights.push({
      type: 'danger',
      text: `<strong>${shutdowns.length} companies</strong> shut down entirely (100% layoff), representing total business failures.`
    });
  }

  // Highly funded but large layoffs
  const fundedLayoffs = data.filter(r => r.fundingMil && r.fundingMil > 100)
    .sort((a, b) => b.laidOff - a.laidOff);
  if (fundedLayoffs.length >= 3) {
    const top3 = fundedLayoffs.slice(0, 3).map(r => r.company).join(', ');
    insights.push({
      type: 'info',
      text: `Among companies with $100M+ funding, <strong>${top3}</strong> had the largest layoffs — suggesting funding doesn't guarantee stability.`
    });
  }

  return insights;
}

export function generateIndustryInsights(data) {
  const insights = [];
  if (!data.length) return insights;

  const top = topN(data, 'industry', 5);
  const total = sumLayoffs(data);

  if (top.length >= 3) {
    const top3Pct = ((top[0].total + top[1].total + top[2].total) / total * 100).toFixed(1);
    insights.push({
      type: 'warning',
      text: `The top 3 industries (<strong>${top[0].name}, ${top[1].name}, ${top[2].name}</strong>) account for <strong>${top3Pct}%</strong> of all layoffs.`
    });
  }

  // Industry with highest average layoff per event
  const byIndustry = groupBy(data, 'industry');
  const avgByIndustry = Object.entries(byIndustry)
    .filter(([, rows]) => rows.length >= 5)
    .map(([name, rows]) => ({ name, avg: sumLayoffs(rows) / rows.length, count: rows.length }))
    .sort((a, b) => b.avg - a.avg);

  if (avgByIndustry.length) {
    insights.push({
      type: 'info',
      text: `<strong>${avgByIndustry[0].name}</strong> has the highest average layoff size at <strong>${formatNumber(avgByIndustry[0].avg)}</strong> per event, indicating larger-scale restructuring.`
    });
  }

  // Fastest growing layoffs
  const byYearIndustry = {};
  data.forEach(r => {
    const key = `${r.industry}-${r.year}`;
    if (!byYearIndustry[key]) byYearIndustry[key] = 0;
    byYearIndustry[key] += r.laidOff;
  });

  return insights;
}

export function generateGeoInsights(data) {
  const insights = [];
  if (!data.length) return insights;

  const total = sumLayoffs(data);
  const topCountries = topN(data, 'country', 3);

  if (topCountries.length >= 3) {
    const top3Pct = ((topCountries[0].total + topCountries[1].total + topCountries[2].total) / total * 100).toFixed(1);
    insights.push({
      type: 'info',
      text: `<strong>${top3Pct}%</strong> of global layoffs are concentrated in just 3 countries: <strong>${topCountries.map(c => c.name).join(', ')}</strong>.`
    });
  }

  // Continental breakdown
  const byCont = topN(data, 'continent', 10);
  if (byCont.length) {
    const topCont = byCont[0];
    insights.push({
      type: 'warning',
      text: `<strong>${topCont.name}</strong> accounts for <strong>${formatPercent(topCont.total / total * 100)}</strong> of all layoffs globally.`
    });
  }

  // Countries with growing trends
  const nonUSData = data.filter(r => r.country !== 'USA');
  if (nonUSData.length) {
    const topNonUS = topN(nonUSData, 'country', 1);
    if (topNonUS.length) {
      insights.push({
        type: 'info',
        text: `Outside the US, <strong>${topNonUS[0].name}</strong> leads with <strong>${formatNumber(topNonUS[0].total)}</strong> layoffs across ${topNonUS[0].count} events.`
      });
    }
  }

  return insights;
}

export function generateFundingInsights(data) {
  const insights = [];
  const funded = data.filter(r => r.fundingMil && r.fundingMil > 0);
  if (funded.length < 10) return insights;

  // Correlation direction
  const avgFunding = funded.reduce((s, r) => s + r.fundingMil, 0) / funded.length;
  const highFunded = funded.filter(r => r.fundingMil > avgFunding);
  const lowFunded = funded.filter(r => r.fundingMil <= avgFunding);

  const avgLayoffHigh = highFunded.length ? sumLayoffs(highFunded) / highFunded.length : 0;
  const avgLayoffLow = lowFunded.length ? sumLayoffs(lowFunded) / lowFunded.length : 0;

  if (avgLayoffHigh > avgLayoffLow) {
    insights.push({
      type: 'warning',
      text: `Companies with above-average funding ($${formatNumber(avgFunding)}M+) laid off <strong>${formatNumber(avgLayoffHigh)}</strong> workers on average vs <strong>${formatNumber(avgLayoffLow)}</strong> for lower-funded companies.`
    });
  }

  // Biggest spenders with biggest layoffs
  const topFunded = [...funded].sort((a, b) => b.fundingMil - a.fundingMil).slice(0, 5);
  const names = topFunded.map(r => `${r.company} ($${formatNumber(r.fundingMil)}M)`).join(', ');
  insights.push({
    type: 'info',
    text: `Top funded companies: <strong>${names}</strong>. High funding often correlates with larger workforces and thus larger layoffs.`
  });

  return insights;
}

export function generateSeverityInsights(data) {
  const insights = [];
  const withPct = data.filter(r => r.percentage != null && r.percentage > 0);
  if (withPct.length < 10) return insights;

  const mass = withPct.filter(r => r.percentage >= 50);
  const total100 = withPct.filter(r => r.percentage === 100);
  const minor = withPct.filter(r => r.percentage < 10);

  insights.push({
    type: 'danger',
    text: `<strong>${mass.length} events</strong> (${formatPercent(mass.length / withPct.length * 100)}) involved laying off 50% or more of the workforce — classified as mass layoffs.`
  });

  if (total100.length) {
    insights.push({
      type: 'danger',
      text: `<strong>${total100.length} companies</strong> shut down entirely, laying off 100% of their workforce.`
    });
  }

  const avgPct = withPct.reduce((s, r) => s + r.percentage, 0) / withPct.length;
  insights.push({
    type: 'info',
    text: `The average layoff severity is <strong>${formatPercent(avgPct)}</strong> of workforce, with a median around ${formatPercent(withPct.sort((a, b) => a.percentage - b.percentage)[Math.floor(withPct.length / 2)].percentage)}.`
  });

  return insights;
}

export function generateStageInsights(data) {
  const insights = [];
  const withStage = data.filter(r => r.stage && r.stage !== 'Unknown');
  if (withStage.length < 10) return insights;

  const top = topN(withStage, 'stage', 3);
  if (top.length) {
    insights.push({
      type: 'warning',
      text: `<strong>${top[0].name}</strong> companies had the most layoffs at <strong>${formatNumber(top[0].total)}</strong>, followed by ${top.slice(1).map(t => t.name).join(' and ')}.`
    });
  }

  // Early vs late stage
  const early = withStage.filter(r => ['Seed', 'Series A', 'Series B'].includes(r.stage));
  const late = withStage.filter(r => ['Post-IPO', 'Acquired', 'Private Equity'].includes(r.stage));

  if (early.length && late.length) {
    const earlyAvg = sumLayoffs(early) / early.length;
    const lateAvg = sumLayoffs(late) / late.length;
    insights.push({
      type: 'info',
      text: `Late-stage companies average <strong>${formatNumber(lateAvg)}</strong> layoffs per event vs <strong>${formatNumber(earlyAvg)}</strong> for early-stage — larger companies naturally affect more people.`
    });
  }

  return insights;
}

export function renderInsights(container, insights) {
  if (!container || !insights.length) {
    if (container) container.innerHTML = '<div class="insight-item insight-item--info">Not enough data to generate insights for current filters.</div>';
    return;
  }

  container.innerHTML = insights.map(i =>
    `<div class="insight-item insight-item--${i.type}">${i.text}</div>`
  ).join('');
}
