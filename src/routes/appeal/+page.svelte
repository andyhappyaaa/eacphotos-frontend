<script>
	import { onMount } from 'svelte';
	import { isLoggedIn, authLoading } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { showToast } from '$lib/stores/toast';
	import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from '@lucide/svelte';

	let rejectedPhotos = $state([]);
	let loading = $state(true);
	let rejectionCount = $state(0);
	let appealingId = $state(null);

	onMount(async () => {
		await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
		if (!$isLoggedIn) { window.location.href = '/login'; return; }
		loadRejected();
	});

	async function loadRejected() {
		loading = true;
		try {
			const r = await api('/api/users/me/photos?status=rejected,ai_rejected', { noRedirect: true });
			const d = await r.json();
			rejectedPhotos = d.photos || [];
			rejectionCount = rejectedPhotos.length;
		} catch (e) {}
		finally { loading = false; }
	}

	async function handleAppeal(id) {
		appealingId = id;
		try {
			const r = await api('/api/photos/' + id + '/appeal', { method: 'POST', body: '{}', noRedirect: true });
			const d = await r.json();
			if (r.ok) { showToast('申诉已提交', 'success'); loadRejected(); }
			else { showToast(d.error || '申诉失败', 'error'); }
		} catch (e) { showToast('申诉失败', 'error'); }
		finally { appealingId = null; }
	}
</script>

<div class="container mx-auto max-w-[1200px] px-5 py-8">
	<a href="/dashboard" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
		<ArrowLeft class="h-4 w-4" /> 返回仪表盘
	</a>

	<h1 class="text-2xl font-bold">申诉中心</h1>
	<p class="mb-2 text-sm text-muted-foreground">查看被拒绝的照片并提交申诉</p>

	{#if rejectionCount >= 5}
		<Card class="mb-6 border-destructive"><CardContent class="flex items-start gap-4 p-5">
			<AlertTriangle class="mt-1 h-6 w-6 shrink-0 text-destructive" />
			<div>
				<h3 class="font-semibold text-destructive">⚠️ 封号警告</h3>
				<p class="text-sm text-muted-foreground">您已有 <strong class="text-destructive">{rejectionCount}</strong> 张照片被拒绝。<strong>累计拒绝 5 张</strong>将自动封号 7 天。申诉失败同样计入累计。</p>
			</div>
		</CardContent></Card>
	{/if}

	{#if rejectionCount >= 3}
		<Card class="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700"><CardContent class="flex items-start gap-4 p-5">
			<AlertTriangle class="mt-1 h-5 w-5 shrink-0 text-amber-600" />
			<div>
				<h3 class="font-semibold text-amber-700 dark:text-amber-400">注意</h3>
				<p class="text-sm text-amber-700 dark:text-amber-300">您已有 {rejectionCount} 张被拒照片。累计 5 次将被封号 7 天。申诉失败的也会计入，请认真对待每次申诉。</p>
			</div>
		</CardContent></Card>
	{/if}

	{#if loading}
		<div class="flex flex-col items-center py-16"><Loader2 class="h-8 w-8 animate-spin text-primary" /></div>
	{:else if rejectedPhotos.length === 0}
		<div class="flex flex-col items-center py-16 text-muted-foreground">
			<CheckCircle2 class="mb-3 h-12 w-12 opacity-30" />
			<p>没有被拒绝的照片</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each rejectedPhotos as p}
				<div class="flex gap-4 rounded-xl border bg-card p-3.5">
					<a href="/photo/{p.id}" class="shrink-0">
						<img src={p.thumbnail || p.url} alt="" class="h-[80px] w-[120px] rounded-lg object-cover" loading="lazy" />
					</a>
					<div class="min-w-0 flex-1">
						<h4 class="truncate font-semibold">{p.title || '无标题'}</h4>
						<p class="text-xs text-muted-foreground">{p.registration || ''} · {p.aircraft_type || ''} · {p.photo_date || ''}</p>
						{#if p.rejection_reason}
							<p class="mt-1 text-xs text-destructive">原因：{p.rejection_reason}</p>
						{/if}
						<div class="mt-2 flex gap-2">
							{p.status === 'ai_rejected' || p.status === 'rejected' ? '' : ''}
							<button class="rounded bg-amber-50 px-2.5 py-1 text-[12px] border border-amber-200 text-amber-700 hover:bg-amber-100" onclick={() => handleAppeal(p.id)} disabled={appealingId === p.id}>
								{appealingId === p.id ? '提交中...' : '提交申诉'}
							</button>
						</div>
					</div>
					<Badge variant="destructive" class="shrink-0 self-start">{p.status === 'ai_rejected' ? 'AI拒绝' : '已拒绝'}</Badge>
				</div>
			{/each}
		</div>
	{/if}
</div>
