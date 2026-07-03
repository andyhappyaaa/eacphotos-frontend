import { authSession, clearSession } from '$lib/stores/auth';
import { get } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * API helper - ported from original auth.js Auth.api()
 *
 * Dev mode (localhost): builds relative URLs, Vite dev server proxies /api → backend
 * Production: routes through /api/proxy Vercel serverless function
 */

export function useProxy() {
	if (!browser) return false;
	const host = window.location.hostname;
	return host !== 'localhost' && !host.startsWith('127.0.0.1');
}

export function buildUrl(endpoint) {
	if (useProxy()) {
		// Production: route through /api/proxy Vercel serverless function
		return '/api/proxy' + endpoint.slice(4);
	}
	// Dev: relative URL, Vite dev server proxies /api to backend
	return endpoint;
}

/**
 * Generate TOTP codes for dev mode authentication
 */
async function generateTOTP(secret, timeOffset = 0) {
	const ts = Math.floor(Date.now() / 1000) + timeOffset;
	const step = Math.floor(ts / 30);

	// Base32 decode the secret
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const counter = new ArrayBuffer(8);
	const view = new DataView(counter);
	view.setUint32(4, step, false);

	const sig = await crypto.subtle.sign('HMAC', key, counter);
	const a = new Uint8Array(sig);
	const off = a[a.length - 1] & 0x0f;

	return (
		(((a[off] & 0x7f) << 24) |
			((a[off + 1] & 0xff) << 16) |
			((a[off + 2] & 0xff) << 8) |
			(a[off + 3] & 0xff)) %
		1000000
	);
}

/**
 * Get authentication headers for API requests
 */
export async function getAuthHeaders(bypassSession = false) {
	const headers = { 'Content-Type': 'application/json' };

	// Dev mode: generate TOTP codes for backend authentication
	if (browser && !useProxy()) {
		const sec = (window.APP_CONFIG && window.APP_CONFIG.AUTH_SECRET) || '';
		if (sec) {
			const codes = await Promise.all([
				generateTOTP(sec, -30),
				generateTOTP(sec, 0),
				generateTOTP(sec, 30)
			]);
			headers['X-Auth-Codes'] = codes.join(',');
			headers['X-Auth-Timestamp'] = Date.now().toString();
		}
	}

	// Bearer token from session
	if (!bypassSession && browser) {
		const session = get(authSession);
		if (session && session.token) {
			headers['Authorization'] = `Bearer ${session.token}`;
		}
	}

	return headers;
}

/**
 * Main API call function
 */
export async function api(endpoint, options = {}) {
	const url = buildUrl(endpoint);
	const bypassSession = options.bypassSession || false;
	const headers = await getAuthHeaders(bypassSession);

	const fetchOpts = {
		...options,
		headers: { ...headers, ...(options.headers || {}) },
		credentials: useProxy() ? 'include' : 'omit'
	};

	const r = await fetch(url, fetchOpts);

	if (r.status === 401) {
		if (browser) {
			clearSession();
		}
		if (!options.noRedirect && browser) {
			window.location.href = '/login';
		}
		throw new Error('Unauthorized');
	}

	return r;
}

/**
 * Upload a file with progress tracking
 * @param {string} endpoint
 * @param {FormData} formData
 * @param {function} onProgress
 * @returns {Promise<any>}
 */
export async function uploadWithProgress(endpoint, formData, onProgress) {
	return new Promise(async (resolve, reject) => {
		const url = buildUrl(endpoint);
		const xhr = new XMLHttpRequest();
		xhr.open('POST', url);
		xhr.withCredentials = useProxy();

		// Add auth headers for dev mode
		if (!useProxy() && browser) {
			const session = get(authSession);
			if (session && session.token) {
				xhr.setRequestHeader('Authorization', `Bearer ${session.token}`);
			}
			const sec = (window.APP_CONFIG && window.APP_CONFIG.AUTH_SECRET) || '';
			const codes = await Promise.all([
				generateTOTP(sec, -30),
				generateTOTP(sec, 0),
				generateTOTP(sec, 30)
			]);
			xhr.setRequestHeader('X-Auth-Codes', codes.join(','));
			xhr.setRequestHeader('X-Auth-Timestamp', Date.now().toString());
		}

		if (onProgress) {
			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
			};
		}

		xhr.onload = () => {
			try {
				const d = JSON.parse(xhr.responseText);
				if (xhr.status >= 200 && xhr.status < 300) resolve(d);
				else reject(new Error(d.message || d.error || 'Upload failed'));
			} catch (e) {
				reject(new Error('Invalid response'));
			}
		};

		xhr.onerror = () => reject(new Error('Network error'));
		xhr.send(formData);
	});
}
