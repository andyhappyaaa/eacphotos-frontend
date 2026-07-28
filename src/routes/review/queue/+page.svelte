<script>
	import { onMount, onDestroy } from 'svelte';
	import { isReviewer, authLoading } from "$lib/stores/auth";
	import { api } from '$lib/api';
	import { showToast } from '$lib/stores/toast';
	import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, Maximize2, Loader2, Image, RefreshCw } from '@lucide/svelte';

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
	let animating = $state(false);        // exit animation in progress
	let animDir = $state('');             // 'left' | 'right'
	let rejectOpen = $state(false);
	let rejectReason = $state('');

	let reviewQueue = $state('manual_review'); // 'manual_review' | 'priority' | 'normal'
	let stats = $state({ pendingManual: 0, priorityQueue: 0, normalQueue: 0, todayReviewed: 0 });

	// ── Derived ──
	let currentPhoto = $derived(photos[currentIdx] || null);
	let hasPrev = $derived(currentIdx > 0);
	let hasNext = $derived(currentIdx < photos.length - 1);

	// ── Mount ──
	onMount(async () => {
		await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
		if (!$isReviewer) { window.location.href = '/login'; return; }
		loadQueue();
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});

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
		} catch (e) { showToast('加载失败', 'error'); }
		finally { loading = false; }
	}

	async function loadPhotosOnly() {
		try {
			const r = await api('/api/review/dashboard', { method: 'POST', body: JSON.stringify({ queue: reviewQueue }) });
			const d = await r.json();
			photos = d.photos || [];
			stats = d.stats || stats;
		} catch (e) { /* silent */ }
	}

	// ── Navigation ──
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
		}, 350);
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
			showToast('✅ 已批准', 'success');
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
			showToast('❌ 已拒绝', 'success');
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
			showToast('🎉 该队列已清空，正在刷新...', 'success');
			setTimeout(() => loadQueue(), 500);
			return;
		}
		if (currentIdx >= photos.length) {
			currentIdx = photos.length - 1;
		}
		// trigger entry animation manually
		animDir = 'right';
		animating = true;
		setTimeout(() => { animating = false; }, 350);
	}

	// ── Keyboard Shortcuts ──
	function handleKeydown(e) {
		if (zoomOpen) {
			if (e.key === 'Escape') { closeZoom(); return; }
			return; // Don't handle review keys when zoomed
		}
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
	function zoomWheel(e) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.2 : 0.2;
		zoomScale = Math.max(0.5, Math.min(5, zoomScale + delta));
	}
	function zoomMouseDown(e) {
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dragPanStartX = zoomPanX;
		dragPanStartY = zoomPanY;
	}
	function zoomMouseMove(e) {
		if (!isDragging) return;
		zoomPanX = dragPanStartX + (e.clientX - dragStartX);
		zoomPanY = dragPanStartY + (e.clientY - dragStartY);
	}
	function zoomMouseUp() { isDragging = false; }
	function zoomDblClick() { zoomScale = zoomScale > 1.5 ? 1 : 2.5; zoomPanX = 0; zoomPanY = 0; }

	// ── Queue Tabs ──
	async function switchQueue(q) {
		reviewQueue = q;
		await loadQueue();
	}

	// ── Helpers ──
	function formatDate(ts) {
		if (!ts) return '';
		const d = new Date(ts);
		return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
	}

	const queueTabs = [
		{ key: 'manual_review', label: '待审核', icon: '📋' },
		{ key: 'priority', label: '优先', icon: '⭐' },
		{ key: 'normal', label: '普通', icon: '📌' },
		{ key: 'history', label: '历史', icon: '📜' },
	];
</script>

<svelte:head>
	<link rel="stylesheet" href="https://gcore.jsdelivr.net/npm/animate.css@4.1.1/animate.min.css" />
</svelte:head>

