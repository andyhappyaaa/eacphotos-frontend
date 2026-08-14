import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { api as apiCall } from '$lib/api';

// ── 主站作为 OAuth 客户端：登录态 = localStorage 里的 Supabase OAuth access_token ──
const TOKEN_KEY = 'eac_oauth_access_token';
const REFRESH_KEY = 'eac_oauth_refresh_token';

export const authSession = writable(null);
export const reviewerInfo = writable(null);
export const authLoading = writable(true);

export const isLoggedIn = derived([authSession, reviewerInfo], ([$s, $r]) => !!($s?.user || $r?.authenticated));
export const currentUser = derived([authSession, reviewerInfo], ([$s, $r]) => {
  if ($s?.user) return $s.user;
  if ($r?.authenticated) return { username: $r.username, email: $r.email, role: $r.role };
  return null;
});
export const isReviewer = derived(reviewerInfo, ($r) => !!$r?.authenticated);
export const reviewerRole = derived(reviewerInfo, ($r) => $r?.role || null);
export const isAdmin = derived(reviewerInfo, ($r) => $r?.role === 'admin' || $r?.role === 'superadmin');
export const isSuperAdmin = derived(reviewerInfo, ($r) => $r?.role === 'superadmin');

function getToken() { return browser ? localStorage.getItem(TOKEN_KEY) : null; }

export function clearSession() {
  authSession.set(null);
  if (browser) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}

export async function refreshReviewerInfo() {
  if (!browser) return;
  try {
    const d = await (await fetch('/api/oauth-userinfo', { credentials: 'include' })).json();
    reviewerInfo.set(d?.authenticated ? d : null);
  } catch (e) { reviewerInfo.set(null); }
}

// 从 OAuth access_token 解析用户信息（调 Supabase userinfo）
async function fetchUserFromToken(token) {
  const supabaseUrl = (window.APP_CONFIG?.SUPABASE_URL || '').replace(/\/$/, '');
  const resp = await fetch(supabaseUrl + '/auth/v1/oauth/userinfo', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!resp.ok) return null;
  const d = await resp.json();
  return { id: d.sub, email: d.email, username: d.email?.split('@')[0] || d.sub };
}

export async function restoreSession() {
  if (!browser) return;
  try {
    const token = getToken();
    if (token) {
      const user = await fetchUserFromToken(token).catch(() => null);
      if (user) authSession.set({ access_token: token, user });
      else clearSession(); // token 失效
    }
    await refreshReviewerInfo();
  } catch (e) { /* ignore */ }
  finally { authLoading.set(false); }
}

// ── Actions ──
export async function logout() {
  clearSession();
  if (browser) {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
    // 同步清 auth.eacof.org 的 Supabase session（iframe 加载 /logout）
    try {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://auth.eacof.org/logout';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 3000);
    } catch (e) {}
    window.location.href = '/';
  }
}

export async function sendPasswordReset(_email) { return { success: true }; }
export async function verifyTurnstile(token) {
  const r = await apiCall('/api/auth/verify-turnstile', { method: 'POST', bypassSession: true, body: JSON.stringify({ token }) });
  return (await r.json()).success;
}

// 兼容旧调用（已迁移到 auth worker，主站不再直接用）
export async function login() { throw new Error('请通过 auth.eacof.org 登录'); }
export async function register() { throw new Error('请通过 auth.eacof.org 注册'); }
export async function oauthLogin() { throw new Error('请通过 auth.eacof.org 登录'); }
export async function setup2FA() { throw new Error('请在 auth.eacof.org 管理 2FA'); }
export async function enable2FA() { throw new Error('请在 auth.eacof.org 管理 2FA'); }
export async function disable2FA() { throw new Error('请在 auth.eacof.org 管理 2FA'); }
export async function loginWith2FA() { throw new Error('请在 auth.eacof.org 登录'); }
export async function verify2FA() { throw new Error('请在 auth.eacof.org 登录'); }
export async function passkeyLoginOptions() { throw new Error('请在 auth.eacof.org 登录'); }
export async function passkeyRegisterOptions() { return { publicKey: {} }; }
export async function passkeyRegisterVerify() { return { success: true }; }
export async function listPasskeys() { return []; }
export async function deletePasskey() { return { success: true }; }
export async function sendEmailCode() { return { success: true }; }
export async function updatePassword() { return { success: true }; }

// Init
if (browser) {
  restoreSession();
}
