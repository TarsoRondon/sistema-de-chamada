(function initAdminPage() {
  const root = document.querySelector('[data-page="admin"]');
  if (!root) return;

  const state = {
    user: null,
    turmas: [],
    students: [],
    devices: [],
    logs: { events: [], syncQueue: [] },
    studentPage: 1,
    pageSize: 20,
    filters: {
      turma: '',
      nome: '',
      matricula: '',
    },
  };

  function selectPanel(panelId) {
    document.querySelectorAll('[data-nav-target]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.navTarget === panelId);
    });

    document.querySelectorAll('[data-panel]').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === panelId);
    });
  }

  function openModal(modalId) {
    const modal = document.querySelector(`[data-modal="${modalId}"]`);
    if (!modal) return;
    modal.classList.add('is-open');
  }

  function closeModal(modalId) {
    const modal = document.querySelector(`[data-modal="${modalId}"]`);
    if (!modal) return;
    modal.classList.remove('is-open');
  }

  function renderUserMeta() {
    const meta = document.getElementById('admin-user-meta');
    if (!meta || !state.user) return;
    meta.textContent = `${state.user.nome} (${state.user.role}) • Organizacao ${state.user.organizationId}`;
  }

  function renderDashboard() {
    document.getElementById('kpi-total-students').textContent = state.students.length;
    document.getElementById('kpi-total-turmas').textContent = state.turmas.length;
    document.getElementById('kpi-total-devices').textContent = state.devices.length;
  }

  function renderTurmaOptions() {
    const turmaCreate = document.getElementById('student-create-turma');
    const turmaFilter = document.getElementById('students-filter-turma');
    const turmaEdit = document.getElementById('student-edit-turma');

    const options = state.turmas
      .map((turma) => `<option value="${turma.id}">${AppFormat.escapeHtml(turma.nome)} (${turma.turno})</option>`)
      .join('');

    turmaCreate.innerHTML = options;
    turmaEdit.innerHTML = options;
    turmaFilter.innerHTML = `<option value="">Todas</option>${options}`;

    AppTable.renderTableBody(
      document.getElementById('turmas-table-body'),
      state.turmas,
      (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${AppFormat.escapeHtml(row.nome)}</td>
          <td>${AppBadges.statusBadge(row.turno)}</td>
        </tr>
      `,
      3,
      'Nenhuma turma cadastrada.'
    );
  }

  function renderStudents() {
    const paged = AppTable.paginate(state.students, state.studentPage, state.pageSize);
    const tbody = document.getElementById('students-table-body');

    AppTable.renderTableBody(
      tbody,
      paged.items,
      (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${AppFormat.escapeHtml(row.matricula)}</td>
          <td>${AppFormat.escapeHtml(row.nome)}</td>
          <td>${AppFormat.escapeHtml(row.turma_nome)} (${row.turma_turno})</td>
          <td>${AppBadges.statusBadge(row.status)}</td>
          <td>
            <button class="btn btn-secondary btn-small" type="button" data-edit-student="${row.id}">Editar</button>
          </td>
        </tr>
      `,
      6,
      'Nenhum aluno encontrado.'
    );

    AppTable.renderPagination(document.getElementById('students-pagination'), paged, (nextPage) => {
      state.studentPage = nextPage;
      renderStudents();
    });
  }

  function renderDevices(secretText) {
    AppTable.renderTableBody(
      document.getElementById('devices-table-body'),
      state.devices,
      (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${AppFormat.escapeHtml(row.device_code)}</td>
          <td>${AppFormat.escapeHtml(row.local)}</td>
          <td>${AppBadges.statusBadge(row.ativo ? 'ATIVO' : 'INATIVO')}</td>
        </tr>
      `,
      4,
      'Nenhum dispositivo cadastrado.'
    );

    const out = document.getElementById('device-secret-output');
    out.textContent = secretText || '';
  }

  function renderLogs() {
    AppTable.renderTableBody(
      document.getElementById('logs-events-body'),
      state.logs.events || [],
      (row) => `
        <tr>
          <td>${AppFormat.formatDateTime(row.event_time, { withSeconds: true })}</td>
          <td>${AppFormat.escapeHtml(row.student_nome)} (${AppFormat.escapeHtml(row.matricula)})</td>
          <td>${AppBadges.statusBadge(row.event_type)}</td>
          <td>${AppFormat.escapeHtml(row.method)}</td>
          <td>${AppBadges.statusBadge(row.status)}</td>
          <td>${AppFormat.escapeHtml(row.device_code || '-')}</td>
        </tr>
      `,
      6,
      'Sem eventos recentes.'
    );

    AppTable.renderTableBody(
      document.getElementById('logs-sync-body'),
      state.logs.syncQueue || [],
      (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${AppBadges.statusBadge(row.status)}</td>
          <td>${row.attempts}</td>
          <td>${AppFormat.formatDateTime(row.next_retry_at)}</td>
          <td>${AppFormat.escapeHtml(row.last_error || '-')}</td>
        </tr>
      `,
      5,
      'Fila de sincronizacao vazia.'
    );
  }

  function getStudentById(studentId) {
    return state.students.find((student) => Number(student.id) === Number(studentId));
  }

  function openEditStudentModal(studentId) {
    const student = getStudentById(studentId);
    if (!student) return;

    document.getElementById('student-edit-id').value = student.id;
    document.getElementById('student-edit-matricula').value = student.matricula;
    document.getElementById('student-edit-nome').value = student.nome;
    document.getElementById('student-edit-turma').value = student.turma_id;
    document.getElementById('student-edit-status').value = student.status;
    openModal('student-edit');
  }

  async function loadTurmas() {
    const response = await AppApi.get('/api/admin/turmas');
    state.turmas = response.data || [];
    renderTurmaOptions();
  }

  async function loadStudents() {
    const params = new URLSearchParams();
    if (state.filters.turma) params.set('turma', state.filters.turma);
    if (state.filters.nome) params.set('nome', state.filters.nome);
    if (state.filters.matricula) params.set('matricula', state.filters.matricula);

    const query = params.toString();
    const response = await AppApi.get(`/api/admin/students${query ? `?${query}` : ''}`);
    state.students = response.data || [];
    state.studentPage = 1;
    renderStudents();
    renderDashboard();
  }

  async function loadDevices(secretText) {
    const response = await AppApi.get('/api/admin/devices');
    state.devices = response.data || [];
    renderDevices(secretText);
    renderDashboard();
  }

  async function loadLogs() {
    const response = await AppApi.get('/api/admin/logs');
    state.logs = response.data || { events: [], syncQueue: [] };
    renderLogs();
  }

  async function submitStudentCreate(event) {
    event.preventDefault();
    const payload = {
      matricula: document.getElementById('student-create-matricula').value.trim(),
      nome: document.getElementById('student-create-nome').value.trim(),
      turma_id: Number(document.getElementById('student-create-turma').value),
      status: document.getElementById('student-create-status').value,
    };

    await AppApi.post('/api/admin/students', payload);
    AppToast.success('Aluno cadastrado com sucesso.');
    event.target.reset();
    closeModal('student-create');
    await loadStudents();
  }

  async function submitStudentEdit(event) {
    event.preventDefault();
    const studentId = Number(document.getElementById('student-edit-id').value);
    const payload = {
      matricula: document.getElementById('student-edit-matricula').value.trim(),
      nome: document.getElementById('student-edit-nome').value.trim(),
      turma_id: Number(document.getElementById('student-edit-turma').value),
      status: document.getElementById('student-edit-status').value,
    };

    await AppApi.put(`/api/admin/students/${studentId}`, payload);
    AppToast.success('Aluno atualizado com sucesso.');
    closeModal('student-edit');
    await loadStudents();
  }

  async function submitTurmaCreate(event) {
    event.preventDefault();
    const payload = {
      nome: document.getElementById('turma-create-nome').value.trim(),
      turno: document.getElementById('turma-create-turno').value,
    };
    await AppApi.post('/api/admin/turmas', payload);
    AppToast.success('Turma criada com sucesso.');
    event.target.reset();
    await loadTurmas();
    await loadStudents();
  }

  async function submitDeviceCreate(event) {
    event.preventDefault();
    const payload = {
      device_code: document.getElementById('device-create-code').value.trim(),
      local: document.getElementById('device-create-local').value.trim(),
      secret: document.getElementById('device-create-secret').value.trim() || undefined,
    };

    const response = await AppApi.post('/api/admin/devices', payload);
    const secret = response.data?.secret || '';
    AppToast.success('Dispositivo cadastrado.');
    event.target.reset();
    await loadDevices(secret ? `Secret gerado: ${secret}` : '');
  }

  async function submitCsvImport(event) {
    event.preventDefault();
    const input = document.getElementById('import-csv-file');
    const resultBox = document.getElementById('import-csv-result');

    if (!input.files || input.files.length === 0) {
      AppToast.warn('Selecione um arquivo CSV.');
      return;
    }

    const formData = new FormData();
    formData.append('file', input.files[0]);

    const response = await AppApi.request('/api/admin/import/digital-csv', {
      method: 'POST',
      body: formData,
    });

    const data = response.data || {};
    resultBox.innerHTML = `
      <strong>Importacao concluida</strong><br />
      Arquivo: ${AppFormat.escapeHtml(data.sourceFile || '-')}. Separador: <code>${AppFormat.escapeHtml(
      data.separator || '-'
    )}</code><br />
      Processadas: ${data.processed || 0} • Inseridas: ${data.inserted || 0} • Duplicadas: ${
      data.duplicatesOrIgnored || 0
    } • Invalidas: ${data.skippedMalformed || 0}
    `;
    AppToast.success('CSV importado com sucesso.');
  }

  function bindEvents() {
    document.querySelectorAll('[data-nav-target]').forEach((button) => {
      button.addEventListener('click', () => {
        selectPanel(button.dataset.navTarget);
      });
    });

    document.querySelectorAll('[data-modal-open]').forEach((button) => {
      button.addEventListener('click', () => openModal(button.dataset.modalOpen));
    });

    document.querySelectorAll('[data-modal-close]').forEach((button) => {
      button.addEventListener('click', () => closeModal(button.dataset.modalClose));
    });

    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          closeModal(modal.dataset.modal);
        }
      });
    });

    document.getElementById('students-filter-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      state.filters.turma = document.getElementById('students-filter-turma').value;
      state.filters.nome = document.getElementById('students-filter-nome').value.trim();
      state.filters.matricula = document.getElementById('students-filter-matricula').value.trim();
      await loadStudents();
    });

    document.getElementById('student-create-form').addEventListener('submit', (event) =>
      submitStudentCreate(event).catch((error) => AppToast.error(error.message))
    );
    document.getElementById('student-edit-form').addEventListener('submit', (event) =>
      submitStudentEdit(event).catch((error) => AppToast.error(error.message))
    );
    document.getElementById('turma-create-form').addEventListener('submit', (event) =>
      submitTurmaCreate(event).catch((error) => AppToast.error(error.message))
    );
    document.getElementById('device-create-form').addEventListener('submit', (event) =>
      submitDeviceCreate(event).catch((error) => AppToast.error(error.message))
    );
    document.getElementById('import-csv-form').addEventListener('submit', (event) =>
      submitCsvImport(event).catch((error) => AppToast.error(error.message))
    );

    document.getElementById('students-table-body').addEventListener('click', (event) => {
      const button = event.target.closest('[data-edit-student]');
      if (!button) return;
      openEditStudentModal(Number(button.dataset.editStudent));
    });

    document.getElementById('btn-refresh-logs').addEventListener('click', () => {
      loadLogs().catch((error) => AppToast.error(error.message));
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
      const confirmed = await AppModal.confirm({
        title: 'Encerrar sessao',
        message: 'Deseja sair do sistema agora?',
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

    state.user = user;
    renderUserMeta();
    bindEvents();
    AppFooter.renderFooter({ mountSelector: '[data-app-footer]' });

    await Promise.all([loadTurmas(), loadStudents(), loadDevices(), loadLogs()]);
    selectPanel('dashboard');
  }

  bootstrap().catch((error) => {
    AppToast.error(error.message);
  });
})();
