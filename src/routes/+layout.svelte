<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Announcement from '$lib/components/Announcement.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { t } from '$lib/stores/i18n';
	import { initAnalytics } from '$lib/analytics';

	if (browser) {
		if (!window.APP_CONFIG) window.APP_CONFIG = {};
		if (window.__ENV__) {
			window.APP_CONFIG.API_URL = window.__ENV__.VITE_API_URL || '';
			window.APP_CONFIG.AUTH_SECRET = window.__ENV__.VITE_AUTH_SECRET || '';
			window.APP_CONFIG.TURNSTILE_SITE_KEY = window.__ENV__.VITE_TURNSTILE_SITE_KEY || '';
		}
	}

	onMount(() => { initAnalytics(); });

	let { children } = $props();
</script>

<Toaster />
<div class="flex min-h-screen flex-col">
	<Navbar t={$t} />
	<main class="flex-1">{@render children()}</main>
	<Footer t={$t} />
</div>
<Announcement />
