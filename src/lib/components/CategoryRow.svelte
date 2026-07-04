<script>
	import { onMount, onDestroy } from 'svelte';
	import { api } from '$lib/api';
	import { takeSlice } from '$lib/utils/helpers';

	let categories = $state([]);
	let offsets = $state([]);
	const PHOTOS_PER_ROW = 4;
	const ROTATE_INTERVAL = 10000;
	let _interval = null;

	onMount(async () => {
		try {
			const r = await api('/api/photos/featured-by-category', { noRedirect: true });
			const d = await r.json();
			categories = d.categories || [];
			offsets = categories.map(() => 0);
		} catch (e) { /* */ }
	});

	onDestroy(() => {
		if (_interval) clearInterval(_interval);
	});

	// Start rotation once categories are loaded
	$effect(() => {
		const needsRotation = categories.some((c) => c.photos && c.photos.length > PHOTOS_PER_ROW);
		if (needsRotation && !_interval) {
			_interval = setInterval(() => {
				offsets = offsets.map((off, i) => {
					const photos = categories[i]?.photos || [];
					return photos.length > PHOTOS_PER_ROW ? (off + PHOTOS_PER_ROW) % photos.length : off;
				});
			}, ROTATE_INTERVAL);
		}
	});
</script>

{#if categories.length > 0}
	<section class="bg-secondary/50 py-8">
		<div class="container mx-auto max-w-[1400px] px-5">
			<h2 class="mb-4 text-2xl font-bold">📂 分类精选</h2>
			<p class="mb-6 text-sm text-muted-foreground">每个栏目展示该类别下最受欢迎的作品</p>

			{#each categories as cat, idx}
				{@const slice = takeSlice(cat.photos || [], offsets[idx], PHOTOS_PER_ROW)}
				{#if slice.length > 0}
					<div class="mb-8">
						<div class="mb-3 flex items-center justify-between">
							<h3 class="text-lg font-semibold">{cat.label}</h3>
							<a href="/search?type={encodeURIComponent(cat.type)}" class="text-sm text-primary">
								查看更多 →
							</a>
						</div>
						<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
							{#each slice as photo}
								<a
									href="/photo/{photo.id}"
									class="group relative aspect-[4/3] overflow-hidden rounded-lg bg-secondary"
								>
									<img
										src={photo.thumbnail || photo.url || ''}
										alt={photo.title || ''}
										class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
										loading="lazy"
									/>
									<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
										<strong class="block text-sm">{photo.title || '无标题'}</strong>
										<span class="text-xs opacity-90">
											{photo.aircraft_type || ''} · {photo.registration || ''}{#if photo.photo_date} · {photo.photo_date}{/if}
										</span>
									</div>
								</a>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</section>
{/if}
