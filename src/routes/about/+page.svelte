<script>
	import { Card, CardContent } from '$lib/components/ui/card';
</script>

<div class="container mx-auto max-w-[800px] px-5 py-12">
	<div class="mb-12 text-center">
		<h1 class="text-4xl font-bold">关于 EAC Photo</h1>
		<p class="mt-3 text-lg text-muted-foreground">全球航空摄影爱好者的家园</p>
	</div>

	<div class="space-y-8">
		<div>
			<h2 class="mb-3 text-2xl font-semibold">我们的使命</h2>
			<p class="leading-relaxed text-muted-foreground">
				EAC Photo 致力于为全球航空摄影爱好者提供一个高质量的作品分享和交流平台。
				我们相信每一张航空照片都承载着对飞行的热爱和对美的追求。
			</p>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<Card><CardContent class="p-6 text-center">
				<div class="mb-3 text-4xl">📸</div>
				<h3 class="font-semibold">海量图库</h3>
				<p class="text-sm text-muted-foreground">收录全球航空摄影作品</p>
			</CardContent></Card>
			<Card><CardContent class="p-6 text-center">
				<div class="mb-3 text-4xl">✈️</div>
				<h3 class="font-semibold">专业分类</h3>
				<p class="text-sm text-muted-foreground">按机型、航司、类型等分类</p>
			</CardContent></Card>
			<Card><CardContent class="p-6 text-center">
				<div class="mb-3 text-4xl">🌍</div>
				<h3 class="font-semibold">全球社区</h3>
				<p class="text-sm text-muted-foreground">与世界各地的爱好者交流</p>
			</CardContent></Card>
		</div>
	</div>
</div>
