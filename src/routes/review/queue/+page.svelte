<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { isReviewer, authLoading } from "$lib/stores/auth";
	import { api } from '$lib/api';
	import { showToast } from '$lib/stores/toast';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle,
		Maximize2, Loader2, Image, RefreshCw
	} from '@lucide/svelte';

	let photos = $state([]);
	let currentIdx = $state(0);
	let loading = $state(true);
	let reviewNote = $state('');
	let zoomOpen = $state(false);
	let zoomScale = $state(1);
	let zoomPanX = $state(0);
	let zoomPanY = $state(0);
	let isDragging = $state(false);
	let dSX = $state(0); let dSY = $state(0); let dPX = $state(0); let dPY = $state(0);
	let exiting = $state(false);
	let entering = $state(false);
	let rejectOpen = $state(false);
	let rejectReason = $state('');

	let reviewQueue = $state('manual_review');
	let stats = $state({ pendingManual: 0, priorityQueue: 0, normalQueue: 0, todayReviewed: 0 });

	let currentPhoto = $derived(photos[currentIdx] || null);
	let hasPrev = $derived(currentIdx > 0);
	let hasNext = $derived(currentIdx < photos.length - 1);

	let stackCards = $derived([
		{ photo: photos[currentIdx] || null, layer: 0, key: currentIdx },
		{ photo: photos[currentIdx + 1] || null, layer: 1, key: currentIdx + 1 },
		{ photo: photos[currentIdx + 2] || null, layer: 2, key: currentIdx + 2 },
	].filter(c => c.photo));

	onMount(async () => {
		await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
		if (!$isReviewer) { window.location.href = '/login'; return; }
		loadQueue();
		window.addEventListener('keydown', handleKeydown);
	});
	onDestroy(() => window.removeEventListener('keydown', handleKeydown));

	async function loadQueue() {
		loading = true;
		try {
			const r = await api('/api/review/dashboard', { method: 'POST', body: JSON.stringify({ queue: reviewQueue }) });
			const d = await r.json();
			stats = d.stats || stats;
			photos = d.photos || [];
			currentIdx = 0; reviewNote = ''; rejectReason = ''; rejectOpen = false;
			exiting = false; entering = false;
		} catch (e) { showToast('加载失败', 'error'); }
		finally { loading = false; }
	}

	function goTo(idx) {
		if (idx < 0 || idx >= photos.length || exiting) return;
		exiting = true;
		setTimeout(() => {
			currentIdx = idx; reviewNote = ''; rejectReason = ''; rejectOpen = false;
			exiting = false; entering = true;
			setTimeout(() => { entering = false; }, 400);
		}, 400);
	}
	function goNext() { if (hasNext) goTo(currentIdx + 1); }
	function goPrev() { if (hasPrev) goTo(currentIdx - 1); }

	async function approve() {
		if (!currentPhoto || exiting) return;
		try {
			await api(`/api/review/photos/${currentPhoto.id}/approve`, { method: 'POST', body: JSON.stringify({ note: reviewNote || undefined }) });
			showToast('已批准', 'success');
			try { import('https://gcore.jsdelivr.net/npm/canvas-confetti@1/dist/confetti.browser.js').then(m => { const c = m.default || m; c({ particleCount: 80, spread: 70, origin: { y: 0.6 } }); }).catch(()=>{}); } catch(e){}
			removeCurrentAndAdvance();
		} catch (e) { showToast('操作失败', 'error'); }
	}

	async function reject() {
		if (!currentPhoto || exiting) return;
		if (!rejectReason) { showToast('请输入拒绝原因', 'error'); return; }
		try {
			await api(`/api/review/photos/${currentPhoto.id}/reject`, { method: 'POST', body: JSON.stringify({ reason: rejectReason, note: reviewNote || undefined }) });
			showToast('已拒绝', 'success');
			removeCurrentAndAdvance();
		} catch (e) { showToast('操作失败', 'error'); }
	}

	function removeCurrentAndAdvance() {
		exiting = true;
		setTimeout(() => {
			photos = photos.toSpliced(currentIdx, 1);
			rejectReason = ''; rejectOpen = false; reviewNote = ''; exiting = false;
			if (photos.length === 0) { showToast('已清空', 'success'); setTimeout(() => loadQueue(), 500); return; }
			if (currentIdx >= photos.length) currentIdx = photos.length - 1;
			entering = true; setTimeout(() => { entering = false; }, 400);
		}, 400);
	}

	function handleKeydown(e) {
		if (zoomOpen) { if (e.key === 'Escape') { closeZoom(); return; } return; }
		if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
		switch (e.key.toLowerCase()) {
			case 'a': e.preventDefault(); approve(); break;
			case 'r': e.preventDefault(); if (!rejectOpen) { rejectOpen = true; rejectReason = ''; } else { reject(); } break;
			case 'arrowleft': e.preventDefault(); goPrev(); break;
			case 'arrowright': e.preventDefault(); goNext(); break;
			case 'escape': if (rejectOpen) { rejectOpen = false; rejectReason = ''; } break;
		}
	}

	function openZoom() { zoomOpen = true; zoomScale = 1; zoomPanX = 0; zoomPanY = 0; }
	function closeZoom() { zoomOpen = false; }
	function zoomWheel(e) { e.preventDefault(); zoomScale = Math.max(0.5, Math.min(5, zoomScale + (e.deltaY > 0 ? -0.2 : 0.2))); }
	function zoomMDown(e) { isDragging = true; dSX = e.clientX; dSY = e.clientY; dPX = zoomPanX; dPY = zoomPanY; }
	function zoomMMove(e) { if (!isDragging) return; zoomPanX = dPX + (e.clientX - dSX); zoomPanY = dPY + (e.clientY - dSY); }
	function zoomMUp() { isDragging = false; }
	function zoomDbl() { zoomScale = zoomScale > 1.5 ? 1 : 2.5; zoomPanX = 0; zoomPanY = 0; }

	async function switchQueue(q) { reviewQueue = q; await loadQueue(); }

	function fmtDt(ts) { if (!ts) return ''; return new Date(ts).toLocaleDateString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit' }); }

	const queueTabs = [
		{ key: 'manual_review', label: '待审核' },
		{ key: 'priority', label: '优先' },
		{ key: 'normal', label: '普通' },
		{ key: 'history', label: '历史' },
	];
</script>

<div class="fixed inset-0 top-[57px] z-30 flex flex-col bg-background font-sans">
	<div class="flex h-[48px] shrink-0 items-center justify-between border-b px-3">
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" class="h-8 gap-1 text-xs" onclick={() => goto('/dashboard')}><ArrowLeft class="h-4 w-4" />返回</Button>
			<span class="text-sm font-semibold">审核队列</span>
		</div>
		<div class="flex items-center gap-1">
			{#each queueTabs as qt}
				<Button variant={reviewQueue === qt.key ? 'default' : 'ghost'} size="sm" class="h-7 text-xs" onclick={() => switchQueue(qt.key)}>{qt.label}</Button>
			{/each}
			<span class="mx-2 text-[11px] text-muted-foreground">待:{stats.pendingManual} 优:{stats.priorityQueue} 普:{stats.normalQueue} 今:{stats.todayReviewed}</span>
			<Button variant="ghost" size="icon" class="h-7 w-7" onclick={loadQueue}><RefreshCw class="h-3.5 w-3.5" /></Button>
		</div>
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center text-muted-foreground">
			<div class="text-center"><Loader2 class="mx-auto mb-3 h-8 w-8 animate-spin" /><p class="text-sm">加载审核队列...</p></div>
		</div>
	{:else if photos.length === 0}
		<div class="flex flex-1 items-center justify-center text-muted-foreground">
			<div class="text-center"><Image class="mx-auto mb-3 opacity-20" style="width:56px;height:56px;" /><p class="text-lg font-medium">该队列暂无照片</p><p class="mt-1 text-sm">切换队列或稍后再来</p><Button variant="outline" size="sm" class="mt-3" onclick={loadQueue}><RefreshCw class="mr-1 h-3.5 w-3.5" />刷新队列</Button></div>
		</div>
	{:else if currentPhoto}
		<div class="flex flex-1 overflow-hidden">
			<div class="relative flex flex-1 items-center justify-center bg-black" style="min-width:0;">
				<div class="card-stage">
					{#each stackCards as card, i}
						<div
							class="review-card {i===0?'card-front':''} {i===0&&exiting?'card-exiting':''} {i===0&&entering?'card-entering':''}"
							style="z-index:{3-i};{i>0?'transform:translateX('+(i*16)+'px) translateY('+(i*10)+'px) scale('+(1-i*0.03)+');opacity:'+(1-i*0.35)+';':''}"
						>
							<div class="card-img-wrap" onclick={i===0?openZoom:undefined} onkeydown={i===0?(e)=>e.key==='Enter'&&openZoom():undefined} role={i===0?'button':undefined} tabindex={i===0?0:undefined}>
								<img src={card.photo.url} alt="" class="card-img" loading="eager" />
								{#if i===0}
									<button class="zm-btn" onclick={openZoom}><Maximize2 class="h-5 w-5" /></button>
									{#if hasPrev}<button class="nav-a nav-l" onclick={goPrev}><ChevronLeft class="h-6 w-6" /></button>{/if}
									{#if hasNext}<button class="nav-a nav-r" onclick={goNext}><ChevronRight class="h-6 w-6" /></button>{/if}
									<div class="cnt-badge">{currentIdx + 1} / {photos.length}</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="flex w-[380px] shrink-0 flex-col border-l bg-card">
				<div class="border-b px-4 py-3">
					<div class="flex items-center justify-between">
						<h2 class="m-0 max-w-[270px] truncate text-base font-bold">{currentPhoto.title || '无标题'}</h2>
						<div class="flex gap-1">
							{#if currentPhoto.queue === 'priority'}<Badge variant="secondary" class="text-[10px]">优先</Badge>{/if}
							{#if currentPhoto.is_hot}<Badge variant="destructive" class="text-[10px]">热门</Badge>{/if}
						</div>
					</div>
					<p class="mt-1 text-xs text-muted-foreground">摄影师：{currentPhoto.photographer_name || '未知'}</p>
				</div>

				<div class="flex-1 overflow-y-auto px-4 py-3" style="min-height:0;">
					<table class="w-full text-sm">
						<tbody>
							{#if currentPhoto.aircraft_type}<tr class="border-b border-border/50"><td class="w-[72px] py-2 pr-3 text-[11px] font-medium text-muted-foreground">机型</td><td class="py-2 text-sm">{currentPhoto.aircraft_type}</td></tr>{/if}
							{#if currentPhoto.registration}<tr class="border-b border-border/50"><td class="py-2 pr-3 text-[11px] font-medium text-muted-foreground">注册号</td><td class="py-2 font-mono text-sm font-semibold">{currentPhoto.registration}</td></tr>{/if}
							{#if currentPhoto.airline}<tr class="border-b border-border/50"><td class="py-2 pr-3 text-[11px] font-medium text-muted-foreground">航司</td><td class="py-2 text-sm">{currentPhoto.airline}</td></tr>{/if}
							{#if currentPhoto.location}<tr class="border-b border-border/50"><td class="py-2 pr-3 text-[11px] font-medium text-muted-foreground">拍摄地</td><td class="py-2 text-sm">{currentPhoto.location}</td></tr>{/if}
							{#if currentPhoto.photo_date}<tr class="border-b border-border/50"><td class="py-2 pr-3 text-[11px] font-medium text-muted-foreground">拍摄日期</td><td class="py-2 text-sm">{currentPhoto.photo_date}</td></tr>{/if}
							{#if currentPhoto.types}<tr class="border-b border-border/50"><td class="py-2 pr-3 text-[11px] font-medium text-muted-foreground">类别</td><td class="py-2 text-sm">{currentPhoto.types}</td></tr>{/if}
							<tr class="border-b border-border/50"><td class="py-2 pr-3 text-[11px] font-medium text-muted-foreground">上传时间</td><td class="py-2 text-sm">{fmtDt(currentPhoto.created_at)}</td></tr>
							{#if currentPhoto.filename}<tr class="border-b border-border/50"><td class="py-2 pr-3 text-[11px] font-medium text-muted-foreground">文件名</td><td class="py-2 font-mono text-[11px] text-muted-foreground break-all">{currentPhoto.filename}</td></tr>{/if}
						</tbody>
					</table>
					{#if currentPhoto.description}
						<div class="mt-4"><h4 class="mb-1 text-[11px] font-medium text-muted-foreground">简介</h4><p class="text-sm leading-relaxed text-foreground/80">{currentPhoto.description}</p></div>
					{/if}
				</div>

				<div class="border-t bg-muted/30 px-4 py-3 flex flex-col gap-3">
					{#if rejectOpen}
						<div>
							<label class="mb-1 block text-[11px] font-medium text-destructive">拒绝原因 (必填)</label>
							<Textarea class="h-14 border-destructive/50 text-sm" bind:value={rejectReason} placeholder="例如：画质模糊 / 重复上传 / 非航空题材..." />
						</div>
					{/if}
					<div>
						<label class="mb-1 block text-[11px] font-medium text-muted-foreground">审核评语</label>
						<Textarea class="h-28 text-sm" bind:value={reviewNote} placeholder="输入审核备注..." />
					</div>
					<div class="flex gap-2">
						{#if rejectOpen}
							<Button variant="destructive" size="sm" class="flex-1" onclick={reject} disabled={!rejectReason}><XCircle class="mr-1.5 h-4 w-4" />确认拒绝</Button>
							<Button variant="outline" size="sm" onclick={() => { rejectOpen = false; rejectReason = ''; }}>取消</Button>
						{:else}
							<Button variant="default" size="sm" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-primary-foreground" onclick={approve}><CheckCircle class="mr-1.5 h-4 w-4" />通过 (A)</Button>
							<Button variant="destructive" size="sm" class="flex-1" onclick={() => { rejectOpen = true; rejectReason = ''; }}><XCircle class="mr-1.5 h-4 w-4" />拒绝 (R)</Button>
						{/if}
					</div>
					<div class="flex items-center justify-between">
						<Button variant="outline" size="sm" class="h-7 text-xs" onclick={goPrev} disabled={!hasPrev}><ChevronLeft class="mr-1 h-3.5 w-3.5" />上一张</Button>
						<span class="text-xs text-muted-foreground">{currentIdx + 1} / {photos.length}</span>
						<Button variant="outline" size="sm" class="h-7 text-xs" onclick={goNext} disabled={!hasNext}>下一张<ChevronRight class="ml-1 h-3.5 w-3.5" /></Button>
					</div>
					<p class="text-center text-[10px] text-muted-foreground/60">
						<kbd>A</kbd> 通过 · <kbd>R</kbd> 拒绝 · <kbd>&larr;</kbd><kbd>&rarr;</kbd> 切换 · 点击图片放大
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

{#if zoomOpen && currentPhoto}
	<div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/95" style="cursor:{zoomScale>1?(isDragging?'grabbing':'grab'):'zoom-out'};" onclick={closeZoom} onwheel={zoomWheel} onmousedown={zoomMDown} onmousemove={zoomMMove} onmouseup={zoomMUp} onmouseleave={zoomMUp} ondblclick={zoomDbl} onkeydown={(e)=>{if(e.key==='Escape')closeZoom();}} role="dialog" tabindex="-1">
		<button class="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/25" onclick={closeZoom}><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg></button>
		<div class="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70">{Math.round(zoomScale * 100)}% · 滚轮缩放 · 拖拽平移 · 双击复位</div>
		<img src={currentPhoto.url} alt="" class="select-none" style="transform:translate({zoomPanX}px,{zoomPanY}px) scale({zoomScale});max-width:90vw;max-height:90vh;object-fit:contain;" ondragstart={(e)=>e.preventDefault()} />
	</div>
{/if}

<style>
	.card-stage { perspective: 1200px; perspective-origin: 50% 50%; position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
	.review-card { position: absolute; width: 92%; height: 92%; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.5); transition: transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.45s ease; transform-origin: center bottom; }
	.card-img-wrap { width: 100%; height: 100%; background: #0a0a0a; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; }
	.card-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
	.card-front { box-shadow: 0 4px 30px rgba(255,255,255,0.06), 0 8px 60px rgba(0,0,0,0.6); }
	.card-exiting { animation: tiltExit 0.4s cubic-bezier(0.55,0,0.1,1) forwards; pointer-events: none; }
	.card-entering { animation: dropIn 0.45s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
	@keyframes tiltExit { 0%{transform:translateX(0) rotate(0deg);opacity:1} 100%{transform:translateX(-35%) rotate(-12deg);opacity:0;box-shadow:0 30px 80px rgba(0,0,0,0.7)}}
	@keyframes dropIn { 0%{transform:translateX(30px) translateY(-10px) scale(0.96);opacity:0.6} 100%{transform:translateX(0) translateY(0) scale(1);opacity:1}}
	.zm-btn { position:absolute; right:10px; top:10px; padding:6px; border-radius:8px; border:none; cursor:pointer; background:rgba(0,0,0,0.5); color:rgba(255,255,255,0.7) }
	.zm-btn:hover { color:#fff; background:rgba(0,0,0,0.7) }
	.nav-a { position:absolute; top:50%; transform:translateY(-50%); padding:10px; border-radius:50%; border:none; cursor:pointer; background:rgba(0,0,0,0.4); color:#fff }
	.nav-a:hover { background:rgba(0,0,0,0.7) }
	.nav-l { left:10px } .nav-r { right:10px }
	.cnt-badge { position:absolute; bottom:12px; left:12px; padding:3px 10px; border-radius:6px; font-size:12px; color:rgba(255,255,255,0.7); background:rgba(0,0,0,0.5) }
	kbd { background:hsl(var(--secondary)); color:hsl(var(--muted-foreground)); font-size:10px; padding:1px 5px; border-radius:3px }
</style>
