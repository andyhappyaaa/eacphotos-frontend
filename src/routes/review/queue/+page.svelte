<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { isReviewer, authLoading } from "$lib/stores/auth";
	import { api } from '$lib/api';
	import { showToast } from '$lib/stores/toast';
	import {
		ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle,
		Maximize2, Loader2, Image, RefreshCw
	} from '@lucide/svelte';

	// ── State ──
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
	let exiting = $state(false);       // exit animation in progress
	let entering = $state(false);      // entry animation
	let rejectOpen = $state(false);
	let rejectReason = $state('');

	let reviewQueue = $state('manual_review');
	let stats = $state({ pendingManual: 0, priorityQueue: 0, normalQueue: 0, todayReviewed: 0 });

	// ── Derived ──
	let currentPhoto = $derived(photos[currentIdx] || null);
	let nextPhoto = $derived(photos[currentIdx + 1] || null);
	let afterNext = $derived(photos[currentIdx + 2] || null);
	let hasPrev = $derived(currentIdx > 0);
	let hasNext = $derived(currentIdx < photos.length - 1);

	// ── Stack indices for rendering: [current, next, after-next] ──
	let stackCards = $derived([
		{ photo: photos[currentIdx] || null, layer: 0, key: currentIdx },
		{ photo: photos[currentIdx + 1] || null, layer: 1, key: currentIdx + 1 },
		{ photo: photos[currentIdx + 2] || null, layer: 2, key: currentIdx + 2 },
	].filter(c => c.photo));

	// ── Mount ──
	onMount(async () => {
		await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
		if (!$isReviewer) { window.location.href = '/login'; return; }
		loadQueue();
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => window.removeEventListener('keydown', handleKeydown));

	// ── Data ──
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
			exiting = false;
			entering = false;
		} catch (e) { showToast('加载失败', 'error'); }
		finally { loading = false; }
	}

	// ── Navigation with stacked-card tilt animation ──
	function goTo(idx) {
		if (idx < 0 || idx >= photos.length || exiting) return;
		exiting = true;
		setTimeout(() => {
			currentIdx = idx;
			reviewNote = '';
			rejectReason = '';
			rejectOpen = false;
			exiting = false;
			entering = true;
			setTimeout(() => { entering = false; }, 400);
		}, 400);
	}
	function goNext() { if (hasNext) goTo(currentIdx + 1); }
	function goPrev() { if (hasPrev) goTo(currentIdx - 1); }

	// ── Review Actions ──
	async function approve() {
		if (!currentPhoto || exiting) return;
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
		if (!currentPhoto || exiting) return;
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
		exiting = true;
		setTimeout(() => {
			const newPhotos = [...photos];
			newPhotos.splice(currentIdx, 1);
			photos = newPhotos;
			rejectReason = '';
			rejectOpen = false;
			reviewNote = '';
			exiting = false;

			if (photos.length === 0) {
				showToast('该队列已清空，正在刷新...', 'success');
				setTimeout(() => loadQueue(), 500);
				return;
			}
			if (currentIdx >= photos.length) currentIdx = photos.length - 1;
			entering = true;
			setTimeout(() => { entering = false; }, 400);
		}, 400);
	}

	// ── Keyboard ──
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

	// ── Queue ──
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

