(function initTeacherPage() {
  const table = document.getElementById('today-sessions-body');
  if (!table) return;

  const state = {
    sessionUser: null,
    turmas: [],
    sessions: [],
    activeSessionId: null,
    activeTurmaId: null,
    eventSource: null,
    poller: null,
  };

  function renderTurmas() {
    const select = document.getElementById('open-session-turma');
    select.innerHTML = state.turmas
      .map((item) => `<option value="${item.id}">${UI.escapeHtml(item.nome)} (${item.turno})</option>`)
      .join('');
  }

  function updateKpis(attendanceRows) {
    const counters = {
      PRESENTE: 0,
      ATRASADO: 0,
      AUSENTE: 0,
      SAIU: 0,
    };

    attendanceRows.forEach((row) => {
      if (counters[row.attendance_status] !== undefined) {
        counters[row.attendance_status] += 1;
      }
    });

    document.getElementById('kpi-presente').textContent = counters.PRESENTE;
    document.getElementById('kpi-atrasado').textContent = counters.ATRASADO;
    document.getElementById('kpi-ausente').textContent = counters.AUSENTE;
    document.getElementById('kpi-saiu').textContent = counters.SAIU;
  }

  function renderAttendance(rows) {
    const body = document.getElementById('attendance-table-body');
    body.innerHTML = rows
      .map(
        (item) => `
          <tr>
            <td>${UI.escapeHtml(item.matricula)}</td>
            <td>${UI.escapeHtml(item.student_nome)}</td>
            <td>${UI.formatDateTime(item.first_in_time)}</td>
            <td>${UI.formatDateTime(item.last_out_time)}</td>
            <td>${UI.badge(item.attendance_status)}</td>
          </tr>
        `
      )
      .join('');

    updateKpis(rows);
  }

  function prependFeedItem(item) {
    const feed = document.getElementById('live-feed-list');
    const row = document.createElement('div');
    row.className = 'feed-item';
    row.innerHTML = `
      <div>
        <strong>${UI.escapeHtml(item.student_nome || item.studentNome || '-')}</strong>
        <div><small>${UI.escapeHtml(item.matricula || item.studentMatricula || '-')}</small></div>
      </div>
      <div>
        <div>${UI.badge(item.event_type || item.eventType || item.status || '-')}</div>
        <small>${UI.formatDateTime(item.event_time || item.eventTime)}</small>
      </div>
    `;

    feed.prepend(row);
    while (feed.children.length > 120) {
      feed.removeChild(feed.lastChild);
    }
  }

  function renderTodaySessions() {
    table.innerHTML = state.sessions
      .map(
        (session) => `
          <tr>
            <td>${session.id}</td>
            <td>${UI.escapeHtml(session.turma_nome)} (${session.turma_turno})</td>
            <td>${UI.escapeHtml(session.hora_inicio)} - ${UI.escapeHtml(session.hora_fim)}</td>
            <td><button class="btn-secondary" type="button" data-open-session="${session.id}" data-open-turma="${session.turma_id}">Abrir lista</button></td>
          </tr>
        `
      )
      .join('');

    [...document.querySelectorAll('[data-open-session]')].forEach((button) => {
      button.addEventListener('click', async () => {
        const sessionId = Number(button.dataset.openSession);
        const turmaId = Number(button.dataset.openTurma);

        state.activeSessionId = sessionId;
        state.activeTurmaId = turmaId;

        document.getElementById('manual-session-id').value = sessionId;

        await loadAttendance(sessionId);
        await loadFeed();
        startStream();
      });
    });
  }

  async function loadTurmas() {
    const response = await Api.request('/api/teacher/turmas');
    state.turmas = response.data || [];
    renderTurmas();
  }

  async function loadSessions() {
    const response = await Api.request('/api/teacher/class-sessions/today');
    state.sessions = response.data || [];
    renderTodaySessions();
  }

  async function loadAttendance(sessionId) {
    const response = await Api.request(`/api/teacher/class-sessions/${sessionId}/attendance`);
    renderAttendance(response.data || []);
  }

  async function loadFeed() {
    const turmaQuery = state.activeTurmaId ? `?turma_id=${state.activeTurmaId}` : '';
    const response = await Api.request(`/api/teacher/live-feed${turmaQuery}`);

    const feed = document.getElementById('live-feed-list');
    feed.innerHTML = '';

    (response.data || []).forEach((item) => prependFeedItem(item));
  }

  function startStream() {
    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }

    const params = new URLSearchParams();
    if (state.activeTurmaId) {
      params.set('turma_id', String(state.activeTurmaId));
    }

    const source = new EventSource(`/api/teacher/stream?${params.toString()}`);
    source.addEventListener('attendance', (event) => {
      try {
        const payload = JSON.parse(event.data);
        prependFeedItem(payload);
      } catch {
        // ignore malformed
      }
    });

    source.onerror = () => {
      source.close();
      state.eventSource = null;
    };

    state.eventSource = source;
  }

  function startPollingFallback() {
    if (state.poller) {
      clearInterval(state.poller);
    }

    state.poller = setInterval(() => {
      loadFeed().catch(() => {});
    }, 5000);
  }

  function bindActions() {
    document.getElementById('open-session-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      try {
        await Api.request('/api/teacher/class-sessions', {
          method: 'POST',
          body: {
            turma_id: Number(document.getElementById('open-session-turma').value),
            subject_id: document.getElementById('open-session-subject').value
              ? Number(document.getElementById('open-session-subject').value)
              : undefined,
            hora_inicio: document.getElementById('open-session-start').value,
            hora_fim: document.getElementById('open-session-end').value,
          },
        });

        UI.showToast('Aula aberta com sucesso', 'success');
        await loadSessions();
      } catch (error) {
        UI.showToast(error.message, 'error');
      }
    });

    document.getElementById('manual-attendance-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      try {
        await Api.request('/api/teacher/attendance/manual', {
          method: 'POST',
          body: {
            class_session_id: Number(document.getElementById('manual-session-id').value),
            student_matricula: document.getElementById('manual-matricula').value.trim(),
            status: document.getElementById('manual-status').value,
            justificativa: document.getElementById('manual-justification').value.trim(),
          },
        });

        UI.showToast('Correcao manual aplicada', 'success');
        if (state.activeSessionId) {
          await loadAttendance(state.activeSessionId);
        }
      } catch (error) {
        UI.showToast(error.message, 'error');
      }
    });

    document.getElementById('btn-refresh-sessions').addEventListener('click', () => {
      loadSessions().catch((error) => UI.showToast(error.message, 'error'));
    });

    document.getElementById('btn-refresh-feed').addEventListener('click', () => {
      loadFeed().catch((error) => UI.showToast(error.message, 'error'));
    });

    document.getElementById('teacher-logout').addEventListener('click', async () => {
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
      if (!['ADMIN', 'TEACHER'].includes(user.role)) {
        UI.showToast('Perfil sem acesso ao diario.', 'error');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 900);
        return;
      }

      state.sessionUser = user;
      document.getElementById('teacher-user-meta').textContent = `${user.nome} (${user.role}) | organizacao ${user.organizationId}`;

      bindActions();
      await loadTurmas();
      await loadSessions();
      await loadFeed();
      startPollingFallback();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        UI.showToast('Sessao expirada. Redirecionando para login.', 'error');
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