<!-- Override layout: fixed full-screen below navbar -->
<div class="fixed inset-0 top-[57px] z-30 flex flex-col bg-background" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
	<!-- Top bar -->
	<div class="flex items-center justify-between border-b px-4 py-2" style="height:48px; min-height:48px;">
		<div class="flex items-center gap-3">
			<a href="/dashboard" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors no-underline">
				<ArrowLeft class="h-4 w-4" /> 返回
			</a>
			<span class="text-sm font-semibold">审核队列</span>
		</div>
		<div class="flex items-center gap-1.5">
			{#each queueTabs as qt}
				<button
					class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors border-0 cursor-pointer {reviewQueue === qt.key ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-secondary'}"
					onclick={() => switchQueue(qt.key)}
				>
					{qt.icon} {qt.label}
				</button>
			{/each}
			<span class="mx-2 text-xs text-muted-foreground">
				待审:{stats.pendingManual} 优先:{stats.priorityQueue} 普通:{stats.normalQueue} 今日:{stats.todayReviewed}
			</span>
			<button class="rounded-md p-1.5 text-muted-foreground hover:bg-secondary border-0 bg-transparent cursor-pointer" onclick={loadQueue} title="刷新">
				<RefreshCw class="h-4 w-4" />
			</button>
		</div>
	</div>

	<!-- Main content area -->
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center text-muted-foreground">
				<Loader2 class="mx-auto mb-3 h-10 w-10 animate-spin" />
				<p class="text-sm">加载审核队列...</p>
			</div>
		</div>
	{:else if photos.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center text-muted-foreground">
				<Image class="mx-auto mb-3 h-14 w-14 opacity-20" />
				<p class="text-lg font-medium">🎉 该队列暂无照片</p>
				<p class="mt-1 text-sm">切换队列或稍后再来</p>
				<button class="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground border-0 cursor-pointer" onclick={loadQueue}>
					<RefreshCw class="mr-1.5 inline h-3.5 w-3.5" />刷新队列
				</button>
			</div>
		</div>
	{:else}
		{#if currentPhoto}
			<div class="flex flex-1 overflow-hidden">
				<!-- ── LEFT: Image Area ── -->
				<div class="relative flex flex-1 items-center justify-center bg-black" style="min-width:0;">
					<!-- Image with animation wrapper -->
					<div
						class="flex h-full w-full items-center justify-center p-4 {animating ? (animDir === 'left' ? 'animate__animated animate__backOutLeft' : 'animate__animated animate__backOutRight') : 'animate__animated animate__backInRight'}"
						style="--animate-duration: 0.35s;"
						onclick={openZoom}
						onkeydown={(e) => e.key === 'Enter' && openZoom()}
						role="button"
						tabindex="0"
					>
						<img
							src={currentPhoto.url}
							alt={currentPhoto.title || 'Photo'}
							class="cursor-zoom-in rounded-sm"
							style="max-width:100%; max-height:100%; object-fit:contain;"
							loading="eager"
						/>
					</div>

					<!-- Zoom hint -->
					<button
						class="absolute right-3 top-3 rounded-lg bg-black/50 p-2 text-white/70 hover:text-white border-0 cursor-pointer transition-opacity"
						onclick={openZoom}
						title="点击放大 (滚轮缩放/拖拽)"
					>
						<Maximize2 class="h-5 w-5" />
					</button>

					<!-- Navigation arrows on image -->
					{#if hasPrev}
						<button
							class="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2.5 text-white hover:bg-black/70 border-0 cursor-pointer transition-all"
							onclick={goPrev}
							title="上一张 (←)"
						>
							<ChevronLeft class="h-6 w-6" />
						</button>
					{/if}
					{#if hasNext}
						<button
							class="absolute right-[396px] top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2.5 text-white hover:bg-black/70 border-0 cursor-pointer transition-all"
							onclick={goNext}
							title="下一张 (→)"
						>
							<ChevronRight class="h-6 w-6" />
						</button>
					{/if}

					<!-- Photo counter badge -->
					<div class="absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-1.5 text-xs text-white/70">
						{currentIdx + 1} / {photos.length}
					</div>
				</div>

				<!-- ── RIGHT: Info Panel (380px) ── -->
				<div class="flex w-[380px] shrink-0 flex-col border-l bg-card" style="min-width:380px;">
					<!-- Panel header -->
					<div class="border-b px-4 py-3">
						<div class="flex items-center justify-between">
							<h2 class="m-0 text-base font-bold truncate max-w-[280px]">{currentPhoto.title || '无标题'}</h2>
							{#if currentPhoto.queue === 'priority'}
								<span class="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">优先</span>
							{/if}
							{#if currentPhoto.is_hot}
								<span class="rounded bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900 dark:text-red-300">热门</span>
							{/if}
						</div>
						<p class="mt-1 text-xs text-muted-foreground">摄影师：{currentPhoto.photographer_name || '未知'}</p>
					</div>

					<!-- Scrollable info -->
					<div class="flex-1 overflow-y-auto px-4 py-3" style="min-height:0;">
						<!-- Photo details table -->
						<table class="w-full text-sm" style="border-collapse:collapse;">
							<tbody>
								{#if currentPhoto.aircraft_type}
									<tr class="border-b border-border/50">
										<td class="py-2 pr-3 text-xs font-medium text-muted-foreground" style="width:80px;">机型</td>
										<td class="py-2 text-sm">{currentPhoto.aircraft_type}</td>
									</tr>
								{/if}
								{#if currentPhoto.registration}
									<tr class="border-b border-border/50">
										<td class="py-2 pr-3 text-xs font-medium text-muted-foreground">注册号</td>
										<td class="py-2 font-mono text-sm font-semibold">{currentPhoto.registration}</td>
									</tr>
								{/if}
								{#if currentPhoto.airline}
									<tr class="border-b border-border/50">
										<td class="py-2 pr-3 text-xs font-medium text-muted-foreground">航司</td>
										<td class="py-2 text-sm">{currentPhoto.airline}</td>
									</tr>
								{/if}
								{#if currentPhoto.location}
									<tr class="border-b border-border/50">
										<td class="py-2 pr-3 text-xs font-medium text-muted-foreground">拍摄地</td>
										<td class="py-2 text-sm">{currentPhoto.location}</td>
									</tr>
								{/if}
								{#if currentPhoto.photo_date}
									<tr class="border-b border-border/50">
										<td class="py-2 pr-3 text-xs font-medium text-muted-foreground">拍摄日期</td>
										<td class="py-2 text-sm">{currentPhoto.photo_date}</td>
									</tr>
								{/if}
								{#if currentPhoto.types}
									<tr class="border-b border-border/50">
										<td class="py-2 pr-3 text-xs font-medium text-muted-foreground">类别</td>
										<td class="py-2 text-sm">{currentPhoto.types}</td>
									</tr>
								{/if}
								<tr class="border-b border-border/50">
									<td class="py-2 pr-3 text-xs font-medium text-muted-foreground">上传时间</td>
									<td class="py-2 text-sm">{formatDate(currentPhoto.created_at)}</td>
								</tr>
								{#if currentPhoto.filename}
									<tr class="border-b border-border/50">
										<td class="py-2 pr-3 text-xs font-medium text-muted-foreground">文件名</td>
										<td class="py-2 font-mono text-[11px] text-muted-foreground break-all">{currentPhoto.filename}</td>
									</tr>
								{/if}
							</tbody>
						</table>

						<!-- Description -->
						{#if currentPhoto.description}
							<div class="mt-4">
								<h4 class="mb-1 text-xs font-medium text-muted-foreground">简介</h4>
								<p class="text-sm leading-relaxed text-foreground/80">{currentPhoto.description}</p>
							</div>
						{/if}
					</div>

					<!-- Bottom: Review actions -->
					<div class="border-t bg-card/50 px-4 py-3 space-y-3">
						<!-- Reject reason -->
						{#if rejectOpen}
							<div class="animate__animated animate__fadeInDown" style="--animate-duration:0.2s;">
								<label class="mb-1 block text-xs font-medium text-destructive">拒绝原因 (必填)</label>
								<textarea
									class="w-full rounded-md border border-destructive/50 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/20"
									rows="2"
									bind:value={rejectReason}
									placeholder="例如：画质模糊 / 重复上传 / 非航空题材 / 水印不当..."
								></textarea>
							</div>
						{/if}

						<!-- Review note -->
						<div>
							<label class="mb-1 block text-xs font-medium text-muted-foreground">审核评语 <span class="text-muted-foreground/50">(可选)</span></label>
							<textarea
								class="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
								rows="6"
								bind:value={reviewNote}
								placeholder="输入审核备注（通过或拒绝时均会保存）..."
							></textarea>
						</div>

						<!-- Action buttons -->
						<div class="flex gap-2">
							{#if rejectOpen}
								<button
									class="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground border-0 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
									onclick={reject}
									disabled={!rejectReason}
								>
									<XCircle class="mr-1.5 inline h-4 w-4" />确认拒绝
								</button>
								<button
									class="rounded-lg border bg-background px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary cursor-pointer transition-colors"
									onclick={() => { rejectOpen = false; rejectReason = ''; }}
								>
									取消
								</button>
							{:else}
								<button
									class="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white border-0 cursor-pointer hover:bg-emerald-700 transition-colors"
									onclick={approve}
								>
									<CheckCircle class="mr-1.5 inline h-4 w-4" />通过 (A)
								</button>
								<button
									class="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground border-0 cursor-pointer hover:opacity-90 transition-opacity"
									onclick={() => { rejectOpen = true; rejectReason = ''; }}
								>
									<XCircle class="mr-1.5 inline h-4 w-4" />拒绝 (R)
								</button>
							{/if}
						</div>

						<!-- Nav arrows bar -->
						<div class="flex items-center justify-between">
							<button
								class="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
								onclick={goPrev}
								disabled={!hasPrev}
							>
								<ChevronLeft class="mr-1 inline h-3.5 w-3.5" />上一张 ←
							</button>
							<span class="text-xs text-muted-foreground">{currentIdx + 1} / {photos.length}</span>
							<button
								class="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
								onclick={goNext}
								disabled={!hasNext}
							>
								→ 下一张 <ChevronRight class="ml-1 inline h-3.5 w-3.5" />
							</button>
						</div>

						<!-- Keyboard hints -->
						<p class="text-center text-[10px] text-muted-foreground/60">
							<kbd class="rounded border px-1 py-0.5 font-mono text-[10px]">A</kbd> 通过 ·
							<kbd class="rounded border px-1 py-0.5 font-mono text-[10px]">R</kbd> 拒绝 ·
							<kbd class="rounded border px-1 py-0.5 font-mono text-[10px]">←</kbd><kbd class="rounded border px-1 py-0.5 font-mono text-[10px]">→</kbd> 切换 ·
							点击图片放大
						</p>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- ── Zoom Modal ── -->
{#if zoomOpen && currentPhoto}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 animate__animated animate__fadeIn"
		style="--animate-duration:0.2s; cursor: {zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-out'};"
		onclick={closeZoom}
		onwheel={zoomWheel}
		onmousedown={zoomMouseDown}
		onmousemove={zoomMouseMove}
		onmouseup={zoomMouseUp}
		onmouseleave={zoomMouseUp}
		ondblclick={zoomDblClick}
		onkeydown={(e) => { if (e.key === 'Escape') closeZoom(); }}
		role="dialog"
		tabindex="-1"
	>
		<!-- Close button -->
		<button
			class="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/25 border-0 cursor-pointer transition-colors"
			onclick={closeZoom}
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
		</button>

		<!-- Zoom info -->
		<div class="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70">
			{Math.round(zoomScale * 100)}% · 滚轮缩放 · 拖拽平移 · 双击复位
		</div>

		<!-- Image -->
		<img
			src={currentPhoto.url}
			alt=""
			class="select-none"
			style="transform: translate({zoomPanX}px, {zoomPanY}px) scale({zoomScale}); max-width:90vw; max-height:90vh; object-fit:contain; transition: transform 0.05s linear;"
			ondragstart={(e) => e.preventDefault()}
		/>
	</div>
{/if}

<style>
	:global(.animate__animated) {
		--animate-duration: 0.35s;
	}
	:global(.animate__backOutLeft) {
		--animate-duration: 0.35s;
	}
	:global(.animate__backOutRight) {
		--animate-duration: 0.35s;
	}
	:global(.animate__backInRight) {
		--animate-duration: 0.35s;
	}
	textarea:focus {
		outline: none;
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 2px hsl(var(--primary) / 0.15);
	}
	kbd {
		background: hsl(var(--secondary));
		color: hsl(var(--muted-foreground));
	}
</style>
