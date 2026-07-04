<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isReviewer } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Separator } from '$lib/components/ui/separator';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { showToast } from '$lib/stores/toast';
	import { ClipboardCheck, CheckCircle, XCircle, Image, Loader2, RefreshCw } from '@lucide/svelte';

	let dashboard = $state(null);
	let loading = $state(true);
	let activeQ = $state('manual_review');
	let rejectId = $state(null);
	let rejectReason = $state('');

	onMount(() => {
		if (!$isReviewer) { window.location.href = '/login'; return; }
		loadQueue(activeQ);
	});

	async function loadQueue(queue) {
		activeQ = queue; loading = true;
		try {
			const r = await api('/api/review/dashboard', { method: 'POST', body: JSON.stringify({ queue }) });
			dashboard = await r.json();
		} catch (e) { showToast('加载失败', 'error'); } finally { loading = false; }
	}

	async function approve(id) {
		try {
			await api(`/api/review/photos/${id}/approve`, { method: 'POST', body: '{}' });
			showToast('已批准', 'success');
			loadQueue(activeQ);
		} catch (e) { showToast('操作失败', 'error'); }
	}

	async function reject(id) {
		if (!rejectReason) { showToast('请输入拒绝原因', 'error'); return; }
		try {
			await api(`/api/review/photos/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason: rejectReason }) });
			showToast('已拒绝', 'success');
			rejectId = null; rejectReason = '';
			loadQueue(activeQ);
		} catch (e) { showToast('操作失败', 'error'); }
	}

	const queues = [
		{ key: 'manual_review', label: '待审核' },
		{ key: 'priority', label: '优先队列' },
		{ key: 'normal', label: '普通队列' },
		{ key: 'history', label: '审核历史' }
	];
</script>

<div class="container mx-auto max-w-[1400px] px-5 py-8">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">📋 审核队列</h1>
			<p class="text-sm text-muted-foreground">审核用户提交的航空摄影作品</p>
		</div>
		<Button variant="outline" size="sm" onclick={() => loadQueue(activeQ)} disabled={loading}>
			<RefreshCw class={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 刷新
		</Button>
	</div>

	<!-- Stats -->
	{#if dashboard?.stats}
		<div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<Card class="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900"><CardContent class="p-4 text-center"><div class="text-2xl font-bold">{dashboard.stats.pendingManual || 0}</div><div class="text-xs text-muted-foreground">待人工审核</div></CardContent></Card>
			<Card class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900"><CardContent class="p-4 text-center"><div class="text-2xl font-bold">{dashboard.stats.priorityQueue || 0}</div><div class="text-xs text-muted-foreground">优先队列</div></CardContent></Card>
			<Card class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"><CardContent class="p-4 text-center"><div class="text-2xl font-bold">{dashboard.stats.normalQueue || 0}</div><div class="text-xs text-muted-foreground">普通队列</div></CardContent></Card>
			<Card class="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900"><CardContent class="p-4 text-center"><div class="text-2xl font-bold">{dashboard.stats.todayReviewed || 0}</div><div class="text-xs text-muted-foreground">今日已审</div></CardContent></Card>
		</div>
	{/if}

	<!-- Queue Tabs -->
	<div class="mb-6 flex gap-2">
		{#each queues as q}
			<Button variant={activeQ === q.key ? 'default' : 'outline'} size="sm" onclick={() => loadQueue(q.key)}>{q.label}</Button>
		{/each}
	</div>

	<!-- Photo List -->
	{#if loading}
		<div class="space-y-3">{#each Array(5) as _}<div class="h-[120px] animate-pulse rounded-xl bg-secondary"></div>{/each}</div>
	{:else if dashboard?.photos?.length}
		<div class="space-y-3">
			{#each dashboard.photos as p}
				<div class="flex gap-4 rounded-xl border bg-card p-4">
					<a href={p.url} target="_blank" class="shrink-0">
						<img src={p.thumbnail || p.url} alt="" class="h-[100px] w-[140px] rounded-lg object-cover" loading="lazy" />
					</a>
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-3">
							<div>
								<h3 class="font-semibold">{p.title || '无标题'}</h3>
								<p class="mt-1 text-xs text-muted-foreground">
									{p.aircraft_type || ''} · {p.registration || ''} · {p.airline || ''} · {p.location || ''}
								</p>
								<p class="text-xs text-muted-foreground">
									摄影师：{p.photographer?.username || '未知'} · {p.date || ''}
									{#if p.queue === 'priority'}<Badge variant="secondary" class="ml-1 text-[10px]">优先</Badge>{/if}
									{#if p.is_hot}<Badge variant="secondary" class="ml-1 text-[10px]">热门</Badge>{/if}
								</p>
							</div>
							<div class="flex shrink-0 gap-2">
								<Button size="sm" class="gap-1 bg-emerald-600 hover:bg-emerald-700" onclick={() => approve(p.id)}>
									<CheckCircle class="h-3.5 w-3.5" /> 批准
								</Button>
								<Button size="sm" variant="destructive" class="gap-1" onclick={() => (rejectId = p.id)}>
									<XCircle class="h-3.5 w-3.5" /> 拒绝
								</Button>
							</div>
						</div>
						{#if p.description}<p class="mt-1.5 text-xs text-muted-foreground line-clamp-2">{p.description}</p>{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center py-16 text-muted-foreground">
			<ClipboardCheck class="mb-3 h-12 w-12 opacity-30" />
			<p>该队列暂无照片</p>
		</div>
	{/if}

	<!-- Reject Dialog -->
	{#if rejectId}
		<Card class="mt-6 border-destructive">
			<CardContent class="space-y-3 p-5">
				<h3 class="font-semibold text-destructive">拒绝照片</h3>
				<div class="space-y-1.5">
					<Label for="reject-reason" class="text-sm">拒绝原因</Label>
					<Input id="reject-reason" bind:value={rejectReason} placeholder="例如：画质模糊 / 重复上传 / 不是航空摄影" />
				</div>
				<div class="flex gap-2">
					<Button size="sm" variant="destructive" onclick={() => reject(rejectId)} disabled={!rejectReason}>确认拒绝</Button>
					<Button size="sm" variant="ghost" onclick={() => { rejectId = null; rejectReason = ''; }}>取消</Button>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
