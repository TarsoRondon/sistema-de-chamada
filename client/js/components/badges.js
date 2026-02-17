(function initBadges(global) {
  const STATUS_CLASS_MAP = {
    PRESENTE: 'success',
    PRESENT: 'success',
    PROCESSED: 'success',
    SENT: 'success',
    ATIVO: 'success',
    IN: 'success',

    ATRASADO: 'warning',
    LATE: 'warning',
    PENDING: 'warning',

    AUSENTE: 'danger',
    FAILED: 'danger',
    INATIVO: 'danger',
    ERROR: 'danger',

    SAIU: 'info',
    LEFT: 'info',
    OUT: 'info',
    IGNORED_DUPLICATE: 'info',
    RECEIVED: 'info',
  };

  function statusBadge(value) {
    const text = String(value || '-');
    const key = global.AppFormat.normalizeText(text);
    const variant = STATUS_CLASS_MAP[key] || 'neutral';
    return `<span class="badge badge--${variant}">${global.AppFormat.escapeHtml(text)}</span>`;
  }

  global.AppBadges = {
    statusBadge,
  };
})(window);
