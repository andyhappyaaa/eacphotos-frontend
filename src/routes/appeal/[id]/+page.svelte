<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { isLoggedIn, authLoading } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { showToast } from '$lib/stores/toast';
	import { Loader2, AlertTriangle, CheckCircle2 } from '@lucide/svelte';

	let photoId = $derived(page.params.id);
	let loading = $state(true);
	let submitting = $state(false);
	let success = $state(false);
	let photo = $state(null);
	let error = $state('');

	onMount(async () => {
		await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
		if (!$isLoggedIn) { window.location.href = '/login'; return; }
		try {
			const r = await api('/api/photos/' + photoId + '/status', { noRedirect: true });
			photo = await r.json();
		} catch (e) { error = '加载失败'; }
		finally { loading = false; }
	});

	async function handleAppeal() {
		submitting = true; error = '';
		try {
			const r = await api('/api/photos/' + photoId + '/appeal', { method: 'POST', body: '{}', noRedirect: true });
			const d = await r.json();
			if (r.ok) { success = true; showToast(d.message || '申诉已提交', 'success'); }
			else { error = d.error || '申诉失败'; }
		} catch (e) { error = e.message || '申诉失败'; }
		finally { submitting = false; }
	}
</script>

<div class="container mx-auto max-w-[600px] px-5 py-12">
	{#if loading}
		<div class="flex flex-col items-center justify-center py-24"><Loader2 class="h-8 w-8 animate-spin text-primary" /><p class="mt-4 text-muted-foreground">加载中...</p></div>
	{:else if success}
		<Card><CardContent class="flex flex-col items-center space-y-4 p-10 text-center">
			<CheckCircle2 class="h-16 w-16 text-emerald-500" />
			<h2 class="text-2xl font-bold text-emerald-600">申诉已提交</h2>
			<p class="text-sm text-muted-foreground">您的照片已转为人工审核，审核员将重新评估。</p>
			<Button href="/dashboard">返回仪表盘</Button>
		</CardContent></Card>
	{:else if error && !photo}
		<Card><CardContent class="flex flex-col items-center space-y-4 p-10 text-center">
			<AlertTriangle class="h-16 w-16 text-destructive" />
			<h2 class="text-xl font-bold text-destructive">加载失败</h2>
			<p class="text-sm text-muted-foreground">{error}</p>
			<Button href="/dashboard">返回仪表盘</Button>
		</CardContent></Card>
	{:else if photo}
		<Card><CardContent class="space-y-4 p-8">
			<div class="text-center">
				<AlertTriangle class="mx-auto h-12 w-12 text-amber-500" />
				<h2 class="mt-3 text-xl font-bold">申诉审核结果</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					{#if photo.status === 'ai_rejected'}AI 审核未检测到飞机{/if}
					{#if photo.status === 'rejected'}审核员拒绝了此照片{/if}
					{#if photo.rejection_reason}<br /><span class="text-destructive">{photo.rejection_reason}</span>{/if}
				</p>
			</div>
			<div class="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
				申诉后将由审核员重新评估您的照片。如确认符合规范，照片将被恢复。
			</div>
			{#if error}<p class="text-sm text-destructive">{error}</p>{/if}
			<div class="flex gap-3 justify-center">
				<Button onclick={handleAppeal} disabled={submitting} class="gap-2">{#if submitting}<Loader2 class="h-4 w-4 animate-spin" />{/if}提交申诉</Button>
				<Button variant="outline" href="/dashboard">返回仪表盘</Button>
			</div>
		</CardContent></Card>
	{/if}
</div>
