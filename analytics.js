(function () {
  const U = window.IncidentUtils;

  function matchesSearch(row, search) {
    if (!search) return true;
    const haystack = [
      row.object,
      row.category,
      row.comment,
      row.auditNumber,
      row.date
    ].map(U.normalizeText).join(' | ');
    return haystack.includes(search);
  }

  function matchesObjectFilter(row, objectQuery) {
    if (!objectQuery) return true;
    return U.normalizeText(row.object).includes(objectQuery);
  }

  function matchesTypeFilter(row, selectedTypes) {
    if (!selectedTypes.length || selectedTypes.includes('all')) return true;
    return selectedTypes.includes(row.category);
  }

  function filterByBaseCriteria(rows, state, rangeOverride) {
    const period = rangeOverride || state.period;
    const search = U.normalizeText(state.search);
    const objectQuery = U.normalizeText(state.objectQuery);
    const selectedTypes = state.typeFilters || [];

    return rows.filter(row =>
      U.isoInRange(row.date, period.startIso, period.endIso) &&
      matchesSearch(row, search) &&
      matchesObjectFilter(row, objectQuery) &&
      matchesTypeFilter(row, selectedTypes)
    );
  }

  function summarizeByObject(rows) {
    const map = new Map();

    for (const row of rows) {
      const key = row.object;
      if (!map.has(key)) {
        map.set(key, {
          object: key,
          type1: 0,
          type2: 0,
          type3: 0,
          total: 0
        });
      }
      const item = map.get(key);
      if (row.category === U.TYPES[0]) item.type1 += 1;
      if (row.category === U.TYPES[1]) item.type2 += 1;
      if (row.category === U.TYPES[2]) item.type3 += 1;
      item.total += 1;
    }

    return Array.from(map.values()).map(item => ({
      ...item,
      risk: U.riskLevel(item.total)
    }));
  }

  function sortObjectRows(rows, sort) {
    const dir = sort.direction === 'asc' ? 1 : -1;
    const key = sort.key;

    return [...rows].sort((a, b) => {
      let av = a[key];
      let bv = b[key];

      if (key === 'object') {
        av = U.normalizeText(av);
        bv = U.normalizeText(bv);
        return av.localeCompare(bv, 'ru') * dir;
      }

      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });
  }

  function computeKpis(rows, periodRows, previousRows) {
    const counts = {
      total: periodRows.length,
      type1: periodRows.filter(r => r.category === U.TYPES[0]).length,
      type2: periodRows.filter(r => r.category === U.TYPES[1]).length,
      type3: periodRows.filter(r => r.category === U.TYPES[2]).length
    };

    const prev = previousRows.length;
    const trendDelta = counts.total - prev;
    const trendPct = prev === 0 ? (counts.total === 0 ? 0 : 100) : Math.round((trendDelta / prev) * 100);

    return {
      total: counts.total,
      type1: counts.type1,
      type2: counts.type2,
      type3: counts.type3,
      trendDelta,
      trendPct
    };
  }

  function groupByDate(rows, startIso, endIso) {
    const map = new Map();
    const start = U.dateFromIso(startIso);
    const end = U.dateFromIso(endIso);
    if (!start || !end) return { labels: [], values: [] };

    for (let d = new Date(start); d <= end; d = U.addDays(d, 1)) {
      const iso = U.toIsoDate(d);
      map.set(iso, 0);
    }

    rows.forEach(row => {
      if (map.has(row.date)) map.set(row.date, map.get(row.date) + 1);
    });

    const labels = Array.from(map.keys()).map(U.getDateLabelFromIso);
    const values = Array.from(map.values());
    return { labels, values };
  }

  function groupByWeek(rows) {
    const map = new Map();
    for (const row of rows) {
      const key = U.getWeekKey(row.date);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }

    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      labels: entries.map(([key]) => {
        const start = U.dateFromIso(key);
        const end = U.addDays(start, 6);
        return `${U.formatDateShort(key)}–${U.formatDateShort(U.toIsoDate(end))}`;
      }),
      values: entries.map(([, value]) => value)
    };
  }

  function groupByMonth(rows) {
    const map = new Map();
    for (const row of rows) {
      const key = U.getMonthKey(row.date);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      labels: entries.map(([key]) => U.getMonthLabel(key)),
      values: entries.map(([, value]) => value)
    };
  }

  function distributionByType(rows) {
    const counts = {
      [U.TYPES[0]]: 0,
      [U.TYPES[1]]: 0,
      [U.TYPES[2]]: 0
    };
    for (const row of rows) counts[row.category] += 1;
    return {
      labels: U.TYPES.map(U.typeShortName),
      values: U.TYPES.map(type => counts[type])
    };
  }

  function topObjects(rows, limit = 10) {
    return summarizeByObject(rows)
      .sort((a, b) => b.total - a.total || a.object.localeCompare(b.object, 'ru'))
      .slice(0, limit);
  }

  function getRiskFilteredRows(baseRows, selectedRisks) {
    if (!selectedRisks || !selectedRisks.length || selectedRisks.includes('all')) return baseRows;
    const summary = summarizeByObject(baseRows);
    const accepted = new Set(summary.filter(item => selectedRisks.includes(item.risk.key)).map(item => item.object));
    return baseRows.filter(row => accepted.has(row.object));
  }

  function buildAnalytics(rows, state) {
    const periodRows = filterByBaseCriteria(rows, state, state.period);
    const riskFilteredRows = getRiskFilteredRows(periodRows, state.riskFilters);

    const prevRange = U.previousRange(state.period.startIso, state.period.endIso);
    const previousRows = prevRange ? filterByBaseCriteria(rows, state, prevRange) : [];

    const filteredRows = riskFilteredRows;
    const objectSummary = summarizeByObject(filteredRows);
    const sortedSummary = sortObjectRows(objectSummary, state.sort);

    const kpis = computeKpis(rows, filteredRows, previousRows);
    const daily = groupByDate(filteredRows, state.period.startIso, state.period.endIso);
    const weekly = groupByWeek(filteredRows);
    const monthly = groupByMonth(filteredRows);
    const distribution = distributionByType(filteredRows);
    const top = topObjects(filteredRows, 10);

    return {
      periodRows,
      previousRows,
      filteredRows,
      objectSummary: sortedSummary,
      kpis,
      charts: {
        daily,
        weekly,
        monthly,
        distribution,
        top
      }
    };
  }

  function sortRows(rows, sort) {
    const dir = sort.direction === 'asc' ? 1 : -1;
    const key = sort.key;

    const comparator = (a, b) => {
      if (key === 'object') {
        return a.object.localeCompare(b.object, 'ru') * dir;
      }
      if (key === 'type1' || key === 'type2' || key === 'type3' || key === 'total') {
        return ((a[key] || 0) - (b[key] || 0)) * dir;
      }
      return 0;
    };

    return [...rows].sort(comparator);
  }

  window.IncidentAnalytics = {
    filterByBaseCriteria,
    summarizeByObject,
    sortObjectRows,
    computeKpis,
    groupByDate,
    groupByWeek,
    groupByMonth,
    distributionByType,
    topObjects,
    getRiskFilteredRows,
    buildAnalytics,
    sortRows
  };
})();

