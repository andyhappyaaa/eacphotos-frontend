/**
 * 全局配置 - App configuration
 */

const defaults = {
	API_URL: 'https://eac-photo-backend.workers.dev',
	AUTH_SECRET: '',
	TURNSTILE_SITE_KEY: ''
};

// Read from window.__ENV__ if available (Vercel etc.)
let config = { ...defaults };
if (typeof window !== 'undefined') {
	if (window.__ENV__) {
		if (window.__ENV__.VITE_API_URL) config.API_URL = window.__ENV__.VITE_API_URL;
		if (window.__ENV__.VITE_AUTH_SECRET) config.AUTH_SECRET = window.__ENV__.VITE_AUTH_SECRET;
		if (window.__ENV__.VITE_TURNSTILE_SITE_KEY)
			config.TURNSTILE_SITE_KEY = window.__ENV__.VITE_TURNSTILE_SITE_KEY;
	}
	if (window.APP_CONFIG) {
		config = { ...config, ...window.APP_CONFIG };
	}
}

export function getConfig(key, defaultValue) {
	return config[key] || defaultValue || '';
}

export { config };
