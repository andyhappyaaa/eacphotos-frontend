<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isLoggedIn, currentUser, isReviewer, isAdmin, isSuperAdmin, reviewerRole, authLoading, refreshReviewerInfo } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { showToast } from '$lib/stores/toast';
	import { LayoutDashboard, Clock, CheckCircle, XCircle, Settings, Upload, Image, Eye, Heart, Loader2, ClipboardCheck, Users, SlidersHorizontal, Building2 } from '@lucide/svelte';

	let activeTab = $state('overview');
		let stats = $state({ approved: 0, pending: 0, rejected: 0, totalViews: 0, totalLikes: 0, recent: [] });
	let pendingPhotos = $state([]); let approvedPhotos = $state([]); let rejectedPhotos = $state([]);
	let allMyPhotos = $state([]);
	let tabLoading = $state(false);
	let mobileMenuOpen = $state(false);

	onMount(async () => {
		// 等待 auth 初始化完成（OAuth cookie / 本地 session 加载），最多 3 秒，避免卡死导致「无反应」
		await Promise.race([
			new Promise(resolve => {
				const unsub = authLoading.subscribe(loading => { if (!loading) { unsub(); resolve(); } });
			}),
			new Promise(resolve => setTimeout(resolve, 3000))
		]);
		if (!$isLoggedIn) { window.location.href = '/login'; return; }
		// OAuth 登录后刷新 reviewer 信息（确保审核/管理标签页立即出现）
		await refreshReviewerInfo();
		loadTab('overview');
	});


	async function loadTab(tab) {
		activeTab = tab; tabLoading = true;
		try {
			if (tab === 'overview') await loadOverview();
			else if (tab === 'pending') await loadPending();
			else if (tab === 'approved') await loadApproved();
			else if (tab === 'rejected') await loadRejected();
			else if (tab === 'appeals') { window.location.href = '/appeal'; }
			else if (tab === 'manage') await loadAllPhotos();
			else if (tab === 'upload') { goto('/upload'); return; }
			else if (tab === 'settings') { window.location.href = 'https://auth.eacof.org/account'; return; }
		} catch (e) {}
		finally { tabLoading = false; }
	}

	async function loadOverview() {
		try { const r = await api('/api/users/me/stats', { noRedirect: true }); if (r.ok) stats = await r.json(); } catch (e) {}
	}
	async function loadPending() {
		try { const r = await api('/api/users/me/photos?status=pending', { noRedirect: true }); const d = await r.json(); pendingPhotos = d.photos || []; } catch (e) {}
	}
	async function loadApproved() {
		try { const r = await api('/api/users/me/photos?status=approved', { noRedirect: true }); const d = await r.json(); approvedPhotos = d.photos || []; } catch (e) {}
	}
	async function loadRejected() {
		try { const r = await api('/api/users/me/photos?status=rejected,ai_rejected', { noRedirect: true }); const d = await r.json(); rejectedPhotos = d.photos || []; } catch (e) {}
	}
	async function loadAllPhotos() {
		try { const r = await api("/api/users/me/photos?status=approved,pending,manual_review,rejected,ai_rejected,private", { noRedirect: true }); const d = await r.json(); allMyPhotos = d.photos || []; } catch (e) {}
	}

	async function handleDeletePhoto(photoId) {
		if (!confirm('确定要删除这张照片？此操作不可恢复。')) return;
		try { await api('/api/photos/' + photoId + '/delete', { method: 'POST', body: '{}' }); showToast('已删除', 'success'); loadTab(activeTab); }
		catch (err) { showToast(err.message || '删除失败', 'error'); }
	}
	async function handleAppeal(photoId) { window.location.href = "/appeal/" + photoId; }
	async function handleTogglePrivate(photo) {
		const makePrivate = photo.status !== 'private';
		try { await api('/api/photos/' + photo.id + '/visibility', { method: 'POST', body: JSON.stringify({ isPrivate: makePrivate }) }); showToast(makePrivate ? '已设为私密' : '已设为公开', 'success'); loadTab(activeTab); }
		catch (err) { showToast(err.message || '操作失败', 'error'); }
	}

	const userTabs = [
		{ value: 'overview', label: '总览', icon: LayoutDashboard },
		{ value: 'upload', label: '上传图片', icon: Upload },
		{ value: 'pending', label: '审核中', icon: Clock },
		{ value: 'approved', label: '已过审', icon: CheckCircle },
		{ value: 'rejected', label: '未过审', icon: XCircle },
			{ value: 'organizations', label: '组织', icon: Building2 },
		{ value: 'settings', label: '账号设置', icon: Settings }
	];

	const reviewerTabs = [
		{ value: 'review-queue', label: '审核', icon: ClipboardCheck },
				{ value: 'review-settings', label: '系统管理', icon: SlidersHorizontal }
	];

	const adminMenuItems = [
		{ href: '/review/users', label: '用户管理', icon: Users }
	];

