// ============================================
// APP.JS — Main entry point
// ============================================

import { loadData, getData, rebuildIndexes } from './dataLoader.js';
import { onFilterChange, applyFilters, renderFilterBar } from './filterEngine.js';
import { setChartDefaults } from './utils/chartFactory.js';

import * as overview from './sections/overview.js';
import * as timeSeries from './sections/timeSeries.js';
import * as companies from './sections/companies.js';
import * as industries from './sections/industries.js';
import * as geographic from './sections/geographic.js';
import * as funding from './sections/funding.js';
import * as stages from './sections/stages.js';
import * as severity from './sections/severity.js';
import * as dataset from './sections/dataset.js';
import { loadFromLocalStorage } from './sections/dataset.js';

const sections = {
  overview: { module: overview, label: 'Overview' },
  timeseries: { module: timeSeries, label: 'Time Series' },
  companies: { module: companies, label: 'Companies' },
  industries: { module: industries, label: 'Industries' },
  geographic: { module: geographic, label: 'Geographic' },
  funding: { module: funding, label: 'Funding' },
  stages: { module: stages, label: 'Stages' },
  severity: { module: severity, label: 'Severity' },
  dataset: { module: dataset, label: 'Dataset Manager' }
};

let currentSection = 'overview';
let allData = [];
let indexes = {};

// Initialize
async function init() {
  setChartDefaults();

  try {
    const result = await loadData();
    allData = result.data;
    indexes = result.indexes;

    // Check for localStorage edits
    const savedData = loadFromLocalStorage();
    if (savedData && savedData.length > 0) {
      allData = savedData;
      indexes = rebuildIndexes(allData);
    }

    // Check for imported CSV
    const importedCSV = localStorage.getItem('layoffs_import_csv');
    if (importedCSV) {
      localStorage.removeItem('layoffs_import_csv');
      // Re-parse the imported CSV
      const parsed = Papa.parse(importedCSV, { header: true, skipEmptyLines: true });
      if (parsed.data && parsed.data.length > 0) {
        const { cleanAndIndex } = await import('./dataLoader.js');
        const imported = cleanAndIndex(parsed.data);
        allData = imported.data;
        indexes = imported.indexes;
        // Save immediately
        localStorage.setItem('layoffs_data_edits', JSON.stringify(allData.map(r => ({
          ...r, date: r.date?.toISOString() || null
        }))));
      }
    }

    // Render filter bar
    const filterBar = document.getElementById('filter-bar');
    renderFilterBar(filterBar, indexes);

    // Listen for filter changes
    onFilterChange(() => {
      const filtered = applyFilters(allData);
      renderCurrentSection(filtered);
    });

    // Wire dataset manager data change callback
    dataset.setOnDataChange((updatedData) => {
      allData = updatedData;
      indexes = rebuildIndexes(allData);
      // Re-render filter bar with updated options
      const filterBar = document.getElementById('filter-bar');
      renderFilterBar(filterBar, indexes);
    });

    // Setup navigation
    setupNavigation();

    // Setup search
    setupSearch();

    // Setup sidebar toggle
    setupSidebarToggle();

    // Setup keyboard shortcuts
    setupKeyboard();

    // Render first section
    renderSection('overview', allData);

    // Hide loading screen
    const loading = document.getElementById('loading-screen');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => loading.remove(), 600);
    }

  } catch (err) {
    console.error('Failed to load data:', err);
    const loading = document.getElementById('loading-screen');
    if (loading) {
      loading.innerHTML = `
        <div style="text-align:center; color: var(--accent-magenta);">
          <div style="font-size:48px; margin-bottom:16px;">⚠️</div>
          <div style="font-size:18px; font-weight:600;">Failed to load data</div>
          <div style="color: var(--text-tertiary); margin-top:8px;">${err.message}</div>
        </div>
      `;
    }
  }
}

function setupNavigation() {
  document.querySelectorAll('.sidebar__nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.dataset.section;
      navigateTo(section);
    });
  });
}

