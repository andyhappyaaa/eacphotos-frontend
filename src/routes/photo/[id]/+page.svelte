<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { api, imageUrl } from '$lib/api';
	import { currentUser, isLoggedIn, isReviewer } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '$lib/components/ui/dialog';
	import { showToast } from '$lib/stores/toast';
	import { formatDate } from '$lib/utils/helpers';
	import { Download, Share2, Heart } from '@lucide/svelte';
	import WalineComment from '$lib/components/WalineComment.svelte';
	

	/** @type {any} */
	let photo = $state(null);
	let id = $derived(page.params.id);
	let showLoginPrompt = $state(false);

	onMount(async () => {
		try { const r = await api('/api/photos/' + id); photo = await r.json(); } catch (e) {}
	});

	async function handleLike() {
		if (!$isLoggedIn && !$isReviewer) {
			showLoginPrompt = true;
			return;
		}
		try {
			const r = await api('/api/photos/' + id + '/like', { method: 'POST' });
			const d = await r.json();
			if (!r.ok || d.error) { showToast(d.error || '操作失败', 'error'); return; }
			photo = { ...photo, likes: d.likes, liked: d.liked };
			showToast(d.liked ? '已点赞' : '已取消点赞', 'success');
		} catch (e) { showToast('操作失败', 'error'); }
	}

	function isOwner() { return $currentUser?.id && photo && ($currentUser.id === photo.photographer_id || $currentUser.id === photo.photographer?.id); }

	async function handleDownload() {
		if (!isOwner()) { showToast('仅照片作者可下载原图', 'error'); return; }
		// 原图在私有桶，经后端 ?download=true 鉴权后返回原图字节
		try {
			const r = await api('/api/photos/' + id + '?download=true');
			if (!r.ok) { showToast('下载失败', 'error'); return; }
			const blob = await r.blob();
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = photo.filename?.split('/').pop() || 'photo.jpg';
			a.click();
			URL.revokeObjectURL(a.href);
		} catch (e) { showToast('下载失败', 'error'); }
	}
	function handleShare() { navigator.clipboard.writeText(window.location.href).then(() => showToast('链接已复制', 'success')); }
</script>

{#if photo}
	<div class="container mx-auto max-w-[1200px] px-5 py-8">
		<div class="grid gap-8 lg:grid-cols-[1fr_380px]">
			<div class="flex items-center justify-center rounded-xl bg-secondary p-5">
				<img src={imageUrl(photo.url)} alt={photo.title} class="max-h-[70vh] max-w-full rounded-lg object-contain" />
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
					<Button variant="outline" size="sm" onclick={handleLike} class="gap-1.5 {photo.liked ? 'text-red-500' : ''}"><Heart class="h-4 w-4" fill={photo.liked ? 'currentColor' : 'none'} /> {photo.likes || 0}</Button>
					{#if isOwner()}<Button variant="outline" size="sm" onclick={handleDownload} class="gap-1.5"><Download class="h-4 w-4" /> 下载原图</Button>{/if}
					<Button variant="outline" size="sm" onclick={handleShare} class="gap-1.5"><Share2 class="h-4 w-4" /> 分享</Button>
				</div>
			</div>
		</div>

		<hr class="my-10 border-border" />
		<WalineComment path={'/photo/' + id} />
	</div>
{/if}

<Dialog bind:open={showLoginPrompt}>
	<DialogContent class="max-w-[400px]">
		<DialogHeader>
			<DialogTitle>登录后即可点赞</DialogTitle>
			<DialogDescription>登录 eac 账号后即可点赞和参与互动</DialogDescription>
		</DialogHeader>
		<div class="mt-2 flex flex-col gap-2">
			<Button href={'/login?redirect=' + encodeURIComponent('/photo/' + id)} class="w-full">通过 OAuth 登录 eac 账号</Button>
		</div>
	</DialogContent>
</Dialog>
