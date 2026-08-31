(function () {
  const U = window.IncidentUtils;
  const Data = window.IncidentDataService;
  const A = window.IncidentAnalytics;
  const Charts = window.IncidentCharts;
  const Export = window.IncidentExport;
  const UI = window.IncidentUI;

  const app = {
    rows: [],
    source: '',
    sourceUrl: '',
    filteredRows: [],
    objectSummary: [],
    kpis: { total: 0, type1: 0, type2: 0, type3: 0, trendDelta: 0, trendPct: 0 },
    charts: {},
    sort: { key: 'total', direction: 'desc' },
    page: 1,
    pageSize: 20,
    search: '',
    objectQuery: '',
    periodPreset: 'month',
    period: U.getPeriodRange('month'),
    customStart: '',
    customEnd: '',
    typeFilters: ['all'],
    riskFilters: ['all'],
    lastRenderedAt: '',
    autoUpdateTimer: null
  };

  function getStateForAnalytics() {
    return {
      search: app.search,
      objectQuery: app.objectQuery,
      period: app.period,
      typeFilters: app.typeFilters,
      riskFilters: app.riskFilters,
      sort: app.sort
    };
  }

  function updateView() {
    if (!app.rows.length) {
      UI.renderKpis({ total: 0, type1: 0, type2: 0, type3: 0, trendDelta: 0, trendPct: 0 });
      UI.renderTable([], app);
      return;
    }

    const vm = A.buildAnalytics(app.rows, getStateForAnalytics());
    app.filteredRows = vm.filteredRows;
    app.objectSummary = vm.objectSummary;
    app.kpis = vm.kpis;

    UI.renderKpis(vm.kpis);
    UI.renderTable(vm.objectSummary, app);
    Charts.renderCharts(vm, app);
    UI.renderObjectsDatalist(app.rows.map(r => r.object));
    UI.updateLastSync(`Last sync: ${Data.getLastSync() ? U.formatDateTime(Data.getLastSync()) : 'not synced yet'}`);

    app.lastRenderedAt = new Date().toISOString();
  }

  function resetPagination() {
    app.page = 1;
  }

  function setPeriodPreset(preset) {
    app.periodPreset = preset;
    if (preset === 'custom') {
      const start = app.customStart ? U.dateFromIso(app.customStart) : U.startOfDay(U.addDays(new Date(), -29));
      const end = app.customEnd ? U.dateFromIso(app.customEnd) : U.endOfDay(new Date());
      app.period = U.getPeriodRange('custom', start, end);
    } else {
      app.period = U.getPeriodRange(preset);
    }
    UI.renderPresets(preset);
    resetPagination();
    updateView();
  }

  function setCustomPeriod() {
    const start = app.customStart ? U.dateFromIso(app.customStart) : null;
    const end = app.customEnd ? U.dateFromIso(app.customEnd) : null;
    app.periodPreset = 'custom';
    app.period = U.getPeriodRange('custom', start, end);
    UI.renderPresets('custom');
    resetPagination();
    updateView();
  }

  function setTypeFilters(value) {
    if (value === 'all') {
      app.typeFilters = ['all'];
    } else {
      const current = new Set(app.typeFilters.filter(v => v !== 'all'));
      if (current.has(value)) current.delete(value);
      else current.add(value);
      app.typeFilters = [...current];
      if (!app.typeFilters.length) app.typeFilters = ['all'];
    }
    UI.renderTypes(app.typeFilters);
    resetPagination();
    updateView();
  }

  function setRiskFilters(value) {
    if (value === 'all') {
      app.riskFilters = ['all'];
    } else {
      const current = new Set(app.riskFilters.filter(v => v !== 'all'));
      if (current.has(value)) current.delete(value);
      else current.add(value);
      app.riskFilters = [...current];
      if (!app.riskFilters.length) app.riskFilters = ['all'];
    }
    UI.renderRisks(app.riskFilters);
    resetPagination();
    updateView();
  }

  function sortBy(key) {
    if (app.sort.key === key) {
      app.sort.direction = app.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      app.sort.key = key;
      app.sort.direction = key === 'object' ? 'asc' : 'desc';
    }
    resetPagination();
    updateView();
  }

  function openDetailsForObject(objectName) {
    const rows = app.filteredRows.filter(row => row.object === objectName);
    UI.renderDetailsModal(objectName, rows, app);
  }

  async function loadData(silent = false) {
    if (!silent) UI.setLoading(true, 'Loading data…');

    const url = Data.getSavedSheetUrl();
    const result = await Data.loadIncidents(url);
    app.rows = result.rows || [];
    app.source = result.source;
    app.sourceUrl = result.url || '';

    if (!silent) UI.setLoading(false);
    if (result.error) {
      UI.showToast('Google Sheet unavailable. Demo/cache data loaded.', 'error');
    } else {
      UI.showToast(
        result.source === 'google-sheet' ? 'Data loaded from Google Sheets' : result.source === 'cache' ? 'Data loaded from cache' : 'Demo data loaded',
        'success'
      );
    }

    updateView();
  }

  async function refreshData(silent = false) {
    await loadData(silent);
  }

  function bindEvents() {
    UI.dom.searchInput.addEventListener('input', U.debounce(() => {
      app.search = UI.dom.searchInput.value.trim();
      resetPagination();
      updateView();
    }, 180));

    UI.dom.objectInput.addEventListener('input', U.debounce(() => {
      app.objectQuery = UI.dom.objectInput.value.trim();
      resetPagination();
      updateView();
    }, 180));

    UI.dom.startDate.addEventListener('change', () => {
      app.customStart = UI.dom.startDate.value || '';
      if (app.periodPreset === 'custom') setCustomPeriod();
    });

    UI.dom.endDate.addEventListener('change', () => {
      app.customEnd = UI.dom.endDate.value || '';
      if (app.periodPreset === 'custom') setCustomPeriod();
    });

    UI.dom.periodPresets.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip[data-period]');
      if (!btn) return;
      setPeriodPreset(btn.dataset.period);
    });

    UI.dom.typeFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip[data-type]');
      if (!btn) return;
      setTypeFilters(btn.dataset.type);
    });

    UI.dom.riskFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip[data-risk]');
      if (!btn) return;
      setRiskFilters(btn.dataset.risk);
    });

    UI.dom.tableBody.addEventListener('click', (e) => {
      const rowEl = e.target.closest('tr[data-object]');
      if (!rowEl) return;
      const objectName = rowEl.dataset.object;
      openDetailsForObject(objectName);
    });

    document.querySelector('table thead').addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      sortBy(th.dataset.sort);
    });

    UI.dom.prevPage.addEventListener('click', () => {
      app.page = Math.max(1, app.page - 1);
      updateView();
    });

    UI.dom.nextPage.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(app.objectSummary.length / app.pageSize));
      app.page = Math.min(totalPages, app.page + 1);
      updateView();
    });

    UI.dom.pageSize.addEventListener('change', () => {
      app.pageSize = Number(UI.dom.pageSize.value) || 20;
      resetPagination();
      updateView();
    });

    UI.dom.btnRefresh.addEventListener('click', async () => {
      UI.setLoading(true, 'Refreshing data…');
      try {
        await refreshData(true);
        UI.showToast('Data refreshed', 'success');
      } catch (error) {
        console.error(error);
        UI.showToast('Refresh failed, keeping previous data', 'error');
      } finally {
        UI.setLoading(false);
      }
    });

    UI.dom.btnExportExcel.addEventListener('click', () => {
      Export.exportExcel({
        filteredRows: app.filteredRows,
        objectSummary: app.objectSummary,
        kpis: app.kpis
      }, app);
    });

    UI.dom.btnExportPDF.addEventListener('click', () => {
      Export.exportPDF({
        filteredRows: app.filteredRows,
        objectSummary: app.objectSummary,
        kpis: app.kpis
      }, app);
    });

    UI.dom.btnSource.addEventListener('click', () => {
      UI.renderSourceModal(Data.getSavedSheetUrl());
    });

    UI.dom.btnSaveSource.addEventListener('click', async () => {
      const url = UI.dom.sheetUrlInput.value.trim();
      if (!url) {
        UI.showToast('CSV URL is required', 'error');
        return;
      }
      Data.setSavedSheetUrl(url);
      UI.closeSourceModal();
      UI.setLoading(true, 'Loading Google Sheet…');
      try {
        await refreshData(true);
        UI.showToast('Google Sheet source saved', 'success');
      } catch (error) {
        console.error(error);
        UI.showToast('Failed to load Google Sheet source', 'error');
      } finally {
        UI.setLoading(false);
      }
    });

    UI.dom.btnClearSource.addEventListener('click', async () => {
      Data.setSavedSheetUrl('');
      UI.closeSourceModal();
      UI.setLoading(true, 'Loading demo data…');
      try {
        await refreshData(true);
        UI.showToast('Demo data enabled', 'info');
      } catch (error) {
        console.error(error);
        UI.showToast('Failed to load demo data', 'error');
      } finally {
        UI.setLoading(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        UI.closeModal(UI.dom.detailsModal);
        UI.closeModal(UI.dom.sourceModal);
      }
    });

    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', () => UI.closeModal(UI.dom.detailsModal));
    });

    document.querySelectorAll('[data-close-source]').forEach(el => {
      el.addEventListener('click', () => UI.closeModal(UI.dom.sourceModal));
    });
  }

  async function init() {
    UI.initDom();
    UI.bindModalClose();
    bindEvents();
    UI.renderPresets(app.periodPreset);
    UI.renderTypes(app.typeFilters);
    UI.renderRisks(app.riskFilters);
    UI.dom.startDate.value = app.period.startIso;
    UI.dom.endDate.value = app.period.endIso;
    UI.dom.pageSize.value = String(app.pageSize);

    UI.setLoading(true, 'Loading data…');
    try {
      await loadData(true);
    } catch (error) {
      console.error(error);
      UI.showToast('Failed to render dashboard. Check console for details.', 'error');
    } finally {
      UI.setLoading(false);
    }

    app.autoUpdateTimer = setInterval(async () => {
      UI.setLoading(true, 'Auto-updating…');
      try {
        await refreshData(true);
        UI.showToast('Auto-updated from source', 'info');
      } catch (error) {
        console.error(error);
        UI.showToast('Auto-update failed, keeping previous data', 'error');
      } finally {
        UI.setLoading(false);
      }
    }, 300000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

