<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { api } from '$lib/api';
	import { formatDateTime } from '$lib/utils/helpers';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
	} from '$lib/components/ui/dialog';

	let announcement = $state(null);
	let githubHtml = $state('');
	let open = $state(false);
	let dismissKey = $state('');
	let { onReady } = $props();
	const DISMISS_KEY_PREFIX = 'eacphoto_ann_dismissed_';

	async function loadAnnouncement() {
		const path = page.url.pathname;
		if (path !== '/' && path !== '') {
			onReady?.();
			return;
		}

		try {
			const r = await api('/api/site/announcement', { noRedirect: true });
			const data = await r.json();
			if (!data.announcement) {
				onReady?.();
				return;
			}

			const a = data.announcement;
			const key = DISMISS_KEY_PREFIX + a.id + '_' + a.updated_at;
			if (localStorage.getItem(key)) {
				onReady?.();
				return;
			}

			// GitHub updates — multi-repo support
			let gh = '';
			if (a.show_github_updates && a.github_repo) {
				try {
					const gr = await api(
						`/api/site/github-updates?repo=${encodeURIComponent(a.github_repo)}`,
						{ noRedirect: true }
					);
					const ud = await gr.json();
					const reposData = ud.repos || (ud.repo ? [{ repo: ud.repo, updates: ud.updates }] : []);
					for (const repoData of reposData) {
						if (!repoData.updates || !repoData.updates.length) continue;
						gh += '<div class="mt-4 border-t pt-3">';
						gh += '<h4 class="mb-2 text-sm font-semibold">🔄 ' + repoData.repo + '</h4>';
						gh += '<ul class="space-y-1.5">';
						for (const commit of repoData.updates) {
							gh += '<li class="border-b pb-1.5 text-sm last:border-b-0">';
							gh += '<a href="' + commit.url + '" target="_blank" rel="noopener" class="text-foreground hover:text-primary">';
							gh += '<code class="rounded bg-secondary px-1.5 py-0.5 text-xs">' + commit.sha + '</code> ' + commit.message;
							gh += '</a>';
							gh += '<small class="mt-0.5 block text-xs text-muted-foreground">by ' + commit.author + ' · ' + formatDateTime(commit.date) + '</small>';
							gh += '</li>';
						}
						gh += '</ul></div>';
					}
				} catch (e) { /* ignore */ }
			}

			announcement = a;
			githubHtml = gh;
			dismissKey = key;
			open = true;
			// 等公告弹窗完成挂载后再允许首页渲染，避免用户开始滑动时弹窗突然出现。
			await tick();
			onReady?.();
		} catch (e) {
			// 公告加载失败时也不能阻塞首页。
			onReady?.();
		}
	}

	function dismiss() {
		if (dismissKey) localStorage.setItem(dismissKey, '1');
		open = false;
	}

	// Prevent touch/wheel gestures from reaching the home page while the announcement is open.
	// Keep the current scroll position so closing the dialog returns the page exactly where it was.
	let lockedScrollY = 0;
	let bodyLocked = false;

	function lockPageScroll() {
		if (!browser || bodyLocked) return;
		lockedScrollY = window.scrollY;
		document.body.style.position = 'fixed';
		document.body.style.top = `-${lockedScrollY}px`;
		document.body.style.left = '0';
		document.body.style.right = '0';
		document.body.style.width = '100%';
		document.body.style.overflow = 'hidden';
		document.body.style.touchAction = 'none';
		bodyLocked = true;
	}

	function unlockPageScroll() {
		if (!browser || !bodyLocked) return;
		document.body.style.position = '';
		document.body.style.top = '';
		document.body.style.left = '';
		document.body.style.right = '';
		document.body.style.width = '';
		document.body.style.overflow = '';
		document.body.style.touchAction = '';
		window.scrollTo(0, lockedScrollY);
		bodyLocked = false;
	}

	$effect(() => {
		if (open) lockPageScroll();
		else unlockPageScroll();
	});

	onMount(() => { loadAnnouncement(); });
	onDestroy(() => unlockPageScroll());
</script>

{#if announcement}
	<Dialog bind:open>
		<DialogContent class="max-h-[85vh] max-w-[560px] overflow-y-auto overscroll-contain touch-pan-y">
			<DialogHeader>
				<DialogTitle>{announcement.title || '公告'}</DialogTitle>
			</DialogHeader>
			<div class="prose prose-sm max-w-none dark:prose-invert">
				{@html announcement.content || ''}
			</div>
			{@html githubHtml}
			<p class="mt-4 border-t pt-3 text-xs text-muted-foreground">
				最后编辑：{announcement.updated_by || '系统'} · {formatDateTime(announcement.updated_at)}
			</p>
			<DialogFooter>
				<Button onclick={dismiss}>我知道了，不再提示</Button>
				<Button variant="outline" onclick={() => (open = false)}>关闭</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
