<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAdmin } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import { showToast } from '$lib/stores/toast';
	import { SlidersHorizontal, Image, Newspaper, Loader2, Save, RefreshCw } from '@lucide/svelte';

	let carousel = $state(null);
	let announcement = $state(null);
	let loading = $state(false);

	// Announcement form
	let annTitle = $state(''); let annContent = $state(''); let annLayout = $state('default');
	let annGithub = $state(false); let annGithubRepo = $state(''); let annActive = $state(true);

	// Carousel form
	let carouselItems = $state('');
	const placeholderJson = '[{"image":"https://...","title":"标题"}]';

	onMount(() => { if (!$isAdmin) window.location.href = '/'; loadAll(); });

	async function loadAll() {
		loading = true;
		try {
			const [carR, annR] = await Promise.all([
				api('/api/admin/carousel', { method: 'POST', body: '{}' }),
				api('/api/admin/announcement', { method: 'POST', body: '{}' })
			]);
			const carD = await carR.json();
			const annD = await annR.json();
			carousel = carD.carousel || [];
			carouselItems = JSON.stringify(carousel, null, 2);
			if (annD.announcement) {
				const a = annD.announcement;
				annTitle = a.title || ''; annContent = a.content || ''; annLayout = a.layout || 'default';
				annGithub = !!a.show_github_updates; annGithubRepo = a.github_repo || ''; annActive = a.is_active !== false;
			}
			announcement = annD;
		} catch (e) { showToast('加载失败', 'error'); }
		finally { loading = false; }
	}

	async function saveCarousel() {
		try {
			const items = JSON.parse(carouselItems);
			await api('/api/admin/carousel', { method: 'POST', body: JSON.stringify({ carousel: items }) });
			showToast('轮播图已保存', 'success');
		} catch (e) { showToast(e.message || 'JSON 格式错误', 'error'); }
	}

	async function saveAnnouncement() {
		try {
			await api('/api/admin/announcement', { method: 'POST', body: JSON.stringify({
				title: annTitle, content: annContent, layout: annLayout,
				show_github_updates: annGithub, github_repo: annGithubRepo, is_active: annActive
			})});
			showToast('公告已保存', 'success');
		} catch (e) { showToast('保存失败', 'error'); }
	}

	async function fetchNews() {
		try {
			const r = await api('/api/admin/fetch-news', { method: 'POST', body: '{}' });
			const d = await r.json();
			showToast(d.message || '新闻拉取完成', 'success');
		} catch (e) { showToast('拉取失败', 'error'); }
	}
</script>

<div class="container mx-auto max-w-[1200px] px-5 py-8">
	<div class="mb-6 flex items-center justify-between">
		<div><h1 class="text-2xl font-bold">⚙️ 系统设置</h1><p class="text-sm text-muted-foreground">站点配置和内容管理</p></div>
		<Button variant="outline" size="sm" onclick={loadAll} disabled={loading}><RefreshCw class={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 刷新</Button>
	</div>

	<div class="space-y-6">
		<!-- Carousel -->
		<Card>
			<CardContent class="space-y-4 p-6">
				<div class="flex items-center gap-3"><div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Image class="h-5 w-5 text-primary" /></div><div><h3 class="font-semibold">🎞️ 首页轮播图</h3><p class="text-sm text-muted-foreground">JSON 格式，每项 { image, title }</p></div></div>
				<Textarea bind:value={carouselItems} rows={8} placeholder={placeholderJson} class="font-mono text-sm" />
				<Button size="sm" onclick={saveCarousel}><Save class="mr-1.5 h-4 w-4" /> 保存轮播图</Button>
			</CardContent>
		</Card>

		<!-- Announcement -->
		<Card>
			<CardContent class="space-y-4 p-6">
				<div class="flex items-center gap-3"><div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><SlidersHorizontal class="h-5 w-5 text-primary" /></div><div><h3 class="font-semibold">📢 站点公告</h3><p class="text-sm text-muted-foreground">首页弹窗公告内容（支持 HTML）</p></div></div>
				<div class="space-y-3">
					<div class="space-y-1.5"><Label for="ann-title" class="text-xs">公告标题</Label><Input id="ann-title" bind:value={annTitle} class="h-9" /></div>
					<div class="space-y-1.5"><Label for="ann-content" class="text-xs">内容（HTML）</Label><Textarea id="ann-content" bind:value={annContent} rows={6} class="font-mono text-sm" /></div>
					<div class="flex flex-wrap gap-4">
						<div class="space-y-1.5"><Label for="ann-layout" class="text-xs">布局</Label>
							<select id="ann-layout" bind:value={annLayout} class="h-9 rounded-lg border bg-background px-3 text-sm"><option value="default">默认</option><option value="compact">紧凑</option><option value="full">全宽</option></select>
						</div>
						<div class="flex items-end gap-2 pb-1.5">
							<Switch id="ann-github" bind:checked={annGithub} /><Label for="ann-github" class="text-xs">显示 GitHub 更新</Label>
						</div>
						{#if annGithub}
							<div class="flex items-end gap-2 pb-1"><Input bind:value={annGithubRepo} placeholder="owner/repo" class="h-9 w-40 text-sm" /></div>
						{/if}
						<div class="flex items-end gap-2 pb-1.5">
							<Switch id="ann-active" bind:checked={annActive} /><Label for="ann-active" class="text-xs">启用</Label>
						</div>
					</div>
				</div>
				<Button size="sm" onclick={saveAnnouncement}><Save class="mr-1.5 h-4 w-4" /> 保存公告</Button>
			</CardContent>
		</Card>

		<!-- News -->
		<Card>
			<CardContent class="flex items-center justify-between p-6">
				<div class="flex items-center gap-3"><div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Newspaper class="h-5 w-5 text-primary" /></div><div><h3 class="font-semibold">📰 拉取新闻</h3><p class="text-sm text-muted-foreground">从航空资讯源拉取最新新闻</p></div></div>
				<Button size="sm" onclick={fetchNews}><RefreshCw class="mr-1.5 h-4 w-4" /> 立即拉取</Button>
			</CardContent>
		</Card>
	</div>
</div>
