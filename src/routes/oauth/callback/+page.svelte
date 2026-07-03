<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { refreshReviewerInfo } from '$lib/stores/auth';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Loader2, CheckCircle, XCircle } from '@lucide/svelte';

	let status = $state('loading');
	let message = $state('正在验证授权...');

	onMount(async () => {
		try {
			const params = new URLSearchParams(window.location.search);
			const code = params.get('code');
			const state = params.get('state');
			const oauthError = params.get('error');

			if (oauthError) { status = 'error'; message = '授权被拒绝：' + oauthError; return; }
			if (!code) { status = 'error'; message = '回调缺少 code 参数'; return; }

			// Verify state (CSRF protection)
			const savedState = sessionStorage.getItem('eacphoto_oauth_state');
			sessionStorage.removeItem('eacphoto_oauth_state');
			if (!savedState || savedState !== state) {
				status = 'error'; message = 'state 验证失败，可能是 CSRF 攻击'; return;
			}

			// Exchange code for token via Vercel proxy (token stored in HttpOnly cookie)
			const tokenResp = await fetch('/api/oauth-token-exchange', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code })
			});
			const tokenData = await tokenResp.json();
			if (!tokenResp.ok || !tokenData.success) {
				status = 'error';
				message = tokenData.error_description || tokenData.error || '换取 token 失败';
				return;
			}

			// Refresh reviewer info from the cookie-based API
			await refreshReviewerInfo();

			status = 'success';
			message = '欢迎回来，审核员！正在跳转到仪表盘...';
			setTimeout(() => { window.location.href = '/dashboard'; }, 1200);
		} catch (e) {
			status = 'error';
			message = '网络错误：' + (e.message || e);
		}
	});
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
	<Card class="w-full max-w-[440px] text-center shadow-lg">
		<CardContent class="space-y-4 p-8">
			{#if status === 'loading'}
				<div class="text-5xl">⏳</div>
				<h2 class="text-xl font-bold">正在验证授权...</h2>
				<p class="text-sm text-muted-foreground">{message}</p>
				<Loader2 class="mx-auto h-6 w-6 animate-spin text-primary" />
			{:else if status === 'success'}
				<CheckCircle class="mx-auto h-14 w-14 text-emerald-500" />
				<h2 class="text-xl font-bold text-emerald-600">授权成功</h2>
				<p class="text-sm text-muted-foreground">{message}</p>
			{:else}
				<XCircle class="mx-auto h-14 w-14 text-destructive" />
				<h2 class="text-xl font-bold text-destructive">授权失败</h2>
				<p class="text-sm text-muted-foreground">{message}</p>
				<div class="flex justify-center gap-3 pt-2">
					<Button href="/">返回首页</Button>
					<Button variant="outline" href="/login">重新登录</Button>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
