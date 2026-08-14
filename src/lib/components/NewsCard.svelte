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
				e.target.outerHTML = '<div class="flex h-40 items-center justify-center bg-secondary text-3xl text-muted-foreground"></div>';
			}}
		/>
	{:else}
		<div class="flex h-40 items-center justify-center bg-secondary text-muted-foreground">
				<svg class="h-10 w-10 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
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
			{formatDate(news.published_at)}
			{news.category ? ` · ${news.category}` : ''}
		</div>
	</div>
</a>
