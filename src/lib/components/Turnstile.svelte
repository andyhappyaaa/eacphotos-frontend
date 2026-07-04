<script>
	import { onMount, onDestroy } from 'svelte';

	let { containerId = 'turnstile-container', onSuccess = () => {}, onExpired = () => {}, onError = () => {}, submitButton = null, onReady } = $props();

	let containerEl = $state(null);
	let widgetId = $state(null);
	let token = $state(null);
	let loaded = $state(false);       // Cloudflare script loaded
	let rendered = $state(false);     // widget rendered into DOM
	let siteKey = $state('');

	function getSiteKey() {
		return String((window.APP_CONFIG?.TURNSTILE_SITE_KEY) || '').trim();
	}

	function renderWidget() {
		if (!containerEl || typeof window.turnstile === 'undefined') return;

		const key = getSiteKey();
		siteKey = key;
		if (!key) {
			console.warn('[Turnstile] No site key — /api/env may not have loaded yet, retrying...');
			// Retry after APP_CONFIG loads (env script is async in some deployments)
			setTimeout(() => {
				const retryKey = getSiteKey();
				siteKey = retryKey;
				if (retryKey) renderWidget();
			}, 1500);
			return;
		}

		try {
			if (widgetId !== null) {
				try { window.turnstile.remove(widgetId); } catch (e) {}
				widgetId = null;
			}

			const themeMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
			widgetId = window.turnstile.render(containerEl, {
				sitekey: key,
				theme: themeMode,
				appearance: 'always',
				retry: 'auto',
				'retry-interval': 8000,
				'refresh-expired': 'auto',
				callback: (tk) => { token = tk; onSuccess(tk); },
				'expired-callback': () => { token = null; onExpired(); },
				'error-callback': (err) => { token = null; onError?.(String(err)); }
			});
			rendered = true;
		} catch (e) {
			console.error('[Turnstile] Render error:', e);
		}
	}

	function loadTurnstileScript() {
		if (typeof window.turnstile !== 'undefined') {
			loaded = true;
			renderWidget();
			return;
		}
		const existing = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/"]');
		if (existing) {
			if (existing.dataset.loaded) { loaded = true; renderWidget(); return; }
			existing.addEventListener('load', () => { existing.dataset.loaded = '1'; loaded = true; renderWidget(); });
			return;
		}
		const script = document.createElement('script');
		script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
		script.async = true;
		script.onload = () => { loaded = true; renderWidget(); };
		script.onerror = () => console.error('[Turnstile] Failed to load Cloudflare script');
		document.head.appendChild(script);
	}

	onMount(() => {
		loadTurnstileScript();

		const handleThemeChange = () => { if (widgetId !== null) renderWidget(); };
		window.addEventListener('themechange', handleThemeChange);

		// Expose API for parent
		if (onReady) {
			onReady({
				getToken: () => token,
				reset: () => {
					token = null;
					if (window.turnstile && widgetId !== null) {
						try { window.turnstile.reset(widgetId); } catch (e) {}
					} else {
						// re-render if reset was called before widget ready
						siteKey = getSiteKey();
						if (siteKey && loaded) renderWidget();
					}
				}
			});
		}

		onDestroy(() => {
			window.removeEventListener('themechange', handleThemeChange);
			if (widgetId !== null && window.turnstile) {
				try { window.turnstile.remove(widgetId); } catch (e) {}
			}
		});
	});
</script>

<div id={containerId} bind:this={containerEl} class="min-h-[65px]">
	{#if siteKey && !rendered}
		<div class="flex items-center justify-center py-4">
			<div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
		</div>
	{:else if !siteKey && loaded}
		<!-- /api/env loaded but no TURNSTILE_SITE_KEY configured — OK in local dev -->
	{/if}
</div>
