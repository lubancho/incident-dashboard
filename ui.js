(function () {
  const U = window.IncidentUtils;

  function byId(id) {
    return document.getElementById(id);
  }

  const dom = {
    searchInput: null,
    objectInput: null,
    objectsList: null,
    periodPresets: null,
    customDates: null,
    startDate: null,
    endDate: null,
    typeFilters: null,
    riskFilters: null,
    kpiGrid: null,
    tableBody: null,
    tableMeta: null,
    paginationInfo: null,
    pageSize: null,
    prevPage: null,
    nextPage: null,
    detailsModal: null,
    detailsBody: null,
    modalTitle: null,
    modalSubtitle: null,
    detailsSummary: null,
    sourceModal: null,
    sheetUrlInput: null,
    btnRefresh: null,
    btnExportExcel: null,
    btnExportPDF: null,
    btnSource: null,
    btnSaveSource: null,
    btnClearSource: null,
    loadingLayer: null,
    loadingText: null,
    toast: null
  };

  function initDom() {
    Object.keys(dom).forEach(key => {
      dom[key] = byId({
        searchInput: 'searchInput',
        objectInput: 'objectInput',
        objectsList: 'objectsList',
        periodPresets: 'periodPresets',
        customDates: 'customDates',
        startDate: 'startDate',
        endDate: 'endDate',
        typeFilters: 'typeFilters',
        riskFilters: 'riskFilters',
        kpiGrid: 'kpiGrid',
        tableBody: 'tableBody',
        tableMeta: 'tableMeta',
        paginationInfo: 'paginationInfo',
        pageSize: 'pageSize',
        prevPage: 'prevPage',
        nextPage: 'nextPage',
        detailsModal: 'detailsModal',
        detailsBody: 'detailsBody',
        modalTitle: 'modalTitle',
        modalSubtitle: 'modalSubtitle',
        detailsSummary: 'detailsSummary',
        sourceModal: 'sourceModal',
        sheetUrlInput: 'sheetUrlInput',
        btnRefresh: 'btnRefresh',
        btnExportExcel: 'btnExportExcel',
        btnExportPDF: 'btnExportPDF',
        btnSource: 'btnSource',
        btnSaveSource: 'btnSaveSource',
        btnClearSource: 'btnClearSource',
        loadingLayer: 'loadingLayer',
        loadingText: 'loadingText',
        toast: 'toast'
      }[key]);
    });
    return dom;
  }

  function setLoading(visible, text) {
    if (dom.loadingLayer) dom.loadingLayer.classList.toggle('is-visible', !!visible);
    if (dom.loadingText && text) dom.loadingText.textContent = text;
  }

  function showToast(message, type = 'info') {
    const item = document.createElement('div');
    item.className = `toast__item toast__item--${type}`;
    item.textContent = message;
    dom.toast.appendChild(item);
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(8px)';
      item.style.transition = 'opacity .2s ease, transform .2s ease';
    }, 2500);
    setTimeout(() => item.remove(), 2900);
  }

  function renderPresets(selectedPeriod) {
    dom.periodPresets.querySelectorAll('.chip').forEach(btn => {
      btn.classList.toggle('chip--active', btn.dataset.period === selectedPeriod);
    });
    dom.customDates.style.display = selectedPeriod === 'custom' ? 'flex' : 'none';
  }

  function renderTypes(selectedTypes) {
    const allSelected = !selectedTypes.length || selectedTypes.includes('all');
    dom.typeFilters.querySelectorAll('.chip').forEach(btn => {
      const value = btn.dataset.type;
      btn.classList.toggle('chip--active', allSelected ? value === 'all' : selectedTypes.includes(value));
    });
  }

  function renderRisks(selectedRisks) {
    const allSelected = !selectedRisks.length || selectedRisks.includes('all');
    dom.riskFilters.querySelectorAll('.chip').forEach(btn => {
      const value = btn.dataset.risk;
      btn.classList.toggle('chip--active', allSelected ? value === 'all' : selectedRisks.includes(value));
    });
  }

  function renderObjectsDatalist(objects) {
    dom.objectsList.innerHTML = '';
    const uniq = [...new Set(objects)].sort((a, b) => a.localeCompare(b, 'ru'));
    uniq.forEach(object => {
      const option = document.createElement('option');
      option.value = object;
      dom.objectsList.appendChild(option);
    });
  }

  function renderKpis(kpis) {
    const trendClass = kpis.trendDelta > 0 ? 'trend--up' : kpis.trendDelta < 0 ? 'trend--down' : 'trend--flat';
    const trendSign = kpis.trendDelta > 0 ? '+' : '';
    dom.kpiGrid.innerHTML = `
      <article class="kpi">
        <div class="kpi__label">Total incidents</div>
        <div class="kpi__value">${U.formatNumber(kpis.total)}</div>
        <div class="kpi__sub">Current period</div>
      </article>
      <article class="kpi">
        <div class="kpi__label">Невыход</div>
        <div class="kpi__value">${U.formatNumber(kpis.type1)}</div>
        <div class="kpi__sub">Невыход на работу</div>
      </article>
      <article class="kpi">
        <div class="kpi__label">&gt;7 дней</div>
        <div class="kpi__value">${U.formatNumber(kpis.type2)}</div>
        <div class="kpi__sub">Менеджер не посещал объект более 7 дней</div>
      </article>
      <article class="kpi">
        <div class="kpi__label">Качество</div>
        <div class="kpi__value">${U.formatNumber(kpis.type3)}</div>
        <div class="kpi__sub">Качество уборки</div>
      </article>
      <article class="kpi">
        <div class="kpi__label">Trend vs previous period</div>
        <div class="kpi__value">${trendSign}${U.formatNumber(kpis.trendDelta)}</div>
        <div class="kpi__trend ${trendClass}">${trendSign}${U.formatNumber(kpis.trendDelta)} (${kpis.trendPct}%)</div>
        <div class="kpi__sub">Previous period comparison</div>
      </article>
    `;
  }

  function renderTable(tableRows, state) {
    const pageSize = state.pageSize;
    const total = tableRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    state.page = U.clamp(state.page, 1, totalPages);

    const start = (state.page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const pageRows = tableRows.slice(start, end);

    const sortIndicator = (key) => {
      if (state.sort.key !== key) return '';
      return state.sort.direction === 'asc' ? '▲' : '▼';
    };

    document.querySelectorAll('th[data-sort]').forEach(th => {
      const key = th.dataset.sort;
      th.querySelector('.sort-indicator').textContent = sortIndicator(key);
    });

    dom.tableBody.innerHTML = pageRows.map(row => `
      <tr class="${row.risk.rowCls}" data-object="${U.escapeHtml(row.object)}">
        <td>
          <div class="object-cell">
            <div class="object-name">${U.escapeHtml(row.object)}</div>
            <span class="risk-pill ${row.risk.cls}">${row.risk.label}</span>
          </div>
        </td>
        <td>${U.formatNumber(row.type1)}</td>
        <td>${U.formatNumber(row.type2)}</td>
        <td>${U.formatNumber(row.type3)}</td>
        <td><strong>${U.formatNumber(row.total)}</strong></td>
      </tr>
    `).join('');

    dom.tableMeta.textContent = `${U.formatNumber(total)} objects matched`;
    dom.paginationInfo.textContent = total
      ? `Showing ${U.formatNumber(start + 1)}–${U.formatNumber(end)} of ${U.formatNumber(total)}`
      : 'No rows found';

    dom.prevPage.disabled = state.page <= 1;
    dom.nextPage.disabled = state.page >= totalPages;
  }

  function renderDetailsModal(objectName, rows, state) {
    const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
    const typeCount = {
      type1: sorted.filter(r => r.category === U.TYPES[0]).length,
      type2: sorted.filter(r => r.category === U.TYPES[1]).length,
      type3: sorted.filter(r => r.category === U.TYPES[2]).length
    };
    const risk = U.riskLevel(sorted.length);

    dom.modalTitle.textContent = objectName;
    dom.modalSubtitle.textContent = `${sorted.length} incidents in current filters`;
    dom.detailsSummary.innerHTML = `
      <div class="details-summary__item">
        <div class="details-summary__label">Total</div>
        <div class="details-summary__value">${U.formatNumber(sorted.length)}</div>
      </div>
      <div class="details-summary__item">
        <div class="details-summary__label">Невыход</div>
        <div class="details-summary__value">${U.formatNumber(typeCount.type1)}</div>
      </div>
      <div class="details-summary__item">
        <div class="details-summary__label">&gt;7 дней</div>
        <div class="details-summary__value">${U.formatNumber(typeCount.type2)}</div>
      </div>
      <div class="details-summary__item">
        <div class="details-summary__label">Качество</div>
        <div class="details-summary__value">${U.formatNumber(typeCount.type3)}</div>
      </div>
    `;

    dom.detailsBody.innerHTML = sorted.map(row => `
      <tr>
        <td>${U.formatDateShort(row.date)}</td>
        <td>${U.escapeHtml(row.category)}</td>
        <td>${U.escapeHtml(row.comment || '')}</td>
        <td>${U.escapeHtml(row.auditNumber || '')}</td>
      </tr>
    `).join('');

    openModal(dom.detailsModal);
  }

  function openModal(el) {
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
  }

  function closeModal(el) {
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }

  function renderSourceModal(currentUrl) {
    dom.sheetUrlInput.value = currentUrl || '';
    openModal(dom.sourceModal);
  }

  function closeSourceModal() {
    closeModal(dom.sourceModal);
  }

  function updateLastSync(text) {
    const meta = document.querySelector('.topbar .brand__text p');
    if (meta) meta.textContent = text;
  }

  function bindModalClose() {
    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', () => closeModal(dom.detailsModal));
    });
    document.querySelectorAll('[data-close-source]').forEach(el => {
      el.addEventListener('click', () => closeSourceModal());
    });
  }

  window.IncidentUI = {
    dom,
    initDom,
    setLoading,
    showToast,
    renderPresets,
    renderTypes,
    renderRisks,
    renderObjectsDatalist,
    renderKpis,
    renderTable,
    renderDetailsModal,
    renderSourceModal,
    closeSourceModal,
    openModal,
    closeModal,
    bindModalClose,
    updateLastSync
  };
})();

