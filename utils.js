(function () {
  const TYPES = [
    'Невыход на работу',
    'Менеджер не посещал объект более 7 дней',
    'Качество уборки'
  ];

  const RISK_META = {
    green: { label: 'Green', cls: 'risk-pill--green', rowCls: 'is-risk-green' },
    yellow: { label: 'Yellow', cls: 'risk-pill--yellow', rowCls: 'is-risk-yellow' },
    red: { label: 'Red', cls: 'risk-pill--red', rowCls: 'is-risk-red' }
  };

  const ruDateTime = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const ruDateLong = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const ruDateTimeFull = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  function normalizeText(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ');
  }

  function normalizeKey(value) {
    return normalizeText(value)
      .replace(/[^\p{L}\p{N}]+/gu, '');
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function toIsoDate(value) {
    if (value == null || value === '') return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const y = value.getFullYear();
      const m = pad2(value.getMonth() + 1);
      const d = pad2(value.getDate());
      return `${y}-${m}-${d}`;
    }

    const text = String(value).trim();

    const ddmmyyyy = text.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (ddmmyyyy) {
      const day = Number(ddmmyyyy[1]);
      const month = Number(ddmmyyyy[2]) - 1;
      let year = Number(ddmmyyyy[3]);
      if (year < 100) year += year >= 70 ? 1900 : 2000;
      const date = new Date(year, month, day);
      if (!Number.isNaN(date.getTime())) return toIsoDate(date);
    }

    const iso = text.match(/^(\d{4})[.\-/](\d{2})[.\-/](\d{2})(?:[ T].*)?$/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return toIsoDate(parsed);

    return '';
  }

  function dateFromIso(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function formatDateShort(iso) {
    const dt = dateFromIso(iso);
    return dt ? ruDateTime.format(dt) : '';
  }

  function formatDateLong(iso) {
    const dt = dateFromIso(iso);
    return dt ? ruDateLong.format(dt) : '';
  }

  function formatDateTime(value) {
    if (!value) return '';
    const dt = value instanceof Date ? value : new Date(value);
    return Number.isNaN(dt.getTime()) ? '' : ruDateTimeFull.format(dt);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  function addDays(date, amount) {
    const d = new Date(date);
    d.setDate(d.getDate() + amount);
    return d;
  }

  function toIsoDateFromDate(date) {
    return toIsoDate(startOfDay(date));
  }

  function getPeriodRange(preset, customStart, customEnd) {
    const today = startOfDay(new Date());
    let start = today;
    let end = endOfDay(today);

    if (preset === 'today') {
      start = today;
      end = endOfDay(today);
    } else if (preset === 'week') {
      start = startOfDay(addDays(today, -6));
      end = endOfDay(today);
    } else if (preset === 'month') {
      start = startOfDay(addDays(today, -29));
      end = endOfDay(today);
    } else if (preset === 'custom') {
      const s = customStart ? startOfDay(customStart) : startOfDay(addDays(today, -29));
      const e = customEnd ? endOfDay(customEnd) : endOfDay(today);
      start = s <= e ? s : e;
      end = e >= s ? e : s;
    }

    return {
      start,
      end,
      startIso: toIsoDateFromDate(start),
      endIso: toIsoDateFromDate(end)
    };
  }

  function previousRange(startIso, endIso) {
    const start = dateFromIso(startIso);
    const end = dateFromIso(endIso);
    if (!start || !end) return null;

    const span = Math.max(1, Math.round((endOfDay(end) - startOfDay(start)) / 86400000) + 1);
    const prevEnd = addDays(startOfDay(start), -1);
    const prevStart = addDays(prevEnd, -(span - 1));
    return {
      start: prevStart,
      end: prevEnd,
      startIso: toIsoDateFromDate(prevStart),
      endIso: toIsoDateFromDate(prevEnd)
    };
  }

  function incidentTypeFromCategory(category) {
    const raw = normalizeText(category);
    if (!raw) return '';
    if (raw === normalizeText(TYPES[0]) || raw.includes('невыход')) return TYPES[0];
    if (raw === normalizeText(TYPES[1]) || (raw.includes('7') && raw.includes('дн'))) return TYPES[1];
    if (raw === normalizeText(TYPES[2]) || raw.includes('качество')) return TYPES[2];
    return '';
  }

  function typeShortName(type) {
    if (type === TYPES[0]) return 'Невыход';
    if (type === TYPES[1]) return '>7 дней';
    if (type === TYPES[2]) return 'Качество';
    return type;
  }

  function riskLevel(count) {
    const value = Number(count) || 0;
    if (value >= 6) return { key: 'red', ...RISK_META.red };
    if (value >= 3) return { key: 'yellow', ...RISK_META.yellow };
    return { key: 'green', ...RISK_META.green };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function debounce(fn, delay = 250) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function isoInRange(iso, startIso, endIso) {
    if (!iso) return false;
    return iso >= startIso && iso <= endIso;
  }

  function getWeekKey(iso) {
    const d = dateFromIso(iso);
    if (!d) return '';
    const dt = startOfDay(d);
    const day = (dt.getDay() + 6) % 7;
    dt.setDate(dt.getDate() - day);
    return toIsoDateFromDate(dt);
  }

  function getMonthKey(iso) {
    if (!iso) return '';
    return iso.slice(0, 7);
  }

  function getDateLabelFromIso(iso) {
    const d = dateFromIso(iso);
    return d ? new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(d) : iso;
  }

  function getMonthLabel(monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
  }

  window.IncidentUtils = {
    TYPES,
    normalizeText,
    normalizeKey,
    toIsoDate,
    toIsoDateFromDate,
    dateFromIso,
    formatDateShort,
    formatDateLong,
    formatDateTime,
    formatNumber,
    escapeHtml,
    startOfDay,
    endOfDay,
    addDays,
    getPeriodRange,
    previousRange,
    incidentTypeFromCategory,
    typeShortName,
    riskLevel,
    clamp,
    debounce,
    isoInRange,
    getWeekKey,
    getMonthKey,
    getDateLabelFromIso,
    getMonthLabel
  };
})();

