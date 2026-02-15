(function initAdminPage() {
  const page = document.getElementById('admin-tabs');
  if (!page) return;

  const state = {
    sessionUser: null,
    turmas: [],
    students: [],
    devices: [],
  };

  function setupTabs() {
    const buttons = [...document.querySelectorAll('.tab-btn')];
    const panels = {
      students: document.getElementById('tab-students'),
      turmas: document.getElementById('tab-turmas'),
      devices: document.getElementById('tab-devices'),
      logs: document.getElementById('tab-logs'),
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        buttons.forEach((item) => item.classList.remove('active'));
        Object.values(panels).forEach((panel) => panel.classList.remove('active'));

        button.classList.add('active');
        const panel = panels[button.dataset.tab];
        if (panel) panel.classList.add('active');
      });
    });
  }

  function renderUserMeta() {
    const text = state.sessionUser
      ? `${state.sessionUser.nome} (${state.sessionUser.role}) | organizacao ${state.sessionUser.organizationId}`
      : 'Sessao ativa';

    document.getElementById('admin-user-meta').textContent = text;
  }

  function renderTurmaOptions() {
    const selectCreate = document.getElementById('student-turma');
    const selectFilter = document.getElementById('filter-turma');

    selectCreate.innerHTML = state.turmas
      .map((item) => `<option value="${item.id}">${UI.escapeHtml(item.nome)} (${item.turno})</option>`)
      .join('');

    selectFilter.innerHTML = `<option value="">Todas</option>${state.turmas
      .map((item) => `<option value="${item.id}">${UI.escapeHtml(item.nome)} (${item.turno})</option>`)
      .join('')}`;

    const table = document.getElementById('turmas-table-body');
    table.innerHTML = state.turmas
      .map(
        (item) =>
          `<tr><td>${item.id}</td><td>${UI.escapeHtml(item.nome)}</td><td>${UI.badge(item.turno)}</td></tr>`
      )
      .join('');
  }

  function renderStudents() {
    const body = document.getElementById('students-table-body');
    body.innerHTML = state.students
      .map(
        (item) => `
          <tr>
            <td>${item.id}</td>
            <td>${UI.escapeHtml(item.matricula)}</td>
            <td>${UI.escapeHtml(item.nome)}</td>
            <td>${UI.escapeHtml(item.turma_nome)} (${item.turma_turno})</td>
            <td>${UI.badge(item.status)}</td>
          </tr>
        `
      )
      .join('');
  }

  function renderDevices(secretMessage) {
    const body = document.getElementById('devices-table-body');
    body.innerHTML = state.devices
      .map(
        (item) => `
          <tr>
            <td>${item.id}</td>
            <td>${UI.escapeHtml(item.device_code)}</td>
            <td>${UI.escapeHtml(item.local)}</td>
            <td>${UI.badge(item.ativo ? 'ATIVO' : 'INATIVO')}</td>
          </tr>
        `
      )
      .join('');

    const out = document.getElementById('device-secret-out');
    out.textContent = secretMessage || '';
  }

  function renderLogs(logs) {
    const eventsBody = document.getElementById('logs-events-body');
    eventsBody.innerHTML = (logs.events || [])
      .map(
        (item) => `
          <tr>
            <td>${UI.formatDateTime(item.event_time)}</td>
            <td>${UI.escapeHtml(item.student_nome)} (${UI.escapeHtml(item.matricula)})</td>
            <td>${UI.badge(item.event_type)}</td>
            <td>${UI.escapeHtml(item.method)}</td>
            <td>${UI.badge(item.status)}</td>
            <td>${UI.escapeHtml(item.device_code || '-')}</td>
          </tr>
        `
      )
      .join('');

    const syncBody = document.getElementById('logs-sync-body');
    syncBody.innerHTML = (logs.syncQueue || [])
      .map(
        (item) => `
          <tr>
            <td>${item.id}</td>
            <td>${UI.badge(item.status)}</td>
            <td>${item.attempts}</td>
            <td>${UI.formatDateTime(item.next_retry_at)}</td>
            <td>${UI.escapeHtml(item.last_error || '-')}</td>
          </tr>
        `
      )
      .join('');
  }

  async function loadTurmas() {
    const response = await Api.request('/api/admin/turmas');
    state.turmas = response.data || [];
    renderTurmaOptions();
  }

  async function loadStudents(filters = {}) {
    const search = new URLSearchParams();
    if (filters.turma) search.set('turma', filters.turma);
    if (filters.nome) search.set('nome', filters.nome);
    if (filters.matricula) search.set('matricula', filters.matricula);

    const response = await Api.request(`/api/admin/students?${search.toString()}`);
    state.students = response.data || [];
    renderStudents();
  }

  async function loadDevices(secretMessage) {
    const response = await Api.request('/api/admin/devices');
    state.devices = response.data || [];
    renderDevices(secretMessage);
  }

  async function loadLogs() {
    const response = await Api.request('/api/admin/logs');
    renderLogs(response.data || { events: [], syncQueue: [] });
  }

  function bindForms() {
    document.getElementById('student-create-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      try {
        await Api.request('/api/admin/students', {
          method: 'POST',
          body: {
            matricula: document.getElementById('student-matricula').value.trim(),
            nome: document.getElementById('student-nome').value.trim(),
            turma_id: Number(document.getElementById('student-turma').value),
          },
        });

        UI.showToast('Aluno cadastrado', 'success');
        event.target.reset();
        await loadStudents();
      } catch (error) {
        UI.showToast(error.message, 'error');
      }
    });

    document.getElementById('student-filter-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      await loadStudents({
        turma: document.getElementById('filter-turma').value,
        nome: document.getElementById('filter-nome').value.trim(),
        matricula: document.getElementById('filter-matricula').value.trim(),
      });
    });

    document.getElementById('turma-create-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      try {
        await Api.request('/api/admin/turmas', {
          method: 'POST',
          body: {
            nome: document.getElementById('turma-nome').value.trim(),
            turno: document.getElementById('turma-turno').value,
          },
        });

        UI.showToast('Turma criada', 'success');
        event.target.reset();
        await loadTurmas();
        await loadStudents();
      } catch (error) {
        UI.showToast(error.message, 'error');
      }
    });

    document.getElementById('device-create-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      try {
        const response = await Api.request('/api/admin/devices', {
          method: 'POST',
          body: {
            device_code: document.getElementById('device-code').value.trim(),
            local: document.getElementById('device-local').value.trim(),
            secret: document.getElementById('device-secret').value.trim() || undefined,
          },
        });

        const generatedSecret = response.data?.secret;
        await loadDevices(generatedSecret ? `Secret do dispositivo: ${generatedSecret}` : '');
        UI.showToast('Dispositivo cadastrado', 'success');
      } catch (error) {
        UI.showToast(error.message, 'error');
      }
    });

    document.getElementById('btn-refresh-logs').addEventListener('click', () => {
      loadLogs().catch((error) => UI.showToast(error.message, 'error'));
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
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

      state.sessionUser = user;
      renderUserMeta();

      setupTabs();
      bindForms();

      await loadTurmas();
      await loadStudents();
      await loadDevices();
      await loadLogs();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        UI.showToast('Sessao expirada. Faca login novamente.', 'error');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 900);
        return;
      }

      UI.showToast(error.message, 'error');
    }
  }

  bootstrap();
})();

