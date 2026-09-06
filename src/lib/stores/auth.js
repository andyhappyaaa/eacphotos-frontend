import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { api as apiCall } from '$lib/api';

let _sb = null;
async function sb() {
  if (_sb) return _sb;
  if (!browser) return null;
  const { createClient } = await import('@supabase/supabase-js');
  const url = window.APP_CONFIG?.SUPABASE_URL || '';
  const key = window.APP_CONFIG?.SUPABASE_PUBLISHABLE_KEY || '';
  if (!url || !key) return null;
  _sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return _sb;
}

// ── Stores ──
export const authSession = writable(null);
export const reviewerInfo = writable(null);
export const authLoading = writable(true);

export const isLoggedIn = derived([authSession, reviewerInfo], ([$s, $r]) => !!($s?.user || $r?.authenticated));
export const currentUser = derived([authSession, reviewerInfo], ([$s, $r]) => {
  if ($s?.user) return { id: $s.user.id, email: $s.user.email, username: $s.user.user_metadata?.username || $s.user.email, avatar: $s.user.user_metadata?.avatar_url };
  if ($r?.authenticated) return { username: $r.username, email: $r.email, role: $r.role };
  return null;
});
export const isReviewer = derived(reviewerInfo, ($r) => !!$r?.authenticated);
export const reviewerRole = derived(reviewerInfo, ($r) => $r?.role || null);
export const isAdmin = derived(reviewerInfo, ($r) => $r?.role === 'admin' || $r?.role === 'superadmin');
export const isSuperAdmin = derived(reviewerInfo, ($r) => $r?.role === 'superadmin');

export function clearSession() { authSession.set(null); }
export async function refreshReviewerInfo() {
  if (!browser) return;
  try { const d = await (await fetch('/api/oauth-userinfo', { credentials: 'include' })).json(); reviewerInfo.set(d?.authenticated ? d : null); } catch (e) { reviewerInfo.set(null); }
}

// ── Actions ──
export async function login(email, password) {
  const s = await sb(); if (!s) throw new Error('Supabase not configured');
  const { data, error } = await s.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  authSession.set(data.session);
  return { success: true, user: data.user };
}

// OAuth login via Supabase provider (Google, GitHub, Discord, etc.)
export async function oauthLogin(provider) {
  const s = await sb(); if (!s) throw new Error('Supabase not configured');
  const { error } = await s.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + '/dashboard' }
  });
  if (error) throw new Error(error.message);
}

export async function register(email, password, username) {
  const s = await sb(); if (!s) throw new Error('Supabase not configured');
  const { data, error } = await s.auth.signUp({ email, password, options: { data: { username } } });
  if (error) throw new Error(error.message);
  if (data.session) authSession.set(data.session);
  return data;
}

export async function logout() {
  const s = await sb(); if (s) await s.auth.signOut().catch(() => {});
  authSession.set(null);
  if (browser) { try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {} window.location.href = '/'; }
}

export async function sendPasswordReset(email) {
  const s = await sb(); if (!s) throw new Error('Supabase not configured');
  const { error } = await s.auth.resetPasswordForEmail(email, { redirectTo: (window.location.origin) + '/confirm-password-change' });
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function updatePassword(newPassword) {
  const s = await sb(); if (!s) throw new Error('Supabase not configured');
  const { error } = await s.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function sendEmailCode(_email) { return { success: true }; }
export async function verifyTurnstile(token) {
  const r = await apiCall('/api/auth/verify-turnstile', { method: 'POST', bypassSession: true, body: JSON.stringify({ token }) });
  return (await r.json()).success;
}

// 2FA
export async function setup2FA() {
  const s = await sb(); if (!s) throw new Error('Supabase not configured');
  const { data, error } = await s.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw new Error(error.message);
  return { id: data.id, secret: data.totp?.secret, qr_code: data.totp?.qr_code };
}
export async function enable2FA(factorId, code) {
  const s = await sb(); if (!s) throw new Error('Supabase not configured');
  const { data, error } = await s.auth.mfa.challenge({ factorId });
  if (error) throw new Error(error.message);
  const { error: ve } = await s.auth.mfa.verify({ factorId, challengeId: data.id, code });
  if (ve) throw new Error(ve.message);
  return { success: true };
}
export async function disable2FA(factorId) {
  const s = await sb(); if (!s) throw new Error('Supabase not configured');
  const { error } = await s.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
  return { success: true };
}
export async function loginWith2FA(factorId, code) {
  const s = await sb(); if (!s) throw new Error('Supabase not configured');
  const { data, error } = await s.auth.mfa.challenge({ factorId });
  if (error) throw new Error(error.message);
  const { data: vd, error: ve } = await s.auth.mfa.verify({ factorId, challengeId: data.id, code });
  if (ve) throw new Error(ve.message);
  authSession.set(vd);
  return { success: true };
}
export async function verify2FA(_code) { return { success: true }; }

// Passkey
export async function passkeyLoginOptions() {
  const s = await sb(); if (!s) return null;
  const { data, error } = await s.auth.signInWithPasskey();
  if (error) throw new Error(error.message);
  authSession.set(data.session);
  return { success: true };
}
export async function passkeyRegisterOptions() {
  const s = await sb(); if (!s) return { publicKey: {} };
  return { publicKey: {} };
}
export async function passkeyRegisterVerify(_cred) { return { success: true }; }
export async function listPasskeys() {
  const s = await sb(); if (!s) return [];
  const { data } = await s.auth.mfa.listFactors();
  return (data?.totp || []).map((f) => ({ id: f.id, device_name: f.friendly_name || '2FA', created_at: f.created_at }));
}
export async function deletePasskey(id) {
  const s = await sb(); if (!s) throw new Error('Supabase not configured');
  const { error } = await s.auth.mfa.unenroll({ factorId: id });
  if (error) throw new Error(error.message);
  return { success: true };
}

// Init
if (browser) {
  Promise.all([
    (async () => {
      const s = await sb();
      if (!s) return;
      const { data, error } = await s.auth.getSession();
      if (error) { authSession.set(null); return; }
      if (!data.session) { authSession.set(null); return; }

      // Never trust a stale cached session blindly. Validate the user against
      // Supabase so an old/expired mobile session cannot make the UI look
      // logged in while API requests are actually unauthorized.
      const { data: userData, error: userError } = await s.auth.getUser(data.session.access_token);
      if (userError || !userData?.user) {
        await s.auth.signOut().catch(() => {});
        authSession.set(null);
        return;
      }
      authSession.set(data.session);
    })(),
    refreshReviewerInfo()
  ]).finally(() => authLoading.set(false));

  sb().then(s => { if (s) s.auth.onAuthStateChange((_ev, session) => authSession.set(session)); });
}
