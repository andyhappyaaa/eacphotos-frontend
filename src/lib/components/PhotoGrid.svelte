<script>
	import PhotoCard from './PhotoCard.svelte';

	/**
	 * Photo grid with responsive layout.
	 * @param {Array} photos - Array of photo objects
	 * @param {number} columns - Number of columns (default: auto-fill)
	 */
	let { photos = [], columns = 0, emptyText = '暂无照片', variant = 'card' } = $props();

	let gridClass = $derived(
		columns
			? `grid-cols-${columns}`
			: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
	);
</script>

{#if photos.length > 0}
	<div class="grid gap-4 {gridClass}">
		{#each photos as photo}
			{#if variant === 'overlay'}
				<div class="aspect-video overflow-hidden rounded-lg">
					<PhotoCard {photo} variant="overlay" />
				</div>
			{:else}
				<PhotoCard {photo} />
			{/if}
		{/each}
	</div>
{:else}
	<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
		<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mb-4 opacity-50">
			<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
			<circle cx="8.5" cy="8.5" r="1.5"/>
			<polyline points="21 15 16 10 5 21"/>
		</svg>
		<p>{emptyText}</p>
	</div>
{/if}
