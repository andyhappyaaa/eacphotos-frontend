<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Separator } from '$lib/components/ui/separator';
	import { t } from '$lib/stores/i18n';
	import { ChevronLeft, ChevronRight, Image, SlidersHorizontal } from '@lucide/svelte';


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

	onMount(() => loadGallery());

	async function loadGallery() {
		loading = true;
		try {
			const q = new URLSearchParams();
			if (currentFilter !== 'all') q.append('type', currentFilter);
			q.append('sort', currentSort);
			q.append('page', String(currentPage));
			q.append('limit', '20');
			const r = await api(`/api/photos/gallery?${q.toString()}`, { noRedirect: true });
			const d = await r.json();
			photos = d.photos || [];
			totalPages = d.totalPages || 1;
		} catch (e) {
			console.error('Gallery load failed:', e);
			photos = [];
		} finally {
			loading = false;
		}
	}

	function setFilter(f) { currentFilter = f; currentPage = 1; loadGallery(); }
	function goToPage(p) {
		if (p >= 1 && p <= totalPages && p !== currentPage) {
			currentPage = p; loadGallery();
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function paginationPages() {
		const p = [];
		const mv = 5;
		let s = Math.max(1, currentPage - Math.floor(mv / 2));
		const e = Math.min(totalPages, s + mv - 1);
		if (e - s < mv - 1) s = Math.max(1, e - mv + 1);
		for (let i = s; i <= e; i++) p.push(i);
		return p;
	}
</script>

<div class="container mx-auto max-w-[1400px] px-5 py-8">
	<div class="mb-8 text-center">
		<div class="mb-3 inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium">
			<Image class="h-3 w-3" /> 图库
		</div>
		<h1 class="text-3xl font-bold tracking-tight">{@html $t('gallery.title')}</h1>
		<p class="mt-2 text-muted-foreground">{@html $t('gallery.subtitle')}</p>
	</div>

	<div class="mb-8 flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-2">
			<SlidersHorizontal class="h-4 w-4 text-muted-foreground" />
			<div class="flex flex-wrap gap-1.5">
				{#each filters as f}
					<Button variant={currentFilter === f.key ? 'default' : 'ghost'} size="sm" onclick={() => setFilter(f.key)}>
						{f.label}
					</Button>
				{/each}
			</div>
		</div>
		<Separator class="sm:hidden" />
		<div class="flex items-center gap-2 sm:ml-auto">
			<span class="text-xs text-muted-foreground">排序</span>
			<select value={currentSort} onchange={(e) => { currentSort = e.target.value; currentPage = 1; loadGallery(); }} class="rounded-lg border bg-background px-3 py-1.5 text-sm">
				<option value="latest">最新上传</option>
				<option value="popular">最受欢迎</option>
				<option value="random">随机</option>
			</select>
		</div>
	</div>

	{#if loading}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each Array(8) as _}
				<div class="space-y-3 rounded-lg border p-3">
					<Skeleton class="aspect-video w-full rounded-lg" />
					<Skeleton class="h-4 w-3/4" />
					<Skeleton class="h-3 w-1/2" />
				</div>
			{/each}
		</div>
	{:else}
		<PhotoGrid {photos} />
	{/if}

	{#if totalPages > 1}
		<div class="mt-10 flex items-center justify-center gap-1.5">
			<Button variant="outline" size="icon" class="h-9 w-9" disabled={currentPage === 1} onclick={() => goToPage(currentPage - 1)}>
				<ChevronLeft class="h-4 w-4" />
			</Button>
			{#each paginationPages() as p}
				<Button variant={p === currentPage ? 'default' : 'outline'} size="icon" class="h-9 w-9 text-sm" onclick={() => goToPage(p)}>
					{p}
				</Button>
			{/each}
			<Button variant="outline" size="icon" class="h-9 w-9" disabled={currentPage === totalPages} onclick={() => goToPage(currentPage + 1)}>
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
	{/if}
</div>
