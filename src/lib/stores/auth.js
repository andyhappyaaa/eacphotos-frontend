import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { api as apiCall } from '$lib/api';

const SESSION_KEY = 'eacphoto_session';
const REVIEWER_SESSION_KEY = 'eacphoto_reviewer_session';
const SESSION_DURATION = 3 * 24 * 60 * 60 * 1000;

function loadSession() {
	if (!browser) return null;
	try { const raw = localStorage.getItem(SESSION_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
	return null;
}

function saveSession(session) {
	if (!browser || !session) return;
	localStorage.setItem(SESSION_KEY, JSON.stringify({ token: session.token, user: session.user, expiresAt: session.expiresAt, rememberMe: session.rememberMe }));
}

function isSessionExpired(session) { return !session || Date.now() > session.expiresAt; }

const initialSession = loadSession();
if (initialSession && isSessionExpired(initialSession) && browser) localStorage.removeItem(SESSION_KEY);

export const authSession = writable(initialSession && !isSessionExpired(initialSession) ? initialSession : null);

// ── Reviewer ──
function getReviewerSession() {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(REVIEWER_SESSION_KEY); if (!raw) return null;
		const s = JSON.parse(raw);
		if (!s.expiresAt || s.expiresAt < Date.now()) { localStorage.removeItem(REVIEWER_SESSION_KEY); return null; }
		return s;
	} catch (e) { return null; }
}
function isReviewerLoggedIn() { return !!getReviewerSession(); }

// ── OAuth reviewer (cookie-based) ──
// ⚠️ 必须定义在 isLoggedIn / currentUser 之前（这两个 derived 引用了它）
export const reviewerInfo = writable(null);

// authLoading: true = 正在检查登录状态（OAuth cookie / restore），此时应显示加载中而不是跳走
export const authLoading = writable(true);

export const isLoggedIn = derived([authSession, reviewerInfo], ([$s, $r]) => {
	if ($s && !isSessionExpired($s)) return true;
	return !!$r?.authenticated;
});

export const currentUser = derived([authSession, reviewerInfo], ([$s, $r]) => {
	if ($s && $s.user) return $s.user;
	if ($r?.authenticated) return { username: $r.username, email: $r.email, role: $r.role };
	return null;
});

export const isReviewer = derived(reviewerInfo, ($r) => !!$r?.authenticated);
export const reviewerRole = derived(reviewerInfo, ($r) => $r?.role || null);
export const isAdmin = derived(reviewerInfo, ($r) => $r?.is_admin || false);
export const isSuperAdmin = derived(reviewerInfo, ($r) => $r?.is_super_admin || false);

export async function refreshReviewerInfo() {
	if (!browser) return;
	try {
		const r = await fetch('/api/oauth-userinfo', { credentials: 'include' });
		const d = await r.json();
		reviewerInfo.set(d?.authenticated ? d : null);
	} catch (e) {
		reviewerInfo.set(null);
	}
}

// ── Helpers ──
function bufToB64u(buf) {
	let b = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) b += String.fromCharCode(a[i]);
	return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uToBuf(b64) {
	b64 = b64.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '=';
	return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

// ── Actions ──
export function clearSession() {
	authSession.set(null);
	if (browser) { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(REVIEWER_SESSION_KEY); }
}

export async function restoreFromCookie() {
	if (!browser) return;
	try {
		const { buildUrl } = await import('$lib/api');
		const r = await fetch(buildUrl('/api/auth/me'), { credentials: 'include' });
		if (!r.ok) return;
		const d = await r.json();
		if (d.authenticated && d.user) {
			const session = { token: d.token || null, user: d.user, expiresAt: Date.now() + SESSION_DURATION };
			authSession.set(session); saveSession(session);
		}
	} catch (e) {}
}

export async function login(username, password, rememberMe, totpCode = null) {
		// Clear old session to prevent multi-token conflicts
		clearSession();
	const r = await apiCall('/api/auth/login', { method: 'POST', bypassSession: true, body: JSON.stringify({ username, password, rememberMe, totpCode }) });
	const data = await r.json();
	if (!r.ok) throw new Error(data.error || data.message || "Login failed");
	if (data.requires2FA) return { requires2FA: true };
	const expireMs = data.expiresIn ? data.expiresIn * 1000 : SESSION_DURATION;
	const session = { token: data.token, user: data.user, expiresAt: Date.now() + expireMs, rememberMe };
	authSession.set(session); saveSession(session);
	return { success: true };
}

export async function register(username, email, password, emailCode, agreeTerms) {
	const r = await apiCall('/api/auth/register', { method: 'POST', bypassSession: true, body: JSON.stringify({ username, email, password, emailCode, agreeTerms }) });
	const data = await r.json();
	if (!r.ok) throw new Error(data.error || data.message || "Registration failed");
	if (data.token) {
		const session = { token: data.token, user: data.user || { id: data.userId, username, email }, expiresAt: Date.now() + SESSION_DURATION };
		authSession.set(session); saveSession(session);
	}
	return data;
}

export async function loginByEmailCode(email, code, rememberMe) {
	const r = await apiCall('/api/auth/login-by-email-code', { method: 'POST', bypassSession: true, body: JSON.stringify({ email, code, rememberMe }) });
	const data = await r.json();
	if (!r.ok) throw new Error(data.error || data.message || "登录失败");
	const expireMs = data.expiresIn ? data.expiresIn * 1000 : SESSION_DURATION;
	const session = { token: data.token, user: data.user, expiresAt: Date.now() + expireMs, rememberMe };
	authSession.set(session); saveSession(session);
	return { success: true };
}

export async function logout() {
	try { await apiCall('/api/auth/logout', { method: 'POST' }); } catch (e) {}
	clearSession();
	if (browser) {
		// 同时清除 OAuth HttpOnly cookie（通过 Vercel proxy）
		try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
		window.location.href = '/';
	}
}

export async function verify2FA(code) {
	const r = await apiCall('/api/auth/verify-2fa', { method: 'POST', bypassSession: true, body: JSON.stringify({ code }) });
	const data = await r.json();
	if (!r.ok) throw new Error(data.message || 'Verification failed');
	if (data.token) {
		const session = { token: data.token, user: data.user, expiresAt: Date.now() + SESSION_DURATION };
		authSession.set(session); saveSession(session);
	}
	return data;
}

export async function setup2FA() {
  const r = await apiCall('/api/auth/setup-2fa', { method: 'POST' });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || '初始化2FA失败');
  return d;
}
export async function enable2FA(code) {
  const r = await apiCall('/api/auth/enable-2fa', { method: 'POST', body: JSON.stringify({ code }) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || '启用2FA失败');
  return d;
}
export async function disable2FA(code) {
  const r = await apiCall('/api/auth/disable-2fa', { method: 'POST', body: JSON.stringify({ code }) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || '禁用2FA失败');
  return d;
}
export async function sendEmailCode(email) { return (await apiCall('/api/auth/send-email-code', { method: 'POST', bypassSession: true, body: JSON.stringify({ email }) })).json(); }
export async function verifyTurnstile(token) { const r = await apiCall('/api/auth/verify-turnstile', { method: 'POST', bypassSession: true, body: JSON.stringify({ token }) }); return (await r.json()).success; }

// ── Passkey / WebAuthn ──
export async function passkeyLoginOptions(username) {
	const r = await apiCall('/api/webauthn/login-options', { method: 'POST', bypassSession: true, body: JSON.stringify({ username }) });
	const d = await r.json();
	d.publicKey.challenge = b64uToBuf(d.publicKey.challenge);
	if (d.publicKey.allowCredentials) {
		d.publicKey.allowCredentials = d.publicKey.allowCredentials.map((c) => ({ ...c, id: b64uToBuf(c.id) }));
	}
	return d;
}

export async function passkeyLoginVerify(credential, rememberMe) {
	const credJSON = {
		id: credential.id,
		rawId: bufToB64u(credential.rawId),
		type: credential.type,
		response: {
			clientDataJSON: bufToB64u(credential.response.clientDataJSON),
			authenticatorData: bufToB64u(credential.response.authenticatorData),
			signature: bufToB64u(credential.response.signature),
			userHandle: credential.response.userHandle ? bufToB64u(credential.response.userHandle) : null
		}
	};
	const r = await apiCall('/api/webauthn/login-verify', { method: 'POST', bypassSession: true, body: JSON.stringify({ credential: credJSON, rememberMe }) });
	const data = await r.json();
	if (!r.ok) throw new Error(data.error || data.message || "Passkey login failed");
	const expireMs = data.expiresIn ? data.expiresIn * 1000 : SESSION_DURATION;
	const session = { token: data.token, user: data.user, expiresAt: Date.now() + expireMs, rememberMe };
	authSession.set(session); saveSession(session);
	return { success: true };
}

export async function passkeyRegisterOptions() {
	const r = await apiCall('/api/webauthn/register-options', { method: 'POST' });
	const d = await r.json();
	d.publicKey.challenge = b64uToBuf(d.publicKey.challenge);
	d.publicKey.user.id = b64uToBuf(d.publicKey.user.id);
	if (d.publicKey.excludeCredentials) {
		d.publicKey.excludeCredentials = d.publicKey.excludeCredentials.map((c) => ({ ...c, id: b64uToBuf(c.id) }));
	}
	return d;
}

export async function passkeyRegisterVerify(credential) {
	const credJSON = {
		id: credential.id,
		rawId: bufToB64u(credential.rawId),
		type: credential.type,
		response: {
			clientDataJSON: bufToB64u(credential.response.clientDataJSON),
			attestationObject: bufToB64u(credential.response.attestationObject)
		}
	};
	const r = await apiCall('/api/webauthn/register-verify', { method: 'POST', body: JSON.stringify({ credential: credJSON }) });
	const data = await r.json();
	if (!r.ok) throw new Error(data.message || data.error || 'Passkey registration failed');
	return data;
}

export async function listPasskeys() {
	const r = await apiCall('/api/webauthn/list');
	return (await r.json()).credentials || [];
}

export async function deletePasskey(id) { return (await apiCall('/api/webauthn/delete', { method: 'POST', body: JSON.stringify({ id }) })).json(); }

// ── Init ──
if (browser) {
	// 等待 restoreFromCookie + refreshReviewerInfo 两者都完成后标记 authLoading = false
	Promise.allSettled([restoreFromCookie(), refreshReviewerInfo()]).finally(() => {
		authLoading.set(false);
	});

	setInterval(() => {
		let session; authSession.subscribe((s) => (session = s))();
		if (session && isSessionExpired(session)) clearSession();
	}, 60000);
}
