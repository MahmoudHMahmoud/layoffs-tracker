// ============================================
// FILTER ENGINE — Global filter state & events
// ============================================

const state = {
  dateFrom: null,
  dateTo: null,
  countries: [],
  industries: [],
  companies: [],
  stages: [],
};

const listeners = [];

export function getFilterState() { return { ...state }; }

export function setFilter(key, value) {
  state[key] = value;
  notifyListeners();
}

export function resetFilters() {
  state.dateFrom = null;
  state.dateTo = null;
  state.countries = [];
  state.industries = [];
  state.companies = [];
  state.stages = [];
  notifyListeners();
}

export function onFilterChange(callback) {
  listeners.push(callback);
}

function notifyListeners() {
  const debounced = debounce(() => {
    listeners.forEach(cb => cb(state));
  }, 100);
  debounced();
}

let debounceTimer;
function debounce(fn, delay) {
  return () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
  };
}

export function applyFilters(data) {
  let filtered = data;

  if (state.dateFrom) {
    const from = new Date(state.dateFrom);
    filtered = filtered.filter(r => r.date >= from);
  }
  if (state.dateTo) {
    const to = new Date(state.dateTo);
    filtered = filtered.filter(r => r.date <= to);
  }
  if (state.countries.length > 0) {
    filtered = filtered.filter(r => state.countries.includes(r.country));
  }
  if (state.industries.length > 0) {
    filtered = filtered.filter(r => state.industries.includes(r.industry));
  }
  if (state.companies.length > 0) {
    filtered = filtered.filter(r => state.companies.includes(r.company));
  }
  if (state.stages.length > 0) {
    filtered = filtered.filter(r => state.stages.includes(r.stage));
  }

  return filtered;
}

export function hasActiveFilters() {
  return state.dateFrom || state.dateTo || state.countries.length || state.industries.length || state.companies.length || state.stages.length;
}

export function getActiveFilterCount() {
  let count = 0;
  if (state.dateFrom) count++;
  if (state.dateTo) count++;
  count += state.countries.length;
  count += state.industries.length;
  count += state.companies.length;
  count += state.stages.length;
  return count;
}

export function renderFilterBar(container, indexes) {
  container.innerHTML = `
    <span class="filter-bar__label">Filters</span>
    <div class="filter-bar__group">
      <div class="filter-select">
        <select id="filter-country" title="Filter by country">
          <option value="">All Countries</option>
          ${indexes.lists.countries.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="filter-select">
        <select id="filter-industry" title="Filter by industry">
          <option value="">All Industries</option>
          ${indexes.lists.industries.map(i => `<option value="${i}">${i}</option>`).join('')}
        </select>
      </div>
      <div class="filter-select">
        <select id="filter-stage" title="Filter by stage">
          <option value="">All Stages</option>
          ${indexes.lists.stages.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="filter-select">
        <select id="filter-year" title="Filter by year">
          <option value="">All Years</option>
          ${indexes.lists.years.map(y => `<option value="${y}">${y}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="filter-bar__chips" id="filter-chips"></div>
  `;

  // Bind events
  const countryEl = container.querySelector('#filter-country');
  const industryEl = container.querySelector('#filter-industry');
  const stageEl = container.querySelector('#filter-stage');
  const yearEl = container.querySelector('#filter-year');

  countryEl.addEventListener('change', () => {
    const v = countryEl.value;
    setFilter('countries', v ? [v] : []);
    updateChips(container);
  });

  industryEl.addEventListener('change', () => {
    const v = industryEl.value;
    setFilter('industries', v ? [v] : []);
    updateChips(container);
  });

  stageEl.addEventListener('change', () => {
    const v = stageEl.value;
    setFilter('stages', v ? [v] : []);
    updateChips(container);
  });

  yearEl.addEventListener('change', () => {
    const v = yearEl.value;
    if (v) {
      const year = parseInt(v);
      setFilter('dateFrom', `${year}-01-01`);
      setFilter('dateTo', `${year}-12-31`);
    } else {
      setFilter('dateFrom', null);
      setFilter('dateTo', null);
    }
    updateChips(container);
  });
}

function updateChips(container) {
  const chipsEl = container.querySelector('#filter-chips');
  if (!chipsEl) return;
  const chips = [];

  if (state.countries.length) {
    state.countries.forEach(c => chips.push({ label: c, type: 'countries', value: c }));
  }
  if (state.industries.length) {
    state.industries.forEach(i => chips.push({ label: i, type: 'industries', value: i }));
  }
  if (state.stages.length) {
    state.stages.forEach(s => chips.push({ label: s, type: 'stages', value: s }));
  }
  if (state.dateFrom && state.dateTo) {
    const y = new Date(state.dateFrom).getFullYear();
    chips.push({ label: `Year: ${y}`, type: 'year', value: y });
  }

  if (chips.length === 0) {
    chipsEl.innerHTML = '';
    return;
  }

  chipsEl.innerHTML = chips.map(c =>
    `<span class="chip" data-type="${c.type}" data-value="${c.value}">
      ${c.label}
      <span class="chip__remove" onclick="this.parentElement.dispatchEvent(new CustomEvent('remove-chip'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </span>
    </span>`
  ).join('') + `<span class="filter-bar__clear" id="clear-filters">Clear all</span>`;

  // Bind chip removal
  chipsEl.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('remove-chip', () => {
      const type = chip.dataset.type;
      if (type === 'year') {
        setFilter('dateFrom', null);
        setFilter('dateTo', null);
        const yearEl = container.querySelector('#filter-year');
        if (yearEl) yearEl.value = '';
      } else {
        setFilter(type, []);
        const selMap = { countries: '#filter-country', industries: '#filter-industry', stages: '#filter-stage' };
        const sel = container.querySelector(selMap[type]);
        if (sel) sel.value = '';
      }
      updateChips(container);
    });
  });

  const clearBtn = chipsEl.querySelector('#clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      resetFilters();
      container.querySelectorAll('select').forEach(s => s.value = '');
      updateChips(container);
    });
  }
}
