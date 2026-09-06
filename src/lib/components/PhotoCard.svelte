<script>
	import { formatDate } from '$lib/utils/helpers';

	let { photo, variant = 'card' } = $props();
</script>

{#if variant === 'overlay'}
	<a href="/photo/{photo.id}" class="group relative block h-full w-full overflow-hidden rounded-lg">
		<img src={photo.thumbnail || photo.url} alt={photo.title || 'eac photos'} class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
		<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-white">
			<h3 class="mb-1 text-lg font-semibold">{photo.title || 'Untitled'}</h3>
			<p class="text-sm opacity-90">{photo.aircraft_type || photo.aircraftType || ''}{#if (photo.aircraft_type || photo.aircraftType) && photo.registration} · {/if}{photo.registration || ''}</p>
			<p class="text-sm opacity-90">{photo.airline || ''}{#if photo.airline && photo.location} · {/if}{photo.location || ''}{#if photo.photo_date} · {photo.photo_date}{/if}</p>
		</div>
	</a>
{:else}
	<div class="group overflow-hidden rounded-lg border bg-card transition-all hover:-translate-y-1 hover:shadow-lg">
		<a href="/photo/{photo.id}">
			<img src={photo.thumbnail || photo.url} alt={photo.title || 'eac photos'} class="aspect-video w-full object-cover" loading="lazy" />
		</a>
		<div class="p-3">
			<h3 class="truncate font-semibold"><a href="/photo/{photo.id}" class="hover:text-primary">{photo.title || 'Untitled'}</a></h3>
			<div class="mt-1 flex justify-between text-sm text-muted-foreground">
				<span>{photo.aircraft_type || photo.aircraftType || 'N/A'}</span>
				<span>{photo.registration || 'N/A'}</span>
			</div>
			<div class="mt-1 flex justify-between text-xs text-muted-foreground">
				<span>{photo.photographer_name || photo.photographer?.username || ''}</span>
				<span>{formatDate(photo.photo_date || photo.date)}</span>
			</div>
		</div>
	</div>
{/if}
