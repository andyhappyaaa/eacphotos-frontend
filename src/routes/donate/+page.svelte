<script>
	import { onMount } from 'svelte';
	import DonateTiers from '$lib/components/DonateTiers.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { api } from '$lib/api';
	import { t } from '$lib/stores/i18n';

	/** @type {any[]} */
	let donations = $state([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const resp = await api('/api/donate/list');
			const data = await resp.json();
			if (!resp.ok) throw new Error(data?.error || $t('donate.loadFailed'));
			donations = Array.isArray(data.donations) ? data.donations : [];
		} catch (e) {
			error = e instanceof Error ? e.message : $t('donate.loadRecordsFailed');
		} finally {
			loading = false;
		}
	});
</script>

<div class="container mx-auto max-w-3xl px-5 py-12">
	<div class="mb-10 text-center">
		<h1 class="text-3xl font-bold tracking-tight">{$t('donate.title')}</h1>
		<p class="mt-3 text-muted-foreground">{$t('donate.subtitle')}</p>
	</div>

	<div class="mx-auto max-w-md">
		<DonateTiers />
	</div>

	<Separator class="my-12" />

	<section>
		<h2 class="mb-6 text-center text-lg font-semibold">{$t('donate.records')}</h2>

		{#if loading}
			<p class="text-center text-sm text-muted-foreground">{$t('donate.loading')}</p>
		{:else if error}
			<p class="text-center text-sm text-muted-foreground">{error}</p>
		{:else if donations.length === 0}
			<p class="text-center text-sm text-muted-foreground">{$t('donate.empty')}</p>
		{:else}
			<ul class="mx-auto max-w-md divide-y">
				{#each donations as d (d.id)}
					<li class="py-2.5 text-sm">
						<div class="flex items-center justify-between gap-4">
							<span class="truncate text-muted-foreground">{d.name}</span>
							<span class="flex shrink-0 items-center gap-3">
								{#if d.amountLabel}<span class="font-medium">{d.amountLabel}</span>{/if}
								{#if d.dateLabel}<span class="text-xs text-muted-foreground">{d.dateLabel}</span>{/if}
							</span>
						</div>
						{#if d.note}
							<p class="mt-1 text-xs text-muted-foreground">“{d.note}”</p>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
