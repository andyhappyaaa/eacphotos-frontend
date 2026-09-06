<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isLoggedIn, verifyTurnstile, authLoading, isReviewer } from '$lib/stores/auth';
	import { api, uploadWithProgress } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Separator } from '$lib/components/ui/separator';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import { showToast } from '$lib/stores/toast';
	import { t } from '$lib/stores/i18n';
	import { ArrowLeft, Upload, X } from '@lucide/svelte';

	let title = $state(''); let photoDate = $state(''); let registration = $state('');
	let airline = $state(''); let aircraftType = $state(''); let location = $state('');
	let serialNumber = $state(''); let description = $state('');
	let isHot = $state(false); let agreeTerms = $state(true);
	let selectedFiles = $state([]); let uploading = $state(false); let uploadProgress = $state(0);
	let tsToken = $state(null); let turnstileVerified = $state(false); let turnstileVerifying = $state(false);
	let rules = $state([]);
	let rulesFetchFailed = $state(false);

	onMount(async () => {
		await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
		if (!$isLoggedIn && !$isReviewer) { window.location.href = '/login'; return; }
		try {
			// 后端公开端点，返回管理员可编辑的上传规则；失败时回退 i18n 默认文案
			const r = await api('/api/site/upload-rules', { bypassSession: true, noRedirect: true });
			const d = await r.json();
			rules = (d.rules || []).filter(x => x.active !== false);
		} catch (e) { rulesFetchFailed = true; }
	});

	async function verifyTsToken(tk) { tsToken = tk; turnstileVerifying = true; try { await verifyTurnstile(tk); turnstileVerified = true; } catch (e) { showToast('人机验证失败', 'error'); turnstileVerified = false; } finally { turnstileVerifying = false; } }

	function handleFileSelect(e) { selectedFiles = [...selectedFiles, ...Array.from(e.target.files || [])]; }
	function removeFile(i) { selectedFiles = selectedFiles.filter((_, idx) => idx !== i); }

	async function handleSubmit(e) {
		e.preventDefault();
		if (selectedFiles.length === 0) { showToast($t('upload.selectImage'), 'error'); return; }
		uploading = true;
		try {
			const fd = new FormData();
			selectedFiles.forEach(f => fd.append('photos', f));
			fd.append('title', title); fd.append('date', photoDate); fd.append('registration', registration);
			fd.append('airline', airline); fd.append('aircraftType', aircraftType); fd.append('location', location);
			if (serialNumber) fd.append('serialNumber', serialNumber);
			if (description) fd.append('description', description);
			if (isHot) fd.append('isHot', 'true'); if (tsToken) fd.append('turnstileToken', tsToken);
			await uploadWithProgress('/api/photos/upload', fd, p => uploadProgress = p);
			showToast($t('upload.uploadSuccess'), 'success'); window.location.href = '/dashboard';
		} catch (e) { showToast(e.message || $t('upload.uploadFailed'), 'error'); } finally { uploading = false; uploadProgress = 0; }
	}
</script>

<div class="container mx-auto max-w-[780px] px-5 py-8">
	<a href="/dashboard" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft class="h-4 w-4" /> 返回仪表盘</a>
	<div class="mb-8 text-center">
		<h1 class="text-3xl font-bold tracking-tight">{@html $t('upload.title')}</h1>
		<p class="mt-2 text-muted-foreground">{@html $t('upload.subtitle')}</p>
	</div>

	<div class="mb-8 rounded-xl border bg-secondary/40 p-5">
		<h2 class="mb-3 text-sm font-semibold">{@html $t('upload.rules.title')}</h2>
		<ol class="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
			{#if rulesFetchFailed}
				{#each [1, 2, 3, 4, 5, 6, 7] as n}<li>{@html $t(`upload.rules.${n}`)}</li>{/each}
			{:else}
				{#each rules as r}<li>{r.text}</li>{/each}
			{/if}
		</ol>
	</div>

	<form onsubmit={handleSubmit}>
		<div class="space-y-6">
			<!-- File drop zone -->
			<div class="rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50">
				<Upload class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
				<p>拖放文件或点击上传</p>
				<p class="mt-1 text-xs text-muted-foreground">支持 JPG, PNG, WEBP (最大 20MB)</p>
				<Input type="file" accept="image/jpeg,image/png,image/webp" multiple onchange={handleFileSelect} class="mt-4" />
			</div>
			{#if selectedFiles.length > 0}
				<div class="space-y-2">
					{#each selectedFiles as file, i}
						<div class="flex items-center justify-between rounded-lg bg-secondary p-2 text-sm"><span class="truncate">{file.name}</span><Button variant="ghost" size="icon" class="h-7 w-7 shrink-0" onclick={() => removeFile(i)}><X class="h-4 w-4" /></Button></div>
					{/each}
				</div>
			{/if}

			<div class="space-y-4">
				<div class="space-y-1.5"><Label for="title">{@html $t('upload.title')}</Label><Input id="title" bind:value={title} maxlength="100" required class="h-9" /></div>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5"><Label for="date">{@html $t('upload.date')}</Label><Input id="date" type="date" bind:value={photoDate} required class="h-9" /></div>
					<div class="space-y-1.5"><Label for="reg">{@html $t('upload.registration')}</Label><Input id="reg" bind:value={registration} required class="h-9" /></div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5"><Label for="airline">{@html $t('upload.airline')}</Label><Input id="airline" bind:value={airline} required class="h-9" /></div>
					<div class="space-y-1.5"><Label for="acType">{@html $t('upload.aircraftType')}</Label><Input id="acType" bind:value={aircraftType} required class="h-9" /></div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5"><Label for="loc">{@html $t('upload.location')}</Label><Input id="loc" bind:value={location} required class="h-9" /></div>
					<div class="space-y-1.5"><Label for="sn">{@html $t('upload.serialNumber')}</Label><Input id="sn" bind:value={serialNumber} class="h-9" /></div>
				</div>
				<div class="space-y-1.5"><Label for="desc">{@html $t('upload.description')}</Label><textarea id="desc" bind:value={description} rows="3" class="w-full rounded-lg border bg-background px-3 py-2 text-sm"></textarea></div>
				<div class="flex items-center gap-2 py-1"><Checkbox id="isHot" bind:checked={isHot} /><Label for="isHot" class="cursor-pointer text-sm">{@html $t('upload.markAsHot')}</Label></div>
				<div class="flex items-center gap-2 py-1"><Checkbox id="agreeTerms" bind:checked={agreeTerms} /><Label for="agreeTerms" class="cursor-pointer text-sm">{@html $t('upload.socialShare')}</Label></div>
				<div class="min-h-[65px]">
				<Turnstile containerId="upload-turnstile" onSuccess={(tk) => verifyTsToken(tk)} onExpired={() => { tsToken = null; turnstileVerified = false; }} /></div>
				{#if uploading}<div class="h-2 overflow-hidden rounded-full bg-secondary"><div class="h-full bg-primary transition-all" style="width:{uploadProgress}%"></div></div>{/if}
				<Button type="submit" size="lg" class="w-full" disabled={uploading || !turnstileVerified}>{uploading ? $t('upload.uploading') : turnstileVerifying ? $t('upload.verifying') : $t('upload.submit')}</Button>
			</div>
		</div>
	</form>
</div>
