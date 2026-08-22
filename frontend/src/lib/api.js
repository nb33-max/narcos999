const TOKEN_KEY = 'nb_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function rawFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const hasBody = options.body !== undefined && options.body !== null;
  const isGet = !options.method || options.method === 'GET';
  if (hasBody && !isGet && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const doFetch = (method) =>
    fetch(url, {
      ...options,
      method: method || options.method,
      headers,
    });

  let res;
  try {
    res = await doFetch();
  } catch (e) {
    if (isGet && !options.noRetry) {
      res = await doFetch();
    } else {
      throw e;
    }
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error((data && (data.error || data.reason)) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiGet(url, params) {
  const qs = params
    ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString()
    : '';
  return rawFetch(`/api${url}${qs}`);
}

export async function apiPost(url, body) {
  return rawFetch(`/api${url}`, { method: 'POST', body: JSON.stringify(body || {}) });
}

export async function apiPut(url, body) {
  return rawFetch(`/api${url}`, { method: 'PUT', body: JSON.stringify(body || {}) });
}

export async function apiPatch(url, body) {
  return rawFetch(`/api${url}`, { method: 'PATCH', body: JSON.stringify(body || {}) });
}

export async function apiDelete(url) {
  return rawFetch(`/api${url}`, { method: 'DELETE' });
}

export async function apiUpload(url, formData) {
  return rawFetch(`/api${url}`, { method: 'POST', body: formData });
}
