(function initApi(global) {
  function createHttpError(message, status, code, details, requestId) {
    const error = new Error(message || 'Erro de requisicao');
    error.status = status || 500;
    error.code = code || 'HTTP_ERROR';
    error.details = details;
    error.requestId = requestId || null;
    return error;
  }

  async function parseResponse(response) {
    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    return data;
  }

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs || 15000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const hasBody = options.body !== undefined && options.body !== null;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    if (hasBody && !isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        credentials: 'include',
        headers,
        body: hasBody ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
        signal: controller.signal,
      });

      const data = await parseResponse(response);
      const requestId = response.headers.get('x-request-id') || data?.requestId || null;

      if (!response.ok) {
        const message = data?.error?.message || data?.error || `Erro HTTP ${response.status}`;
        const code = data?.error?.code || 'HTTP_ERROR';
        throw createHttpError(message, response.status, code, data?.error?.details || data?.details, requestId);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw createHttpError('Tempo de resposta excedido. Tente novamente.', 408, 'REQUEST_TIMEOUT');
      }

      if (error.status) {
        throw error;
      }

      throw createHttpError(error.message || 'Falha de rede', 0, 'NETWORK_ERROR');
    } finally {
      clearTimeout(timeout);
    }
  }

  function get(url, options = {}) {
    return request(url, { ...options, method: 'GET' });
  }

  function post(url, body, options = {}) {
    return request(url, { ...options, method: 'POST', body });
  }

  function put(url, body, options = {}) {
    return request(url, { ...options, method: 'PUT', body });
  }

  function del(url, options = {}) {
    return request(url, { ...options, method: 'DELETE' });
  }

  global.AppApi = {
    request,
    get,
    post,
    put,
    del,
  };
})(window);