<div class="review-shell">
	<!-- Top bar -->
	<div class="topbar">
		<div class="topbar-left">
			<button class="btn btn-sm btn-ghost" onclick={() => goto('/dashboard')}><ArrowLeft class="h-4 w-4" /> 返回</button>
			<span class="fw-semibold small">审核队列</span>
		</div>
		<div class="topbar-right">
			{#each queueTabs as qt}
				<button class="btn btn-sm {reviewQueue === qt.key ? 'btn-primary' : 'btn-ghost'} px-2 py-0 small" onclick={() => switchQueue(qt.key)}>{qt.icon} {qt.label}</button>
			{/each}
			<span class="stats-line">待:{stats.pendingManual} 优:{stats.priorityQueue} 普:{stats.normalQueue} 今:{stats.todayReviewed}</span>
			<button class="btn btn-sm btn-ghost p-1" onclick={loadQueue} title="刷新"><RefreshCw class="h-4 w-4" /></button>
		</div>
	</div>

	<!-- Body -->
	{#if loading}
		<div class="empty-state"><Loader2 class="mb-2 h-8 w-8 animate-spin" /><p class="small text-muted">加载审核队列...</p></div>
	{:else if photos.length === 0}
		<div class="empty-state"><Image style="width:56px;height:56px;opacity:.2;" /><p class="fs-5 fw-medium">该队列暂无照片</p><p class="small">切换队列或稍后再来</p><button class="btn btn-primary btn-sm mt-2" onclick={loadQueue}><RefreshCw class="h-3 w-3" /> 刷新队列</button></div>
	{:else if currentPhoto}
		<div class="review-body">
			<!-- LEFT: Card Stack Area -->
			<div class="card-stage">
				<!-- Perspective wrapper -->
				<div class="card-perspective">
					{#each stackCards as card, i (card.key)}
						{@const isFront = i === 0}
						{@const isOffset = i > 0}
						<div
							class="review-card {isFront ? 'card-front' : ''} {isFront && exiting ? 'card-exiting' : ''} {isFront && entering ? 'card-entering' : ''}"
							style="z-index: {3 - i}; {isOffset ? 'transform: translateX(' + (i * 16) + 'px) translateY(' + (i * 10) + 'px) scale(' + (1 - i * 0.03) + '); opacity: ' + (1 - i * 0.35) + ';' : ''}"
						>
							<!-- Inner black image area -->
							<div class="card-image-wrap" onclick={isFront ? openZoom : undefined} onkeydown={isFront ? (e) => e.key === 'Enter' && openZoom() : undefined} role={isFront ? 'button' : undefined} tabindex={isFront ? 0 : undefined}>
								<img src={card.photo.url} alt={card.photo.title || 'Photo'} class="card-img" loading="eager" />
								{#if isFront}
									<button class="zoom-btn" onclick={openZoom}><Maximize2 class="h-5 w-5" /></button>
									{#if hasPrev}<button class="nav-arrow nav-left" onclick={goPrev}><ChevronLeft class="h-6 w-6" /></button>{/if}
									{#if hasNext}<button class="nav-arrow nav-right" onclick={goNext}><ChevronRight class="h-6 w-6" /></button>{/if}
									<div class="counter-badge">{currentIdx + 1} / {photos.length}</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- RIGHT: Info Panel -->
			<div class="info-panel">
				<div class="info-header">
					<div class="d-flex justify-content-between align-items-center">
						<h2 class="info-title">{currentPhoto.title || '无标题'}</h2>
						<div class="d-flex gap-1">
							{#if currentPhoto.queue === 'priority'}<span class="badge bg-warning text-dark">优先</span>{/if}
							{#if currentPhoto.is_hot}<span class="badge bg-danger">热门</span>{/if}
						</div>
					</div>
					<p class="info-subtitle">摄影师：{currentPhoto.photographer_name || '未知'}</p>
				</div>

				<div class="info-scroll">
					<table class="table table-sm table-borderless info-table">
						<tbody>
							{#if currentPhoto.aircraft_type}<tr><td class="info-label">机型</td><td>{currentPhoto.aircraft_type}</td></tr>{/if}
							{#if currentPhoto.registration}<tr><td class="info-label">注册号</td><td class="font-monospace fw-semibold">{currentPhoto.registration}</td></tr>{/if}
							{#if currentPhoto.airline}<tr><td class="info-label">航司</td><td>{currentPhoto.airline}</td></tr>{/if}
							{#if currentPhoto.location}<tr><td class="info-label">拍摄地</td><td>{currentPhoto.location}</td></tr>{/if}
							{#if currentPhoto.photo_date}<tr><td class="info-label">拍摄日期</td><td>{currentPhoto.photo_date}</td></tr>{/if}
							{#if currentPhoto.types}<tr><td class="info-label">类别</td><td>{currentPhoto.types}</td></tr>{/if}
							<tr><td class="info-label">上传时间</td><td>{formatDate(currentPhoto.created_at)}</td></tr>
							{#if currentPhoto.filename}<tr><td class="info-label">文件名</td><td class="font-monospace info-filename">{currentPhoto.filename}</td></tr>{/if}
						</tbody>
					</table>
					{#if currentPhoto.description}
						<div class="mt-3"><h6 class="info-section-title">简介</h6><p class="info-desc">{currentPhoto.description}</p></div>
					{/if}
				</div>

				<div class="info-actions">
					{#if rejectOpen}
						<div class="animate__animated animate__fadeInDown" style="--animate-duration:0.2s;">
							<label class="form-label text-danger mb-1" style="font-size:11px;">拒绝原因 (必填)</label>
							<textarea class="form-control form-control-sm border-danger" rows="2" bind:value={rejectReason} placeholder="例如：画质模糊 / 重复上传 / 非航空题材..."></textarea>
						</div>
					{/if}
					<div>
						<label class="form-label text-muted mb-1" style="font-size:11px;">审核评语 <span class="opacity-50">(可选)</span></label>
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
					<p class="mb-0 text-center text-muted" style="font-size:10px;">
						<kbd>A</kbd> 通过 · <kbd>R</kbd> 拒绝 · <kbd>&larr;</kbd><kbd>&rarr;</kbd> 切换 · 点击图片放大
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Zoom -->
{#if zoomOpen && currentPhoto}
	<div class="zoom-overlay" style="cursor:{zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-out'};" onclick={closeZoom} onwheel={zoomWheel} onmousedown={zoomMouseDown} onmousemove={zoomMouseMove} onmouseup={zoomMouseUp} onmouseleave={zoomMouseUp} ondblclick={zoomDblClick} onkeydown={(e) => { if (e.key === 'Escape') closeZoom(); }} role="dialog" tabindex="-1">
		<button class="zoom-close" onclick={closeZoom}><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg></button>
		<div class="zoom-info">{Math.round(zoomScale * 100)}% · 滚轮缩放 · 拖拽平移 · 双击复位</div>
		<img src={currentPhoto.url} alt="" class="zoom-img" style="transform: translate({zoomPanX}px, {zoomPanY}px) scale({zoomScale});" ondragstart={(e) => e.preventDefault()} />
	</div>
{/if}

<style>
	/* ── Shell ── */
	.review-shell {
		position: fixed; inset: 57px 0 0 0; z-index: 30;
		display: flex; flex-direction: column;
		background: var(--bs-body-bg, #fff);
		font-family: system-ui, -apple-system, sans-serif;
		color-scheme: light dark;
	}

	/* ── Topbar ── */
	.topbar {
		display: flex; align-items: center; justify-content: space-between;
		height: 48px; min-height: 48px; padding: 0 12px;
		border-bottom: 1px solid var(--bs-border-color, #dee2e6);
	}
	.topbar-left, .topbar-right { display: flex; align-items: center; gap: 8px; }
	.stats-line { font-size: 11px; color: var(--bs-secondary-color); margin: 0 8px; }
	.btn-ghost { background: transparent; color: var(--bs-secondary-color); border: none; }
	.btn-ghost:hover { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }

	/* ── Empty ── */
	.empty-state { display: flex; flex: 1; align-items: center; justify-content: center; flex-direction: column; color: var(--bs-secondary-color); }

	/* ── Body ── */
	.review-body { display: flex; flex: 1; overflow: hidden; }

	/* ── Card Stage ── */
	.card-stage {
		flex: 1; min-width: 0; background: #000;
		display: flex; align-items: center; justify-content: center;
		overflow: hidden;
	}
	.card-perspective {
		perspective: 1200px;
		perspective-origin: 50% 50%;
		position: relative;
		width: 100%; height: 100%;
		display: flex; align-items: center; justify-content: center;
	}

	/* ── Review Card ── */
	.review-card {
		position: absolute;
		width: 92%; height: 92%;
		border-radius: 12px; overflow: hidden;
		box-shadow: 0 8px 40px rgba(0,0,0,0.5);
		transition: transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94),
		            opacity 0.45s ease;
		transform-origin: center bottom;
	}
	.card-image-wrap {
		width: 100%; height: 100%; background: #0a0a0a;
		display: flex; align-items: center; justify-content: center;
		position: relative; cursor: pointer;
	}
	.card-img {
		max-width: 100%; max-height: 100%; object-fit: contain;
		border-radius: 8px;
	}

	/* ── Exit animation: tilt left around bottom pivot + fade ── */
	.card-exiting {
		animation: cardTiltExit 0.4s cubic-bezier(0.55, 0, 0.1, 1) forwards;
		pointer-events: none;
	}
	@keyframes cardTiltExit {
		0%   { transform: translateX(0) rotate(0deg); opacity: 1; }
		100% { transform: translateX(-35%) rotate(-12deg); opacity: 0;
		       box-shadow: 0 30px 80px rgba(0,0,0,0.7); }
	}

	/* ── Entry animation: back cards shift forward into front position ── */
	.card-entering {
		animation: cardDropIn 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
	}
	@keyframes cardDropIn {
		0%   { transform: translateX(30px) translateY(-10px) scale(0.96); opacity: 0.6; }
		100% { transform: translateX(0) translateY(0) scale(1); opacity: 1; }
	}

	/* ── Front card spotlight effect ── */
	.card-front { box-shadow: 0 4px 30px rgba(255,255,255,0.06), 0 8px 60px rgba(0,0,0,0.6); }

	/* ── Overlay buttons ── */
	.zoom-btn {
		position: absolute; right: 10px; top: 10px;
		padding: 6px; border-radius: 8px; border: none; cursor: pointer;
		background: rgba(0,0,0,0.5); color: rgba(255,255,255,0.7);
	}
	.zoom-btn:hover { color: #fff; background: rgba(0,0,0,0.7); }
	.nav-arrow {
		position: absolute; top: 50%; transform: translateY(-50%);
		padding: 10px; border-radius: 50%; border: none; cursor: pointer;
		background: rgba(0,0,0,0.4); color: #fff;
	}
	.nav-arrow:hover { background: rgba(0,0,0,0.7); }
	.nav-left { left: 10px; }
	.nav-right { right: 10px; }
	.counter-badge {
		position: absolute; bottom: 12px; left: 12px;
		padding: 3px 10px; border-radius: 6px;
		font-size: 12px; color: rgba(255,255,255,0.7);
		background: rgba(0,0,0,0.5);
	}

	/* ── Info Panel ── */
	.info-panel {
		width: 380px; min-width: 380px; display: flex; flex-direction: column;
		border-left: 1px solid var(--bs-border-color);
		background: var(--bs-body-bg);
	}
	.info-header {
		padding: 14px 16px; border-bottom: 1px solid var(--bs-border-color);
	}
	.info-title {
		margin: 0; font-size: 15px; font-weight: 700;
		max-width: 270px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}
	.info-subtitle { margin: 4px 0 0; font-size: 12px; color: var(--bs-secondary-color); }

	.info-scroll { flex: 1; overflow-y: auto; padding: 12px 16px; min-height: 0; }
	.info-table { font-size: 13px; margin: 0; }
	.info-label { font-size: 11px; color: var(--bs-secondary-color); width: 68px; padding: 5px 8px 5px 0 !important; }
	.info-filename { font-size: 10px; word-break: break-all; color: var(--bs-secondary-color); }
	.info-section-title { font-size: 11px; color: var(--bs-secondary-color); margin-bottom: 4px; }
	.info-desc { font-size: 13px; line-height: 1.6; opacity: 0.85; margin: 0; }

	.info-actions {
		border-top: 1px solid var(--bs-border-color);
		padding: 12px 16px;
		display: flex; flex-direction: column; gap: 10px;
		background: var(--bs-tertiary-bg);
	}

	/* ── Zoom Overlay ── */
	.zoom-overlay {
		position: fixed; inset: 0; z-index: 100;
		display: flex; align-items: center; justify-content: center;
		background: rgba(0,0,0,0.96); animation: fadeIn 0.2s ease;
	}
	.zoom-close {
		position: absolute; right: 16px; top: 16px; z-index: 10;
		padding: 8px; border-radius: 50%; border: none; cursor: pointer;
		background: rgba(255,255,255,0.15); color: #fff;
	}
	.zoom-close:hover { background: rgba(255,255,255,0.25); }
	.zoom-info {
		position: absolute; left: 16px; top: 16px;
		padding: 4px 12px; border-radius: 6px; font-size: 12px;
		color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.1);
	}
	.zoom-img {
		max-width: 90vw; max-height: 90vh; object-fit: contain;
		user-select: none; transition: transform 0.05s linear;
	}

	/* ── Utils ── */
	kbd { background: var(--bs-tertiary-bg); color: var(--bs-secondary-color); font-size: 10px; padding: 1px 5px; border-radius: 3px; }
	textarea:focus { box-shadow: none; border-color: var(--bs-primary); }
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

	/* ── Dark mode via system ── */
	@media (prefers-color-scheme: dark) {
		.review-shell { --bs-body-bg: #0f172a; --bs-body-color: #e2e8f0;
			--bs-secondary-color: #94a3b8; --bs-border-color: #1e293b;
			--bs-tertiary-bg: #1e293b; --bs-primary: #3b82f6; }
		.review-card { box-shadow: 0 8px 40px rgba(0,0,0,0.7); }
	}
</style>
