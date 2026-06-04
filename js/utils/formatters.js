// ============================================
// FORMATTERS — Number, date, currency utilities
// ============================================

export function formatNumber(n) {
  if (n == null || isNaN(n)) return 'N/A';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}

export function formatNumberFull(n) {
  if (n == null || isNaN(n)) return 'N/A';
  return Math.round(n).toLocaleString();
}

export function formatPercent(n, decimals = 1) {
  if (n == null || isNaN(n)) return 'N/A';
  return n.toFixed(decimals) + '%';
}

export function formatCurrency(n) {
  if (n == null || isNaN(n)) return 'N/A';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'B';
  return '$' + n.toFixed(0) + 'M';
}

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatDateFull(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatMonthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKeyToLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export function getQuarter(dateStr) {
  const d = new Date(dateStr);
  return `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
}

export function relativeTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'Today';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export const CHART_COLORS = [
  '#06d6a0', '#7c3aed', '#3b82f6', '#f59e0b', '#e63946',
  '#ec4899', '#14b8a6', '#8b5cf6', '#06b6d4', '#f97316',
  '#a3e635', '#f472b6', '#22d3ee', '#fb923c', '#a78bfa'
];

export function getColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export function getColorWithAlpha(index, alpha) {
  const hex = CHART_COLORS[index % CHART_COLORS.length];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
