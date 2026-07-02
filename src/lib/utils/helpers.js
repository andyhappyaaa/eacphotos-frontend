/**
 * Shared utility functions - ported from the original vanilla JS.
 */

/**
 * Escape HTML to prevent XSS
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
	if (!text) return '';
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Format a date string/timestamp for display
 * @param {string|number|Date} ts
 * @param {string} locale
 * @returns {string}
 */
export function formatDate(ts, locale = 'zh-CN') {
	if (!ts) return '';
	try {
		return new Date(ts).toLocaleDateString(locale);
	} catch (e) {
		return '';
	}
}

/**
 * Format a date/time string for display
 * @param {*} v
 * @returns {string}
 */
export function formatDateTime(v) {
	if (!v) return '';
	const d = v instanceof Date ? v : new Date(v);
	if (isNaN(d.getTime())) return '';
	return d.toLocaleString('zh-CN', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Take a cyclic slice from an array
 * @param {Array} arr
 * @param {number} offset
 * @param {number} n
 * @returns {Array}
 */
export function takeSlice(arr, offset, n) {
	if (!arr.length) return [];
	const out = [];
	for (let i = 0; i < n && i < arr.length; i++) {
		out.push(arr[(offset + i) % arr.length]);
	}
	return out;
}

/**
 * Animate a number counting up
 * @param {number} target
 * @param {function} onFrame - called with current value each frame
 * @param {number} duration
 */
export function animateNumber(target, onFrame, duration = 1000) {
	const startTime = performance.now();
	const start = 0;

	function update(currentTime) {
		const elapsed = currentTime - startTime;
		const progress = Math.min(elapsed / duration, 1);
		const easeOut = 1 - Math.pow(1 - progress, 3);
		const current = Math.floor(start + (target - start) * easeOut);
		onFrame(current);
		if (progress < 1) {
			requestAnimationFrame(update);
		}
	}

	requestAnimationFrame(update);
}

/**
 * Get default logo URL based on theme
 * @param {string} theme - 'light' or 'dark'
 * @returns {string}
 */
export function getLogoUrl(theme = 'light') {
	return theme === 'dark'
		? 'https://r2.eacof.org/logo-dark.png'
		: 'https://r2.eacof.org/logo-light.png';
}

/**
 * Create a photo card HTML (for use in non-Svelte contexts)
 * @param {object} photo
 * @returns {object} photo card data
 */
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
