<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isLoggedIn, currentUser } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { t } from '$lib/stores/i18n';

	let tFn = $derived($t);
	let user = $derived($currentUser);

	// Overview stats
	let stats = $state({ approved: 0, pending: 0, rejected: 0, totalViews: 0, totalLikes: 0, recent: [] });
	let pendingPhotos = $state([]);
	let approvedPhotos = $state([]);
	let rejectedPhotos = $state([]);

	onMount(async () => {
		if (!$isLoggedIn) {
			goto('/login');
			return;
		}
		loadOverview();
	});

	async function loadOverview() {
		try {
			const r = await api('/api/users/me/stats', { noRedirect: true });
			if (r.ok) stats = await r.json();
		} catch (e) { /* */ }
	}

	async function loadPending() {
		try {
			const r = await api('/api/users/me/photos?status=pending');
			const d = await r.json();
			pendingPhotos = d.photos || [];
		} catch (e) { /* */ }
	}

	async function loadApproved() {
		try {
			const r = await api('/api/users/me/photos?status=approved');
			const d = await r.json();
			approvedPhotos = d.photos || [];
		} catch (e) { /* */ }
	}

	async function loadRejected() {
		try {
			const r = await api('/api/users/me/photos?status=rejected');
			const d = await r.json();
			rejectedPhotos = d.photos || [];
		} catch (e) { /* */ }
	}
</script>

<div class="container mx-auto max-w-[1200px] px-5 py-6">
	<Tabs defaultValue="overview">
		<div class="grid gap-6 lg:grid-cols-[260px_1fr]">
			<!-- Sidebar -->
			<aside class="rounded-xl border bg-card p-5 lg:sticky lg:top-20 lg:self-start">
				<div class="mb-4 border-b pb-4 text-center">
					<div class="mx-auto mb-3 h-18 w-18 rounded-full border-2 bg-secondary"></div>
					<h3 class="text-lg font-semibold">{user?.username || '用户'}</h3>
					<p class="text-sm text-muted-foreground">{user?.email || ''}</p>
				</div>
				<TabsList class="flex w-full flex-col gap-1">
					<TabsTrigger value="overview" class="w-full justify-center" onclick={loadOverview}>📊 总览</TabsTrigger>
					<TabsTrigger value="pending" class="w-full justify-center" onclick={loadPending}>⏳ 审核中</TabsTrigger>
					<TabsTrigger value="approved" class="w-full justify-center" onclick={loadApproved}>✅ 已过审</TabsTrigger>
					<TabsTrigger value="rejected" class="w-full justify-center" onclick={loadRejected}>❌ 未过审</TabsTrigger>
					<TabsTrigger value="settings" class="w-full justify-center">⚙️ 账号设置</TabsTrigger>
				</TabsList>
			</aside>

			<!-- Content -->
			<div class="min-h-[400px] rounded-xl border bg-card p-7">
				<TabsContent value="overview">
					<h2 class="mb-5 text-xl font-bold">📊 我的数据总览</h2>
					<div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
						<Card><CardContent class="p-4 text-center"><div class="text-xs text-muted-foreground">已通过</div><div class="text-2xl font-bold">{stats.approved}</div></CardContent></Card>
						<Card><CardContent class="p-4 text-center"><div class="text-xs text-muted-foreground">审核中</div><div class="text-2xl font-bold">{stats.pending}</div></CardContent></Card>
						<Card><CardContent class="p-4 text-center"><div class="text-xs text-muted-foreground">未通过</div><div class="text-2xl font-bold">{stats.rejected}</div></CardContent></Card>
						<Card><CardContent class="p-4 text-center"><div class="text-xs text-muted-foreground">总浏览</div><div class="text-2xl font-bold">{stats.totalViews}</div></CardContent></Card>
						<Card><CardContent class="p-4 text-center"><div class="text-xs text-muted-foreground">总点赞</div><div class="text-2xl font-bold">{stats.totalLikes}</div></CardContent></Card>
					</div>
					{#if stats.recent?.length}
						<h3 class="mb-3 font-semibold">最近上传</h3>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{#each stats.recent as photo}
								<a href="/photo/{photo.id}" class="overflow-hidden rounded-lg border">
									<img src={photo.thumbnail || photo.url} alt="" class="aspect-video w-full object-cover" loading="lazy" />
								</a>
							{/each}
						</div>
					{/if}
				</TabsContent>

				<TabsContent value="pending">
					<h2 class="mb-5 text-xl font-bold">⏳ 审核中</h2>
					{#each pendingPhotos as p}
						<div class="mb-3 flex gap-4 rounded-lg bg-secondary p-3.5">
							<img src={p.thumbnail || p.url} alt="" class="h-[70px] w-[100px] rounded object-cover" />
							<div>
								<h4 class="font-semibold">{p.title || '无标题'}</h4>
								<p class="text-xs text-muted-foreground">{p.aircraft_type || ''} · {p.registration || ''}</p>
							</div>
						</div>
					{:else}
						<p class="py-8 text-center text-muted-foreground">暂无审核中的照片</p>
					{/each}
				</TabsContent>

				<TabsContent value="approved">
					<h2 class="mb-5 text-xl font-bold">✅ 已过审</h2>
					<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{#each approvedPhotos as photo}
							<a href="/photo/{photo.id}" class="overflow-hidden rounded-lg border">
								<img src={photo.thumbnail || photo.url} alt="" class="aspect-video w-full object-cover" loading="lazy" />
							</a>
						{/each}
					</div>
					{#if !approvedPhotos.length}
						<p class="py-8 text-center text-muted-foreground">暂无已过审照片</p>
					{/if}
				</TabsContent>

				<TabsContent value="rejected">
					<h2 class="mb-5 text-xl font-bold">❌ 未过审</h2>
					{#each rejectedPhotos as p}
						<div class="mb-3 flex gap-4 rounded-lg bg-secondary p-3.5">
							<img src={p.thumbnail || p.url} alt="" class="h-[70px] w-[100px] rounded object-cover" />
							<div>
								<h4 class="font-semibold">{p.title || '无标题'}</h4>
								<p class="text-xs text-muted-foreground">{p.aircraft_type || ''} · {p.registration || ''}</p>
							</div>
						</div>
					{:else}
						<p class="py-8 text-center text-muted-foreground">暂无未过审照片</p>
					{/each}
				</TabsContent>

				<TabsContent value="settings">
					<h2 class="mb-5 text-xl font-bold">⚙️ 账号设置</h2>
					<div class="space-y-4 rounded-lg border p-5">
						<h3 class="font-semibold">🔐 修改密码</h3>
						<p class="text-sm text-muted-foreground">点击下方按钮，向您的注册邮箱发送确认链接。</p>
						<Button class="mt-2">📧 发送密码修改确认邮件</Button>
					</div>
					<div class="mt-4 space-y-4 rounded-lg border p-5">
						<h3 class="font-semibold">🖼️ 头像</h3>
						<Button variant="outline" href="/settings">在设置页修改</Button>
					</div>
				</TabsContent>
			</div>
		</div>
	</Tabs>
</div>
