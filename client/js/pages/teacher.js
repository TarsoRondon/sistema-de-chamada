(function initTeacherPage() {
  const root = document.querySelector('[data-page="teacher"]');
  if (!root) return;

  const state = {
    user: null,
    turmas: [],
    sessions: [],
    activeSessionId: null,
    activeTurmaId: null,
    eventSource: null,
    pollTimer: null,
  };

  function setUserMeta() {
    const target = document.getElementById('teacher-user-meta');
    if (!target || !state.user) return;
    target.textContent = `${state.user.nome} (${state.user.role}) • Organizacao ${state.user.organizationId}`;
  }

  function setKpis(rows) {
    const counters = {
      PRESENTE: 0,
      ATRASADO: 0,
      AUSENTE: 0,
      SAIU: 0,
    };

    rows.forEach((row) => {
      if (counters[row.attendance_status] !== undefined) {
        counters[row.attendance_status] += 1;
      }
    });

    document.getElementById('kpi-presente').textContent = counters.PRESENTE;
    document.getElementById('kpi-atrasado').textContent = counters.ATRASADO;
    document.getElementById('kpi-ausente').textContent = counters.AUSENTE;
    document.getElementById('kpi-saiu').textContent = counters.SAIU;
  }

  function renderTurmas() {
    const selectOpen = document.getElementById('open-session-turma');
    const options = state.turmas
      .map((turma) => `<option value="${turma.id}">${AppFormat.escapeHtml(turma.nome)} (${turma.turno})</option>`)
      .join('');
    selectOpen.innerHTML = options;
  }

  function renderTodaySessions() {
    AppTable.renderTableBody(
      document.getElementById('today-sessions-body'),
      state.sessions,
      (session) => `
        <tr>
          <td>${session.id}</td>
          <td>${AppFormat.escapeHtml(session.turma_nome)} (${session.turma_turno})</td>
          <td>${AppFormat.escapeHtml(session.hora_inicio)} - ${AppFormat.escapeHtml(session.hora_fim)}</td>
          <td><button class="btn btn-secondary btn-small" type="button" data-select-session="${session.id}" data-select-turma="${
        session.turma_id
      }">Selecionar</button></td>
        </tr>
      `,
      4,
      'Nenhuma aula aberta hoje.'
    );
  }

  function renderAttendance(rows) {
    AppTable.renderTableBody(
      document.getElementById('attendance-table-body'),
      rows,
      (row) => `
        <tr>
          <td>${AppFormat.escapeHtml(row.matricula)}</td>
          <td>${AppFormat.escapeHtml(row.student_nome)}</td>
          <td>${AppFormat.formatDateTime(row.first_in_time)}</td>
          <td>${AppFormat.formatDateTime(row.last_out_time)}</td>
          <td>${AppBadges.statusBadge(row.attendance_status)}</td>
        </tr>
      `,
      5,
      'Selecione uma aula para visualizar a frequencia.'
    );

    setKpis(rows);
  }

  function appendFeedItem(item) {
    const list = document.getElementById('live-feed-list');
    const row = document.createElement('div');
    row.className = 'feed-item';
    row.innerHTML = `
      <div>
        <strong>${AppFormat.escapeHtml(item.student_nome || item.studentNome || '-')}</strong>
        <small>${AppFormat.escapeHtml(item.matricula || item.studentMatricula || '-')}</small>
      </div>
      <div class="feed-item__meta">
        ${AppBadges.statusBadge(item.event_type || item.eventType || '-')}
        <small>${AppFormat.formatDateTime(item.event_time || item.eventTime, { withSeconds: true })}</small>
      </div>
    `;

    list.prepend(row);
    while (list.children.length > 80) {
      list.removeChild(list.lastChild);
    }
  }

  function renderFeed(rows) {
    const list = document.getElementById('live-feed-list');
    list.innerHTML = '';
    rows.forEach((row) => appendFeedItem(row));
  }

  async function loadTurmas() {
    const response = await AppApi.get('/api/teacher/turmas');
    state.turmas = response.data || [];
    renderTurmas();
  }

  async function loadSessions() {
    const response = await AppApi.get('/api/teacher/class-sessions/today');
    state.sessions = response.data || [];
    renderTodaySessions();
  }

  async function loadAttendance() {
    if (!state.activeSessionId) {
      renderAttendance([]);
      return;
    }
    const response = await AppApi.get(`/api/teacher/class-sessions/${state.activeSessionId}/attendance`);
    renderAttendance(response.data || []);
  }

  async function loadFeed() {
    const params = new URLSearchParams();
    if (state.activeTurmaId) params.set('turma_id', state.activeTurmaId);
    const query = params.toString();
    const response = await AppApi.get(`/api/teacher/live-feed${query ? `?${query}` : ''}`);
    renderFeed(response.data || []);
  }

  function stopRealtime() {
    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }

    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function startRealtime() {
    stopRealtime();

    const params = new URLSearchParams();
    if (state.activeTurmaId) params.set('turma_id', state.activeTurmaId);
    const query = params.toString();
    const source = new EventSource(`/api/teacher/stream${query ? `?${query}` : ''}`);

    source.addEventListener('attendance', (event) => {
      try {
        const payload = JSON.parse(event.data);
        appendFeedItem(payload);
      } catch {
        // no-op
      }
    });

    source.onerror = () => {
      source.close();
      state.eventSource = null;
    };

    state.eventSource = source;

    state.pollTimer = setInterval(() => {
      loadFeed().catch(() => {});
    }, 5000);
  }

  async function handleCreateSession(event) {
    event.preventDefault();
    await AppApi.post('/api/teacher/class-sessions', {
      turma_id: Number(document.getElementById('open-session-turma').value),
      subject_id: document.getElementById('open-session-subject').value
        ? Number(document.getElementById('open-session-subject').value)
        : undefined,
      hora_inicio: document.getElementById('open-session-start').value,
      hora_fim: document.getElementById('open-session-end').value,
      data_aula: document.getElementById('open-session-date').value || undefined,
    });

    AppToast.success('Aula aberta com sucesso.');
    event.target.reset();
    await loadSessions();
  }

  async function handleManualAdjust(event) {
    event.preventDefault();
    await AppApi.post('/api/teacher/attendance/manual', {
      class_session_id: Number(document.getElementById('manual-session-id').value),
      student_matricula: document.getElementById('manual-matricula').value.trim(),
      status: document.getElementById('manual-status').value,
      justificativa: document.getElementById('manual-justification').value.trim(),
    });

    AppToast.success('Ajuste manual aplicado.');
    await loadAttendance();
    await loadFeed();
  }

  function bindEvents() {
    document.getElementById('open-session-form').addEventListener('submit', (event) =>
      handleCreateSession(event).catch((error) => AppToast.error(error.message))
    );
    document.getElementById('manual-attendance-form').addEventListener('submit', (event) =>
      handleManualAdjust(event).catch((error) => AppToast.error(error.message))
    );

    document.getElementById('today-sessions-body').addEventListener('click', (event) => {
      const button = event.target.closest('[data-select-session]');
      if (!button) return;

      state.activeSessionId = Number(button.dataset.selectSession);
      state.activeTurmaId = Number(button.dataset.selectTurma);
      document.getElementById('manual-session-id').value = state.activeSessionId;

      loadAttendance().catch((error) => AppToast.error(error.message));
      loadFeed().catch((error) => AppToast.error(error.message));
      startRealtime();
    });

    document.getElementById('btn-refresh-sessions').addEventListener('click', () => {
      loadSessions().catch((error) => AppToast.error(error.message));
    });

    document.getElementById('btn-refresh-feed').addEventListener('click', () => {
      loadFeed().catch((error) => AppToast.error(error.message));
    });

    document.getElementById('teacher-logout').addEventListener('click', async () => {
      const confirmed = await AppModal.confirm({
        title: 'Encerrar sessao',
        message: 'Deseja sair do diario agora?',
        confirmText: 'Sair',
      });
      if (!confirmed) return;

      await AppAuth.logout();
      window.location.href = '/login.html';
    });
  }

  async function bootstrap() {
    const user = await AppAuth.requireAuth({ roles: ['ADMIN', 'TEACHER'] });
    if (!user) return;

    state.user = user;
    setUserMeta();
    bindEvents();
    AppFooter.renderFooter({ mountSelector: '[data-app-footer]' });

    await Promise.all([loadTurmas(), loadSessions(), loadFeed()]);
  }

  bootstrap().catch((error) => {
    AppToast.error(error.message);
  });

  window.addEventListener('beforeunload', stopRealtime);
})();
