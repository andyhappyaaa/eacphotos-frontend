<script>
	import { onMount, onDestroy } from 'svelte';
	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	/**
	 * Hero carousel component - ported from index.js loadHeroCarousel().
	 * Shows rotating background images with text overlay.
	 */

	let { t } = $props();

	let slides = $state([]);
	let currentIndex = $state(0);
	let intervalId = null;
	let trackEl = null;

	onMount(async () => {
		await loadSlides();
		if (slides.length > 1) {
			intervalId = setInterval(next, 5000);
		}
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	async function loadSlides() {
		try {
			const r = await api('/api/site/carousel', { noRedirect: true });
			const data = await r.json();
			if (data.carousel && data.carousel.length > 0) {
				slides = data.carousel;
				return;
			}
		} catch (e) {
			/* fallback to featured photos */
		}

		try {
			const r = await api('/api/photos/featured');
			const data = await r.json();
			if (data.photos && data.photos.length > 0) {
				slides = data.photos.map((p) => ({
					image: p.thumbnail || p.url,
					title: p.title
				}));
			}
		} catch (e) {
			/* use placeholder */
		}

		if (slides.length === 0) {
			slides = [{ image: '', title: '欢迎来到 eac photos', placeholder: true }];
		}
	}

	function goToSlide(index) {
		const total = slides.length;
		if (total === 0) return;
		currentIndex = (index + total) % total;
	}

	function next() {
		goToSlide(currentIndex + 1);
	}

	function prev() {
		goToSlide(currentIndex - 1);
	}

	function resetAutoPlay() {
		if (intervalId) clearInterval(intervalId);
		if (slides.length > 1) {
			intervalId = setInterval(next, 5000);
		}
	}
</script>

<section class="relative flex min-h-[300px] md:min-h-[460px] items-center justify-center overflow-hidden bg-slate-900 text-center text-white">
	<!-- Slides -->
	<div class="absolute inset-0 z-[1]" bind:this={trackEl}>
		{#each slides as slide, i}
			<div
				class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1200ms] ease-in-out"
				class:opacity-100={i === currentIndex}
				class:opacity-0={i !== currentIndex}
				style={slide.image ? `background-image: url('${slide.image}')` : ''}
				class:bg-gradient-to-br={slide.placeholder}
				class:from-slate-700={slide.placeholder}
				class:to-slate-900={slide.placeholder}
			></div>
		{/each}
	</div>

	<!-- Overlay -->
	<div class="absolute inset-0 z-[2] bg-gradient-to-b from-black/30 to-black/60"></div>

	<!-- Content -->
	<div class="relative z-[3] mx-auto max-w-3xl px-5">
		<h1 class="mb-4 text-4xl font-bold [text-shadow:0_2px_8px_rgba(0,0,0,0.5)] md:text-5xl">
			{@html t?.('hero.title') || '✈️ 发现世界各地的航空之美'}
		</h1>
		<p class="mb-8 text-xl opacity-95 [text-shadow:0_2px_6px_rgba(0,0,0,0.5)]">
			{@html t?.('hero.subtitle') || '分享你的航空摄影作品，加入全球航空摄影爱好者社区'}
		</p>
		<div class="flex justify-center gap-4">
			<Button href="/dashboard" size="lg">
				{@html t?.('hero.dashboard') || '📊 进入仪表盘'}
			</Button>
			<Button variant="outline" href="/gallery" size="lg"
				class="border-white/80 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
			>
				{@html t?.('hero.browse') || '🖼️ 浏览图库'}
			</Button>
		</div>
	</div>

	<!-- Controls -->
	{#if slides.length > 1}
		<button
			onclick={() => { prev(); resetAutoPlay(); }}
			class="absolute left-6 top-1/2 z-[4] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/40"
			aria-label="Previous"
		>
			<ChevronLeft class="h-7 w-7" />
		</button>
		<button
			onclick={() => { next(); resetAutoPlay(); }}
			class="absolute right-6 top-1/2 z-[4] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/40"
			aria-label="Next"
		>
			<ChevronRight class="h-7 w-7" />
		</button>

		<!-- Indicators -->
		<div class="absolute bottom-6 left-1/2 z-[4] flex -translate-x-1/2 gap-2">
			{#each slides as _, i}
				<button
					onclick={() => { goToSlide(i); resetAutoPlay(); }}
					class={`h-2.5 rounded-full transition-all ${
						i === currentIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/40'
					}`}
					aria-label="Slide {i + 1}"
				></button>
			{/each}
		</div>
	{/if}
</section>
