(function setupApi(global) {
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs || 15000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const hasBody = options.body !== undefined;
    const headers = {
      ...(options.headers || {}),
    };

    if (hasBody && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(path, {
        method: options.method || 'GET',
        credentials: 'include',
        headers,
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        const error = new Error(data?.error || `Erro HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Tempo de resposta excedido. Tente novamente.');
        timeoutError.status = 408;
        throw timeoutError;
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function getSession() {
    const response = await request('/api/auth/me', { timeoutMs: 10000 });
    return response.user;
  }

  global.Api = { request, getSession };
})(window);
