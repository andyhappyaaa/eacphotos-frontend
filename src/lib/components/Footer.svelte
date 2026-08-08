<script>
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { theme } from '$lib/stores/theme';
	import { Separator } from '$lib/components/ui/separator';

	let { t } = $props();
	let logoUrl = $state(get(theme) === 'dark' ? 'https://r2.eacof.org/logo-dark.png' : 'https://r2.eacof.org/logo-light.png');
	onMount(() => {
		const setLogo = (t: string) => { logoUrl = t === 'dark' ? 'https://r2.eacof.org/logo-dark.png' : 'https://r2.eacof.org/logo-light.png'; };
		const unsub = theme.subscribe(setLogo);
		return unsub;
	});
	function tVal(key) { return t ? t(key) : key; }
</script>

<footer class="border-t bg-card/50">
	<div class="container mx-auto max-w-[1400px] px-5 py-12">
		<div class="grid grid-cols-1 gap-10 md:grid-cols-3">
			<div>
				<a href="/" class="inline-block">
					<img src={logoUrl} alt="" class="mb-4 h-9 w-auto" />
				</a>
				<p class="max-w-xs text-sm leading-relaxed text-muted-foreground">{tVal('footer.description')}</p>
			</div>
			<div>
				<h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tVal('footer.links')}</h3>
				<ul class="space-y-2.5 text-sm">
					<li><a href="/about" class="text-muted-foreground transition-colors hover:text-foreground">关于我们</a></li>
					<li><a href="/contact" class="text-muted-foreground transition-colors hover:text-foreground">联系我们</a></li>
					<li><a href="/careers" class="text-muted-foreground transition-colors hover:text-foreground">加入我们</a></li>
					<li><a href="/terms" class="text-muted-foreground transition-colors hover:text-foreground">服务条款</a></li>
					<li><a href="/privacy" class="text-muted-foreground transition-colors hover:text-foreground">隐私政策</a></li>
					<li><a href="/upload" class="text-muted-foreground transition-colors hover:text-foreground">上传规则</a></li>
				</ul>
			</div>
			<div>
				<h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">eac photos</h3>
				<p class="text-sm leading-relaxed text-muted-foreground">致力于为全球航空摄影爱好者提供高质量的作品分享和交流平台，记录每一次飞行的美好瞬间。</p>
			</div>
		</div>
		<Separator class="my-8" />
		<div class="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
			<p>&copy; 2026 eac photos. All rights reserved.</p>
			<div class="flex gap-6">
				<a href="/terms" class="hover:text-foreground">服务条款</a>
				<a href="/privacy" class="hover:text-foreground">隐私政策</a>
			</div>
		</div>
	</div>
</footer>
