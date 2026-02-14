(function setupApi(global) {
  async function request(path, options = {}) {
    const response = await fetch(path, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
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
  }

  global.Api = { request };
})(window);
