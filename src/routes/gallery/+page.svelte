<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import { Button } from '$lib/components/ui/button';
	import { t } from '$lib/stores/i18n';

	let tFn = $derived($t);

	let photos = $state([]);
	let currentFilter = $state('all');
	let currentSort = $state('latest');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let loading = $state(true);

	const filters = [
		{ key: 'all', label: '全部' },
		{ key: 'special', label: '特殊涂装' },
		{ key: 'artistic', label: '风格图' },
		{ key: 'military', label: '军用机' },
		{ key: 'night', label: '夜拍' }
	];

	const sortOptions = [
		{ value: 'latest', label: '最新上传' },
		{ value: 'popular', label: '最受欢迎' },
		{ value: 'random', label: '随机' }
	];

	onMount(() => {
		loadGallery();
	});

	async function loadGallery() {
		loading = true;
		try {
			const queryParams = new URLSearchParams();
			if (currentFilter !== 'all') queryParams.append('type', currentFilter);
			queryParams.append('sort', currentSort);
			queryParams.append('page', String(currentPage));
			queryParams.append('limit', '20');

			const r = await api(`/api/photos/gallery?${queryParams.toString()}`);
			const data = await r.json();
			photos = data.photos || [];
			totalPages = data.totalPages || 1;
		} catch (e) {
			photos = [];
		} finally {
			loading = false;
		}
	}

	function setFilter(filter) {
		currentFilter = filter;
		currentPage = 1;
		loadGallery();
	}

	function setSort(e) {
		currentSort = e.target.value;
		currentPage = 1;
		loadGallery();
	}

	function goToPage(page) {
		if (page >= 1 && page <= totalPages && page !== currentPage) {
			currentPage = page;
			loadGallery();
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function getPaginationPages() {
		const pages = [];
		const maxVisible = 5;
		let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
		let end = Math.min(totalPages, start + maxVisible - 1);
		if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	}
</script>

<div class="container mx-auto max-w-[1400px] px-5 py-8">
	<div class="mb-8 text-center">
		<h1 class="text-3xl font-bold">{@html tFn('gallery.title')}</h1>
		<p class="mt-2 text-muted-foreground">{@html tFn('gallery.subtitle')}</p>
	</div>

	<!-- Filters & Sort -->
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
		<div class="flex flex-wrap gap-2">
			{#each filters as f}
				<Button
					variant={currentFilter === f.key ? 'default' : 'outline'}
					size="sm"
					onclick={() => setFilter(f.key)}
				>
					{f.label}
				</Button>
			{/each}
		</div>
		<select
			value={currentSort}
			onchange={setSort}
			class="rounded-lg border bg-background px-3 py-2 text-sm"
		>
			{#each sortOptions as opt}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	</div>

	<!-- Photo Grid -->
	{#if loading}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each Array(8) as _}
				<div class="aspect-video animate-pulse rounded-lg bg-secondary"></div>
			{/each}
		</div>
	{:else}
		<PhotoGrid {photos} />
	{/if}

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="mt-8 flex justify-center gap-2">
			<Button variant="outline" size="sm" disabled={currentPage === 1} onclick={() => goToPage(currentPage - 1)}>
				«
			</Button>
			{#each getPaginationPages() as page}
				<Button
					variant={page === currentPage ? 'default' : 'outline'}
					size="sm"
					onclick={() => goToPage(page)}
				>
					{page}
				</Button>
			{/each}
			<Button variant="outline" size="sm" disabled={currentPage === totalPages} onclick={() => goToPage(currentPage + 1)}>
				»
			</Button>
		</div>
	{/if}
</div>
