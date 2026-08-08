<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { formatDateTime } from '$lib/utils/helpers';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter
	} from '$lib/components/ui/dialog';

	/**
	 * Site announcement modal - ported from announcement.js
	 * Fetches announcement from API and shows it as a dialog.
	 */

	let announcement = $state(null);
	let githubHtml = $state('');
	let open = $state(false);
	let dismissKey = $state('');

	const DISMISS_KEY_PREFIX = 'eacphoto_ann_dismissed_';

	async function loadAnnouncement() {
		// 仅在首页显示公告
		const path = page.url.pathname;
		if (path !== '/' && path !== '') return;

		try {
			const r = await api('/api/site/announcement', { noRedirect: true });
			const data = await r.json();
			if (!data.announcement) return;

			const a = data.announcement;
			const key = DISMISS_KEY_PREFIX + a.id + '_' + a.updated_at;
			if (localStorage.getItem(key)) return;

			// Fetch GitHub updates — supports comma-separated multi-repo
				let ghHtml = "";
				if (a.show_github_updates && a.github_repo) {
					try {
						const gr = await api("/api/site/github-updates?repo=" + encodeURIComponent(a.github_repo), { noRedirect: true });
						const ud = await gr.json();
						const reposData = ud.repos || (ud.repo ? [{ repo: ud.repo, updates: ud.updates }] : []);
						if (reposData.some(r => r.updates?.length)) {
							ghHtml = reposData.filter(r => r.updates?.length).map(r => "<div class="mt-4 border-t pt-3"><h4 class="mb-2 text-sm font-semibold">🔄 " + r.repo + "</h4><ul class="space-y-1.5">" + r.updates.map(u => "<li class="border-b pb-1.5 text-sm last:border-b-0"><a href="" + u.url + "" target="_blank" rel="noopener" class="text-foreground hover:text-primary"><code class="rounded bg-secondary px-1.5 py-0.5 text-xs">" + u.sha + "</code> " + u.message + "</a><small class="mt-0.5 block text-xs text-muted-foreground">by " + u.author + " · " + formatDateTime(u.date) + "</small></li>").join("") + "</ul></div>").join("");
						}
					} catch (e) { /* GitHub fetch failed silently */ }
				}

				announcement = a;
			githubHtml = ghHtml;
			dismissKey = key;
			open = true;
		} catch (e) {
			/* No announcement or server error, ignore */
		}
	}

	function dismiss() {
		if (dismissKey) {
			localStorage.setItem(dismissKey, '1');
		}
		open = false;
	}

	onMount(() => {
		loadAnnouncement();
	});
</script>

{#if announcement}
	<Dialog bind:open>
		<DialogContent class="max-h-[85vh] max-w-[560px] overflow-y-auto">
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
