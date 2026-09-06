<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAdmin, authLoading } from "$lib/stores/auth";
	import { api } from '$lib/api';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { showToast } from '$lib/stores/toast';
	import { ArrowLeft, Image, Search, Trash2, Loader2 } from '@lucide/svelte';

	let photos = $state([]);
	let loading = $state(false);
	let statusFilter = $state('all');
	let searchQuery = $state('');

	onMount(async () => { await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); }); if (!$isAdmin) window.location.href = '/login'; });

	async function loadPhotos() {
		loading = true;
		try {
			let url = '/api/admin/photos';
			const params = new URLSearchParams();
			if (statusFilter !== 'all') params.append('status', statusFilter);
			if (searchQuery) params.append('search', searchQuery);
			const qs = params.toString();
			const r = await api(qs ? `${url}?${qs}` : url, { method: 'POST', body: '{}' });
			const d = await r.json();
			photos = d.photos || [];
		} catch (e) { showToast('加载失败', 'error'); } finally { loading = false; }
	}

	async function deletePhoto(id) {
		if (!confirm('确定要删除这张照片？此操作不可恢复。')) return;
		try {
			await api(`/api/admin/photos/${id}/delete`, { method: 'POST', body: '{}' });
			showToast('已删除', 'success');
			loadPhotos();
		} catch (e) { showToast('删除失败', 'error'); }
	}

	const statuses = [
		{ key: 'all', label: '全部' },
		{ key: 'approved', label: '已过审' },
		{ key: 'pending', label: '待审核' },
		{ key: 'rejected', label: '未过审' }
	];

	const statusBadge = (s) => ({ approved: 'default', pending: 'secondary', rejected: 'destructive' }[s] || 'secondary');
	const statusLabel = (s) => ({ approved: '已过审', pending: '待审核', rejected: '未过审' }[s] || s);
</script>

<div class="container mx-auto max-w-[1400px] px-5 py-8">
		<a href="/dashboard" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft class="h-4 w-4" /> 返回仪表盘</a>>
	<div class="mb-6">
		<h1 class="text-2xl font-bold">🖼️ 图片管理</h1>
		<p class="text-sm text-muted-foreground">搜索、查看和删除所有照片</p>
	</div>

	<div class="mb-6 flex flex-wrap items-center gap-3">
		{#each statuses as s}
			<Button variant={statusFilter === s.key ? 'default' : 'outline'} size="sm" onclick={() => { statusFilter = s.key; loadPhotos(); }}>{s.label}</Button>
		{/each}
		<div class="flex flex-1 items-center gap-2 sm:ml-auto">
			<Input bind:value={searchQuery} placeholder="搜索标题/注册号/摄影师..." class="h-9 max-w-[300px] text-sm" />
			<Button size="sm" onclick={loadPhotos} disabled={loading}><Search class="h-4 w-4" /></Button>
		</div>
	</div>

	{#if loading}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{#each Array(8) as _}<div class="aspect-video animate-pulse rounded-xl bg-secondary"></div>{/each}</div>
	{:else if photos.length}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each photos as p}
				<div class="group relative overflow-hidden rounded-xl border bg-card">
					<a href={p.url} target="_blank"><img src={p.thumbnail || p.url} alt="" class="aspect-video w-full object-cover" loading="lazy" /></a>
					<div class="p-2.5">
						<div class="flex items-center justify-between gap-2">
							<span class="truncate text-xs font-medium">{p.title || '无标题'}</span>
							<Badge variant={statusBadge(p.status)} class="shrink-0 text-[10px]">{statusLabel(p.status)}</Badge>
						</div>
						<p class="mt-1 text-[11px] text-muted-foreground">{p.registration || ''} · {p.photographer?.username || ''}</p>
						<div class="mt-2 flex gap-1.5">
							<Button variant="outline" size="sm" class="h-7 flex-1 text-[11px]" href="/photo/{p.id}">查看</Button>
							<Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive" onclick={() => deletePhoto(p.id)}><Trash2 class="h-3.5 w-3.5" /></Button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center py-20 text-muted-foreground"><Image class="mb-4 h-16 w-16 opacity-20" /><p>暂无照片</p></div>
	{/if}
</div>
