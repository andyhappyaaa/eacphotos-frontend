<script>
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Announcement from '$lib/components/Announcement.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { t } from '$lib/stores/i18n';

	let { children } = $props();

	let tFn = $derived($t);
</script>

<Toaster />

<div class="flex min-h-screen flex-col">
	<Navbar t={tFn} />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer t={tFn} />
</div>

<Announcement />
