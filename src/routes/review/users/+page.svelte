<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAdmin, authLoading } from "$lib/stores/auth";
	import { api } from '$lib/api';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { showToast } from '$lib/stores/toast';
	import { ArrowLeft, Users, Ban, CheckCircle, Loader2 } from '@lucide/svelte';

	let users = $state([]);
	let loading = $state(true);
	let banReason = $state('');
	let banDays = $state('');
	let banUserId = $state(null);

	onMount(async () => { await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); }); if (!$isAdmin) { window.location.href = '/login'; return; } loadUsers(); });

	async function loadUsers() {
		loading = true;
		try {
			const r = await api('/api/admin/users', { method: 'POST', body: '{}' });
			const d = await r.json();
			users = d.users || [];
		} catch (e) { showToast('加载失败', 'error'); } finally { loading = false; }
	}

	async function banUser() {
		if (!banReason) { showToast('请输入封禁原因', 'error'); return; }
		try {
			await api('/api/admin/ban-user', { method: 'POST', body: JSON.stringify({ userId: banUserId, reason: banReason, days: banDays ? parseInt(banDays) : undefined }) });
			showToast('已封禁', 'success');
			banUserId = null; banReason = ''; banDays = '';
			loadUsers();
		} catch (e) { showToast('操作失败', 'error'); }
	}

	async function unbanUser(userId) {
		try {
			await api('/api/admin/unban-user', { method: 'POST', body: JSON.stringify({ userId }) });
			showToast('已解封', 'success');
			loadUsers();
		} catch (e) { showToast('操作失败', 'error'); }
	}
</script>

<div class="container mx-auto max-w-[1400px] px-5 py-8">
		<a href="/dashboard" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft class="h-4 w-4" /> 返回仪表盘</a>>
	<div class="mb-6">
		<h1 class="text-2xl font-bold">👥 用户管理</h1>
		<p class="text-sm text-muted-foreground">管理用户账号和封禁状态</p>
	</div>

	{#if loading}
		<div class="space-y-3">{#each Array(5) as _}<div class="h-16 animate-pulse rounded-xl bg-secondary"></div>{/each}</div>
	{:else if users.length}
		<div class="space-y-2">
			{#each users as u}
				<div class="flex items-center gap-4 rounded-xl border bg-card p-3.5">
					<Avatar class="h-10 w-10 shrink-0"><AvatarImage src={u.avatar} alt="" /><AvatarFallback>{u.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2"><span class="font-medium">{u.username || u.email}</span>{#if u.banned}<Badge variant="destructive" class="text-[10px]">已封禁</Badge>{/if}</div>
						<p class="text-xs text-muted-foreground">{u.email || ''} · 注册于 {u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}</p>
						{#if u.banned && u.ban_reason}<p class="text-xs text-destructive">封禁原因：{u.ban_reason}</p>{/if}
					</div>
					{#if u.banned}
						<Button size="sm" variant="outline" class="gap-1" onclick={() => unbanUser(u.id)}><CheckCircle class="h-3.5 w-3.5" /> 解封</Button>
					{:else}
						<Button size="sm" variant="destructive" class="gap-1" onclick={() => (banUserId = u.id)}><Ban class="h-3.5 w-3.5" /> 封禁</Button>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center py-20 text-muted-foreground"><Users class="mb-4 h-16 w-16 opacity-20" /><p>暂无用户数据</p></div>
	{/if}

	{#if banUserId}
		<Card class="mt-6 border-destructive">
			<CardContent class="space-y-3 p-5">
				<h3 class="font-semibold text-destructive">封禁用户</h3>
				<div class="flex gap-3">
					<div class="flex-1 space-y-1.5"><Label for="ban-reason" class="text-xs">封禁原因</Label><Input id="ban-reason" bind:value={banReason} placeholder="违规行为描述" class="h-9 text-sm" /></div>
					<div class="w-24 space-y-1.5"><Label for="ban-days" class="text-xs">天数（可选）</Label><Input id="ban-days" type="number" bind:value={banDays} placeholder="永久" class="h-9 text-sm" /></div>
				</div>
				<div class="flex gap-2">
					<Button size="sm" variant="destructive" onclick={banUser} disabled={!banReason}>确认封禁</Button>
					<Button size="sm" variant="ghost" onclick={() => { banUserId = null; banReason = ''; banDays = ''; }}>取消</Button>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
