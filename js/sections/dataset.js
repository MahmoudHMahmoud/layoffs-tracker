// ============================================
// DATASET MANAGER SECTION
// ============================================

import { formatDateFull, formatNumber } from '../utils/formatters.js';

const COLUMNS = [
  { key: 'id', label: '#', class: 'col-id', editable: false, type: 'number' },
  { key: 'company', label: 'Company', class: 'col-company', editable: true, type: 'text' },
  { key: 'industry', label: 'Industry', class: 'col-industry', editable: true, type: 'text' },
  { key: 'country', label: 'Country', class: 'col-country', editable: true, type: 'text' },
  { key: 'laidOff', label: 'Laid Off', class: 'col-laidoff', editable: true, type: 'number' },
  { key: 'percentage', label: '%', class: 'col-pct', editable: true, type: 'number' },
  { key: 'dateStr', label: 'Date', class: 'col-date', editable: true, type: 'date' },
  { key: 'stage', label: 'Stage', class: 'col-stage', editable: true, type: 'text' },
  { key: 'fundingMil', label: 'Funding ($M)', class: 'col-funding', editable: true, type: 'number' },
  { key: 'locationHQ', label: 'Location', class: 'col-location', editable: true, type: 'text' },
];

let state = {
  page: 1,
  pageSize: 50,
  sortKey: 'id',
  sortDir: 'asc',
  search: '',
  selected: new Set(),
  modified: new Set(),
  newRows: new Set(),
};

let onDataChange = null;

export function setOnDataChange(callback) {
  onDataChange = callback;
}

