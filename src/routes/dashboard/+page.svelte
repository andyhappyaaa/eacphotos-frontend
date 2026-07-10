<script>
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isLoggedIn, currentUser, isReviewer, isAdmin, isSuperAdmin, reviewerRole } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import { setup2FA, enable2FA, disable2FA, sendEmailCode, passkeyRegisterOptions, passkeyRegisterVerify, listPasskeys, deletePasskey } from '$lib/stores/auth';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import { showToast } from '$lib/stores/toast';
	import { t } from '$lib/stores/i18n';
	import { LayoutDashboard, Clock, CheckCircle, XCircle, Settings, Upload, Image, Eye, Heart, Lock, Mail, Fingerprint, Shield, Loader2, Trash2, Plus, ClipboardCheck, Users, SlidersHorizontal, EyeOff } from '@lucide/svelte';
	import QRCode from '$lib/components/QRCode.svelte';

	let activeTab = $state('overview');
	let sidebarOpen = $state(false);

	let stats = $state({ approved: 0, pending: 0, rejected: 0, totalViews: 0, totalLikes: 0, recent: [] });
	let pendingPhotos = $state([]); let approvedPhotos = $state([]); let rejectedPhotos = $state([]);
	let tabLoading = $state(false);

	// 2FA state
	let tfaEnabled = $state(false); let tfaSecret = $state(''); let tfaSetupCode = $state('');
	let tfaLoading = $state(false); let tfaError = $state('');
	let showTfaSetup = $state(false); let showTfaDisable = $state(false); let tfaDisableCode = $state(''); let tfaDisablePass = $state('');

	// Passkey state
	let passkeys = $state([]); let passkeyLoading = $state(false);

	onMount(async () => {
		// 等待 Reviewer cookie 刷新（OAuth 登录后 store 异步初始化）
		await new Promise(r => setTimeout(r, 800));
		if (!$isLoggedIn) { window.location.href = '/login'; return; }
		loadTab('overview');
	});

	function toggleSidebar() { sidebarOpen = !sidebarOpen; }

	async function loadTab(tab) {
		activeTab = tab; tabLoading = true; sidebarOpen = false;
		try {
			if (tab === 'overview') await loadOverview();
			else if (tab === 'pending') await loadPending();
			else if (tab === 'approved') await loadApproved();
			else if (tab === 'rejected') await loadRejected();
			else if (tab === 'settings') { tfaEnabled = !!$currentUser?.twoFactorEnabled; loadPasskeys(); }
			else if (tab === 'upload') { goto('/upload'); return; }
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
		try { const r = await api('/api/users/me/photos?status=rejected', { noRedirect: true }); const d = await r.json(); rejectedPhotos = d.photos || []; } catch (e) {}
	}

	// ── 2FA ──
	async function handleSetup2FA() {
		tfaLoading = true; tfaError = '';
		try {
			const data = await setup2FA();
			tfaSecret = data.secret;
			showTfaSetup = true;
		} catch (err) { tfaError = err.message || '设置失败'; }
		finally { tfaLoading = false; }
	}

	async function handleEnable2FA() {
		if (!tfaSetupCode || tfaSetupCode.length !== 6) { tfaError = '请输入6位验证码'; return; }
		tfaLoading = true; tfaError = '';
		try {
			await enable2FA(tfaSetupCode);
			tfaEnabled = true; showTfaSetup = false; showToast('两步验证已启用', 'success');
			// Update local user
			if ($currentUser) $currentUser.twoFactorEnabled = true;
		} catch (err) { tfaError = err.message || '启用失败'; }
		finally { tfaLoading = false; }
	}

	async function handleDisable2FA() {
		if (!tfaDisableCode || tfaDisableCode.length !== 6) { tfaError = '请输入验证码'; return; }
		tfaLoading = true; tfaError = '';
		try {
			await disable2FA(tfaDisableCode);
			tfaEnabled = false; showTfaDisable = false; tfaDisableCode = ''; tfaDisablePass = '';
			showToast('两步验证已禁用', 'success');
			if ($currentUser) $currentUser.twoFactorEnabled = false;
		} catch (err) { tfaError = err.message || '禁用失败'; }
		finally { tfaLoading = false; }
	}

	// ── Passkey ──
	async function loadPasskeys() {
		passkeyLoading = true;
		try { passkeys = await listPasskeys(); } catch (e) {}
		finally { passkeyLoading = false; }
	}

	async function handleAddPasskey() {
		try {
			const opts = await passkeyRegisterOptions();
			const cred = await navigator.credentials.create({ publicKey: opts.publicKey });
			if (!cred) { showToast('用户取消', 'warning'); return; }
			await passkeyRegisterVerify(cred);
			showToast('Passkey 添加成功', 'success');
			loadPasskeys();
		} catch (err) { showToast(err.message || '添加失败', 'error'); }
	}

	async function handleDeletePasskey(id) {
		try { await deletePasskey(id); showToast('已删除', 'success'); loadPasskeys(); }
		catch (err) { showToast(err.message || '删除失败', 'error'); }
	}

	async function handleSendPasswordConfirm() {
		try {
			const r = await api('/api/users/me/request-password-change', { method: 'POST', body: '{}' });
			const d = await r.json();
			showToast(d.message || '确认邮件已发送', 'success');
		} catch (err) { showToast(err.message || '发送失败', 'error'); }
	}

	async function handleDeletePhoto(photoId) {
		if (!confirm('确定要删除这张照片？此操作不可恢复。')) return;
		try { await api('/api/photos/' + photoId + '/delete', { method: 'POST', body: '{}' }); showToast('已删除', 'success'); loadTab(activeTab); }
		catch (err) { showToast(err.message || '删除失败', 'error'); }
	}
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
		{ value: 'settings', label: '账号设置', icon: Settings }
	];

	const reviewerTabs = [
		{ value: 'review-queue', label: '审核队列', icon: ClipboardCheck },
		{ value: 'review-photos', label: '图片管理', icon: Image },
		{ value: 'review-settings', label: '系统设置', icon: SlidersHorizontal }
	];

	const adminTabs = [
		{ value: 'review-users', label: '用户管理', icon: Users }
	];

	let tabItems = $derived([
		...userTabs,
		...(get(isReviewer) ? reviewerTabs : []),
		...(get(isAdmin) ? adminTabs : [])
	]);
