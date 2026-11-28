import { get } from 'svelte/store';
import { browser } from '$app/environment';

export function useProxy() {
  if (!browser) return false;
  const host = window.location.hostname;
  return host !== 'localhost' && !host.startsWith('127.0.0.1');
}

export function buildUrl(endpoint) {
  if (useProxy()) return '/api/proxy' + endpoint.slice(4);
  return endpoint;
}

/** 图片地址：相对 /api/...（未过审原图）走代理，完整 R2 URL 原样返回 */
export function imageUrl(u) {
  if (u && u.startsWith('/api/')) return buildUrl(u);
  return u;
}

/** Get Supabase access token from session store */
async function getSupabaseToken() {
  if (!browser) return null;
  try {
    const { authSession } = await import('$lib/stores/auth');
    const session = get(authSession);
    return session?.access_token || null;
  } catch (e) { return null; }
}

export async function getAuthHeaders(bypassSession = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (bypassSession) return headers;

  // Supabase JWT
  const token = await getSupabaseToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // OAuth reviewer fallback (cookie-based, only in production)
  if (!token && browser && useProxy()) {
    try {
      const r = await fetch('/api/oauth-userinfo', { credentials: 'include' });
      const d = await r.json();
      if (d?.token) headers['Authorization'] = `Bearer ${d.token}`;
    } catch (e) { /* ignore */ }
  }

  return headers;
}

export async function api(endpoint, options = {}) {
  const url = buildUrl(endpoint);
  const headers = await getAuthHeaders(options.bypassSession);

  const fetchOpts = { ...options, headers: { ...headers, ...(options.headers || {}) }, credentials: useProxy() ? 'include' : 'omit' };
  delete fetchOpts.bypassSession;
  delete fetchOpts.noRedirect;

  const r = await fetch(url, fetchOpts);
  // 带了 token 却仍 401 → 会话过期/失效：清会话并提示；未设置 noRedirect 时稍候跳转登录
  if (r.status === 401 && headers['Authorization']) {
    if (browser) {
      const { clearSession, sessionExpired } = await import('$lib/stores/auth');
      clearSession();
      sessionExpired.set(true);
      const { showToast } = await import('$lib/stores/toast');
      showToast('会话已过期，请重新登录', 'error');
      if (!options.noRedirect) {
        setTimeout(() => { window.location.href = '/login'; }, 1200);
      }
    }
    throw new Error('会话已过期，请重新登录');
  }
  return r;
}

export async function uploadWithProgress(endpoint, formData, onProgress) {
  return new Promise(async (resolve, reject) => {
    const url = buildUrl(endpoint);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = useProxy();

    const token = await getSupabaseToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    if (onProgress) xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress((e.loaded / e.total) * 100); };
    xhr.onload = () => {
      try { const d = JSON.parse(xhr.responseText); if (xhr.status >= 200 && xhr.status < 300) resolve(d); else reject(new Error(d.error || d.message || 'Upload failed')); }
      catch (e) { reject(new Error('Invalid response')); }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}
