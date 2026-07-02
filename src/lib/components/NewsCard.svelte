<script>
	import { formatDate } from '$lib/utils/helpers';

	/**
	 * News card component.
	 * @param {object} news - News item
	 * @param {string} variant - 'home' (compact) or 'detail' (full)
	 */
	let { news, variant = 'home' } = $props();

	let imageUrl = $derived(
		news.image ||
			(news.gallery_photos && news.gallery_photos[0]
				? news.gallery_photos[0].thumbnail || news.gallery_photos[0].url
				: null)
	);

	let linkHref = $derived(
		news.slug ? `/news/${news.slug}` : `/news/${news.id}`
	);
</script>

<a
	href={linkHref}
	class="group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
>
	{#if imageUrl}
		<img
			src={imageUrl}
			alt={news.title || 'News'}
			class="h-40 w-full object-cover"
			loading="lazy"
			onerror={(e) => {
				e.target.outerHTML = '<div class="flex h-40 items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl text-white">📰</div>';
			}}
		/>
	{:else}
		<div class="flex h-40 items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl text-white">
			📰
		</div>
	{/if}

	<div class="flex flex-1 flex-col p-3.5">
		<div class="mb-2 line-clamp-2 text-sm font-semibold leading-snug">
			{news.title || '无标题'}
		</div>

		{#if news.excerpt}
			<p class="mb-auto line-clamp-2 text-xs text-muted-foreground">{news.excerpt}</p>
		{/if}

		<div class="mt-2 text-xs text-muted-foreground">
			📅 {formatDate(news.published_at)}
			{news.category ? ` · ${news.category}` : ''}
			{#if news.gallery_photos}
				· 🔗 图库匹配
			{/if}
		</div>
	</div>
</a>
