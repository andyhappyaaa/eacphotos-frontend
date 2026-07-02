/**
 * Google Analytics - ported from analytics.js
 * Loads GA script and tracks page views.
 */

export function initAnalytics() {
	// GA tracking can be added here
	// Currently using server-side analytics or a different provider
}

export function trackPageView(path) {
	if (typeof window !== 'undefined' && window.gtag) {
		window.gtag('config', window.GA_MEASUREMENT_ID, {
			page_path: path
		});
	}
}
