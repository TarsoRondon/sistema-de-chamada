(function initKioskPage() {
  const root = document.querySelector('[data-page="kiosk"]');
  if (!root) return;

  async function loadFeed() {
    const response = await AppApi.get('/api/admin/logs');
    const events = (response.data?.events || []).slice(0, 40);

    const target = document.getElementById('kiosk-feed');
    target.innerHTML = events
      .map(
        (row) => `
          <div class="feed-item">
            <div>
              <strong>${AppFormat.escapeHtml(row.student_nome || '-')}</strong>
              <small>${AppFormat.escapeHtml(row.matricula || '-')}</small>
            </div>
            <div class="feed-item__meta">
              ${AppBadges.statusBadge(row.event_type)}
              <small>${AppFormat.formatDateTime(row.event_time, { withSeconds: true })}</small>
            </div>
          </div>
        `
      )
      .join('');
  }

  async function sendEvent(eventType) {
    const matriculaEl = document.getElementById('kiosk-matricula');
    const methodEl = document.getElementById('kiosk-method');
    const reasonEl = document.getElementById('kiosk-reason');

    const matricula = matriculaEl.value.trim();
    if (!matricula) {
      AppToast.warn('Informe a matricula.');
      matriculaEl.focus();
      return;
    }

    await AppApi.post('/api/admin/kiosk/events', {
      student_matricula: matricula,
      event_type: eventType,
      method: methodEl.value,
      motivo: reasonEl.value.trim() || undefined,
    });

    AppToast.success(`Evento ${eventType} registrado.`);
    matriculaEl.value = '';
    reasonEl.value = '';
    await loadFeed();
  }

  function bindEvents() {
    document.getElementById('kiosk-in').addEventListener('click', () => {
      sendEvent('IN').catch((error) => AppToast.error(error.message));
    });

    document.getElementById('kiosk-out').addEventListener('click', () => {
      sendEvent('OUT').catch((error) => AppToast.error(error.message));
    });

    document.getElementById('kiosk-logout').addEventListener('click', async () => {
      const confirmed = await AppModal.confirm({
        title: 'Encerrar sessao',
        message: 'Deseja sair do modo totem?',
        confirmText: 'Sair',
      });
      if (!confirmed) return;

      await AppAuth.logout();
      window.location.href = '/login.html';
    });
  }

  async function bootstrap() {
    const user = await AppAuth.requireAuth({ roles: ['ADMIN'] });
    if (!user) return;

    bindEvents();
    AppFooter.renderFooter({ mountSelector: '[data-app-footer]' });
    await loadFeed();
    setInterval(() => {
      loadFeed().catch(() => {});
    }, 7000);
  }

  bootstrap().catch((error) => {
    AppToast.error(error.message);
  });
})();
