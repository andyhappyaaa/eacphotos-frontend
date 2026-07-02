import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Theme store - manages dark/light mode.
 * Toggles 'dark' class on <html> element.
 */

const THEME_KEY = 'eacphoto_theme';

function getInitialTheme() {
	if (!browser) return 'light';
	const saved = localStorage.getItem(THEME_KEY);
	if (saved === 'dark' || saved === 'light') return saved;
	// Check system preference
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const theme = writable(getInitialTheme());

function applyTheme(t) {
	if (!browser) return;
	const html = document.documentElement;
	html.classList.remove('light', 'dark');
	html.classList.add(t);
}

export function setTheme(t) {
	if (t !== 'dark' && t !== 'light') return;
	theme.set(t);
	if (browser) {
		localStorage.setItem(THEME_KEY, t);
		applyTheme(t);
		// Dispatch event for external components (e.g., Turnstile)
		try {
			window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
		} catch (e) {
			/* ignore */
		}
	}
}

export function toggleTheme() {
	let current;
	theme.subscribe((t) => (current = t))();
	setTheme(current === 'light' ? 'dark' : 'light');
}

// Apply initial theme
if (browser) {
	applyTheme(getInitialTheme());

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		if (!localStorage.getItem(THEME_KEY)) {
			setTheme(e.matches ? 'dark' : 'light');
		}
	});
}
