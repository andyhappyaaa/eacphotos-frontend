<script>
	import { onMount, onDestroy } from 'svelte';
	import { api } from '$lib/api';
	import { takeSlice } from '$lib/utils/helpers';
	import PhotoCard from './PhotoCard.svelte';

	/**
	 * Featured photos grid with rotation.
	 * Shows 1 main + 4 side photos, rotating every 10s.
	 * Ported from index.js loadFeaturedPhotos().
	 */

	let { t } = $props();

	let pool = $state([]);
	let offset = $state(0);
	let intervalId = null;
	const BATCH_SIZE = 5;
	const ROTATE_INTERVAL = 10000;

	onMount(async () => {
		try {
			const r = await api('/api/photos/featured?limit=25', { noRedirect: true });
			const data = await r.json();
			pool = data.photos || [];
		} catch (e) {
			/* ignore */
		}

		if (pool.length > BATCH_SIZE) {
			intervalId = setInterval(rotate, ROTATE_INTERVAL);
		}
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	function rotate() {
		offset = (offset + BATCH_SIZE) % pool.length;
	}

	let batch = $derived(takeSlice(pool, offset, BATCH_SIZE));
	let mainPhoto = $derived(batch[0]);
	let sidePhotos = $derived(batch.slice(1, 5));
</script>

<section class="py-12">
	<div class="container mx-auto max-w-[1400px] px-5">
		<h2 class="mb-6 text-2xl font-bold">{@html t?.('featured.title') || '🌟 精选作品'}</h2>

		{#if pool.length === 0}
			<div class="flex min-h-[200px] items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
				暂无精选作品，快来上传第一张照片吧！
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<!-- Main featured -->
				<div class="md:col-span-2">
					{#if mainPhoto}
						<div class="aspect-video overflow-hidden rounded-xl">
							<PhotoCard photo={mainPhoto} variant="overlay" />
						</div>
					{/if}
				</div>

				<!-- Side featured -->
				<div class="grid grid-rows-4 gap-4">
					{#each sidePhotos as photo}
						{#if photo}
							<div class="overflow-hidden rounded-lg">
								<PhotoCard photo={photo} variant="overlay" />
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
</section>
