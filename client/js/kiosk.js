(function initKioskPage() {
  const feed = document.getElementById('kiosk-feed');
  if (!feed) return;

  async function sendEvent(eventType) {
    const matricula = document.getElementById('kiosk-matricula').value.trim();
    const method = document.getElementById('kiosk-method').value;

    if (!matricula) {
      UI.showToast('Informe a matricula', 'error');
      return;
    }

    try {
      await Api.request('/api/admin/kiosk/events', {
        method: 'POST',
        body: {
          student_matricula: matricula,
          event_type: eventType,
          method,
        },
      });

      UI.showToast(`Evento ${eventType} registrado`, 'success');
      document.getElementById('kiosk-matricula').value = '';
      await loadFeed();
    } catch (error) {
      UI.showToast(error.message, 'error');
    }
  }

  function renderFeed(events) {
    feed.innerHTML = events
      .slice(0, 50)
      .map(
        (item) => `
          <div class="feed-item">
            <div>
              <strong>${UI.escapeHtml(item.student_nome || '-')}</strong>
              <div><small>${UI.escapeHtml(item.matricula || '-')}</small></div>
            </div>
            <div>
              <div>${UI.badge(item.event_type)}</div>
              <small>${UI.formatDateTime(item.event_time)}</small>
            </div>
          </div>
        `
      )
      .join('');
  }

  async function loadFeed() {
    const response = await Api.request('/api/admin/logs');
    renderFeed(response.data?.events || []);
  }

  function bind() {
    document.getElementById('kiosk-in').addEventListener('click', () => sendEvent('IN'));
    document.getElementById('kiosk-out').addEventListener('click', () => sendEvent('OUT'));

    document.getElementById('kiosk-logout').addEventListener('click', async () => {
      try {
        await Api.request('/api/auth/logout', { method: 'POST' });
      } catch {
        // session may already be expired
      }
      window.location.href = '/login.html';
    });
  }

  async function bootstrap() {
    try {
      const user = await Api.getSession();
      if (user.role !== 'ADMIN') {
        UI.showToast('Acesso permitido apenas para admin.', 'error');
        setTimeout(() => {
          window.location.href = '/teacher.html';
        }, 1000);
        return;
      }

      bind();
      await loadFeed();
      setInterval(() => {
        loadFeed().catch(() => {});
      }, 7000);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        UI.showToast('Acesso negado. Faca login como admin.', 'error');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1000);
        return;
      }

      UI.showToast(error.message, 'error');
    }
  }

  bootstrap();
})();

