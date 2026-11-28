<script>
	import { openCheckout } from '@creem_io/svelte';
	import { requireAuth } from '$lib/auth-guard';
	import { api } from '$lib/api';
	import { isLoggedIn, isReviewer, authLoading } from '$lib/stores/auth';
	import { t } from '$lib/stores/i18n';

	const tiers = [
		{ amount: 200, key: 'basic', price: '$2', recommended: false },
		{ amount: 500, key: 'coffee', price: '$5', recommended: true },
		{ amount: 800, key: 'supporter', price: '$8', recommended: false }
	];

	let loading = $state(false);
	let error = $state('');
	let note = $state('');
	let customAmount = $state('');
	let customError = $state('');

	async function donate(/** @type {number} */ amount) {
		console.log('[donate] clicked', amount);
		if (loading) return;
		const authed = await requireAuth();
		console.log('[donate] authed =', authed);
		if (!authed) return;
		loading = true;
		error = '';
		try {
			const resp = await api('/api/donate/create-checkout', {
				method: 'POST',
				body: JSON.stringify({ amount, note: note.trim() })
			});
			const data = await resp.json();
			if (!resp.ok) throw new Error(data?.error || $t('donate.errorCreate'));
			const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
			openCheckout({ checkoutUrl: data.checkoutUrl, theme, onComplete: () => {} });
			maximizeCreemModal(theme);
		} catch (e) {
			error = e instanceof Error ? e.message : $t('donate.errorRequest');
		} finally {
			loading = false;
		}
	}

	function submitCustom() {
		if (loading) return;
		const raw = customAmount.trim();
		const v = Number(raw);
		if (!raw || !Number.isFinite(v)) {
			customError = $t('donate.errorInvalid');
			return;
		}
		if (v <= 5) {
			customError = $t('donate.errorTooLow');
			return;
		}
		if (v >= 10000) {
			customError = $t('donate.errorTooHigh');
			return;
		}
		customError = '';
		donate(Math.round(v * 100));
	}

	/** @param {'dark' | 'light'} theme */
	function maximizeCreemModal(theme) {
		// openCheckout 同步把全屏 overlay 追加到 body，这里把默认的 460×860 弹窗撑满。
		// 不能用 style 属性字符串匹配：浏览器会把 inline style 规范成 "z-index: 2147483647"（冒号后带空格），
		// 直接读 CSSOM 的 el.style.zIndex 才可靠。
		const overlay = /** @type {HTMLElement | null} */ (
			Array.from(document.querySelectorAll('div')).find((el) => el.style.zIndex === '2147483647') ?? null
		);
		if (!overlay) return;
		overlay.style.padding = '0';
		overlay.style.background = theme === 'dark' ? '#000' : '#f9fafb';
		const column = /** @type {HTMLElement | null} */ (overlay.firstElementChild);
		if (!column) return;
		column.style.width = '100%';
		column.style.height = '100%';
		column.style.gap = '0';
		const wrap = /** @type {HTMLElement | undefined} */ (column.children[1]);
		if (wrap) wrap.style.borderRadius = '0';
	}
</script>

{#if $authLoading}
	<p class="py-6 text-center text-sm text-muted-foreground">{$t('donate.loading')}</p>
{:else if !$isLoggedIn && !$isReviewer}
	<div class="rounded-lg border p-6 text-center">
		<p class="font-medium">{$t('donate.loginRequired')}</p>
		<p class="mt-1 text-xs text-muted-foreground">{$t('donate.loginRequiredSub')}</p>
		<div class="mt-4 flex justify-center gap-3">
			<a href="/login?redirect=/donate" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{$t('nav.login')}</a>
			<a href="/register" class="rounded-lg border px-4 py-2 text-sm">{$t('nav.register')}</a>
		</div>
	</div>
{:else}
	<div class="grid gap-3">
		<textarea
			rows="2"
			bind:value={note}
			maxlength="500"
			placeholder={$t('donate.notePlaceholder')}
			class="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		></textarea>

		<div class="grid gap-2">
			{#each tiers as tier (tier.amount)}
				<button
					type="button"
					disabled={loading}
					onclick={() => donate(tier.amount)}
					class="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:bg-muted disabled:opacity-60 {tier.recommended
						? 'border-primary/50 bg-primary/5'
						: ''}"
				>
					<span class="flex items-baseline gap-2">
						<span class="font-medium">{$t('donate.tier.' + tier.key + '.name')}</span>
						<span class="text-base font-semibold">{tier.price}</span>
						{#if tier.recommended}
							<span class="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{$t('donate.recommended')}</span>
						{/if}
					</span>
					<span class="text-xs text-muted-foreground">{$t('donate.tier.' + tier.key + '.desc')}</span>
				</button>
			{/each}
		</div>

		<div class="border-t pt-3">
			<p class="mb-2 text-xs text-muted-foreground">{$t('donate.customAmount')}</p>
			<div class="flex gap-2">
				<div class="relative flex-1">
					<span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
					<input
						type="text"
						inputmode="decimal"
						placeholder={$t('donate.customPlaceholder')}
						bind:value={customAmount}
						class="w-full rounded-lg border bg-transparent py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
				<button
					type="button"
					disabled={loading}
					onclick={submitCustom}
					class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
				>{$t('donate.submit')}</button>
			</div>
			{#if customError}
				<p class="mt-1 text-xs text-destructive">{customError}</p>
			{/if}
		</div>
	</div>

	{#if loading}
		<p class="text-center text-xs text-muted-foreground">{$t('donate.opening')}</p>
	{/if}
	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
{/if}