export function render(container, data) {
  const filtered = filterData(data);
  const sorted = sortData(filtered);
  const totalPages = Math.ceil(sorted.length / state.pageSize);
  if (state.page > totalPages && totalPages > 0) state.page = totalPages;
  const start = (state.page - 1) * state.pageSize;
  const pageData = sorted.slice(start, start + state.pageSize);

  const modCount = state.modified.size;
  const newCount = state.newRows.size;

  container.innerHTML = `
    <div class="section__header">
      <h1 class="section__title">Dataset Manager</h1>
      <p class="section__description">View, edit, and manage the layoffs dataset. Changes sync with all dashboards in real-time.</p>
    </div>

    <div class="dm-toolbar">
      <div class="dm-toolbar__left">
        <div class="dm-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="dm-search-input" placeholder="Search across all columns..." value="${state.search}" autocomplete="off">
        </div>
      </div>
      <div class="dm-toolbar__right">
        <button class="dm-btn dm-btn--primary" id="dm-add-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Row
        </button>
        <button class="dm-btn dm-btn--danger" id="dm-delete-selected" ${state.selected.size === 0 ? 'disabled style="opacity:0.4"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Delete (${state.selected.size})
        </button>
        <button class="dm-btn dm-btn--success" id="dm-export">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
        <label class="dm-btn" for="dm-import-file">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Import
        </label>
        <input type="file" accept=".csv" id="dm-import-file" class="dm-file-input">
        <button class="dm-btn dm-btn--danger" id="dm-reset">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          Reset
        </button>
      </div>
    </div>

    <div class="dm-stats">
      <div class="dm-stats__item">Total: <strong>${data.length}</strong></div>
      <div class="dm-stats__item">Showing: <strong>${filtered.length}</strong></div>
      <div class="dm-stats__item">Selected: <strong>${state.selected.size}</strong></div>
      ${modCount > 0 ? `<span class="dm-stats__badge">${modCount} modified</span>` : ''}
      ${newCount > 0 ? `<span class="dm-stats__badge" style="background:var(--accent-cyan-dim);color:var(--accent-cyan)">${newCount} new</span>` : ''}
    </div>

    <div class="dm-table-wrap">
      <div class="dm-table-scroll">
        <table class="dm-table">
          <thead>
            <tr>
              <th class="col-select">
                <input type="checkbox" class="dm-checkbox" id="dm-select-all" ${state.selected.size === pageData.length && pageData.length > 0 ? 'checked' : ''}>
              </th>
              ${COLUMNS.map(col => `
                <th class="${col.class} ${state.sortKey === col.key ? (state.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}" data-sort="${col.key}">
                  ${col.label}
                </th>
              `).join('')}
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody id="dm-tbody">
            ${pageData.map(row => renderRow(row)).join('')}
          </tbody>
        </table>
      </div>
      <div class="dm-pagination">
        <div class="dm-pagination__info">
          Showing ${start + 1}–${Math.min(start + state.pageSize, sorted.length)} of ${sorted.length}
        </div>
        <div class="dm-pagination__controls">
          <button class="dm-page-btn" id="dm-prev" ${state.page <= 1 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          ${renderPageButtons(state.page, totalPages)}
          <button class="dm-page-btn" id="dm-next" ${state.page >= totalPages ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div class="dm-page-size">
            <select id="dm-page-size" title="Rows per page">
              ${[25, 50, 100, 200].map(n => `<option value="${n}" ${state.pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    </div>
  `;

  bindEvents(container, data);
}

function renderRow(row) {
  const isSelected = state.selected.has(row.id);
  const isModified = state.modified.has(row.id);
  const isNew = state.newRows.has(row.id);

  return `
    <tr data-id="${row.id}" class="${isSelected ? 'selected' : ''} ${isModified ? 'modified' : ''} ${isNew ? 'new-row' : ''}">
      <td class="col-select"><input type="checkbox" class="dm-checkbox dm-row-check" data-id="${row.id}" ${isSelected ? 'checked' : ''}></td>
      ${COLUMNS.map(col => {
        let val = row[col.key];
        if (val == null) val = '';
        if (col.key === 'percentage' && val !== '') val = parseFloat(val).toFixed(1);
        if (col.key === 'fundingMil' && val !== '') val = parseFloat(val).toFixed(1);
        return `<td class="${col.class}" ${col.editable ? `contenteditable="true" data-key="${col.key}" data-type="${col.type}"` : ''} title="${val}">${val}</td>`;
      }).join('')}
      <td class="col-actions">
        <span class="dm-row-action" data-action="delete" data-id="${row.id}" title="Delete row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </span>
      </td>
    </tr>
  `;
}

function renderPageButtons(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
      .map(p => `<button class="dm-page-btn ${p === current ? 'active' : ''}" data-page="${p}">${p}</button>`)
      .join('');
  }

  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages.map(p => {
    if (p === '...') return `<span style="color:var(--text-tertiary);padding:0 4px;">…</span>`;
    return `<button class="dm-page-btn ${p === current ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }).join('');
}

function filterData(data) {
  if (!state.search) return [...data];
  const q = state.search.toLowerCase();
  return data.filter(r =>
    (r.company && r.company.toLowerCase().includes(q)) ||
    (r.industry && r.industry.toLowerCase().includes(q)) ||
    (r.country && r.country.toLowerCase().includes(q)) ||
    (r.locationHQ && r.locationHQ.toLowerCase().includes(q)) ||
    (r.stage && r.stage.toLowerCase().includes(q)) ||
    (r.dateStr && r.dateStr.includes(q))
  );
}

function sortData(data) {
  const key = state.sortKey;
  const dir = state.sortDir === 'asc' ? 1 : -1;
  return [...data].sort((a, b) => {
    let va = a[key], vb = b[key];
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    if (va instanceof Date && vb instanceof Date) return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
}

function bindEvents(container, data) {
  // Search
  const searchInput = container.querySelector('#dm-search-input');
  let searchTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = searchInput.value;
      state.page = 1;
      render(container, data);
    }, 200);
  });

  // Sort
  container.querySelectorAll('.dm-table thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = 'asc';
      }
      render(container, data);
    });
  });

  // Select all
  container.querySelector('#dm-select-all')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    const filtered = filterData(data);
    const sorted = sortData(filtered);
    const start = (state.page - 1) * state.pageSize;
    const pageData = sorted.slice(start, start + state.pageSize);
    pageData.forEach(r => {
      if (checked) state.selected.add(r.id);
      else state.selected.delete(r.id);
    });
    render(container, data);
  });

  // Row checkboxes
  container.querySelectorAll('.dm-row-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = parseInt(cb.dataset.id);
      if (cb.checked) state.selected.add(id);
      else state.selected.delete(id);
      render(container, data);
    });
  });

  // Inline editing
  container.querySelectorAll('td[contenteditable="true"]').forEach(td => {
    const origValue = td.textContent;

    td.addEventListener('focus', () => {
      td.classList.add('editing');
    });

    td.addEventListener('blur', () => {
      td.classList.remove('editing');
      const newValue = td.textContent.trim();
      if (newValue === origValue) return;

      const row = td.closest('tr');
      const rowId = parseInt(row.dataset.id);
      const key = td.dataset.key;
      const type = td.dataset.type;

      const record = data.find(r => r.id === rowId);
      if (!record) return;

      // Update value
      if (type === 'number') {
        const num = parseFloat(newValue);
        record[key] = isNaN(num) ? null : num;
      } else if (type === 'date') {
        record[key] = newValue;
        const d = new Date(newValue);
        if (!isNaN(d)) {
          record.date = d;
          record.year = d.getFullYear();
          record.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          record.quarter = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
        }
      } else {
        record[key] = newValue;
      }

      state.modified.add(rowId);
      td.classList.add('modified-cell');
      row.classList.add('modified');

      // Persist to localStorage
      saveToLocalStorage(data);

      // Notify dashboard
      if (onDataChange) onDataChange(data);
    });

    td.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        td.blur();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        td.blur();
        // Move to next editable cell
        const next = td.nextElementSibling;
        if (next && next.contentEditable === 'true') {
          next.focus();
        }
      }
      if (e.key === 'Escape') {
        td.textContent = origValue;
        td.blur();
      }
    });
  });

  // Delete row button
  container.querySelectorAll('.dm-row-action[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      showConfirm(container, 'Delete Row', 'Are you sure you want to delete this row? This cannot be undone.', () => {
        const idx = data.findIndex(r => r.id === id);
        if (idx !== -1) data.splice(idx, 1);
        state.selected.delete(id);
        state.modified.delete(id);
        state.newRows.delete(id);
        saveToLocalStorage(data);
        if (onDataChange) onDataChange(data);
        render(container, data);
      });
    });
  });

  // Delete selected
  container.querySelector('#dm-delete-selected')?.addEventListener('click', () => {
    if (state.selected.size === 0) return;
    showConfirm(container, 'Delete Selected', `Delete ${state.selected.size} selected rows? This cannot be undone.`, () => {
      const toDelete = new Set(state.selected);
      for (let i = data.length - 1; i >= 0; i--) {
        if (toDelete.has(data[i].id)) data.splice(i, 1);
      }
      state.selected.clear();
      saveToLocalStorage(data);
      if (onDataChange) onDataChange(data);
      render(container, data);
    });
  });

  // Add row
  container.querySelector('#dm-add-row')?.addEventListener('click', () => {
    const maxId = data.length ? Math.max(...data.map(r => r.id)) + 1 : 1;
    const newRow = {
      id: maxId,
      company: 'New Company',
      locationHQ: '',
      region: '',
      usState: '',
      country: 'USA',
      continent: 'North America',
      laidOff: 0,
      date: new Date(),
      dateStr: new Date().toISOString().split('T')[0],
      percentage: null,
      sizeBefore: null,
      sizeAfter: null,
      industry: 'Other',
      stage: 'Unknown',
      fundingMil: null,
      year: new Date().getFullYear(),
      month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
      lat: null,
      lng: null
    };
    data.unshift(newRow);
    state.newRows.add(maxId);
    state.page = 1;
    state.search = '';
    state.sortKey = 'id';
    state.sortDir = 'desc';
    saveToLocalStorage(data);
    if (onDataChange) onDataChange(data);
    render(container, data);
  });

  // Export CSV
  container.querySelector('#dm-export')?.addEventListener('click', () => {
    exportCSV(data);
  });

  // Import CSV
  container.querySelector('#dm-import-file')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      importCSV(text, container, data);
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Reset
  container.querySelector('#dm-reset')?.addEventListener('click', () => {
    showConfirm(container, 'Reset Dataset', 'Reset to original dataset? All edits will be lost.', () => {
      localStorage.removeItem('layoffs_data_edits');
      state.modified.clear();
      state.newRows.clear();
      state.selected.clear();
      window.location.reload();
    });
  });

  // Pagination
  container.querySelector('#dm-prev')?.addEventListener('click', () => {
    if (state.page > 1) { state.page--; render(container, data); }
  });
  container.querySelector('#dm-next')?.addEventListener('click', () => {
    const total = Math.ceil(filterData(data).length / state.pageSize);
    if (state.page < total) { state.page++; render(container, data); }
  });
  container.querySelectorAll('.dm-page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.page = parseInt(btn.dataset.page);
      render(container, data);
    });
  });
  container.querySelector('#dm-page-size')?.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value);
    state.page = 1;
    render(container, data);
  });
}

