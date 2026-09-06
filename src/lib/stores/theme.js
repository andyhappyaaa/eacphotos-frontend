import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Theme store — dark/light mode with system-following.
 *
 * Priority: localStorage > system preference > light
 * When no saved preference exists, follows prefers-color-scheme automatically.
 */

const THEME_KEY = 'eacphoto_theme';

function getSystemTheme() {
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme() {
	if (!browser) return 'light';
	const saved = localStorage.getItem(THEME_KEY);
	if (saved === 'dark' || saved === 'light') return saved;
	// No saved preference => follow system
	return getSystemTheme();
}

export const theme = writable(getInitialTheme());

function applyTheme(t) {
	if (!browser) return;
	const html = document.documentElement;
	html.classList.remove('light', 'dark');
	html.classList.add(t);
	html.setAttribute('data-theme', t);
	// Also update <meta name="theme-color"> for mobile browser chrome
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.content = t === 'dark' ? '#0f172a' : '#2563eb';
}

export function setTheme(t) {
	if (t !== 'dark' && t !== 'light') return;
	theme.set(t);
	if (browser) {
		localStorage.setItem(THEME_KEY, t);
		// Enable a short, smooth color transition only for an intentional theme switch.
		const html = document.documentElement;
		html.classList.add('theme-transition');
		applyTheme(t);
		window.setTimeout(() => html.classList.remove('theme-transition'), 380);
		window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
	}
}

export function toggleTheme() {
	let current;
	theme.subscribe((t) => (current = t))();
	setTheme(current === 'dark' ? 'light' : 'dark');
}

// ── Init ──
if (browser) {
	applyTheme(getInitialTheme());

	// Live system theme following: only when user hasn't manually chosen
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		const saved = localStorage.getItem(THEME_KEY);
		if (!saved) {
			const t = e.matches ? 'dark' : 'light';
			theme.set(t);
			applyTheme(t);
		}
	});
}
