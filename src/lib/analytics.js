/**
 * Google Analytics 4 + Microsoft Clarity
 * Respects Do Not Track settings.
 *
 * Reads config from window.APP_CONFIG (injected by /api/env):
 *   GA_MEASUREMENT_ID  — G-XXXXXXXXXX
 *   CLARITY_PROJECT_ID — Clarity project ID
 *
 * Call initAnalytics() once in the root layout.
 */

export function initAnalytics() {
	if (typeof window === 'undefined') return;
	if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

	const cfg = window.APP_CONFIG || {};
	const GA_ID = cfg.GA_MEASUREMENT_ID || '';
	const CLARITY_ID = cfg.CLARITY_PROJECT_ID || '';

	// Google Analytics 4
	if (GA_ID) {
		const s = document.createElement('script');
		s.async = true;
		s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
		document.head.appendChild(s);

		window.dataLayer = window.dataLayer || [];
		window.gtag = function () { window.dataLayer.push(arguments); };
		window.gtag('js', new Date());
		window.gtag('config', GA_ID, { anonymize_ip: true, send_page_view: true });
	}

	// Microsoft Clarity
	if (CLARITY_ID) {
		(function (c, l, a, r, i, t, y) {
			c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
			t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
			y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
		})(window, document, 'clarity', 'script', CLARITY_ID);
	}

	// Global trackEvent helper
	window.trackEvent = function (eventName, params) {
		try {
			if (window.gtag) window.gtag('event', eventName, params || {});
			if (window.clarity) window.clarity('event', eventName);
		} catch (e) { /* ignore */ }
	};
}

export function trackPageView(path) {
	if (typeof window !== 'undefined' && window.gtag) {
		window.gtag('config', (window.APP_CONFIG || {}).GA_MEASUREMENT_ID || '', { page_path: path });
	}
}
