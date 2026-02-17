(function initAuth(global) {
  async function getMe() {
    const response = await global.AppApi.get('/api/auth/me', { timeoutMs: 10000 });
    return response.user;
  }

  function hasRole(user, roles) {
    if (!roles || roles.length === 0) return true;
    return roles.includes(user?.role);
  }

  async function requireAuth({ roles = [], redirectTo = '/login.html' } = {}) {
    try {
      const user = await getMe();
      if (!hasRole(user, roles)) {
        throw new Error('Perfil sem permissao');
      }
      return user;
    } catch {
      window.location.href = redirectTo;
      return null;
    }
  }

  async function logout() {
    try {
      await global.AppApi.post('/api/auth/logout', {});
    } catch {
      // no-op
    }
  }

  global.AppAuth = {
    getMe,
    requireAuth,
    logout,
    hasRole,
  };
})(window);
