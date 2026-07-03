<script>
	import { api } from '$lib/api';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { t } from '$lib/stores/i18n';
	import { Search as SearchIcon, RotateCcw, SlidersHorizontal } from '@lucide/svelte';

	let photos = $state([]);
	let loading = $state(false);
	let searched = $state(false);

	let registration = $state('');
	let airline = $state('');
	let location = $state('');
	let aircraft = $state('');
	let photographer = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');
	let sort = $state('latest');

	async function performSearch() {
		loading = true; searched = true;
		try {
			const p = new URLSearchParams();
			if (registration) p.append('registration', registration);
			if (airline) p.append('airline', airline);
			if (location) p.append('location', location);
			if (aircraft) p.append('aircraft', aircraft);
			if (photographer) p.append('photographer', photographer);
			if (dateFrom) p.append('dateFrom', dateFrom);
			if (dateTo) p.append('dateTo', dateTo);
			p.append('sort', sort); p.append('limit', '24');
			const r = await api(`/api/photos/search?${p.toString()}`, { noRedirect: true });
			const d = await r.json();
			photos = d.photos || [];
		} catch (e) { console.error('Search failed:', e); photos = []; } finally { loading = false; }
	}

	function resetFilters() {
		registration = ''; airline = ''; location = ''; aircraft = ''; photographer = '';
		dateFrom = ''; dateTo = ''; sort = 'latest'; photos = []; searched = false;
	}
</script>

<div class="container mx-auto max-w-[1400px] px-5 py-8">
	<div class="mb-8 text-center">
		<div class="mb-3 inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium">
			<SearchIcon class="h-3 w-3" /> 搜索
		</div>
		<h1 class="text-3xl font-bold tracking-tight">{@html $t('search.title')}</h1>
		<p class="mt-2 text-muted-foreground">{@html $t('search.subtitle')}</p>
	</div>

	<div class="grid gap-8 lg:grid-cols-[320px_1fr]">
		<Card class="lg:sticky lg:top-20 lg:self-start">
			<CardContent class="space-y-4 p-5">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<SlidersHorizontal class="h-4 w-4" /> {@html $t('search.filters')}
				</div>
				<Separator />
				<div class="space-y-1.5">
					<Label for="reg" class="text-xs">{@html $t('search.byRegistration')}</Label>
					<Input id="reg" bind:value={registration} placeholder="B-2032" class="h-9 text-sm" />
				</div>
				<div class="space-y-1.5">
					<Label for="airline" class="text-xs">{@html $t('search.byAirline')}</Label>
					<Input id="airline" bind:value={airline} placeholder="中国国际航空" class="h-9 text-sm" />
				</div>
				<div class="space-y-1.5">
					<Label for="loc" class="text-xs">{@html $t('search.byLocation')}</Label>
					<Input id="loc" bind:value={location} placeholder="北京首都国际机场" class="h-9 text-sm" />
				</div>
				<div class="space-y-1.5">
					<Label for="ac" class="text-xs">{@html $t('search.byAircraft')}</Label>
					<Input id="ac" bind:value={aircraft} placeholder="Boeing 777-300ER" class="h-9 text-sm" />
				</div>
				<div class="space-y-1.5">
					<Label for="photog" class="text-xs">{@html $t('search.byPhotographer')}</Label>
					<Input id="photog" bind:value={photographer} placeholder="username" class="h-9 text-sm" />
				</div>
				<div class="space-y-1.5">
					<Label class="text-xs">{@html $t('search.dateRange')}</Label>
					<div class="flex gap-2">
						<Input type="date" bind:value={dateFrom} class="h-9 text-sm" />
						<Input type="date" bind:value={dateTo} class="h-9 text-sm" />
					</div>
				</div>
				<Separator />
				<Button onclick={performSearch} class="w-full gap-2" disabled={loading}>
					<SearchIcon class="h-4 w-4" /> {$t('search.search')}
				</Button>
				<Button variant="outline" onclick={resetFilters} class="w-full gap-2">
					<RotateCcw class="h-4 w-4" /> {$t('search.reset')}
				</Button>
			</CardContent>
		</Card>

		<div>
			{#if loading}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each Array(6) as _}
						<div class="aspect-video animate-pulse rounded-xl bg-secondary"></div>
					{/each}
				</div>
			{:else if !searched}
				<div class="flex flex-col items-center justify-center py-24 text-muted-foreground">
					<SearchIcon class="mb-4 h-16 w-16 opacity-20" />
					<p class="text-lg">{@html $t('search.empty')}</p>
				</div>
			{:else if photos.length === 0}
				<div class="flex flex-col items-center justify-center py-24 text-muted-foreground">
					<SearchIcon class="mb-4 h-16 w-16 opacity-20" />
					<p>未找到匹配的照片</p>
				</div>
			{:else}
				<div class="mb-4 text-sm text-muted-foreground">
					<span class="font-medium text-foreground">{photos.length}</span> 个结果
				</div>
				<PhotoGrid {photos} columns={3} />
			{/if}
		</div>
	</div>
</div>
