(function setupUi(global) {
  function ensureToastWrap() {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }

    return wrap;
  }

  function showToast(message, type = 'success', timeoutMs = 3200) {
    const wrap = ensureToastWrap();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<strong>${type === 'error' ? 'Erro' : 'Info'}</strong><div>${message}</div>`;
    wrap.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, timeoutMs);
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function badge(value) {
    const safe = escapeHtml(value);
    return `<span class="badge badge-${safe}">${safe}</span>`;
  }

  global.UI = {
    showToast,
    formatDateTime,
    escapeHtml,
    badge,
  };
})(window);
