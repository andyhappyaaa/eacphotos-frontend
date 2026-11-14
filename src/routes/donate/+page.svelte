<script>
	import { onMount } from 'svelte';
	import DonateTiers from '$lib/components/DonateTiers.svelte';
	import { Separator } from '$lib/components/ui/separator';

	let donations = $state([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const resp = await fetch('/api/donations');
			const data = await resp.json();
			if (!resp.ok) throw new Error(data?.error || '加载失败');
			donations = Array.isArray(data.donations) ? data.donations : [];
		} catch (e) {
			error = e instanceof Error ? e.message : '加载赞助记录失败';
		} finally {
			loading = false;
		}
	});
</script>

<div class="container mx-auto max-w-3xl px-5 py-12">
	<div class="mb-10 text-center">
		<h1 class="text-3xl font-bold tracking-tight">支持这个小站继续存在</h1>
		<p class="mt-3 text-muted-foreground">用于支付运营产生的费用</p>
	</div>

	<div class="mx-auto max-w-md">
		<DonateTiers />
	</div>

	<Separator class="my-12" />

	<section>
		<h2 class="mb-6 text-center text-lg font-semibold">赞助记录</h2>

		{#if loading}
			<p class="text-center text-sm text-muted-foreground">加载中…</p>
		{:else if error}
			<p class="text-center text-sm text-muted-foreground">{error}</p>
		{:else if donations.length === 0}
			<p class="text-center text-sm text-muted-foreground">还没有赞助记录，来做第一个支持者吧 ❤️</p>
		{:else}
			<ul class="mx-auto max-w-md divide-y">
				{#each donations as d (d.id)}
					<li class="flex items-center justify-between gap-4 py-2.5 text-sm">
						<span class="truncate text-muted-foreground">{d.name}</span>
						<span class="flex shrink-0 items-center gap-3">
							{#if d.amountLabel}<span class="font-medium">{d.amountLabel}</span>{/if}
							{#if d.dateLabel}<span class="text-xs text-muted-foreground">{d.dateLabel}</span>{/if}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
