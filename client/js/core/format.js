(function initFormat(global) {
  const defaultTimeZone = global.APP_TIMEZONE || 'America/Sao_Paulo';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateTime(value, opts = {}) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: opts.withSeconds ? '2-digit' : undefined,
      hour12: false,
      timeZone: opts.timeZone || defaultTimeZone,
    }).format(date);
  }

  function formatDate(value, opts = {}) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: opts.timeZone || defaultTimeZone,
    }).format(date);
  }

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
  }

  global.AppFormat = {
    escapeHtml,
    formatDateTime,
    formatDate,
    normalizeText,
  };
})(window);
