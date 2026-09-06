<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { formatDate } from '$lib/utils/helpers';
	import { Loader2, ArrowLeft } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { t } from '$lib/stores/i18n';

	let news = $state(null);
	let loading = $state(true);
	let slug = $derived(page.params.slug);

	onMount(async () => {
		try {
			const r = await api(`/api/news/${slug}`, { noRedirect: true });
			const data = await r.json();
			news = data.news || data;  // backend returns {news, related}, or direct object
		} catch (e) { console.error('News load failed:', e); }
		finally { loading = false; }
	});
</script>

<div class="container mx-auto max-w-[800px] px-5 py-8">
	<div class="mb-5">
		<Button variant="ghost" size="sm" href="/" class="gap-1.5">
			<ArrowLeft class="h-4 w-4" /> {t('nav.home')}
		</Button>
	</div>
	{#if loading}
		<div class="flex flex-col items-center justify-center py-24">
			<Loader2 class="h-8 w-8 animate-spin text-primary" />
			<p class="mt-4 text-muted-foreground">加载中...</p>
		</div>
	{:else if news?.title}
		{#if news.image}
			<img src={news.image} alt="" class="mb-6 max-h-[400px] w-full rounded-xl object-cover" />
		{/if}
		<h1 class="text-3xl font-bold">{news.title}</h1>
		<div class="mt-2 text-sm text-muted-foreground">
			📅 {formatDate(news.published_at)} · {news.category || '新闻'}
		</div>
		<div class="prose prose-neutral mt-8 max-w-none dark:prose-invert">
			{@html news.content || news.excerpt || ''}
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center py-24 text-muted-foreground">
			<p class="text-lg">暂无新闻内容</p>
			<a href="/news" class="mt-4 text-primary hover:underline">← 返回新闻列表</a>
		</div>
	{/if}
</div>
