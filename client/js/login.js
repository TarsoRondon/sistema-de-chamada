(function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');

  function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? 'Entrando...' : 'Entrar';
  }

  async function redirectIfAlreadyAuthenticated() {
    try {
      const user = await Api.getSession();
      if (user?.role === 'ADMIN') {
        window.location.href = '/admin.html';
        return;
      }

      if (user?.role === 'TEACHER') {
        window.location.href = '/teacher.html';
      }
    } catch {
      // no active session
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const organizationRaw = document.getElementById('organization').value.trim();

    setLoading(true);

    try {
      const response = await Api.request('/api/auth/login', {
        method: 'POST',
        body: {
          email,
          password,
          organization_id: organizationRaw ? Number(organizationRaw) : undefined,
        },
      });

      UI.showToast('Login realizado com sucesso', 'success');

      if (response.user?.role === 'ADMIN') {
        window.location.href = '/admin.html';
        return;
      }

      window.location.href = '/teacher.html';
    } catch (error) {
      UI.showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  });

  redirectIfAlreadyAuthenticated();
})();
