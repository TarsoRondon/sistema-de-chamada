(function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailEl = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const orgEl = document.getElementById('organization');
  const rememberEl = document.getElementById('remember-email');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const capsLockWarning = document.getElementById('capslock-warning');
  const submitBtn = form.querySelector('button[type="submit"]');

  function setFieldError(fieldId, message) {
    const target = document.querySelector(`[data-error-for="${fieldId}"]`);
    if (target) {
      target.textContent = message || '';
    }
  }

  function clearErrors() {
    setFieldError('email', '');
    setFieldError('password', '');
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.setAttribute('aria-busy', String(isLoading));
    submitBtn.textContent = isLoading ? 'Entrando...' : 'Entrar';
  }

  function validateForm() {
    clearErrors();
    let valid = true;

    const email = emailEl.value.trim();
    if (!email) {
      setFieldError('email', 'Informe o email institucional.');
      valid = false;
    } else if (!emailEl.checkValidity()) {
      setFieldError('email', 'Email invalido.');
      valid = false;
    }

    if (!passwordEl.value) {
      setFieldError('password', 'Informe a senha.');
      valid = false;
    }

    return valid;
  }

  function loadRememberedEmail() {
    const remembered = localStorage.getItem('login_email');
    if (remembered) {
      emailEl.value = remembered;
      rememberEl.checked = true;
    }
    emailEl.focus();
  }

  function persistRememberedEmail() {
    if (rememberEl.checked) {
      localStorage.setItem('login_email', emailEl.value.trim());
      return;
    }
    localStorage.removeItem('login_email');
  }

  async function redirectIfAuthenticated() {
    try {
      const user = await AppAuth.getMe();
      if (user.role === 'ADMIN') {
        window.location.href = '/admin.html';
      } else {
        window.location.href = '/teacher.html';
      }
    } catch {
      // no-op
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await AppApi.post('/api/auth/login', {
        email: emailEl.value.trim(),
        password: passwordEl.value,
        organization_id: orgEl.value ? Number(orgEl.value) : undefined,
      });

      persistRememberedEmail();
      AppToast.success('Login realizado com sucesso.');

      if (response.user?.role === 'ADMIN') {
        window.location.href = '/admin.html';
        return;
      }

      window.location.href = '/teacher.html';
    } catch (error) {
      AppToast.error(error.message);
      if (error.code === 'INVALID_CREDENTIALS') {
        setFieldError('password', 'Email ou senha invalidos.');
      }
    } finally {
      setLoading(false);
    }
  });

  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordEl.type === 'password';
      passwordEl.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.textContent = isPassword ? 'Ocultar' : 'Mostrar';
    });
  }

  passwordEl.addEventListener('keyup', (event) => {
    if (!capsLockWarning) return;
    const capsOn = typeof event.getModifierState === 'function' && event.getModifierState('CapsLock');
    capsLockWarning.classList.toggle('hidden', !capsOn);
  });

  loadRememberedEmail();
  AppFooter.renderFooter({ mountSelector: '[data-app-footer]' });
  redirectIfAuthenticated();
})();