</script>

<style>
	/* 当前选中 tab 加粗 — bits-ui TabsTrigger 激活时自动设置 data-active */
	#dashboard-sidebar-tabs :global([data-slot="tabs-trigger"][data-active]) {
		font-weight: 700 !important;
	}
</style>

<div class="container mx-auto max-w-[1200px] px-4 py-6">
	<!-- Mobile sidebar toggle (fixed left) -->
	<button class="fixed left-3 top-20 z-[100] rounded-lg border bg-background p-2 shadow-md lg:hidden" type="button" onclick={() => (mobileMenuOpen = true)} aria-label="菜单">
		<LayoutDashboard class="h-5 w-5" />
	</button>

		<Tabs value={activeTab}>
		<div class="grid gap-6 lg:grid-cols-[260px_1fr]">
			<!-- Desktop Sidebar -->
				<aside class="hidden lg:block lg:sticky lg:top-20 lg:self-start"><Card><CardContent class="p-5">{@render sidebarContent()}</CardContent></Card></aside>
			{#snippet sidebarContent()}
					<div class="mb-4 text-center">
						<Avatar class="mx-auto mb-3 h-16 w-16"><AvatarImage src={$currentUser?.avatar} alt="" /><AvatarFallback class="text-lg">{$currentUser?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
						<h3 class="font-semibold">{$currentUser?.username || '用户'}</h3>
						<p class="text-xs text-muted-foreground">{$currentUser?.email || ''}</p>
					</div>
					<Separator class="mb-3" />
					<TabsList class="flex w-full flex-col gap-0.5" id="dashboard-sidebar-tabs">
						{#each userTabs as ti}
							<TabsTrigger value={ti.value} class="w-full justify-start gap-2" onclick={() => loadTab(ti.value)}>
								<ti.icon class="h-4 w-4" /> {ti.label}
							</TabsTrigger>
						{/each}
						{#if $isReviewer}
							<Separator />
							<span class="px-3 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">审核管理</span>
							{#each reviewerTabs as ti}
								<button class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left" onclick={() => window.location.href = "/review/" + ti.value.split("-")[1]}>
									<ti.icon class="h-4 w-4" /> {ti.label}
								</button>
							{/each}
						{/if}
						{#if $isAdmin}
							<Separator />
							<span class="px-3 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">高级管理</span>
							{#each adminMenuItems as ti}
								<button class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left" onclick={() => window.location.href = ti.href}>
									<ti.icon class="h-4 w-4" /> {ti.label}
								</button>
							{/each}
						{/if}
					</TabsList>
				{/snippet}

			<!-- Mobile sidebar drawer (Tailwind，放在 Tabs 内以访问 sidebarContent snippet) -->
			{#if mobileMenuOpen}
				<div class="fixed inset-0 z-[90] bg-black/30 lg:hidden" onclick={() => (mobileMenuOpen = false)}></div>
				<aside class="fixed left-0 top-0 bottom-0 z-[95] w-[280px] overflow-y-auto border-r bg-background p-4 shadow-xl lg:hidden">
					<div class="mb-4 flex items-center justify-between border-b pb-3">
						<h5 class="text-sm font-semibold">仪表盘菜单</h5>
						<button type="button" class="rounded p-1 hover:bg-secondary" onclick={() => (mobileMenuOpen = false)} aria-label="Close">✕</button>
					</div>
					{@render sidebarContent()}
				</aside>
			{/if}

			<!-- Content -->
			<Card>
				<CardContent class="min-h-[400px] p-5 lg:p-7">
					<TabsContent value="overview">
						<h2 class="mb-1 text-xl font-bold">📊 我的数据总览</h2>
						<p class="mb-6 text-sm text-muted-foreground">查看您的上传和互动数据</p>
						<div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
							<Card class="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900"><CardContent class="p-4 text-center"><CheckCircle class="mx-auto mb-2 h-5 w-5 text-emerald-600" /><div class="text-2xl font-bold">{stats.approved}</div><div class="text-xs text-muted-foreground">已通过</div></CardContent></Card>
							<Card class="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900"><CardContent class="p-4 text-center"><Clock class="mx-auto mb-2 h-5 w-5 text-amber-600" /><div class="text-2xl font-bold">{stats.pending}</div><div class="text-xs text-muted-foreground">审核中</div></CardContent></Card>
							<Card class="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900"><CardContent class="p-4 text-center"><XCircle class="mx-auto mb-2 h-5 w-5 text-rose-600" /><div class="text-2xl font-bold">{stats.rejected}</div><div class="text-xs text-muted-foreground">未通过</div></CardContent></Card>
							<Card class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"><CardContent class="p-4 text-center"><Eye class="mx-auto mb-2 h-5 w-5 text-blue-600" /><div class="text-2xl font-bold">{stats.totalViews}</div><div class="text-xs text-muted-foreground">总浏览</div></CardContent></Card>
							<Card class="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900"><CardContent class="p-4 text-center"><Heart class="mx-auto mb-2 h-5 w-5 text-red-600" /><div class="text-2xl font-bold">{stats.totalLikes}</div><div class="text-xs text-muted-foreground">总点赞</div></CardContent></Card>
						</div>
						{#if stats.recent?.length}
							<div class="mb-3 flex items-center gap-2"><Image class="h-4 w-4 text-muted-foreground" /><h3 class="font-semibold">最近上传</h3></div>
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
								{#each stats.recent as photo}
									<div class="group relative overflow-hidden rounded-lg border bg-secondary"><a href="/photo/{photo.id}"><img src={photo.thumbnail || photo.url} alt="" class="aspect-video w-full object-cover transition-transform group-hover:scale-105" loading="lazy" /></a><div class="absolute inset-x-0 bottom-0 flex gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"><button class="flex-1 rounded bg-white/20 px-1 py-0.5 text-[10px] text-white hover:bg-white/40" onclick={() => handleTogglePrivate(photo)}>私密/公开</button><button class="rounded bg-red-500/30 px-1 py-0.5 text-[10px] text-white hover:bg-red-500/60" onclick={() => handleDeletePhoto(photo.id)}>删除</button></div></div>
								{/each}
							</div>
						{/if}
					</TabsContent>

					<TabsContent value="pending">
						<h2 class="mb-5 text-xl font-bold">⏳ 审核中的图片</h2>
						{#if tabLoading}{#each Array(3) as _}<Skeleton class="mb-3 h-[86px] w-full rounded-lg" />{/each}
						{:else if pendingPhotos.length}
							<div class="space-y-3">
								{#each pendingPhotos as p}
									<div class="flex gap-4 rounded-xl border bg-card p-3.5"><img src={p.thumbnail || p.url} alt="" class="h-[70px] w-[100px] shrink-0 rounded-lg object-cover" /><div class="min-w-0 flex-1"><h4 class="truncate font-semibold">{p.title || '无标题'}</h4><p class="mt-1 text-xs text-muted-foreground">{p.aircraft_type || ''} · {p.registration || ''}</p></div><Badge variant="secondary" class="shrink-0 self-start">审核中</Badge></div>
								{/each}
							</div>
						{:else}<div class="flex flex-col items-center py-16 text-muted-foreground"><Image class="mb-3 h-10 w-10 opacity-30" /><p>暂无审核中的照片</p></div>{/if}
					</TabsContent>

					<TabsContent value="approved">
						<h2 class="mb-5 text-xl font-bold">✅ 已通过的图片</h2>
						{#if approvedPhotos.length}<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">{#each approvedPhotos as photo}<div class="group relative overflow-hidden rounded-lg border bg-secondary"><a href="/photo/{photo.id}"><img src={photo.thumbnail || photo.url} alt="" class="aspect-video w-full object-cover transition-transform group-hover:scale-105" loading="lazy" /></a><div class="absolute inset-x-0 bottom-0 flex gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"><button class="flex-1 rounded bg-white/20 px-1 py-0.5 text-[10px] text-white hover:bg-white/40" onclick={() => handleTogglePrivate(photo)}>私密/公开</button><button class="rounded bg-red-500/30 px-1 py-0.5 text-[10px] text-white hover:bg-red-500/60" onclick={() => handleDeletePhoto(photo.id)}>删除</button></div></div>{/each}</div>
						{:else}<div class="flex flex-col items-center py-16 text-muted-foreground"><Image class="mb-3 h-10 w-10 opacity-30" /><p>暂无已过审的照片</p></div>{/if}
					</TabsContent>

					<TabsContent value="rejected">
						<h2 class="mb-5 text-xl font-bold">❌ 未通过的图片</h2>
						{#if rejectedPhotos.length}
							<div class="space-y-3">
								{#each rejectedPhotos as p}
									<div class="flex gap-4 rounded-xl border bg-card p-3.5"><img src={p.thumbnail || p.url} alt="" class="h-[70px] w-[100px] shrink-0 rounded-lg object-cover opacity-80" /><div class="min-w-0 flex-1"><h4 class="truncate font-semibold">{p.title || '无标题'}</h4><p class="mt-1 text-xs text-muted-foreground">{p.aircraft_type || ''} · {p.registration || ''}</p>{#if p.reject_reason}<p class="mt-1 text-xs text-destructive">原因：{p.reject_reason}</p>{/if}
									<div class="mt-2"><button class="rounded bg-amber-50 px-2 py-1 text-[11px] border border-amber-200 text-amber-700 hover:bg-amber-100" onclick={() => handleAppeal(p.id)}>申诉</button></div></div><Badge variant="destructive" class="shrink-0 self-start">未过审</Badge></div>
								{/each}
							</div>
						{:else}<div class="flex flex-col items-center py-16 text-muted-foreground"><Image class="mb-3 h-10 w-10 opacity-30" /><p>暂无未过审的照片</p></div>{/if}
					</TabsContent>

					<TabsContent value="manage">
						<h2 class="mb-5 text-xl font-bold">管理我的图片</h2>
						{#if tabLoading}
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">{#each Array(4) as _}<div class="aspect-video animate-pulse rounded-lg bg-secondary"></div>{/each}</div>
						{:else if allMyPhotos.length}
							<div class="space-y-3">
								{#each allMyPhotos as photo}
									<div class="flex gap-4 rounded-xl border bg-card p-3.5">
										<a href="/photo/{photo.id}" class="shrink-0"><img src={photo.thumbnail || photo.url} alt="" class="h-[88px] w-[130px] rounded-lg object-cover" loading="lazy" /></a>
										<div class="min-w-0 flex-1">
											<h4 class="truncate font-semibold">{photo.title || '无标题'}</h4>
											<p class="mt-0.5 text-xs text-muted-foreground">{photo.registration || ''} · {photo.aircraft_type || ''} · {photo.photo_date || ''}</p>
											<div class="mt-2 flex gap-2">
												<button class="rounded bg-white/80 px-2 py-1 text-[11px] border hover:bg-secondary" onclick={() => handleTogglePrivate(photo)}>{photo.status === 'private' ? '设为公开' : '设为私密'}</button>
												<button class="rounded bg-red-50 px-2 py-1 text-[11px] border border-red-200 text-red-600 hover:bg-red-100" onclick={() => handleDeletePhoto(photo.id)}>删除</button>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}<div class="flex flex-col items-center py-16 text-muted-foreground"><Image class="mb-3 h-10 w-10 opacity-30" /><p>暂无照片</p></div>{/if}
						</TabsContent>
						<!-- ── 审核队列（仅审核员）── -->
					<TabsContent value="review-queue">
						<h2 class="mb-1 text-xl font-bold">📋 审核队列</h2>
						<p class="mb-6 text-sm text-muted-foreground">查看并审核用户提交的照片</p>
						<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
							<ClipboardCheck class="mb-3 h-12 w-12 opacity-30" />
							<p class="text-sm">审核队列功能即将上线</p>
							<Button variant="outline" size="sm" class="mt-3" href="/review/queue">打开审核面板</Button>
						</div>
					</TabsContent>

					<!-- ── 图片管理（仅审核员）── -->
					
					<!-- ── 系统设置（仅审核员）── -->
					<TabsContent value="review-settings">
						<h2 class="mb-1 text-xl font-bold">⚙️ 系统设置</h2>
						<p class="mb-6 text-sm text-muted-foreground">站点配置、公告管理和轮播图设置</p>
						<div class="space-y-4">
							<Card><CardContent class="flex items-start gap-4 p-5">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><SlidersHorizontal class="h-5 w-5 text-primary" /></div>
								<div class="flex-1"><h3 class="font-semibold">📢 站点公告</h3><p class="text-sm text-muted-foreground">管理全站公告弹窗内容和 GitHub 更新展示。</p></div>
							</CardContent></Card>
							<Card><CardContent class="flex items-start gap-4 p-5">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Image class="h-5 w-5 text-primary" /></div>
								<div class="flex-1"><h3 class="font-semibold">🎞️ 首页轮播图</h3><p class="text-sm text-muted-foreground">配置首页 Hero 区域的轮播图片。</p></div>
							</CardContent></Card>
							<Button variant="outline" size="sm" class="mt-2" href="/review/settings">打开系统设置</Button>
						</div>
					</TabsContent>

					<!-- ── 用户管理（仅管理员）── -->
					<TabsContent value="review-users">
						<h2 class="mb-1 text-xl font-bold">👥 用户管理</h2>
						<p class="mb-6 text-sm text-muted-foreground">管理用户账号、权限和审核员分配</p>
						<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
							<Users class="mb-3 h-12 w-12 opacity-30" />
							<p class="text-sm">用户管理功能即将上线</p>
							<Button variant="outline" size="sm" class="mt-3" href="/review/users">打开用户管理</Button>
						</div>
					</TabsContent>


				</CardContent>
			</Card>
		</div>
	</Tabs>
</div>
