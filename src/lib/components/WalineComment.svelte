<script>
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { browser } from '$app/environment';

	/**
	 * Waline 评论组件 —— 加载 @waline/client 并做 Supabase 会话共享。
	 * 会话共享：把前端 localStorage 里的 Supabase token 注入 Waline 的 WALINE_USER，
	 * 这样前端登录了，评论组件就自动登录（Waline 服务端直接验 Supabase JWT）。
	 */
	let { path: commentPath = '' } = $props();

	let containerEl = $state(null);
	let waline = null;

	const serverURL = browser ? String(window.APP_CONFIG?.WALINE_SERVER_URL || '').replace(/\/$/, '') : '';
	let currentPath = $derived(commentPath || page.url.pathname);

	onMount(async () => {
		if (!serverURL) {
			console.warn('[waline] 未配置 WALINE_SERVER_URL');
			return;
		}

		// 1. 会话共享：把 Supabase token 换到 Waline 用户信息；无 token 则清除（退出同步）
		const supabaseToken = localStorage.getItem('eac_oauth_access_token');
		if (supabaseToken) {
			try {
				const resp = await fetch(`${serverURL}/token`, {
					headers: { Authorization: `Bearer ${supabaseToken}` }
				});
				const data = await resp.json();
				if (!data.errno && data.data?.objectId) {
					localStorage.setItem('WALINE_USER', JSON.stringify({ ...data.data, token: supabaseToken }));
				}
			} catch (e) {
				// 忽略会话同步失败
			}
		} else {
			localStorage.removeItem('WALINE_USER');
		}

		// 2. 加载 Waline CSS（去重）
		if (!document.querySelector('link[data-waline-css]')) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = 'https://unpkg.com/@waline/client@v3/dist/waline.css';
			link.setAttribute('data-waline-css', 'true');
			document.head.appendChild(link);
		}

		// 3. 动态加载 Waline 并初始化
		try {
			const { init } = await import('https://unpkg.com/@waline/client@v3/dist/waline.js');
			waline = init({
				el: containerEl,
				serverURL,
				path: currentPath,
				login: 'force',
				lang: 'zh-CN',
				dark: 'html.dark'
			});
		} catch (e) {
			console.error('[waline] init failed:', e);
		}
	});

	onDestroy(() => {
		waline?.destroy?.();
	});
</script>

<div bind:this={containerEl}></div>
