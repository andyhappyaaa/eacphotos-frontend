<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import NewsCard from '$lib/components/NewsCard.svelte';
	import { t } from '$lib/stores/i18n';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from '@lucide/svelte';

	let newsItems = $state([]);

	onMount(async () => {
		try {
			const r = await api('/api/news?limit=30');
			const d = await r.json();
			newsItems = d.news || [];
		} catch (e) { /* */ }
	});
</script>

<div class="container mx-auto max-w-[1200px] px-5 py-8">
	<div class="mb-5">
		<Button variant="ghost" size="sm" href="/" class="gap-1.5">
			<ArrowLeft class="h-4 w-4" /> {t('nav.home')}
		</Button>
	</div>
	<h1 class="mb-8 text-center text-3xl font-bold">新闻公告</h1>
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each newsItems as item}
			<NewsCard news={item} />
		{/each}
	</div>
	{#if !newsItems.length}
		<p class="py-16 text-center text-muted-foreground">暂无新闻</p>
	{/if}
</div>
