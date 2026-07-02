<script>
	import { api } from '$lib/api';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { t } from '$lib/stores/i18n';

	let tFn = $derived($t);
	let photos = $state([]);
	let loading = $state(false);

	// Search fields
	let registration = $state('');
	let airline = $state('');
	let location = $state('');
	let aircraft = $state('');
	let photographer = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');
	let sort = $state('latest');

	async function performSearch() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (registration) params.append('registration', registration);
			if (airline) params.append('airline', airline);
			if (location) params.append('location', location);
			if (aircraft) params.append('aircraft', aircraft);
			if (photographer) params.append('photographer', photographer);
			if (dateFrom) params.append('dateFrom', dateFrom);
			if (dateTo) params.append('dateTo', dateTo);
			params.append('sort', sort);
			params.append('limit', '24');

			const r = await api(`/api/photos/search?${params.toString()}`);
			const data = await r.json();
			photos = data.photos || [];
		} catch (e) {
			photos = [];
		} finally {
			loading = false;
		}
	}

	function resetFilters() {
		registration = '';
		airline = '';
		location = '';
		aircraft = '';
		photographer = '';
		dateFrom = '';
		dateTo = '';
		sort = 'latest';
		photos = [];
	}
</script>

<div class="container mx-auto max-w-[1400px] px-5 py-8">
	<div class="mb-8 text-center">
		<h1 class="text-3xl font-bold">{@html tFn('search.title')}</h1>
		<p class="mt-2 text-muted-foreground">{@html tFn('search.subtitle')}</p>
	</div>

	<div class="grid gap-8 lg:grid-cols-[320px_1fr]">
		<!-- Filters Panel -->
		<div class="space-y-4 rounded-lg border bg-card p-5 lg:sticky lg:top-20 lg:self-start">
			<h3 class="font-semibold">{@html tFn('search.filters')}</h3>

			<div>
				<Label for="reg">{@html tFn('search.byRegistration')}</Label>
				<Input id="reg" bind:value={registration} placeholder="B-2032" class="mt-1" />
			</div>
			<div>
				<Label for="airline">{@html tFn('search.byAirline')}</Label>
				<Input id="airline" bind:value={airline} placeholder="中国国际航空" class="mt-1" />
			</div>
			<div>
				<Label for="loc">{@html tFn('search.byLocation')}</Label>
				<Input id="loc" bind:value={location} placeholder="北京首都国际机场" class="mt-1" />
			</div>
			<div>
				<Label for="ac">{@html tFn('search.byAircraft')}</Label>
				<Input id="ac" bind:value={aircraft} placeholder="Boeing 777-300ER" class="mt-1" />
			</div>
			<div>
				<Label for="photog">{@html tFn('search.byPhotographer')}</Label>
				<Input id="photog" bind:value={photographer} placeholder="username" class="mt-1" />
			</div>
			<div>
				<Label>{@html tFn('search.dateRange')}</Label>
				<div class="mt-1 flex gap-2">
					<Input type="date" bind:value={dateFrom} />
					<Input type="date" bind:value={dateTo} />
				</div>
			</div>
			<div>
				<Label for="sort">{tFn('search.sort.latest')}</Label>
				<select bind:value={sort} class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
					<option value="latest">{tFn('search.sort.latest')}</option>
					<option value="popular">{tFn('search.sort.popular')}</option>
					<option value="date">{tFn('search.sort.date')}</option>
					<option value="random">{tFn('search.sort.random')}</option>
				</select>
			</div>
			<div class="flex gap-2">
				<Button onclick={performSearch} class="flex-1">{tFn('search.search')}</Button>
				<Button variant="outline" onclick={resetFilters}>{tFn('search.reset')}</Button>
			</div>
		</div>

		<!-- Results -->
		<div>
			{#if loading}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each Array(6) as _}
						<div class="aspect-video animate-pulse rounded-lg bg-secondary"></div>
					{/each}
				</div>
			{:else if photos.length === 0}
				<div class="flex items-center justify-center py-16 text-muted-foreground">
					<p>{@html tFn('search.empty')}</p>
				</div>
			{:else}
				<h3 class="mb-4 font-semibold">{@html tFn('search.results')} ({photos.length})</h3>
				<PhotoGrid {photos} columns={3} />
			{/if}
		</div>
	</div>
</div>
