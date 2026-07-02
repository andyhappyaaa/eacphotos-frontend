/**
 * Shared utility functions.
 */

export function escapeHtml(text) {
	if (!text) return '';
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

export function formatDate(ts, locale = 'zh-CN') {
	if (!ts) return '';
	try { return new Date(ts).toLocaleDateString(locale); }
	catch (e) { return ''; }
}

export function formatDateTime(v) {
	if (!v) return '';
	const d = v instanceof Date ? v : new Date(v);
	if (isNaN(d.getTime())) return '';
	return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function takeSlice(arr, offset, n) {
	if (!arr.length) return [];
	const out = [];
	for (let i = 0; i < n && i < arr.length; i++) {
		out.push(arr[(offset + i) % arr.length]);
	}
	return out;
}

/**
 * Animate a number counting up — Svelte 5 safe.
 * Uses a promise that resolves after the animation completes.
 * The caller should use $state to track the display value.
 */
export function createCountUp(target, duration = 1000) {
	// Returns an object with a .current reactive getter and a .start() method
	let rafId;
	let resolved = false;

	const api = {
		current: 0,
		start() {
			const startTime = performance.now();
			const step = (now) => {
				const elapsed = now - startTime;
				const progress = Math.min(elapsed / duration, 1);
				const ease = 1 - Math.pow(1 - progress, 3);
				api.current = Math.floor(target * ease);
				if (progress < 1) {
					rafId = requestAnimationFrame(step);
				} else {
					api.current = target;
				}
			};
			rafId = requestAnimationFrame(step);
		},
		stop() {
			if (rafId) cancelAnimationFrame(rafId);
			api.current = target;
		}
	};
	return api;
}

export function getLogoUrl(theme = 'light') {
	return theme === 'dark'
		? 'https://r2.eacof.org/logo-dark.png'
		: 'https://r2.eacof.org/logo-light.png';
}

export function getPhotoCardData(photo) {
	return {
		id: photo.id,
		thumbnail: photo.thumbnail || photo.url,
		title: photo.title || 'Untitled',
		aircraftType: photo.aircraft_type || photo.aircraftType || 'N/A',
		registration: photo.registration || 'N/A',
		airline: photo.airline || '',
		location: photo.location || '',
		views: photo.views || 0,
		likes: photo.likes || 0,
		url: `/photo/${photo.id}`
	};
}
