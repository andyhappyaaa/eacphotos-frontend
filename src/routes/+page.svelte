<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { animateNumber } from '$lib/utils/helpers';
	import Carousel from '$lib/components/Carousel.svelte';
	import FeaturedGrid from '$lib/components/FeaturedGrid.svelte';
	import CategoryRow from '$lib/components/CategoryRow.svelte';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import NewsCard from '$lib/components/NewsCard.svelte';
	import { t } from '$lib/stores/i18n';

	let tFn = $derived($t);

	// Stats
	let statPhotos = $state(0);
	let statUsers = $state(0);
	let statAirlines = $state(0);
	let statAircraft = $state(0);
	let statsLoaded = $state(false);

	// Latest photos
	let latestPhotos = $state([]);

	// Homepage news
	let newsItems = $state([]);
	let newsOffset = $state(0);
	let newsIntervalId = null;

	onMount(async () => {
		loadStats();
		loadLatestPhotos();
		loadNews();
	});

	async function loadStats() {
		try {
			const r = await api('/api/stats');
			const data = await r.json();
			statsLoaded = true;
			animateNumber(data.photos || 0, (v) => (statPhotos = v));
			animateNumber(data.users || 0, (v) => (statUsers = v));
			animateNumber(data.airlines || 0, (v) => (statAirlines = v));
			animateNumber(data.aircraft || 0, (v) => (statAircraft = v));
		} catch (e) {
			console.error('Failed to load stats:', e);
		}
	}

	async function loadLatestPhotos() {
		try {
			const r = await api('/api/photos/latest?page=1&limit=12');
			const data = await r.json();
			latestPhotos = data.photos || [];
		} catch (e) {
			console.error('Failed to load latest photos:', e);
		}
	}

	async function loadNews() {
		try {
			// Try gallery-matched news first
			const galleryR = await api('/api/site/news-with-gallery?limit=6', { noRedirect: true });
			const galleryD = await galleryR.json();
			const enrichedNews = galleryD.news || [];

			// Supplement with regular news
			const r = await api('/api/news?limit=30', { noRedirect: true });
			const d = await r.json();
			const allNews = d.news || [];

			const usedIds = new Set(enrichedNews.map((n) => n.id));
			const regular = allNews.filter((n) => !usedIds.has(n.id));
			newsItems = [...enrichedNews, ...regular];
		} catch (e) {
			/* ignore */
		}
	}
</script>

<!-- Hero Carousel -->
<Carousel t={tFn} />

<!-- Stats -->
<section class="bg-secondary py-12">
	<div class="container mx-auto max-w-[1400px] px-5">
		<div class="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
			<div class="flex flex-col gap-2">
				<span class="text-3xl font-bold text-primary md:text-4xl">{statPhotos.toLocaleString()}</span>
				<span class="text-sm text-muted-foreground">{@html tFn('stats.photos')}</span>
			</div>
			<div class="flex flex-col gap-2">
				<span class="text-3xl font-bold text-primary md:text-4xl">{statUsers.toLocaleString()}</span>
				<span class="text-sm text-muted-foreground">{@html tFn('stats.users')}</span>
			</div>
			<div class="flex flex-col gap-2">
				<span class="text-3xl font-bold text-primary md:text-4xl">{statAirlines.toLocaleString()}</span>
				<span class="text-sm text-muted-foreground">{@html tFn('stats.airlines')}</span>
			</div>
			<div class="flex flex-col gap-2">
				<span class="text-3xl font-bold text-primary md:text-4xl">{statAircraft.toLocaleString()}</span>
				<span class="text-sm text-muted-foreground">{@html tFn('stats.aircraft')}</span>
			</div>
		</div>
	</div>
</section>

<!-- Featured Photos -->
<FeaturedGrid t={tFn} />

<!-- Category Rows -->
<CategoryRow />

<!-- News Section -->
{#if newsItems.length > 0}
	<section class="py-8">
		<div class="container mx-auto max-w-[1400px] px-5">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-2xl font-bold">📰 新闻资讯</h2>
				<a href="/news" class="text-sm text-primary">查看全部 →</a>
			</div>
			<p class="mb-4 text-sm text-muted-foreground">最新航空动态</p>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each newsItems.slice(0, 3) as item}
					<NewsCard news={item} />
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- Latest Photos -->
<section class="py-12">
	<div class="container mx-auto max-w-[1400px] px-5">
		<h2 class="mb-6 text-2xl font-bold">{@html tFn('latest.title')}</h2>
		<PhotoGrid photos={latestPhotos} emptyText={tFn('search.empty')} />
	</div>
</section>
