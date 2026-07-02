<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { animateNumber } from '$lib/utils/helpers';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import Carousel from '$lib/components/Carousel.svelte';
	import FeaturedGrid from '$lib/components/FeaturedGrid.svelte';
	import CategoryRow from '$lib/components/CategoryRow.svelte';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import NewsCard from '$lib/components/NewsCard.svelte';
	import { t } from '$lib/stores/i18n';
	import { Camera, Users, Plane, PlaneTakeoff, ArrowRight, Sparkles } from '@lucide/svelte';

	let tFn = $derived($t);

	let statPhotos = $state(0);
	let statUsers = $state(0);
	let statAirlines = $state(0);
	let statAircraft = $state(0);

	let latestPhotos = $state([]);
	let newsItems = $state([]);

	onMount(async () => {
		loadStats();
		loadLatestPhotos();
		loadNews();
	});

	async function loadStats() {
		try {
			const r = await api('/api/stats');
			const data = await r.json();
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
			const galleryR = await api('/api/site/news-with-gallery?limit=6', { noRedirect: true });
			const galleryD = await galleryR.json();
			const enrichedNews = galleryD.news || [];
			const r = await api('/api/news?limit=30', { noRedirect: true });
			const d = await r.json();
			const allNews = d.news || [];
			const usedIds = new Set(enrichedNews.map((n) => n.id));
			newsItems = [...enrichedNews, ...allNews.filter((n) => !usedIds.has(n.id))];
		} catch (e) { /* */ }
	}

	const statsItems = [
		{ value: statPhotos, key: 'stats.photos', icon: Camera },
		{ value: statUsers, key: 'stats.users', icon: Users },
		{ value: statAirlines, key: 'stats.airlines', icon: PlaneTakeoff },
		{ value: statAircraft, key: 'stats.aircraft', icon: Plane }
	];
</script>

<!-- Hero Carousel -->
<Carousel t={tFn} />

<!-- Stats Section -->
<section class="relative border-b bg-card py-16">
	<div class="container mx-auto max-w-[1400px] px-5">
		<div class="grid grid-cols-2 gap-8 md:grid-cols-4">
			{#each statsItems as stat}
				<div class="flex flex-col items-center gap-3 text-center">
					<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
						<stat.icon class="h-6 w-6 text-primary" />
					</div>
					<div>
						<div class="text-3xl font-bold tracking-tight tabular-nums">{stat.value.toLocaleString()}</div>
						<div class="mt-1 text-sm text-muted-foreground">{@html tFn(stat.key)}</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Featured Photos -->
<FeaturedGrid t={tFn} />

<!-- Category Rows -->
<CategoryRow />

<!-- News Section -->
{#if newsItems.length > 0}
	<section class="border-t py-16">
		<div class="container mx-auto max-w-[1400px] px-5">
			<div class="mb-8 flex items-end justify-between">
				<div>
					<div class="mb-2 inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium">
						<Sparkles class="h-3 w-3" /> 最新动态
					</div>
					<h2 class="text-2xl font-bold tracking-tight">📰 新闻资讯</h2>
				</div>
				<a href="/news" class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
					查看全部 <ArrowRight class="h-4 w-4" />
				</a>
			</div>
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each newsItems.slice(0, 3) as item}
					<NewsCard news={item} />
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- Latest Photos -->
<section class="border-t py-16">
	<div class="container mx-auto max-w-[1400px] px-5">
		<div class="mb-8 flex items-end justify-between">
			<div>
				<h2 class="text-2xl font-bold tracking-tight">{@html tFn('latest.title')}</h2>
				<p class="mt-1 text-sm text-muted-foreground">社区最新上传的航空摄影作品</p>
			</div>
			<a href="/gallery" class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
				浏览更多 <ArrowRight class="h-4 w-4" />
			</a>
		</div>
		<PhotoGrid photos={latestPhotos} emptyText={tFn('search.empty')} />
	</div>
</section>