function navigateTo(sectionId) {
  currentSection = sectionId;

  // Update active nav
  document.querySelectorAll('.sidebar__nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.querySelector(`.sidebar__nav-item[data-section="${sectionId}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Show section
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  const sectionEl = document.getElementById(`section-${sectionId}`);
  if (sectionEl) sectionEl.classList.add('active');

  // Render — dataset always uses allData, not filtered
  if (sectionId === 'dataset') {
    renderSection(sectionId, allData);
  } else {
    const filtered = applyFilters(allData);
    renderSection(sectionId, filtered);
  }

  // Close sidebar on mobile
  document.querySelector('.sidebar')?.classList.remove('open');

  // Scroll to top
  document.querySelector('.content')?.scrollTo(0, 0);
}

function renderSection(sectionId, data) {
  const section = sections[sectionId];
  if (!section) return;
  const container = document.getElementById(`section-${sectionId}`);
  if (!container) return;
  section.module.render(container, data);
}

function renderCurrentSection(data) {
  if (currentSection === 'dataset') {
    renderSection(currentSection, allData);
  } else {
    renderSection(currentSection, data);
  }
}

function setupSearch() {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const openBtn = document.getElementById('open-search');

  if (!overlay || !input || !results) return;

  function openSearch() {
    overlay.classList.add('open');
    input.value = '';
    input.focus();
    results.innerHTML = '<div class="search-box__empty">Type to search companies, industries, or countries...</div>';
  }

  function closeSearch() {
    overlay.classList.remove('open');
  }

  if (openBtn) openBtn.addEventListener('click', openSearch);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSearch();
  });

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    if (!query) {
      results.innerHTML = '<div class="search-box__empty">Type to search...</div>';
      return;
    }

    const matches = [];

    // Search companies
    indexes.lists.companies
      .filter(c => c.toLowerCase().includes(query))
      .slice(0, 8)
      .forEach(c => {
        const rows = allData.filter(r => r.company === c);
        const total = rows.reduce((s, r) => s + r.laidOff, 0);
        matches.push({
          name: c,
          type: 'Company',
          meta: `${rows.length} events · ${total.toLocaleString()} laid off`,
          icon: '🏢'
        });
      });

    // Search industries
    indexes.lists.industries
      .filter(i => i.toLowerCase().includes(query))
      .slice(0, 4)
      .forEach(i => {
        const rows = allData.filter(r => r.industry === i);
        matches.push({
          name: i,
          type: 'Industry',
          meta: `${rows.length} events`,
          icon: '🏭'
        });
      });

    // Search countries
    indexes.lists.countries
      .filter(c => c.toLowerCase().includes(query))
      .slice(0, 4)
      .forEach(c => {
        const rows = allData.filter(r => r.country === c);
        matches.push({
          name: c,
          type: 'Country',
          meta: `${rows.length} events`,
          icon: '🌍'
        });
      });

    if (!matches.length) {
      results.innerHTML = '<div class="search-box__empty">No results found</div>';
      return;
    }

    results.innerHTML = matches.map(m => {
      const highlighted = m.name.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>');
      return `
        <div class="search-result" data-name="${m.name}" data-type="${m.type}">
          <div class="search-result__icon"><span style="font-size:16px">${m.icon}</span></div>
          <div>
            <div class="search-result__name">${highlighted}</div>
            <div class="search-result__meta">${m.type} · ${m.meta}</div>
          </div>
        </div>
      `;
    }).join('');

    // Bind clicks
    results.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => {
        const type = el.dataset.type;
        closeSearch();
        if (type === 'Company') navigateTo('companies');
        else if (type === 'Industry') navigateTo('industries');
        else if (type === 'Country') navigateTo('geographic');
      });
    });
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeSearch();
    }
  });
}

function setupSidebarToggle() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Close sidebar when clicking overlay
  const overlayEl = document.querySelector('.sidebar-overlay');
  if (overlayEl) {
    overlayEl.addEventListener('click', () => {
      sidebar?.classList.remove('open');
    });
  }
}

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const overlay = document.getElementById('search-overlay');
      if (overlay) {
        if (overlay.classList.contains('open')) {
          overlay.classList.remove('open');
        } else {
          overlay.classList.add('open');
          document.getElementById('search-input')?.focus();
        }
      }
    }
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);
