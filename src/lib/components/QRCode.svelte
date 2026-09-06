<script>
	import { onMount } from 'svelte';

	/** QRCode.js component — loads from fastly.jsdelivr.net (China-accelerated CDN) */
	let { text = '', size = 180, darkColor = '#000000', lightColor = '#ffffff' } = $props();

	let container = $state(null);
	let loaded = $state(false);
	let qrInstance = null;

	function renderQR() {
		if (!loaded || !container || !text) return;
		if (qrInstance) { container.innerHTML = ''; }
		try {
			qrInstance = new window.QRCode(container, { text, width: size, height: size, colorDark: darkColor, colorLight: lightColor });
		} catch (e) {
			container.innerHTML = '<p class="text-sm text-destructive">二维码生成失败</p>';
		}
	}

	onMount(() => {
		if (typeof window.QRCode !== 'undefined') {
			loaded = true;
			renderQR();
			return;
		}
		const script = document.createElement('script');
		script.src = 'https://fastly.jsdelivr.net/npm/qrcodejs2@0.0.2/qrcode.min.js';
		script.async = true;
		script.onload = () => { loaded = true; renderQR(); };
		script.onerror = () => { if (container) container.innerHTML = '<p class="text-sm text-destructive">二维码库加载失败</p>'; };
		document.head.appendChild(script);
	});

	// Re-render when props change
	$effect(() => { if (text) renderQR(); });
</script>

<div bind:this={container} class="inline-block rounded bg-white p-2">
	{#if !loaded}
		<div class="flex items-center justify-center" style="width:{size}px;height:{size}px">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
		</div>
	{:else if !text}
		<div class="flex items-center justify-center text-sm text-muted-foreground" style="width:{size}px;height:{size}px">无数据</div>
	{/if}
</div>
