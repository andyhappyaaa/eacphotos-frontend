<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import Carousel from '$lib/components/Carousel.svelte';
	import FeaturedGrid from '$lib/components/FeaturedGrid.svelte';
	import CategoryRow from '$lib/components/CategoryRow.svelte';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import NewsCard from '$lib/components/NewsCard.svelte';
	import { t } from '$lib/stores/i18n';
	import { Camera, Users, Plane, PlaneTakeoff, ArrowRight } from '@lucide/svelte';

	let statPhotos = $state(0); let statUsers = $state(0);
	let statAirlines = $state(0); let statAircraft = $state(0);
	let latestPhotos = $state([]); let newsItems = $state([]);

	onMount(() => { loadStats(); loadLatestPhotos(); loadNews(); });

	async function loadStats() {
		try { const r = await api('/api/stats'); const d = await r.json(); statPhotos = d.photos || 0; statUsers = d.users || 0; statAirlines = d.airlines || 0; statAircraft = d.aircraft || 0; } catch (e) {}
	}
	async function loadLatestPhotos() {
		try { const r = await api('/api/photos/latest?page=1&limit=12'); latestPhotos = (await r.json()).photos || []; } catch (e) {}
	}
	async function loadNews() {
		try { const [gR, nR] = await Promise.all([api('/api/site/news-with-gallery?limit=6', { noRedirect: true }), api('/api/news?limit=30', { noRedirect: true })]); const [gD, nD] = await Promise.all([gR.json(), nR.json()]); const usedIds = new Set((gD.news || []).map(n => n.id)); newsItems = [...(gD.news || []), ...(nD.news || []).filter(n => !usedIds.has(n.id))]; } catch (e) {}
	}
</script>

<Carousel t={$t} />



<FeaturedGrid t={$t} />

<section class="relative border-b bg-card py-16">
	<div class="container mx-auto max-w-[1400px] px-5">
		<div class="grid grid-cols-2 gap-8 md:grid-cols-4">
			<div class="flex flex-col items-center gap-3 text-center"><div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><Camera class="h-6 w-6 text-primary" /></div><div><div class="text-3xl font-bold tracking-tight tabular-nums">{statPhotos.toLocaleString()}</div><div class="mt-1 text-sm text-muted-foreground">{$t('stats.photos')}</div></div></div>
			<div class="flex flex-col items-center gap-3 text-center"><div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><Users class="h-6 w-6 text-primary" /></div><div><div class="text-3xl font-bold tracking-tight tabular-nums">{statUsers.toLocaleString()}</div><div class="mt-1 text-sm text-muted-foreground">{$t('stats.users')}</div></div></div>
			<div class="flex flex-col items-center gap-3 text-center"><div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><PlaneTakeoff class="h-6 w-6 text-primary" /></div><div><div class="text-3xl font-bold tracking-tight tabular-nums">{statAirlines.toLocaleString()}</div><div class="mt-1 text-sm text-muted-foreground">{$t('stats.airlines')}</div></div></div>
			<div class="flex flex-col items-center gap-3 text-center"><div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><Plane class="h-6 w-6 text-primary" /></div><div><div class="text-3xl font-bold tracking-tight tabular-nums">{statAircraft.toLocaleString()}</div><div class="mt-1 text-sm text-muted-foreground">{$t('stats.aircraft')}</div></div></div>
		</div>
	</div>
</section>
<CategoryRow />

{#if newsItems.length > 0}
	<section class="border-t py-16"><div class="container mx-auto max-w-[1400px] px-5"><div class="mb-8 flex items-end justify-between"><div><div class="mb-2 inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium">最新动态</div><h2 class="text-2xl font-bold tracking-tight">新闻资讯</h2></div><a href="/news" class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">查看全部 <ArrowRight class="h-4 w-4" /></a></div><div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{#each newsItems.slice(0, 3) as item}<NewsCard news={item} />{/each}</div></div></section>
{/if}

<section class="border-t py-16"><div class="container mx-auto max-w-[1400px] px-5"><div class="mb-8 flex items-end justify-between"><div><h2 class="text-2xl font-bold tracking-tight">{$t('latest.title')}</h2><p class="mt-1 text-sm text-muted-foreground">社区最新上传的航空摄影作品</p></div><a href="/gallery" class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">浏览更多 <ArrowRight class="h-4 w-4" /></a></div><PhotoGrid photos={latestPhotos} variant="overlay" emptyText={$t('search.empty')} /></div></section>
