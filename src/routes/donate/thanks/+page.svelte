<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { requireAuth } from '$lib/auth-guard';
	import { api } from '$lib/api';

	let status = $state('loading'); // 'loading' | 'verified' | 'denied'
	let error = $state('');

	onMount(async () => {
		// 1. 登录校验
		const authed = await requireAuth();
		if (!authed) return;

		// 2. 取 checkout_id
		const checkoutId = page.url.searchParams.get('checkout_id');
		if (!checkoutId) {
			status = 'denied';
			return;
		}

		// 3. 服务端核对这笔捐赠确已完成
		try {
			const resp = await api('/api/donate/verify', {
				method: 'POST',
				body: JSON.stringify({ checkoutId })
			});
			const data = await resp.json();
			if (resp.ok && data.ok) {
				status = 'verified';
				fireConfetti();
			} else {
				status = 'denied';
			}
		} catch (e) {
			error = e instanceof Error ? e.message : '校验失败';
			status = 'denied';
		}
	});

	async function fireConfetti() {
		const { default: confetti } = await import('canvas-confetti');
		confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
		setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 200);
		setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 400);
		setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 } }), 700);
	}
</script>

<div class="container mx-auto max-w-2xl px-5 py-16">
	{#if status === 'loading'}
		<p class="text-center text-muted-foreground">加载中…</p>
	{:else if status === 'verified'}
		<div class="text-center">
			<div class="mb-4 text-6xl">🎉</div>
			<h1 class="text-3xl font-bold tracking-tight">感谢你的支持！</h1>
			<p class="mt-3 text-muted-foreground">你的心意已收到，正是这些支持让这个小站能够继续存在。</p>
			<div class="mt-8 flex justify-center gap-3">
				<a href="/" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">返回首页</a>
				<a href="/gallery" class="rounded-lg border px-4 py-2 text-sm">浏览图库</a>
			</div>
		</div>
	{:else}
		<div class="text-center">
			<h1 class="text-2xl font-bold">未找到捐赠记录</h1>
			<p class="mt-3 text-muted-foreground">{error || '只有完成捐赠后才能看到这个页面'}</p>
			<div class="mt-8">
				<a href="/donate" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">去支持一下</a>
			</div>
		</div>
	{/if}
</div>
