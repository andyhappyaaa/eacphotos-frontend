import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { api as apiCall } from '$lib/api';

/**
 * Auth store - wraps existing Auth logic in Svelte reactivity.
 *
 * Manages user session: login, register, logout, session persistence.
 * Uses HttpOnly cookie in production + localStorage fallback for dev.
 */

const SESSION_KEY = 'eacphoto_session';
const REVIEWER_SESSION_KEY = 'eacphoto_reviewer_session';
const SESSION_DURATION = 3 * 24 * 60 * 60 * 1000;

// Load initial session from localStorage
function loadSession() {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (raw) return JSON.parse(raw);
	} catch (e) {
		/* ignore */
	}
	return null;
}

function saveSession(session) {
	if (!browser) return;
	if (session) {
		localStorage.setItem(
			SESSION_KEY,
			JSON.stringify({
				token: session.token,
				user: session.user,
				expiresAt: session.expiresAt,
				rememberMe: session.rememberMe
			})
		);
	}
}

function isSessionExpired(session) {
	return !session || Date.now() > session.expiresAt;
}

// Create the writable store
const initialSession = loadSession();
if (initialSession && isSessionExpired(initialSession)) {
	if (browser) localStorage.removeItem(SESSION_KEY);
}

export const authSession = writable(
	initialSession && !isSessionExpired(initialSession) ? initialSession : null
);

export const isLoggedIn = derived(authSession, ($s) => {
	if ($s && !isSessionExpired($s)) return true;
	// Also check reviewer session
	return isReviewerLoggedIn();
});

export const currentUser = derived(authSession, ($s) => {
	if ($s && $s.user) return $s.user;
	const rs = getReviewerSession();
	return rs ? rs.user : null;
});

// ── Reviewer session ──
function getReviewerSession() {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(REVIEWER_SESSION_KEY);
		if (!raw) return null;
		const s = JSON.parse(raw);
		if (!s.expiresAt || s.expiresAt < Date.now()) {
			localStorage.removeItem(REVIEWER_SESSION_KEY);
			return null;
		}
		return s;
	} catch (e) {
		return null;
	}
}

function isReviewerLoggedIn() {
	return !!getReviewerSession();
}

// ── Actions ──

export function clearSession() {
	authSession.set(null);
	if (browser) {
		localStorage.removeItem(SESSION_KEY);
		localStorage.removeItem(REVIEWER_SESSION_KEY);
	}
}

export async function restoreFromCookie() {
	if (!browser) return;
	try {
		const r = await fetch('/api/auth/me', { credentials: 'include' });
		if (!r.ok) return;
		const d = await r.json();
		if (d.authenticated && d.user) {
			const session = {
				token: d.token || null,
				user: d.user,
				expiresAt: Date.now() + SESSION_DURATION
			};
			authSession.set(session);
			saveSession(session);
		}
	} catch (e) {
		/* ignore */
	}
}

export async function login(username, password, rememberMe, totpCode = null) {
	const r = await apiCall('/api/auth/login', {
		method: 'POST',
		bypassSession: true,
		body: JSON.stringify({ username, password, rememberMe, totpCode })
	});
	const data = await r.json();
	if (!r.ok) throw new Error(data.message || data.error || 'Login failed');
	if (data.requires2FA) return { requires2FA: true };

	const expireMs = data.expiresIn ? data.expiresIn * 1000 : SESSION_DURATION;
	const session = {
		token: data.token,
		user: data.user,
		expiresAt: Date.now() + expireMs,
		rememberMe
	};
	authSession.set(session);
	saveSession(session);
	return { success: true };
}

export async function register(username, email, password, emailCode, agreeTerms) {
	const r = await apiCall('/api/auth/register', {
		method: 'POST',
		bypassSession: true,
		body: JSON.stringify({ username, email, password, emailCode, agreeTerms })
	});
	const data = await r.json();
	if (!r.ok) throw new Error(data.message || data.error || 'Registration failed');
	if (data.token) {
		const session = {
			token: data.token,
			user: data.user || { id: data.userId, username, email },
			expiresAt: Date.now() + SESSION_DURATION
		};
		authSession.set(session);
		saveSession(session);
	}
	return data;
}

export async function logout() {
	try {
		await apiCall('/api/auth/logout', { method: 'POST' });
	} catch (e) {
		/* ignore */
	}
	clearSession();
	if (browser) window.location.href = '/';
}

export async function verify2FA(code) {
	const r = await apiCall('/api/auth/verify-2fa', {
		method: 'POST',
		bypassSession: true,
		body: JSON.stringify({ code })
	});
	const data = await r.json();
	if (!r.ok) throw new Error(data.message || 'Verification failed');

	if (data.token) {
		const session = {
			token: data.token,
			user: data.user,
			expiresAt: Date.now() + SESSION_DURATION
		};
		authSession.set(session);
		saveSession(session);
	}
	return data;
}

export async function setup2FA() {
	return (await apiCall('/api/auth/setup-2fa', { method: 'POST' })).json();
}

export async function enable2FA(code) {
	return (
		await apiCall('/api/auth/enable-2fa', {
			method: 'POST',
			body: JSON.stringify({ code })
		})
	).json();
}

export async function sendEmailCode(email) {
	return (
		await apiCall('/api/auth/send-email-code', {
			method: 'POST',
			bypassSession: true,
			body: JSON.stringify({ email })
		})
	).json();
}

export async function verifyTurnstile(token) {
	const r = await apiCall('/api/auth/verify-turnstile', {
		method: 'POST',
		bypassSession: true,
		body: JSON.stringify({ token })
	});
	return (await r.json()).success;
}

// ── Init ──
if (browser) {
	// Try to restore from cookie on page load
	restoreFromCookie();

	// Periodically check session validity
	setInterval(() => {
		const s = getCurrentSession();
		if (s && isSessionExpired(s)) {
			clearSession();
		}
	}, 60000);
}

function getCurrentSession() {
	let session;
	authSession.subscribe((s) => (session = s))();
	return session;
}
