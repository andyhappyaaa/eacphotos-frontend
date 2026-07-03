<script>
	import { onMount } from 'svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Loader2 } from '@lucide/svelte';

	let error = $state('');

	onMount(() => {
		try {
			const cfg = window.APP_CONFIG || {};
			const BACKEND_URL = cfg.BACKEND_URL || '';
			const CLIENT_ID = cfg.OAUTH_CLIENT_ID || 'mainsite';

			if (!BACKEND_URL) {
				error = '系统未配置 BACKEND_URL，请联系管理员';
				return;
			}

			// Generate random state for CSRF protection
			const bytes = new Uint8Array(32);
			crypto.getRandomValues(bytes);
			const state = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
			sessionStorage.setItem('eacphoto_oauth_state', state);

			const redirectUri = window.location.origin + '/oauth/callback';
			const authUrl = new URL(BACKEND_URL + '/oauth/authorize');
			authUrl.searchParams.set('client_id', CLIENT_ID);
			authUrl.searchParams.set('redirect_uri', redirectUri);
			authUrl.searchParams.set('response_type', 'code');
			authUrl.searchParams.set('state', state);

			window.location.href = authUrl.toString();
		} catch (e) {
			error = '跳转失败: ' + (e.message || e);
		}
	});
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
	<Card class="w-full max-w-[420px] text-center shadow-lg">
		<CardContent class="space-y-4 p-8">
			{#if error}
				<div class="text-5xl">⚠️</div>
				<h2 class="text-xl font-bold">授权配置错误</h2>
				<p class="text-sm text-destructive">{error}</p>
			{:else}
				<div class="text-5xl">🔐</div>
				<h2 class="text-xl font-bold">正在跳转到授权页面...</h2>
				<p class="text-sm text-muted-foreground">即将前往审核员后台进行身份验证</p>
				<Loader2 class="mx-auto h-6 w-6 animate-spin text-primary" />
			{/if}
		</CardContent>
	</Card>
</div>
