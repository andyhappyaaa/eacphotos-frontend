<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { showToast } from '$lib/stores/toast';

	let photo = $state(null);
	let id = $derived(page.params.id);

	onMount(async () => {
		try {
			const r = await api(`/api/photos/${id}`);
			photo = await r.json();
		} catch (e) { /* */ }
	});

	async function handleLike() {
		try {
			const r = await api(`/api/photos/${id}/like`, { method: 'POST' });
			const d = await r.json();
			photo = { ...photo, likes: d.likes };
			showToast(d.liked ? '已点赞' : '已取消点赞', 'success');
		} catch (e) { showToast('操作失败', 'error'); }
	}

	async function handleDownload() {
		try {
			const r = await api(`/api/photos/${id}/download`);
			const d = await r.json();
			const a = document.createElement('a');
			a.href = d.downloadUrl;
			a.download = d.filename || 'photo.jpg';
			a.click();
		} catch (e) { showToast('下载失败', 'error'); }
	}

	function handleShare() {
		const url = window.location.href;
		navigator.clipboard.writeText(url).then(() => showToast('链接已复制', 'success'));
	}
</script>

{#if photo}
	<div class="container mx-auto max-w-[1200px] px-5 py-8">
		<div class="grid gap-8 lg:grid-cols-[1fr_400px]">
			<div class="flex items-center justify-center rounded-xl bg-secondary p-5">
				<img src={photo.url} alt={photo.title} class="max-h-[70vh] max-w-full rounded-lg object-contain" />
			</div>
			<div class="space-y-6">
				<h1 class="text-2xl font-bold">{photo.title || 'Untitled'}</h1>
				<div class="grid gap-3 text-sm">
					<div class="flex justify-between"><span class="text-muted-foreground">拍摄日期</span><span>{photo.date || 'N/A'}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">注册号</span><span>{photo.registration || 'N/A'}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">机型</span><span>{photo.aircraftType || 'N/A'}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">航司</span><span>{photo.airline || 'N/A'}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">拍摄地点</span><span>{photo.location || 'N/A'}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">摄影师</span><a href="/profile?user={photo.photographer?.id}" class="text-primary">{photo.photographer?.username || 'Unknown'}</a></div>
				</div>
				{#if photo.types?.length}
					<div class="flex flex-wrap gap-2">
						{#each photo.types as t}<Badge variant="secondary">{t}</Badge>{/each}
					</div>
				{/if}
				{#if photo.description}
					<div>
						<h3 class="mb-2 font-semibold">描述</h3>
						<p class="text-sm text-muted-foreground">{photo.description}</p>
					</div>
				{/if}
				<div class="flex gap-3">
					<Button variant="outline" onclick={handleLike}>❤ {photo.likes || 0}</Button>
					<Button variant="outline" onclick={handleDownload}>下载</Button>
					<Button variant="outline" onclick={handleShare}>分享</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
