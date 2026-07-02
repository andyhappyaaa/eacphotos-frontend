<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isLoggedIn, currentUser } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { t } from '$lib/stores/i18n';
	import { LayoutDashboard, Clock, CheckCircle, XCircle, Settings, Upload, Image, Eye, Heart } from '@lucide/svelte';

	let tFn = $derived($t);
	let user = $derived($currentUser);
	let activeTab = $state('overview');

	let stats = $state({ approved: 0, pending: 0, rejected: 0, totalViews: 0, totalLikes: 0, recent: [] });
	let pendingPhotos = $state([]);
	let approvedPhotos = $state([]);
	let rejectedPhotos = $state([]);
	let tabLoading = $state(false);

	onMount(async () => {
		if (!$isLoggedIn) { goto('/login'); return; }
		loadTab('overview');
	});

	async function loadTab(tab) {
		activeTab = tab;
		tabLoading = true;
		try {
			if (tab === 'overview') await loadOverview();
			else if (tab === 'pending') await loadPending();
			else if (tab === 'approved') await loadApproved();
			else if (tab === 'rejected') await loadRejected();
		} finally { tabLoading = false; }
	}

	async function loadOverview() {
		try { const r = await api('/api/users/me/stats', { noRedirect: true }); if (r.ok) stats = await r.json(); } catch (e) { /* */ }
	}
	async function loadPending() {
		try { const r = await api('/api/users/me/photos?status=pending'); const d = await r.json(); pendingPhotos = d.photos || []; } catch (e) { /* */ }
	}
	async function loadApproved() {
		try { const r = await api('/api/users/me/photos?status=approved'); const d = await r.json(); approvedPhotos = d.photos || []; } catch (e) { /* */ }
	}
	async function loadRejected() {
		try { const r = await api('/api/users/me/photos?status=rejected'); const d = await r.json(); rejectedPhotos = d.photos || []; } catch (e) { /* */ }
	}

	const tabItems = [
		{ value: 'overview', label: '总览', icon: LayoutDashboard },
		{ value: 'pending', label: '审核中', icon: Clock },
		{ value: 'approved', label: '已过审', icon: CheckCircle },
		{ value: 'rejected', label: '未过审', icon: XCircle },
		{ value: 'settings', label: '账号设置', icon: Settings }
	];
</script>

