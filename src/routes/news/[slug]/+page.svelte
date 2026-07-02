<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { formatDate } from '$lib/utils/helpers';

	let news = $state(null);
	let slug = $derived(page.params.slug);

	onMount(async () => {
		try {
			const r = await api(`/api/news/${slug}`);
			news = await r.json();
		} catch (e) { /* */ }
	});
</script>

{#if news}
	<div class="container mx-auto max-w-[800px] px-5 py-8">
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
	</div>
{/if}
