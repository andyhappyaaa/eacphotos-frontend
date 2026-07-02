<script>
	import { getLogoUrl } from '$lib/utils/helpers';
	import { theme } from '$lib/stores/theme';
	import { Separator } from '$lib/components/ui/separator';
	import { Globe, Camera, Heart, MessageCircle } from '@lucide/svelte';

	let { t } = $props();

	let logoUrl = $derived(getLogoUrl($theme));

	function tVal(key) {
		return t ? t(key) : key;
	}
</script>

<footer class="border-t bg-card/50">
	<div class="container mx-auto max-w-[1400px] px-5 py-12">
		<div class="grid grid-cols-1 gap-10 md:grid-cols-4">
			<!-- Brand -->
			<div class="md:col-span-1">
				<a href="/" class="inline-block">
					<img src={logoUrl} alt="EAC Photo" class="mb-4 h-9 w-auto" />
				</a>
				<p class="max-w-xs text-sm leading-relaxed text-muted-foreground">
					{tVal('footer.description')}
				</p>
			</div>

			<!-- Links -->
			<div>
				<h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{tVal('footer.links')}
				</h3>
				<ul class="space-y-2.5 text-sm">
					<li><a href="/about" class="text-muted-foreground transition-colors hover:text-foreground">关于我们</a></li>
					<li><a href="/contact" class="text-muted-foreground transition-colors hover:text-foreground">联系我们</a></li>
					<li><a href="/careers" class="text-muted-foreground transition-colors hover:text-foreground">加入我们</a></li>
					<li><a href="/terms" class="text-muted-foreground transition-colors hover:text-foreground">服务条款</a></li>
					<li><a href="/privacy" class="text-muted-foreground transition-colors hover:text-foreground">隐私政策</a></li>
				</ul>
			</div>

			<!-- Social -->
			<div>
				<h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{tVal('footer.follow')}
				</h3>
				<div class="flex gap-3">
					<button
						type="button"
						class="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
						aria-label="Twitter"
					>
						<MessageCircle class="h-4 w-4" />
					</button>
					<button
						type="button"
						class="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
						aria-label="Instagram"
					>
						<Camera class="h-4 w-4" />
					</button>
					<button
						type="button"
						class="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
						aria-label="Weibo"
					>
						<Globe class="h-4 w-4" />
					</button>
				</div>
			</div>

			<!-- About -->
			<div>
				<h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					EAC Photo
				</h3>
				<p class="text-sm leading-relaxed text-muted-foreground">
					致力于为全球航空摄影爱好者提供高质量的作品分享和交流平台，记录每一次飞行的美好瞬间。
				</p>
				<div class="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
					<Heart class="h-3 w-3 text-destructive" fill="currentColor" />
					<span>Made with passion</span>
				</div>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
			<p>&copy; 2026 EAC Photo. All rights reserved.</p>
			<div class="flex gap-6">
				<a href="/terms" class="hover:text-foreground">服务条款</a>
				<a href="/privacy" class="hover:text-foreground">隐私政策</a>
			</div>
		</div>
	</div>
</footer>
