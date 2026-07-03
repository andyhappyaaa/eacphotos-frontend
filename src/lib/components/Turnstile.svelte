<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	/**
	 * Turnstile CAPTCHA wrapper component.
	 * Ported from turnstile-init.js.
	 */

	let { containerId = 'turnstile-container', onSuccess = () => {}, onExpired = () => {}, onError = () => {}, submitButton = null, onReady } = $props();

	let containerEl = $state(null);
	let widgetId = $state(null);
	let token = $state(null);
	let turnstileLoaded = $state(false);
	let siteKey = $state('');

	function getSiteKey() {
		if (!browser) return '';
		const raw = window.APP_CONFIG?.TURNSTILE_SITE_KEY || '';
		const cleaned = String(raw).trim();
		return cleaned;
	}

	function renderWidget() {
		if (!browser || typeof window.turnstile === 'undefined' || !containerEl) return;

		try {
			siteKey = getSiteKey();
			if (!siteKey) return;

			const themeMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

			widgetId = window.turnstile.render(containerEl, {
				sitekey: siteKey,
				theme: themeMode,
				appearance: 'always',
				retry: 'auto',
				'retry-interval': 8000,
				'refresh-expired': 'auto',
				callback: (tk) => {
					token = tk;
					if (submitButton) submitButton.disabled = false;
					onSuccess(tk);
				},
				'expired-callback': () => {
					token = null;
					if (submitButton) submitButton.disabled = true;
					onExpired();
				},
				'error-callback': (err) => {
					token = null;
					onError(String(err));
				}
			});
		} catch (e) {
			console.error('[Turnstile] Render error:', e);
		}
	}

	function loadTurnstileScript() {
		if (!browser) return;
		if (typeof window.turnstile !== 'undefined') {
			turnstileLoaded = true;
			renderWidget();
			return;
		}

		const existing = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/"]');
		if (existing) {
			existing.addEventListener('load', () => {
				turnstileLoaded = true;
				renderWidget();
			});
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
		script.async = true;
		script.defer = true;
		script.onload = () => {
			turnstileLoaded = true;
			renderWidget();
		};
		document.head.appendChild(script);
	}

	onMount(() => {
		loadTurnstileScript();

		// Re-render on theme change
		const handleThemeChange = () => {
			if (widgetId !== null && window.turnstile) {
				try { window.turnstile.remove(widgetId); } catch (e) {}
				renderWidget();
			}
		};

		window.addEventListener('themechange', handleThemeChange);

		onDestroy(() => {
			window.removeEventListener('themechange', handleThemeChange);
			if (widgetId !== null && window.turnstile) {
				try { window.turnstile.remove(widgetId); } catch (e) {}
			}
		});

		// Expose API
		if (onReady) {
			onReady({
				getToken: () => token,
				reset: () => {
					token = null;
					if (window.turnstile && widgetId !== null) {
						try { window.turnstile.reset(widgetId); } catch (e) {}
					}
					if (submitButton) submitButton.disabled = true;
				},
				required: () => !!siteKey
			});
		}
	});
</script>

<div id={containerId} bind:this={containerEl} class="min-h-[65px]">
	{#if siteKey && !turnstileLoaded}
		<div class="flex items-center justify-center py-4">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
		</div>
	{/if}
</div>