<div class="container mx-auto max-w-[1200px] px-5 py-6">
	<Tabs value={activeTab}>
		<div class="grid gap-6 lg:grid-cols-[260px_1fr]">
			<!-- Sidebar -->
			<aside class="lg:sticky lg:top-20 lg:self-start">
				<Card>
					<CardContent class="p-5">
						<div class="mb-4 text-center">
							<Avatar class="mx-auto mb-3 h-16 w-16">
								<AvatarImage src={user?.avatar} alt={user?.username || ''} />
								<AvatarFallback class="text-lg">{user?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
							</Avatar>
							<h3 class="font-semibold">{user?.username || '用户'}</h3>
							<p class="text-xs text-muted-foreground">{user?.email || ''}</p>
						</div>
						<Separator class="mb-3" />
						<TabsList class="flex w-full flex-col gap-0.5">
							{#each tabItems as t}
								<TabsTrigger value={t.value} class="w-full justify-start gap-2" onclick={() => loadTab(t.value)}>
									<t.icon class="h-4 w-4" />
									{t.label}
								</TabsTrigger>
							{/each}
						</TabsList>
					</CardContent>
				</Card>
			</aside>

			<!-- Content -->
			<Card>
				<CardContent class="min-h-[400px] p-6">
					{#if tabLoading && activeTab === 'overview'}
						<div class="space-y-4">
							<Skeleton class="h-6 w-48" />
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
								{#each Array(5) as _}<Skeleton class="h-24 rounded-xl" />{/each}
							</div>
						</div>
					{:else}
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
								<div class="mb-3 flex items-center gap-2">
									<Image class="h-4 w-4 text-muted-foreground" />
									<h3 class="font-semibold">最近上传</h3>
								</div>
								<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
									{#each stats.recent as photo}
										<a href="/photo/{photo.id}" class="group overflow-hidden rounded-lg border bg-secondary">
											<img src={photo.thumbnail || photo.url} alt="" class="aspect-video w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
										</a>
									{/each}
								</div>
							{/if}
						</TabsContent>

						<TabsContent value="pending">
							<h2 class="mb-5 text-xl font-bold">⏳ 审核中的图片</h2>
							{#if tabLoading}
								{#each Array(3) as _}<Skeleton class="mb-3 h-[86px] w-full rounded-lg" />{/each}
							{:else if pendingPhotos.length}
								<div class="space-y-3">
									{#each pendingPhotos as p}
										<div class="flex gap-4 rounded-xl border bg-card p-3.5">
											<img src={p.thumbnail || p.url} alt="" class="h-[70px] w-[100px] shrink-0 rounded-lg object-cover" />
											<div class="min-w-0 flex-1">
												<h4 class="truncate font-semibold">{p.title || '无标题'}</h4>
												<p class="mt-1 text-xs text-muted-foreground">{p.aircraft_type || ''} · {p.registration || ''}</p>
												{#if p.date}<p class="text-xs text-muted-foreground">📅 {p.date}</p>{/if}
											</div>
											<Badge variant="secondary" class="shrink-0 self-start">审核中</Badge>
										</div>
									{/each}
								</div>
							{:else}
								<div class="flex flex-col items-center py-16 text-muted-foreground">
									<Image class="mb-3 h-10 w-10 opacity-30" />
									<p>暂无审核中的照片</p>
								</div>
							{/if}
						</TabsContent>

						<TabsContent value="approved">
							<h2 class="mb-5 text-xl font-bold">✅ 已通过的图片</h2>
							{#if approvedPhotos.length}
								<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
									{#each approvedPhotos as photo}
										<a href="/photo/{photo.id}" class="group overflow-hidden rounded-lg border bg-secondary">
											<img src={photo.thumbnail || photo.url} alt="" class="aspect-video w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
										</a>
									{/each}
								</div>
							{:else}
								<div class="flex flex-col items-center py-16 text-muted-foreground">
									<Image class="mb-3 h-10 w-10 opacity-30" />
									<p>暂无已过审的照片</p>
								</div>
							{/if}
						</TabsContent>

						<TabsContent value="rejected">
							<h2 class="mb-5 text-xl font-bold">❌ 未通过的图片</h2>
							{#if rejectedPhotos.length}
								<div class="space-y-3">
									{#each rejectedPhotos as p}
										<div class="flex gap-4 rounded-xl border bg-card p-3.5">
											<img src={p.thumbnail || p.url} alt="" class="h-[70px] w-[100px] shrink-0 rounded-lg object-cover opacity-80" />
											<div class="min-w-0 flex-1">
												<h4 class="truncate font-semibold">{p.title || '无标题'}</h4>
												<p class="mt-1 text-xs text-muted-foreground">{p.aircraft_type || ''} · {p.registration || ''}</p>
												{#if p.reject_reason}<p class="mt-1 text-xs text-destructive">原因：{p.reject_reason}</p>{/if}
											</div>
											<Badge variant="destructive" class="shrink-0 self-start">未过审</Badge>
										</div>
									{/each}
								</div>
							{:else}
								<div class="flex flex-col items-center py-16 text-muted-foreground">
									<Image class="mb-3 h-10 w-10 opacity-30" />
									<p>暂无未过审的照片</p>
								</div>
							{/if}
						</TabsContent>

						<TabsContent value="settings">
							<h2 class="mb-5 text-xl font-bold">⚙️ 账号设置</h2>
							<div class="space-y-4">
								<Card><CardContent class="flex items-start gap-4 p-5">
									<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Lock class="h-5 w-5 text-primary" /></div>
									<div class="flex-1">
										<h3 class="font-semibold">🔐 修改密码</h3>
										<p class="text-sm text-muted-foreground">向您的注册邮箱发送确认链接来修改密码。</p>
										<Button size="sm" class="mt-3">📧 发送确认邮件</Button>
									</div>
								</CardContent></Card>
								<Card><CardContent class="flex items-start gap-4 p-5">
									<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Image class="h-5 w-5 text-primary" /></div>
									<div class="flex-1">
										<h3 class="font-semibold">🖼️ 头像</h3>
										<p class="text-sm text-muted-foreground">在设置页面修改头像和个人资料。</p>
										<Button variant="outline" size="sm" class="mt-3" href="/settings">前往设置</Button>
									</div>
								</CardContent></Card>
							</div>
						</TabsContent>
					{/if}
				</CardContent>
			</Card>
		</div>
	</Tabs>
</div>
