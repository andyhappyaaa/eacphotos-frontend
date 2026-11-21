<script>
	import { openCheckout } from '@creem_io/svelte';
	import { requireAuth } from '$lib/auth-guard';
	import { api } from '$lib/api';
	import { isLoggedIn, isReviewer, authLoading } from '$lib/stores/auth';

	const tiers = [
		{ amount: 200, name: '心意档', price: '$2', desc: '一点点心意' },
		{ amount: 500, name: '咖啡档', price: '$5', desc: '请作者喝杯咖啡 ☕', recommended: true },
		{ amount: 800, name: '支持档', price: '$8', desc: '真心喜欢，想多支持一点' }
	];

	let loading = $state(false);
	let error = $state('');
	let note = $state('');

	async function donate(/** @type {number} */ amount) {
		console.log('[donate] clicked', amount);
		if (loading) return;
		const authed = await requireAuth();
		console.log('[donate] authed =', authed);
		if (!authed) return;
		loading = true;
		error = '';
		try {
			const resp = await api('/api/donate/create-checkout', {
				method: 'POST',
				body: JSON.stringify({ amount, note: note.trim() })
			});
			const data = await resp.json();
			if (!resp.ok) throw new Error(data?.error || '创建支付失败');
			await openCheckout({ checkoutUrl: data.checkoutUrl, onComplete: () => {} });
		} catch (e) {
			error = e instanceof Error ? e.message : '支付请求失败，请稍后再试';
		} finally {
			loading = false;
		}
	}
</script>

{#if $authLoading}
	<p class="py-6 text-center text-sm text-muted-foreground">加载中…</p>
{:else if !$isLoggedIn && !$isReviewer}
	<div class="rounded-lg border p-6 text-center">
		<p class="font-medium">登录后才能捐赠</p>
		<p class="mt-1 text-xs text-muted-foreground">登录后即可支持这个小站继续存在</p>
		<div class="mt-4 flex justify-center gap-3">
			<a href="/login?redirect=/donate" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">登录</a>
			<a href="/register" class="rounded-lg border px-4 py-2 text-sm">注册</a>
		</div>
	</div>
{:else}
	<div class="grid gap-3">
		<textarea
			rows="2"
			bind:value={note}
			maxlength="500"
			placeholder="想说的话（可选，会随付款一起记录）"
			class="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		></textarea>

		<div class="grid gap-2">
			{#each tiers as tier (tier.amount)}
				<button
					type="button"
					disabled={loading}
					onclick={() => donate(tier.amount)}
					class="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:bg-muted disabled:opacity-60 {tier.recommended
						? 'border-primary/50 bg-primary/5'
						: ''}"
				>
					<span class="flex items-baseline gap-2">
						<span class="font-medium">{tier.name}</span>
						<span class="text-base font-semibold">{tier.price}</span>
						{#if tier.recommended}
							<span class="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">推荐</span>
						{/if}
					</span>
					<span class="text-xs text-muted-foreground">{tier.desc}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if loading}
		<p class="text-center text-xs text-muted-foreground">正在打开支付…</p>
	{/if}
	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
{/if}
