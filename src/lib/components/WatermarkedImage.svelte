<script>
	let { src, alt = '', photographer = '', className = '', wm = true } = $props();
	let year = $derived(new Date().getFullYear());
</script>

{#if wm}
	<div class="wm-wrap {className}">
		<img {src} {alt} loading="lazy" class="wm-img" />
		<div class="wm-bar"><span>© {year} {photographer}</span></div>
	</div>
{:else}
	<img {src} {alt} loading="lazy" class={className} />
{/if}

<style>
	.wm-wrap { position: relative; overflow: hidden; line-height: 0; }
	.wm-img { width: 100%; height: 100%; object-fit: cover; }
	.wm-bar {
		position: absolute; bottom: 0; left: 0; right: 0; height: 36px;
		display: flex; align-items: center; justify-content: center;
		background: linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.2) 60%, transparent);
		color: rgba(255,255,255,0.82); font-size: 11px; font-weight: 500;
		pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.6);
	}
</style>