</script>

<style>
	/* 当前选中 tab 加粗 — bits-ui TabsTrigger 激活时自动设置 data-active */
	#dashboard-sidebar-tabs :global([data-slot="tabs-trigger"][data-active]) {
		font-weight: 700 !important;
	}
</style>

<div class="container mx-auto max-w-[1200px] px-4 py-6">
	<!-- Mobile sidebar toggle (fixed left) -->
	<button onclick={toggleSidebar} class="fixed left-3 top-20 z-[100] rounded-lg border bg-background p-2 shadow-md lg:hidden" aria-label="菜单">
		<LayoutDashboard class="h-5 w-5" />
	</button>

	<Tabs value={activeTab}>
		<div class="grid gap-6 lg:grid-cols-[260px_1fr]">
			<!-- Desktop Sidebar -->
			<aside class="hidden lg:block lg:sticky lg:top-20 lg:self-start">
				{#snippet sidebarContent()}
					<div class="mb-4 text-center">
						<Avatar class="mx-auto mb-3 h-16 w-16"><AvatarImage src={$currentUser?.avatar} alt="" /><AvatarFallback class="text-lg">{$currentUser?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
						<h3 class="font-semibold">{$currentUser?.username || '用户'}</h3>
						<p class="text-xs text-muted-foreground">{$currentUser?.email || ''}</p>
					</div>
					<Separator class="mb-3" />
					<TabsList class="flex w-full flex-col gap-0.5" id="dashboard-sidebar-tabs">
						{#each tabItems as ti}
							<TabsTrigger value={ti.value} class="w-full justify-start gap-2" onclick={() => loadTab(ti.value)}>
								<ti.icon class="h-4 w-4" /> {ti.label}
							</TabsTrigger>
						{/each}
					</TabsList>
				{/snippet}
				<Card><CardContent class="p-5">{@render sidebarContent()}</CardContent></Card>
			</aside>

			<!-- Mobile Sidebar overlay -->
			{#if sidebarOpen}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="fixed inset-0 z-[101] bg-black/50 lg:hidden" onclick={() => (sidebarOpen = false)}></div>
				<div class="fixed left-0 top-0 z-[102] h-full w-[280px] overflow-y-auto border-r bg-card p-5 shadow-2xl lg:hidden">
					<button class="mb-4 text-sm text-muted-foreground" onclick={() => (sidebarOpen = false)}>✕ 关闭</button>
					{@render sidebarContent()}
				</div>
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
									<div class="flex gap-4 rounded-xl border bg-card p-3.5"><img src={p.thumbnail || p.url} alt="" class="h-[70px] w-[100px] shrink-0 rounded-lg object-cover opacity-80" /><div class="min-w-0 flex-1"><h4 class="truncate font-semibold">{p.title || '无标题'}</h4><p class="mt-1 text-xs text-muted-foreground">{p.aircraft_type || ''} · {p.registration || ''}</p>{#if p.reject_reason}<p class="mt-1 text-xs text-destructive">原因：{p.reject_reason}</p>{/if}</div><Badge variant="destructive" class="shrink-0 self-start">未过审</Badge></div>
								{/each}
							</div>
						{:else}<div class="flex flex-col items-center py-16 text-muted-foreground"><Image class="mb-3 h-10 w-10 opacity-30" /><p>暂无未过审的照片</p></div>{/if}
					</TabsContent>

					<TabsContent value="settings">
						<h2 class="mb-5 text-xl font-bold">⚙️ 账号设置</h2>
						<div class="space-y-4">
							<!-- Password Change -->
							<Card><CardContent class="flex items-start gap-4 p-5">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Lock class="h-5 w-5 text-primary" /></div>
								<div class="flex-1"><h3 class="font-semibold">🔐 修改密码</h3><p class="text-sm text-muted-foreground">向您的注册邮箱发送确认链接来修改密码。</p><Button size="sm" class="mt-3" onclick={handleSendPasswordConfirm}>📧 发送确认邮件</Button></div>
							</CardContent></Card>

							<!-- 2FA Setup -->
							<Card><CardContent class="flex items-start gap-4 p-5">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Shield class="h-5 w-5 text-primary" /></div>
								<div class="flex-1">
									<h3 class="font-semibold">🔒 两步验证（2FA）</h3>
									<p class="text-sm text-muted-foreground">当前状态：<strong class="text-foreground">{tfaEnabled ? '已启用 ✅' : '未启用'}</strong></p>
									{#if tfaError}<p class="mt-1 text-xs text-destructive">{tfaError}</p>{/if}

									{#if !tfaEnabled && !showTfaSetup}
										<Button size="sm" class="mt-3 gap-1" onclick={handleSetup2FA} disabled={tfaLoading}>{#if tfaLoading}<Loader2 class="h-3 w-3 animate-spin" />{/if}启用 2FA</Button>
									{/if}

									{#if showTfaSetup && tfaSecret}
										<div class="mt-4 space-y-3 rounded-lg bg-secondary/50 p-4">
											<p class="text-sm">请使用验证器扫描下方二维码或手动输入密钥：</p>
											<QRCode text={`otpauth://totp/EACPhoto:${$currentUser?.username}?secret=${tfaSecret}&issuer=EACPhoto`} size={180} />
											<p class="text-sm">密钥：<code class="rounded bg-secondary px-2 py-0.5 text-xs font-mono select-all">{tfaSecret}</code></p>
											<div class="flex gap-2"><Input type="text" bind:value={tfaSetupCode} maxlength="6" placeholder="000000" class="h-9 w-24 text-center" /><Button size="sm" onclick={handleEnable2FA} disabled={tfaLoading}>验证并完成</Button><Button size="sm" variant="ghost" onclick={() => { showTfaSetup = false; tfaSecret = ''; }}>取消</Button></div>
										</div>
									{/if}

									{#if tfaEnabled && !showTfaDisable}
										<Button size="sm" variant="destructive" class="mt-3" onclick={() => (showTfaDisable = true)}>取消 2FA</Button>
									{/if}

									{#if showTfaDisable}
										<div class="mt-4 space-y-3 rounded-lg bg-destructive/5 border border-destructive/30 p-4">
											<p class="text-sm">输入验证器验证码确认关闭：</p>
											<Input type="text" bind:value={tfaDisableCode} maxlength="6" placeholder="000000" class="h-9 w-24 text-center" />
											<Button size="sm" variant="destructive" onclick={handleDisable2FA} disabled={tfaLoading}>确认关闭 2FA</Button>
											<Button size="sm" variant="ghost" onclick={() => { showTfaDisable = false; tfaDisableCode = ''; }}>取消</Button>
										</div>
									{/if}
								</div>
							</CardContent></Card>

							<!-- Passkey -->
							<Card><CardContent class="flex items-start gap-4 p-5">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Fingerprint class="h-5 w-5 text-primary" /></div>
								<div class="flex-1">
									<h3 class="font-semibold">🔐 浏览器通行密钥（Passkey）</h3>
									<p class="text-sm text-muted-foreground">使用指纹、面容或 PIN 一键登录，无需密码。</p>
									{#if passkeyLoading}
										<div class="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 class="h-3 w-3 animate-spin" /> 加载中...</div>
									{:else}
										{#if passkeys.length > 0}
											<div class="mt-3 space-y-1.5">
												{#each passkeys as pk}
													<div class="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5 text-sm">
														<span>🔑 {pk.name || pk.id?.slice(0, 8) || 'Passkey'} {pk.created_at ? `· ${new Date(pk.created_at).toLocaleDateString()}` : ''}</span>
														<Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive" onclick={() => handleDeletePasskey(pk.id)}><Trash2 class="h-3.5 w-3.5" /></Button>
													</div>
												{/each}
											</div>
										{/if}
										<Button size="sm" class="mt-3 gap-1" onclick={handleAddPasskey}><Plus class="h-3.5 w-3.5" /> 添加新的 Passkey</Button>
									{/if}
								</div>
							</CardContent></Card>


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
					<TabsContent value="review-photos">
						<h2 class="mb-1 text-xl font-bold">🖼️ 图片管理</h2>
						<p class="mb-6 text-sm text-muted-foreground">搜索、编辑和管理所有照片</p>
						<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
							<Image class="mb-3 h-12 w-12 opacity-30" />
							<p class="text-sm">图片管理功能即将上线</p>
							<Button variant="outline" size="sm" class="mt-3" href="/review/photos">打开图片管理</Button>
						</div>
					</TabsContent>

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
							<!-- Avatar -->
							<Card><CardContent class="flex items-start gap-4 p-5">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Image class="h-5 w-5 text-primary" /></div>
							</CardContent></Card>
						</div>
					</TabsContent>
				</CardContent>
			</Card>
		</div>
	</Tabs>
</div>
