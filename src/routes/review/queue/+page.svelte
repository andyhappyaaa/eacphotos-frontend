<script>
	import { onMount, onDestroy } from 'svelte';
	import { isReviewer, authLoading } from "$lib/stores/auth";
	import { api } from '$lib/api';
	import { showToast } from '$lib/stores/toast';
	import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, Maximize2, Loader2, Image, RefreshCw } from '@lucide/svelte';

	let photos = $state([]);
	let currentIdx = $state(0);
	let loading = $state(true);
	let reviewNote = $state('');
	let zoomOpen = $state(false);
	let zoomScale = $state(1);
	let zoomPanX = $state(0);
	let zoomPanY = $state(0);
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let dragPanStartX = $state(0);
	let dragPanStartY = $state(0);
	let animating = $state(false);
	let animDir = $state('');
	let rejectOpen = $state(false);
	let rejectReason = $state('');

	let reviewQueue = $state('manual_review');
	let stats = $state({ pendingManual: 0, priorityQueue: 0, normalQueue: 0, todayReviewed: 0 });

	let currentPhoto = $derived(photos[currentIdx] || null);
	let hasPrev = $derived(currentIdx > 0);
	let hasNext = $derived(currentIdx < photos.length - 1);

	onMount(async () => {
		await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
		if (!$isReviewer) { window.location.href = '/login'; return; }
		loadQueue();
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => { window.removeEventListener('keydown', handleKeydown); });

	async function loadQueue() {
		loading = true;
		try {
			const r = await api('/api/review/dashboard', { method: 'POST', body: JSON.stringify({ queue: reviewQueue }) });
			const d = await r.json();
			stats = d.stats || stats;
			photos = d.photos || [];
			currentIdx = 0;
			reviewNote = '';
			rejectReason = '';
			rejectOpen = false;
		} catch (e) { showToast('加载失败', 'error'); }
		finally { loading = false; }
	}

	// ── Navigation with slide animation ──
	function goTo(idx) {
		if (idx < 0 || idx >= photos.length || animating) return;
		const dir = idx > currentIdx ? 'left' : 'right';
		animDir = dir;
		animating = true;
		setTimeout(() => {
			currentIdx = idx;
			reviewNote = '';
			rejectReason = '';
			rejectOpen = false;
			animating = false;
		}, 320);
	}
	function goNext() { if (hasNext) goTo(currentIdx + 1); }
	function goPrev() { if (hasPrev) goTo(currentIdx - 1); }

	// ── Review Actions ──
	async function approve() {
		if (!currentPhoto || animating) return;
		const photoId = currentPhoto.id;
		try {
			await api(`/api/review/photos/${photoId}/approve`, {
				method: 'POST',
				body: JSON.stringify({ note: reviewNote || undefined })
			});
			showToast('已批准', 'success');
			removeCurrentAndAdvance();
		} catch (e) { showToast('操作失败: ' + (e.message || ''), 'error'); }
	}

	async function reject() {
		if (!currentPhoto || animating) return;
		if (!rejectReason) { showToast('请输入拒绝原因', 'error'); return; }
		const photoId = currentPhoto.id;
		try {
			await api(`/api/review/photos/${photoId}/reject`, {
				method: 'POST',
				body: JSON.stringify({ reason: rejectReason, note: reviewNote || undefined })
			});
			showToast('已拒绝', 'success');
			removeCurrentAndAdvance();
		} catch (e) { showToast('操作失败: ' + (e.message || ''), 'error'); }
	}

	function removeCurrentAndAdvance() {
		const newPhotos = [...photos];
		newPhotos.splice(currentIdx, 1);
		photos = newPhotos;
		rejectReason = '';
		rejectOpen = false;
		reviewNote = '';

		if (photos.length === 0) {
			showToast('该队列已清空，正在刷新...', 'success');
			setTimeout(() => loadQueue(), 500);
			return;
		}
		if (currentIdx >= photos.length) currentIdx = photos.length - 1;
		animDir = 'right';
		animating = true;
		setTimeout(() => { animating = false; }, 320);
	}

	// ── Keyboard Shortcuts ──
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

	// ── Zoom ──
	function openZoom() { zoomOpen = true; zoomScale = 1; zoomPanX = 0; zoomPanY = 0; }
	function closeZoom() { zoomOpen = false; }
	function zoomWheel(e) { e.preventDefault(); const d = e.deltaY > 0 ? -0.2 : 0.2; zoomScale = Math.max(0.5, Math.min(5, zoomScale + d)); }
	function zoomMouseDown(e) { isDragging = true; dragStartX = e.clientX; dragStartY = e.clientY; dragPanStartX = zoomPanX; dragPanStartY = zoomPanY; }
	function zoomMouseMove(e) { if (!isDragging) return; zoomPanX = dragPanStartX + (e.clientX - dragStartX); zoomPanY = dragPanStartY + (e.clientY - dragStartY); }
	function zoomMouseUp() { isDragging = false; }
	function zoomDblClick() { zoomScale = zoomScale > 1.5 ? 1 : 2.5; zoomPanX = 0; zoomPanY = 0; }

	async function switchQueue(q) { reviewQueue = q; await loadQueue(); }

	function formatDate(ts) {
		if (!ts) return '';
		return new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
	}

	const queueTabs = [
		{ key: 'manual_review', label: '待审核', icon: '📋' },
		{ key: 'priority', label: '优先', icon: '⭐' },
		{ key: 'normal', label: '普通', icon: '📌' },
		{ key: 'history', label: '历史', icon: '📜' },
	];
</script>

<svelte:head>
	<link rel="stylesheet" href="https://gcore.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
</svelte:head>

<div class="position-fixed start-0 end-0 bottom-0 z-30 d-flex flex-column bg-body" style="top:57px; font-family:system-ui,-apple-system,sans-serif;">
	<!-- Top bar -->
	<div class="d-flex align-items-center justify-content-between border-bottom px-3" style="height:48px;min-height:48px;">
		<div class="d-flex align-items-center gap-2">
			<a href="/dashboard" class="d-inline-flex align-items-center gap-1 text-secondary text-decoration-none small hover:text-body"><ArrowLeft class="h-4 w-4" /> 返回</a>
			<span class="fw-semibold small">审核队列</span>
		</div>
		<div class="d-flex align-items-center gap-1">
			{#each queueTabs as qt}
				<button class="btn btn-sm {reviewQueue === qt.key ? 'btn-primary' : 'btn-ghost'} px-2 py-0 small" onclick={() => switchQueue(qt.key)}>
					{qt.icon} {qt.label}
				</button>
			{/each}
			<span class="mx-2 text-muted" style="font-size:11px;">
				待:{stats.pendingManual} 优:{stats.priorityQueue} 普:{stats.normalQueue} 今:{stats.todayReviewed}
			</span>
			<button class="btn btn-sm btn-ghost p-1" onclick={loadQueue} title="刷新"><RefreshCw class="h-4 w-4" /></button>
		</div>
	</div>

	{#if loading}
		<div class="d-flex flex-1 align-items-center justify-content-center">
			<div class="text-center text-muted"><Loader2 class="mb-2 h-8 w-8 animate-spin" /><p class="small">加载审核队列...</p></div>
		</div>
	{:else if photos.length === 0}
		<div class="d-flex flex-1 align-items-center justify-content-center">
			<div class="text-center text-muted"><Image class="mb-2" style="width:56px;height:56px;opacity:.2;" /><p class="fs-5 fw-medium">该队列暂无照片</p><p class="small">切换队列或稍后再来</p><button class="btn btn-primary btn-sm mt-2" onclick={loadQueue}><RefreshCw class="h-3 w-3" /> 刷新队列</button></div>
		</div>
	{:else if currentPhoto}
		<div class="d-flex flex-1 overflow-hidden">
			<!-- LEFT: Image Area -->
			<div class="position-relative d-flex flex-1 align-items-center justify-content-center bg-dark" style="min-width:0;">
				<div class="d-flex h-100 w-100 align-items-center justify-content-center p-3 review-stage {animating ? (animDir === 'left' ? 'stage-exit-left' : 'stage-exit-right') : 'stage-enter'}" onclick={openZoom} onkeydown={(e) => e.key === 'Enter' && openZoom()} role="button" tabindex="0">
					<img src={currentPhoto.url} alt={currentPhoto.title || 'Photo'} class="rounded-1" style="max-width:100%;max-height:100%;object-fit:contain;cursor:zoom-in;" loading="eager" />
				</div>

				<button class="position-absolute top-0 end-0 m-2 btn btn-sm btn-dark bg-opacity-50 border-0 text-white-50" onclick={openZoom} title="点击放大"><Maximize2 class="h-5 w-5" /></button>

				{#if hasPrev}
					<button class="position-absolute top-50 start-0 translate-middle-y ms-2 btn btn-sm btn-dark bg-opacity-50 border-0 rounded-circle text-white p-2" onclick={goPrev} title="上一张 (←)"><ChevronLeft class="h-5 w-5" /></button>
				{/if}
				{#if hasNext}
					<button class="position-absolute top-50 translate-middle-y btn btn-sm btn-dark bg-opacity-50 border-0 rounded-circle text-white p-2" style="right:396px;" onclick={goNext} title="下一张 (→)"><ChevronRight class="h-5 w-5" /></button>
				{/if}

				<div class="position-absolute bottom-0 start-0 m-3 rounded-2 px-2 py-1 small text-white-50" style="background:rgba(0,0,0,.5);">{currentIdx + 1} / {photos.length}</div>
			</div>

			<!-- RIGHT: Info Panel (380px) -->
			<div class="d-flex flex-column border-start bg-body review-panel {animating && animDir === 'left' ? 'panel-exit-left' : ''} {!animating ? 'panel-enter' : ''}" style="width:380px;min-width:380px;transition: opacity 0.3s ease, transform 0.35s ease;">
				<div class="border-bottom px-3 py-2">
					<div class="d-flex align-items-center justify-content-between">
						<h2 class="m-0 fs-6 fw-bold text-truncate" style="max-width:280px;">{currentPhoto.title || '无标题'}</h2>
						<div class="d-flex gap-1">
							{#if currentPhoto.queue === 'priority'}<span class="badge bg-warning text-dark">优先</span>{/if}
							{#if currentPhoto.is_hot}<span class="badge bg-danger">热门</span>{/if}
						</div>
					</div>
					<p class="mt-1 mb-0 text-muted" style="font-size:12px;">摄影师：{currentPhoto.photographer_name || '未知'}</p>
				</div>

				<div class="flex-1 overflow-y-auto px-3 py-2" style="min-height:0;">
					<table class="table table-sm table-borderless mb-0" style="font-size:13px;">
						<tbody>
							{#if currentPhoto.aircraft_type}<tr><td class="text-muted ps-0" style="width:70px;font-size:11px;">机型</td><td class="pe-0">{currentPhoto.aircraft_type}</td></tr>{/if}
							{#if currentPhoto.registration}<tr><td class="text-muted ps-0" style="font-size:11px;">注册号</td><td class="pe-0 font-monospace fw-semibold">{currentPhoto.registration}</td></tr>{/if}
							{#if currentPhoto.airline}<tr><td class="text-muted ps-0" style="font-size:11px;">航司</td><td class="pe-0">{currentPhoto.airline}</td></tr>{/if}
							{#if currentPhoto.location}<tr><td class="text-muted ps-0" style="font-size:11px;">拍摄地</td><td class="pe-0">{currentPhoto.location}</td></tr>{/if}
							{#if currentPhoto.photo_date}<tr><td class="text-muted ps-0" style="font-size:11px;">拍摄日期</td><td class="pe-0">{currentPhoto.photo_date}</td></tr>{/if}
							{#if currentPhoto.types}<tr><td class="text-muted ps-0" style="font-size:11px;">类别</td><td class="pe-0">{currentPhoto.types}</td></tr>{/if}
							<tr><td class="text-muted ps-0" style="font-size:11px;">上传时间</td><td class="pe-0">{formatDate(currentPhoto.created_at)}</td></tr>
							{#if currentPhoto.filename}<tr><td class="text-muted ps-0" style="font-size:11px;">文件名</td><td class="pe-0 font-monospace text-break" style="font-size:10px;">{currentPhoto.filename}</td></tr>{/if}
						</tbody>
					</table>
					{#if currentPhoto.description}
						<div class="mt-3"><h6 class="text-muted mb-1" style="font-size:11px;">简介</h6><p class="mb-0" style="font-size:13px;line-height:1.6;opacity:.85;">{currentPhoto.description}</p></div>
					{/if}
				</div>

				<!-- Review actions -->
				<div class="border-top bg-body-tertiary px-3 py-2 d-flex flex-column gap-2">
					{#if rejectOpen}
						<div class="fade show">
							<label class="form-label mb-1 text-danger" style="font-size:11px;">拒绝原因 (必填)</label>
							<textarea class="form-control form-control-sm border-danger" rows="2" bind:value={rejectReason} placeholder="例如：画质模糊 / 重复上传 / 非航空题材..."></textarea>
						</div>
					{/if}

					<div>
						<label class="form-label mb-1 text-muted" style="font-size:11px;">审核评语 <span class="opacity-50">(可选)</span></label>
						<textarea class="form-control form-control-sm" rows="6" bind:value={reviewNote} placeholder="输入审核备注..."></textarea>
					</div>

					<div class="d-flex gap-2">
						{#if rejectOpen}
							<button class="btn btn-danger btn-sm flex-1 fw-semibold" onclick={reject} disabled={!rejectReason}><XCircle class="h-4 w-4" /> 确认拒绝</button>
							<button class="btn btn-outline-secondary btn-sm" onclick={() => { rejectOpen = false; rejectReason = ''; }}>取消</button>
						{:else}
							<button class="btn btn-success btn-sm flex-1 fw-semibold" onclick={approve}><CheckCircle class="h-4 w-4" /> 通过 (A)</button>
							<button class="btn btn-danger btn-sm flex-1 fw-semibold" onclick={() => { rejectOpen = true; rejectReason = ''; }}><XCircle class="h-4 w-4" /> 拒绝 (R)</button>
						{/if}
					</div>

					<div class="d-flex align-items-center justify-content-between">
						<button class="btn btn-outline-secondary btn-sm px-2" onclick={goPrev} disabled={!hasPrev}><ChevronLeft class="h-3 w-3" /> 上一张</button>
						<span class="text-muted" style="font-size:12px;">{currentIdx + 1} / {photos.length}</span>
						<button class="btn btn-outline-secondary btn-sm px-2" onclick={goNext} disabled={!hasNext}>下一张 <ChevronRight class="h-3 w-3" /></button>
					</div>

					<p class="text-center text-muted mb-0" style="font-size:10px;">
						<kbd>A</kbd> 通过 · <kbd>R</kbd> 拒绝 · <kbd>&larr;</kbd><kbd>&rarr;</kbd> 切换 · 点击图片放大
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Zoom Modal -->
{#if zoomOpen && currentPhoto}
	<div class="position-fixed start-0 end-0 top-0 bottom-0 z-3 d-flex align-items-center justify-content-center fade show" style="background:rgba(0,0,0,.96);cursor:{zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-out'};" onclick={closeZoom} onwheel={zoomWheel} onmousedown={zoomMouseDown} onmousemove={zoomMouseMove} onmouseup={zoomMouseUp} onmouseleave={zoomMouseUp} ondblclick={zoomDblClick} onkeydown={(e) => { if (e.key === 'Escape') closeZoom(); }} role="dialog" tabindex="-1">
		<button class="position-absolute top-0 end-0 m-3 btn btn-sm btn-light bg-opacity-10 border-0 rounded-circle text-white p-2" onclick={closeZoom}>
			<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
		</button>
		<div class="position-absolute top-0 start-0 m-3 rounded-2 px-2 py-1 small text-white-50" style="background:rgba(255,255,255,.1);">{Math.round(zoomScale * 100)}% · 滚轮缩放 · 拖拽平移 · 双击复位</div>
		<img src={currentPhoto.url} alt="" class="user-select-none" style="transform: translate({zoomPanX}px, {zoomPanY}px) scale({zoomScale}); max-width:90vw; max-height:90vh; object-fit:contain; transition: transform 0.05s linear;" ondragstart={(e) => e.preventDefault()} />
	</div>
{/if}

<style>
	/* ── Review stage animations ── */
	.review-stage { transition: opacity 0.32s ease, transform 0.32s ease; }
	.stage-enter  { animation: slideInFromRight 0.32s ease forwards; }
	.stage-exit-left  { animation: slideOutToLeft 0.32s ease forwards; }
	.stage-exit-right { animation: slideOutToRight 0.32s ease forwards; }

	/* ── Info panel animations ── */
	.review-panel { transition: opacity 0.3s ease, transform 0.35s ease; }
	.panel-enter { animation: panelFadeIn 0.35s ease forwards; }
	.panel-exit-left { animation: panelFadeOutLeftDown 0.35s ease forwards; }

	@keyframes slideInFromRight {
		from { opacity: 0; transform: translateX(60px); }
		to   { opacity: 1; transform: translateX(0); }
	}
	@keyframes slideOutToLeft {
		from { opacity: 1; transform: translateX(0); }
		to   { opacity: 0; transform: translateX(-80px); }
	}
	@keyframes slideOutToRight {
		from { opacity: 1; transform: translateX(0); }
		to   { opacity: 0; transform: translateX(80px); }
	}
	@keyframes panelFadeIn {
		from { opacity: 0; transform: translateX(30px); }
		to   { opacity: 1; transform: translateX(0); }
	}
	@keyframes panelFadeOutLeftDown {
		from { opacity: 1; transform: translate(0, 0); }
		to   { opacity: 0; transform: translate(-120px, 40px); }
	}

	/* ── Button tweaks ── */
	.btn-ghost { background: transparent; color: var(--bs-secondary-color); border: none; }
	.btn-ghost:hover { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }
	kbd { background: var(--bs-tertiary-bg); color: var(--bs-secondary-color); font-size: 10px; padding: 1px 5px; border-radius: 3px; }
	textarea:focus { box-shadow: none; border-color: var(--bs-primary); }

	/* ── Dark mode inherit ── */
	.bg-dark { background-color: #000 !important; }
</style>
