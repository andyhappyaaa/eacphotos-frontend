<script>
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores/theme';
	import { Separator } from '$lib/components/ui/separator';

	let { t } = $props();
	let dark = $state(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
	let logoUrl = $derived(dark ? 'https://r2.eacof.org/logo-dark.png' : 'https://r2.eacof.org/logo-light.png');

	onMount(() => {
		dark = document.documentElement.classList.contains('dark');
		const onTheme = () => { dark = document.documentElement.classList.contains('dark'); };
		window.addEventListener('themechange', onTheme);
		return () => window.removeEventListener('themechange', onTheme);
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
					<li><a href="/" class="text-muted-foreground transition-colors hover:text-foreground">{tVal('nav.home')}</a></li>
					<li><a href="/about" class="text-muted-foreground transition-colors hover:text-foreground">{tVal('footer.about')}</a></li>
					<li><a href="/contact" class="text-muted-foreground transition-colors hover:text-foreground">{tVal('footer.contact')}</a></li>
					<li><a href="/careers" class="text-muted-foreground transition-colors hover:text-foreground">{tVal('footer.careers')}</a></li>
					<li><a href="/terms" class="text-muted-foreground transition-colors hover:text-foreground">{tVal('footer.terms')}</a></li>
					<li><a href="/privacy" class="text-muted-foreground transition-colors hover:text-foreground">{tVal('footer.privacy')}</a></li>
					<li><a href="/upload" class="text-muted-foreground transition-colors hover:text-foreground">上传规则</a></li>
				</ul>
			</div>
			<div>
				<h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">eac photos</h3>
				<p class="text-sm leading-relaxed text-muted-foreground">{tVal('footer.description')}</p>
			</div>
		</div>
		<Separator class="my-8" />
		<div class="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
			<p>&copy; 2026 eac photos. {tVal('footer.copyright')}</p>
			<div class="flex gap-6">
				<a href="/terms" class="hover:text-foreground">{tVal('footer.terms')}</a>
				<a href="/privacy" class="hover:text-foreground">{tVal('footer.privacy')}</a>
			</div>
		</div>
	</div>
</footer>
