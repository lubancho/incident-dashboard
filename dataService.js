(function () {
  const U = window.IncidentUtils;

  const STORAGE_KEYS = {
    sheetUrl: 'incident_dashboard_sheet_url',
    cachedRows: 'incident_dashboard_cached_rows',
    cachedSource: 'incident_dashboard_cached_source',
    lastSync: 'incident_dashboard_last_sync'
  };

  function makeDateOffset(daysAgo) {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return U.toIsoDate(d);
  }

  function buildDemoRows() {
    const base = [
      [0, 'Фулфилмент-1', 'Невыход на работу', 'Сотрудник не вышел в смену', 'A-10001'],
      [1, 'Фулфилмент-1', 'Качество уборки', 'Пыль в зоне отгрузки', 'A-10002'],
      [2, 'Фулфилмент-2', 'Менеджер не посещал объект более 7 дней', 'Отсутствие визита 8 дней', 'A-10003'],
      [2, 'Фулфилмент-3', 'Качество уборки', 'Некачественная уборка санзоны', 'A-10004'],
      [3, 'Фулфилмент-2', 'Невыход на работу', 'Не вышел старший смены', 'A-10005'],
      [4, 'Сортировочный центр-1', 'Качество уборки', 'Скопление мусора у рампы', 'A-10006'],
      [5, 'Сортировочный центр-1', 'Менеджер не посещал объект более 7 дней', 'Нет контроля более недели', 'A-10007'],
      [6, 'Фулфилмент-4', 'Качество уборки', 'Полы после уборки скользкие', 'A-10008'],
      [7, 'Фулфилмент-5', 'Невыход на работу', 'Смена закрыта с опозданием', 'A-10009'],
      [8, 'Фулфилмент-3', 'Менеджер не посещал объект более 7 дней', 'Плановый визит не выполнен', 'A-10010'],
      [9, 'Сортировочный центр-2', 'Качество уборки', 'Влажная уборка пропущена', 'A-10011'],
      [10, 'Фулфилмент-6', 'Невыход на работу', 'Нет оператора участка', 'A-10012'],
      [12, 'Фулфилмент-1', 'Менеджер не посещал объект более 7 дней', 'Последний визит был 9 дней назад', 'A-10013'],
      [12, 'Сортировочный центр-3', 'Качество уборки', 'Нарушение графика уборки', 'A-10014'],
      [13, 'Фулфилмент-4', 'Качество уборки', 'Пыль на стеллажах', 'A-10015'],
      [14, 'Фулфилмент-2', 'Невыход на работу', 'Отсутствие ночной смены', 'A-10016'],
      [15, 'Сортировочный центр-2', 'Менеджер не посещал объект более 7 дней', 'Не был на объекте 10 дней', 'A-10017'],
      [16, 'Фулфилмент-5', 'Качество уборки', 'Не убраны проходы', 'A-10018'],
      [17, 'Фулфилмент-6', 'Невыход на работу', 'Бригадир не вышел', 'A-10019'],
      [18, 'Фулфилмент-3', 'Качество уборки', 'Замечания по санитарной зоне', 'A-10020'],
      [19, 'Сортировочный центр-1', 'Невыход на работу', 'Смена недоукомплектована', 'A-10021'],
      [20, 'Сортировочный центр-3', 'Менеджер не посещал объект более 7 дней', 'Не было визита 8 дней', 'A-10022'],
      [21, 'Фулфилмент-1', 'Качество уборки', 'Пропуск уборки в зоне упаковки', 'A-10023'],
      [22, 'Фулфилмент-2', 'Качество уборки', 'Загрязнение в коридоре', 'A-10024'],
      [24, 'Фулфилмент-4', 'Невыход на работу', 'Нет комплектовщика', 'A-10025'],
      [25, 'Фулфилмент-5', 'Менеджер не посещал объект более 7 дней', 'Отсутствие регулярного контроля', 'A-10026'],
      [26, 'Фулфилмент-6', 'Качество уборки', 'Пыль и мусор у доков', 'A-10027'],
      [27, 'Сортировочный центр-2', 'Невыход на работу', 'Сотрудник не вышел на линию', 'A-10028'],
      [28, 'Сортировочный центр-3', 'Качество уборки', 'Нарушения по чистоте санузлов', 'A-10029'],
      [30, 'Фулфилмент-1', 'Невыход на работу', 'Проблема с закрытием смены', 'A-10030'],
      [31, 'Фулфилмент-2', 'Менеджер не посещал объект более 7 дней', 'Контроль отсутствует 11 дней', 'A-10031'],
      [33, 'Фулфилмент-3', 'Невыход на работу', 'Не укомплектована утренняя смена', 'A-10032'],
      [35, 'Фулфилмент-4', 'Качество уборки', 'Следы грязи в производственной зоне', 'A-10033'],
      [40, 'Фулфилмент-5', 'Качество уборки', 'Периодическая уборка с нарушениями', 'A-10034'],
      [42, 'Сортировочный центр-1', 'Менеджер не посещал объект более 7 дней', 'Нет визита 8+ дней', 'A-10035'],
      [45, 'Сортировочный центр-2', 'Качество уборки', 'Загрязнение в зоне приема', 'A-10036'],
      [50, 'Фулфилмент-6', 'Невыход на работу', 'Не вышел ключевой сотрудник', 'A-10037'],
      [55, 'Фулфилмент-2', 'Качество уборки', 'Нарушен график генеральной уборки', 'A-10038']
    ];

    return base.map(([offset, object, category, comment, auditNumber]) => ({
      date: makeDateOffset(offset),
      object,
      category,
      comment,
      auditNumber
    }));
  }

  function findField(row, candidates) {
    const entries = Object.entries(row || {});
    for (const candidate of candidates) {
      const normalizedCandidate = U.normalizeKey(candidate);
      const found = entries.find(([key]) => U.normalizeKey(key) === normalizedCandidate);
      if (found) return found[1];
    }
    return '';
  }

  function normalizeRow(raw) {
    const date = U.toIsoDate(findField(raw, ['Дата', 'date', 'Date']));
    const object = String(findField(raw, ['Объект', 'object', 'Object']) || '').trim();
    const categoryRaw = String(findField(raw, ['Категория', 'category', 'Category']) || '').trim();
    const category = U.incidentTypeFromCategory(categoryRaw);
    const comment = String(findField(raw, ['Комментарий', 'comment', 'Comment']) || '').trim();
    const auditNumber = String(findField(raw, ['Номер проверки', 'auditNumber', 'Audit number', 'AuditNumber']) || '').trim();

    if (!date || !object || !category) return null;

    return {
      date,
      object,
      category,
      comment,
      auditNumber
    };
  }

  function parseCsvRows(csvText) {
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false
    });

    if (parsed.errors && parsed.errors.length) {
      const fatal = parsed.errors.find(err => err.fatal);
      if (fatal) throw new Error(fatal.message || 'CSV parse error');
    }

    return (parsed.data || []).map(normalizeRow).filter(Boolean);
  }

  async function fetchFromSheet(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }
    const text = await response.text();
    return parseCsvRows(text);
  }

  function saveCache(rows, source) {
    localStorage.setItem(STORAGE_KEYS.cachedRows, JSON.stringify(rows));
    localStorage.setItem(STORAGE_KEYS.cachedSource, source || '');
    localStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.cachedRows);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return null;
      return data.filter(row => row && row.date && row.object && row.category);
    } catch {
      return null;
    }
  }

  function getSavedSheetUrl() {
    return localStorage.getItem(STORAGE_KEYS.sheetUrl) || '';
  }

  function setSavedSheetUrl(url) {
    if (url) localStorage.setItem(STORAGE_KEYS.sheetUrl, url);
    else localStorage.removeItem(STORAGE_KEYS.sheetUrl);
  }

  function getLastSync() {
    return localStorage.getItem(STORAGE_KEYS.lastSync) || '';
  }

  async function loadIncidents(sourceUrl) {
    const url = sourceUrl || getSavedSheetUrl();

    if (url) {
      try {
        const rows = await fetchFromSheet(url);
        rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.object.localeCompare(b.object, 'ru')));
        saveCache(rows, url);
        return { rows, source: 'google-sheet', url };
      } catch (error) {
        const cached = loadCache();
        if (cached && cached.length) {
          return { rows: cached, source: 'cache', url };
        }
        return { rows: buildDemoRows(), source: 'demo-fallback', url, error };
      }
    }

    const cached = loadCache();
    if (cached && cached.length) {
      return { rows: cached, source: 'cache', url: '' };
    }

    return { rows: buildDemoRows(), source: 'demo', url: '' };
  }

  window.IncidentDataService = {
    STORAGE_KEYS,
    buildDemoRows,
    parseCsvRows,
    loadIncidents,
    saveCache,
    loadCache,
    getSavedSheetUrl,
    setSavedSheetUrl,
    getLastSync
  };
})();

