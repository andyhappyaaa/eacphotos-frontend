<script>
	import { t } from '$lib/stores/i18n';
</script>

<svelte:head>
	<title>{$t('nav.about')} · eac photos</title>
</svelte:head>

<div class="container mx-auto max-w-[860px] px-5 py-12">
	<header class="mb-12 text-center">
		<h1 class="text-4xl font-bold tracking-tight">eac photos</h1>
		<p class="mt-3 text-lg text-muted-foreground">{$t('about.subtitle')}</p>
	</header>

	<main class="space-y-10 leading-relaxed">
		<section>
			<h2 class="mb-3 text-2xl font-semibold">{$t('about.who')}</h2>
			<p class="text-muted-foreground">{$t('about.whoText')}</p>
		</section>

		<section>
			<h2 class="mb-3 text-2xl font-semibold">{$t('about.platform')}</h2>
			<p class="text-muted-foreground">{$t('about.platformText')}</p>
		</section>

		<section>
			<h2 class="mb-3 text-2xl font-semibold">{$t('about.technology')}</h2>
			<p class="text-muted-foreground">{$t('about.technologyText')}</p>
		</section>

		<section class="rounded-xl border bg-muted/30 p-5">
			<h2 class="mb-3 text-2xl font-semibold">{$t('about.moderation')}</h2>
			<p class="text-muted-foreground">{$t('about.moderationText')}</p>
			<p class="mt-3 font-medium text-foreground">{$t('about.moderationHighlight')}</p>
		</section>

		<section>
			<h2 class="mb-3 text-2xl font-semibold">{$t('about.news')}</h2>
			<p class="text-muted-foreground">{$t('about.newsText')}</p>
		</section>

		<section>
			<h2 class="mb-3 text-2xl font-semibold">{$t('about.future')}</h2>
			<p class="text-muted-foreground">{$t('about.futureText')}</p>
		</section>

		<footer class="pt-4 text-center">
			<p class="text-xl font-semibold">eac photos</p>
			<p class="mt-2 text-muted-foreground">{$t('about.closing')}</p>
		</footer>
	</main>
</div>
