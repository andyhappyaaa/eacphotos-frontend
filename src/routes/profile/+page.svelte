<script>
	import { get } from 'svelte/store';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { isLoggedIn, authLoading } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import { showToast } from '$lib/stores/toast';
	import PhotoGrid from '$lib/components/PhotoGrid.svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import WalineComment from '$lib/components/WalineComment.svelte';
	import { t } from '$lib/stores/i18n';

	let profile = $state(null);
	let photos = $state([]);
	let friendStatus = $state('none');
	let friendBusy = $state(false);

	onMount(async () => {
		const userId = page.url.searchParams.get('user') || 'me';
		try {
			const r = await api(`/api/users/${userId}`);
			profile = await r.json();
		} catch (e) { /* */ }
		try {
			const r = await api(`/api/users/${userId === 'me' ? 'me' : userId}/photos`);
			const d = await r.json();
			photos = d.photos || [];
		} catch (e) { /* */ }
		// 好友状态（仅查看他人主页时）
		if (userId !== 'me') {
			try {
				const r = await api(`/api/users/${userId}/friend-status`, { noRedirect: true });
				const d = await r.json();
				friendStatus = d.status || 'none';
			} catch (e) { /* */ }
		}
	});

	const targetId = $derived(page.url.searchParams.get('user'));
	const isOther = $derived(!!targetId);

	async function friendAction() {
		if (!targetId || friendBusy) return;
		friendBusy = true;
		try {
			let action, d;
			if (friendStatus === 'none' || friendStatus === 'pending_in') {
				// 发送申请（none）或接受申请（pending_in）
				action = friendStatus === 'pending_in' ? 'friend-accept' : 'friend-request';
				const r = await api(`/api/users/${targetId}/${action}`, { method: 'POST', body: '{}' });
				d = await r.json();
				if (d.error) { showToast(d.error, 'error'); return; }
				friendStatus = d.status;
				showToast(d.status === 'friends' ? '已成为好友' : '已发送好友申请', 'success');
			} else if (friendStatus === 'friends' || friendStatus === 'pending_out') {
				// 移除好友 / 撤回申请
				const r = await api(`/api/users/${targetId}/friend-reject`, { method: 'POST', body: '{}' });
				d = await r.json();
				friendStatus = 'none';
				showToast('已移除好友', 'success');
			}
		} catch (e) { showToast('操作失败', 'error'); }
		finally { friendBusy = false; }
	}

	let photoCount = $derived(profile?.photo_count || profile?.photoCount || 0);
	let totalLikes = $derived(profile?.total_likes || profile?.totalLikes || 0);
	let totalViews = $derived(profile?.total_views || profile?.totalViews || 0);
	let joined = $derived(profile?.joined || profile?.created_at || '');
</script>

{#if profile}
	<div class="pb-10">
		<!-- Cover -->
		<div class="h-[200px] bg-gradient-to-br from-slate-700 to-slate-900"></div>
		<!-- Info -->
		<div class="container mx-auto max-w-[1200px] px-5">
			<div class="relative -mt-16 flex flex-col items-center gap-6 sm:flex-row sm:items-end">
				<div class="h-[120px] w-[120px] overflow-hidden rounded-full border-4 border-background bg-secondary">
					{#if profile.avatar}
						<img src={profile.avatar} alt="" class="h-full w-full object-cover" />
					{/if}
				</div>
				<div class="pb-4 text-center sm:text-left">
					<h1 class="text-2xl font-bold">{profile.username || ''}</h1>
					<div class="mt-1 flex gap-4 text-sm text-muted-foreground">
						<span>📸 {photoCount} {$t('profile.photos')}</span>
						<span>❤ {totalLikes} {$t('profile.likes')}</span>
						<span>👁 {totalViews} {$t('profile.views')}</span>
						<span>📅 {joined ? new Date(joined).toLocaleDateString() : ''}</span>
					</div>
					{#if isOther}
						<button
							class="mt-3 rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors {friendStatus === 'friends' ? 'border-muted-foreground text-muted-foreground hover:bg-secondary' : 'bg-primary text-primary-foreground hover:bg-primary/90'}"
							onclick={friendAction}
							disabled={friendBusy}
						>
							{#if friendStatus === 'friends'}已是好友{:else if friendStatus === 'pending_out'}已发送申请{:else if friendStatus === 'pending_in'}接受申请{:else}加好友{/if}
						</button>
					{/if}
				</div>
			</div>

			<Tabs defaultValue="photos" class="mt-6">
				<TabsList>
					<TabsTrigger value="photos">{$t('profile.tab.photos')}</TabsTrigger>
					<TabsTrigger value="about">{$t('profile.tab.about')}</TabsTrigger>
				</TabsList>
				<TabsContent value="photos" class="mt-4">
					<PhotoGrid {photos} />
				</TabsContent>
				<TabsContent value="about" class="mt-4">
					<div class="rounded-lg border p-5">
						<h3 class="font-semibold">{$t('profile.about')}</h3>
						<p class="mt-2 text-muted-foreground">{profile.bio || '暂无介绍'}</p>
						{#if profile.equipment}
							<h3 class="mt-4 font-semibold">{$t('profile.equipment')}</h3>
							<p class="mt-2 text-muted-foreground">{profile.equipment}</p>
						{/if}
					</div>
				</TabsContent>
			</Tabs>

			<hr class="my-10 border-border" />
			<WalineComment path={page.url.pathname + page.url.search} />
		</div>
	</div>
{/if}
