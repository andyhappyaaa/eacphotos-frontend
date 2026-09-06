<script>
	import { Toaster as Sonner } from "svelte-sonner";
	import { mode } from "mode-watcher";
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import OctagonXIcon from '@lucide/svelte/icons/octagon-x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	let { ...restProps } = $props();
</script>

<Sonner
	theme={mode.current}
	class="toaster group"
	style="
		--normal-bg: var(--color-popover);
		--normal-text: var(--color-popover-foreground);
		--normal-border: var(--color-border);
	"
	{...restProps}
>
	{#snippet loadingIcon()}<Loader2Icon class="size-4 animate-spin" />{/snippet}
	{#snippet successIcon()}<CircleCheckIcon class="size-4" />{/snippet}
	{#snippet errorIcon()}<OctagonXIcon class="size-4" />{/snippet}
	{#snippet infoIcon()}<InfoIcon class="size-4" />{/snippet}
	{#snippet warningIcon()}<TriangleAlertIcon class="size-4" />{/snippet}
</Sonner>

<style>
	/* sonner toast 颜色：错误 = 暗红，成功 = 深绿 */
	:global(.toaster li[data-type="error"]) {
		background: rgb(127 29 29);
		border-color: rgb(185 28 28);
		color: rgb(254 202 202);
	}
	:global(.toaster li[data-type="success"]) {
		background: rgb(6 78 59);
		border-color: rgb(4 120 87);
		color: rgb(167 243 208);
	}
</style>