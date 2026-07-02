<script>
	import { getLogoUrl } from '$lib/utils/helpers';
	import { theme } from '$lib/stores/theme';

	let { t } = $props();

	let logoUrl = $derived(getLogoUrl($theme));

	function tVal(key) {
		return t ? t(key) : key;
	}
</script>

<footer class="border-t bg-secondary/50 py-12">
	<div class="container mx-auto max-w-[1400px] px-5">
		<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
			<!-- Brand -->
			<div>
				<img src={logoUrl} alt="EAC Photo" class="mb-4 h-10 w-auto" />
				<p class="text-sm text-muted-foreground">
					{tVal('footer.description')}
				</p>
			</div>

			<!-- Links -->
			<div>
				<h3 class="mb-4 text-sm font-semibold">
					{tVal('footer.links')}
				</h3>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li><a href="/about" class="transition-colors hover:text-foreground">关于我们</a></li>
					<li><a href="/contact" class="transition-colors hover:text-foreground">联系我们</a></li>
					<li><a href="/careers" class="transition-colors hover:text-foreground">加入我们</a></li>
					<li><a href="/terms" class="transition-colors hover:text-foreground">服务条款</a></li>
					<li><a href="/privacy" class="transition-colors hover:text-foreground">隐私政策</a></li>
				</ul>
			</div>

			<!-- Social -->
			<div>
				<h3 class="mb-4 text-sm font-semibold">
					{tVal('footer.follow')}
				</h3>
				<div class="flex gap-4 text-sm text-muted-foreground">
					<a href="#" class="transition-colors hover:text-foreground">Twitter</a>
					<a href="#" class="transition-colors hover:text-foreground">Instagram</a>
					<a href="#" class="transition-colors hover:text-foreground">Weibo</a>
				</div>
			</div>
		</div>

		<div class="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
			<p>&copy; 2026 EAC Photo. All rights reserved.</p>
		</div>
	</div>
</footer>
