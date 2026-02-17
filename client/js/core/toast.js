(function initToast(global) {
  function ensureWrap() {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      wrap.setAttribute('aria-live', 'polite');
      wrap.setAttribute('aria-atomic', 'true');
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function show(message, type = 'info', timeoutMs = 4200) {
    const wrap = ensureWrap();
    const toast = document.createElement('article');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-title">${type === 'error' ? 'Erro' : type === 'success' ? 'Sucesso' : 'Aviso'}</div>
      <div class="toast-message"></div>
      <button type="button" class="toast-close" aria-label="Fechar">×</button>
    `;

    toast.querySelector('.toast-message').textContent = message;
    wrap.appendChild(toast);

    const remove = () => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 180);
    };

    toast.querySelector('.toast-close').addEventListener('click', remove);

    if (timeoutMs > 0) {
      setTimeout(remove, timeoutMs);
    }
  }

  global.AppToast = {
    show,
    success: (message, timeoutMs) => show(message, 'success', timeoutMs),
    error: (message, timeoutMs) => show(message, 'error', timeoutMs),
    info: (message, timeoutMs) => show(message, 'info', timeoutMs),
    warn: (message, timeoutMs) => show(message, 'warn', timeoutMs),
  };
})(window);
