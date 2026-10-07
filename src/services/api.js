// The ONE place that talks to the Express API. Pages never call fetch() themselves.
import { dataBus } from './dataBus';

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'intero.ims.token';

// The login token is kept in localStorage so the session survives a page refresh.
export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage blocked */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
  },
};

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Network problem. Please check your connection and try again.', 0, 'NETWORK');
  }

  let data = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }

  if (!res.ok) {
    // 401 on any call except the login form itself = the session ended (expired / deactivated / deleted).
    if (res.status === 401 && path !== '/auth/login') {
      dataBus.dispatchEvent(new CustomEvent('unauthorized', { detail: data?.message || '' }));
    }
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', res.status, data?.code);
  }

  if (method !== 'GET' && !path.startsWith('/auth/')) dataBus.dispatchEvent(new Event('mutated'));
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
};
