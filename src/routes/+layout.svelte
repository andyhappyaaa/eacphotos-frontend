<script>
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/state';
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Announcement from '$lib/components/Announcement.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { t } from '$lib/stores/i18n';
	import { initAnalytics } from '$lib/analytics';
	import { isLoggedIn, authLoading } from '$lib/stores/auth';

	if (browser) {
		if (!window.APP_CONFIG) window.APP_CONFIG = {};
		if (window.__ENV__) {
			window.APP_CONFIG.API_URL = window.__ENV__.VITE_API_URL || '';
			window.APP_CONFIG.AUTH_SECRET = window.__ENV__.VITE_AUTH_SECRET || '';
			window.APP_CONFIG.TURNSTILE_SITE_KEY = window.__ENV__.VITE_TURNSTILE_SITE_KEY || '';
		}
	}

	const protectedPaths = ['/upload', '/dashboard', '/profile', '/settings', '/review'];

	let authCheckInterval;
	let announcementReady = $state(false);
	let authUnsubscribe;
	onMount(() => {
		initAnalytics();

		// 认证初始化完成后立即检查受保护页面，避免未登录用户在上传页停留等待。
		// 不再依赖 30 秒轮询作为首次鉴权。
		authUnsubscribe = authLoading.subscribe((loading) => {
			if (!loading && !get(isLoggedIn)) {
				const path = page.url.pathname;
				if (protectedPaths.some(p => path.startsWith(p))) {
						window.location.replace('/login');
				}
			}
		});

		// 作为登录状态在页面停留期间失效后的兜底检查。
		authCheckInterval = setInterval(() => {
			if (!get(isLoggedIn)) {
				const path = page.url.pathname;
				if (protectedPaths.some(p => path.startsWith(p))) {
					window.location.replace('/login');
				}
			}
		}, 30000);
	});
	onDestroy(() => {
		if (authUnsubscribe) authUnsubscribe();
		if (authCheckInterval) clearInterval(authCheckInterval);
	});

	let { children } = $props();
</script>

<Toaster />
<div class="flex min-h-screen flex-col">
	<Navbar t={$t} />
	<main class="flex-1">
		{#if announcementReady || (page.url.pathname !== '/' && page.url.pathname !== '')}
			{@render children()}
		{:else}
			<div class="min-h-[60vh]" aria-hidden="true"></div>
		{/if}
	</main>
	<Footer t={$t} />
</div>
<Announcement onReady={() => (announcementReady = true)} />
