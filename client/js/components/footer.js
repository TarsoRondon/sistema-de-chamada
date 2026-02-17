(function initFooter(global) {
  function createFooterMarkup(appName) {
    return `
      <div class="app-footer__left">
        <span>${appName} • v1.0 • © 2026 • IFRO</span>
      </div>
      <div class="app-footer__links">
        <a href="https://github.com/TarsoRondon/sistema-de-chamada" target="_blank" rel="noreferrer">GitHub</a>
        <a href="mailto:suporte@sistema.local">Suporte</a>
      </div>
      <div class="app-footer__status">
        <span class="status-dot" data-api-dot></span>
        <span data-api-status>Verificando API...</span>
      </div>
    `;
  }

  async function checkApiStatus(footerEl) {
    const dot = footerEl.querySelector('[data-api-dot]');
    const text = footerEl.querySelector('[data-api-status]');

    try {
      const response = await global.AppApi.get('/health/ready', { timeoutMs: 5000 });
      if (response?.ok) {
        dot.className = 'status-dot is-online';
        text.textContent = 'API Online';
        return;
      }

      dot.className = 'status-dot is-offline';
      text.textContent = 'API Offline';
    } catch {
      dot.className = 'status-dot is-offline';
      text.textContent = 'API Offline';
    }
  }

  function renderFooter({ appName = 'Sistema de Chamada', mountSelector = '[data-app-footer]' } = {}) {
    const mount = document.querySelector(mountSelector);
    if (!mount) return;

    mount.classList.add('app-footer');
    mount.innerHTML = createFooterMarkup(appName);
    checkApiStatus(mount);

    const timer = setInterval(() => checkApiStatus(mount), 30000);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  global.AppFooter = {
    renderFooter,
  };
})(window);