function showConfirm(container, title, text, onConfirm) {
  const dialog = document.createElement('div');
  dialog.className = 'dm-confirm';
  dialog.innerHTML = `
    <div class="dm-confirm__box">
      <div class="dm-confirm__title">${title}</div>
      <div class="dm-confirm__text">${text}</div>
      <div class="dm-confirm__actions">
        <button class="dm-btn" id="dm-confirm-cancel">Cancel</button>
        <button class="dm-btn dm-btn--danger" id="dm-confirm-ok">Confirm</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);

  dialog.querySelector('#dm-confirm-cancel').addEventListener('click', () => dialog.remove());
  dialog.querySelector('#dm-confirm-ok').addEventListener('click', () => {
    dialog.remove();
    onConfirm();
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.remove(); });
}

function exportCSV(data) {
  const headers = ['Nr', 'Company', 'Location_HQ', 'Region', 'USState', 'Country', 'Continent', 'Laid_Off', 'Date_layoffs', 'Percentage', 'Company_Size_before_Layoffs', 'Company_Size_after_layoffs', 'Industry', 'Stage', 'Money_Raised_in__mil', 'Year', 'latitude', 'longitude'];

  const rows = data.map(r => [
    r.id, r.company, r.locationHQ, r.region, r.usState, r.country, r.continent,
    r.laidOff, r.dateStr, r.percentage ?? '', r.sizeBefore ?? '', r.sizeAfter ?? '',
    r.industry, r.stage, r.fundingMil ?? '', r.year, r.lat ?? '', r.lng ?? ''
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `layoffs_data_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function importCSV(text, container, data) {
  try {
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (!parsed.data || parsed.data.length === 0) {
      alert('No valid data found in the CSV file.');
      return;
    }
    showConfirm(container, 'Import Data', `Import ${parsed.data.length} rows? This will replace all current data.`, () => {
      // Signal app to reload with new CSV text
      localStorage.setItem('layoffs_import_csv', text);
      window.location.reload();
    });
  } catch (e) {
    alert('Failed to parse CSV: ' + e.message);
  }
}

function saveToLocalStorage(data) {
  try {
    const serializable = data.map(r => ({
      ...r,
      date: r.date?.toISOString() || null
    }));
    localStorage.setItem('layoffs_data_edits', JSON.stringify(serializable));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export function loadFromLocalStorage() {
  try {
    const stored = localStorage.getItem('layoffs_data_edits');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.map(r => ({
      ...r,
      date: r.date ? new Date(r.date) : null
    }));
  } catch (e) {
    return null;
  }
}

export function update(data) {
  const container = document.getElementById('section-dataset');
  if (container) render(container, data);
}
