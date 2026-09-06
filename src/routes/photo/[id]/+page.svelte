<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { currentUser } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { showToast } from '$lib/stores/toast';
	import { formatDate } from '$lib/utils/helpers';
	import { Download, Share2, Heart, ArrowLeft } from '@lucide/svelte';
	

	let photo = $state(null);
	let id = $derived(page.params.id);

	onMount(async () => {
		try {
			const r = await api('/api/photos/' + id);
			if (!r.ok) return;
			photo = await r.json();
			// 单独读取点赞状态，保证计数来自数据库明细表，并在当前用户登录时显示自己的状态。
			const lr = await api('/api/photos/' + id + '/like');
			if (lr.ok) { const ld = await lr.json(); photo = { ...photo, likes: ld.likes, liked: ld.liked }; }
		} catch (e) {}
	});

	async function handleLike() {
		if (!$currentUser) {
			showToast('请先登录后再点赞', 'error');
			return;
		}
		try {
			const r = await api('/api/photos/' + id + '/like', { method: 'POST' });
			const d = await r.json().catch(() => ({}));
			if (!r.ok) { showToast(d.error || '点赞失败', 'error'); return; }
			photo = { ...photo, likes: d.likes, liked: d.liked };
			showToast(d.liked ? '已点赞' : '已取消点赞', 'success');
		} catch (e) { showToast('操作失败', 'error'); }
	}

	function isOwner() { return $currentUser?.id && photo && ($currentUser.id === photo.photographer_id || $currentUser.id === photo.photographer?.id); }

	async function handleDownload() {
		if (!isOwner()) { showToast('仅照片作者可下载原图', 'error'); return; }
		// 直接用 photo.url（R2 公开地址）下载
		const a = document.createElement('a');
		a.href = photo.url || '';
		a.download = photo.filename?.split('/').pop() || 'photo.jpg';
		a.click();
	}
	function handleShare() { navigator.clipboard.writeText(window.location.href).then(() => showToast('链接已复制', 'success')); }
</script>

{#if photo}
	<div class="container mx-auto max-w-[1200px] px-5 py-8">
		<div class="mb-5">
			<Button variant="ghost" size="sm" href="/" class="gap-1.5">
				<ArrowLeft class="h-4 w-4" /> 返回首页
			</Button>
		</div>
		<div class="grid gap-8 lg:grid-cols-[1fr_380px]">
			<div class="flex items-center justify-center rounded-xl bg-secondary p-5">
				<img src={photo.url} alt={photo.title} class="max-h-[70vh] max-w-full rounded-lg object-contain" />
			</div>
			<div class="space-y-5">
				<h1 class="text-2xl font-bold">{photo.title || 'Untitled'}</h1>
				<div class="grid gap-2.5 text-sm">
					<div class="flex justify-between"><span class="text-muted-foreground">拍摄日期</span><span>{formatDate(photo.photo_date || photo.date)}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">注册号</span><span>{photo.registration || '—'}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">机型</span><span>{photo.aircraft_type || photo.aircraftType || '—'}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">航司</span><span>{photo.airline || '—'}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">拍摄地点</span><span>{photo.location || '—'}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">摄影师</span><a href="/profile?user={photo.photographer_id}" class="text-primary">{photo.photographer_name || 'Unknown'}</a></div>
					<div class="flex justify-between"><span class="text-muted-foreground">浏览</span><span>{photo.views || 0}</span></div>
				</div>
				{#if photo.description}
					<div><h3 class="mb-1 font-semibold text-sm">描述</h3><p class="text-sm text-muted-foreground">{photo.description}</p></div>
				{/if}
				<div class="flex gap-2.5">
					<Button variant="outline" size="sm" onclick={handleLike} class="gap-1.5"><Heart class="h-4 w-4" fill={photo.liked ? 'currentColor' : 'none'} /> {photo.likes || 0}</Button>
					{#if isOwner()}<Button variant="outline" size="sm" onclick={handleDownload} class="gap-1.5"><Download class="h-4 w-4" /> 下载原图</Button>{/if}
					<Button variant="outline" size="sm" onclick={handleShare} class="gap-1.5"><Share2 class="h-4 w-4" /> 分享</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
