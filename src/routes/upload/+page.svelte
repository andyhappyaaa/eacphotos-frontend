<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isLoggedIn, verifyTurnstile } from '$lib/stores/auth';
	import { uploadWithProgress } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import { showToast } from '$lib/stores/toast';
	import { t } from '$lib/stores/i18n';
	import { Upload, X } from '@lucide/svelte';

	let title = $state(''); let photoDate = $state(''); let registration = $state('');
	let airline = $state(''); let aircraftType = $state(''); let location = $state('');
	let serialNumber = $state(''); let description = $state(''); let message = $state('');
	let isHot = $state(false); let agreeTerms = $state(true);
	let selectedFiles = $state([]); let uploading = $state(false); let uploadProgress = $state(0);
	let tsToken = $state(null); let tsRef = $state(null);
	let turnstileVerified = $state(false); let turnstileVerifying = $state(false);

	async function verifyTsToken(tk) {
		tsToken = tk; turnstileVerifying = true;
		try { await verifyTurnstile(tk); turnstileVerified = true; }
		catch (err) { showToast('人机验证失败，请重试', 'error'); turnstileVerified = false; }
		finally { turnstileVerifying = false; }
	}

	onMount(() => { if (!$isLoggedIn) window.location.href = '/'; });

	function handleFileSelect(e) { selectedFiles = [...selectedFiles, ...Array.from(e.target.files || [])]; }
	function removeFile(i) { selectedFiles = selectedFiles.filter((_, idx) => idx !== i); }

	async function handleSubmit(e) {
		e.preventDefault();
		if (selectedFiles.length === 0) { showToast('请选择图片', 'error'); return; }
		uploading = true;
		try {
			const fd = new FormData();
			selectedFiles.forEach((f) => fd.append('photos', f));
			fd.append('title', title); fd.append('date', photoDate); fd.append('registration', registration);
			fd.append('airline', airline); fd.append('aircraftType', aircraftType); fd.append('location', location);
			if (serialNumber) fd.append('serialNumber', serialNumber);
			if (description) fd.append('description', description);
			if (message) fd.append('message', message);
			if (isHot) fd.append('isHot', 'true');
			if (tsToken) fd.append('turnstileToken', tsToken);
			await uploadWithProgress('/api/photos/upload', fd, (p) => (uploadProgress = p));
			showToast('上传成功', 'success'); goto('/dashboard');
		} catch (err) { showToast(err.message || '上传失败', 'error'); }
		finally { uploading = false; uploadProgress = 0; }
	}
</script>

<div class="container mx-auto max-w-[1200px] px-5 py-8">
	<div class="mb-8 text-center">
		<div class="mb-3 inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs font-medium"><Upload class="h-3 w-3" /> 上传</div>
		<h1 class="text-3xl font-bold tracking-tight">{@html $t('upload.title')}</h1>
		<p class="mt-2 text-muted-foreground">{@html $t('upload.subtitle')}</p>
	</div>

	<form onsubmit={handleSubmit}>
		<div class="grid gap-8 lg:grid-cols-[350px_1fr]">
			<div>
				<div class="rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50">
					<Upload class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
					<p>拖放文件或点击上传</p>
					<p class="mt-1 text-xs text-muted-foreground">支持 JPG, PNG, WEBP (最大 20MB)</p>
					<Input type="file" accept="image/jpeg,image/png,image/webp" multiple onchange={handleFileSelect} class="mt-4" />
				</div>
				{#if selectedFiles.length > 0}
					<div class="mt-4 space-y-2">
						{#each selectedFiles as file, i}
							<div class="flex items-center justify-between rounded-lg bg-secondary p-2 text-sm"><span class="truncate">{file.name}</span><Button variant="ghost" size="icon" class="h-7 w-7 shrink-0" onclick={() => removeFile(i)}><X class="h-4 w-4" /></Button></div>
						{/each}
					</div>
				{/if}
			</div>

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
				<div class="flex items-center gap-2"><Checkbox id="isHot" bind:checked={isHot} /><Label for="isHot" class="text-sm">{@html $t('upload.markAsHot')}</Label></div>
				<div class="flex items-center gap-2"><Checkbox id="agreeTerms" bind:checked={agreeTerms} /><Label for="agreeTerms" class="text-sm">{@html $t('upload.socialShare')}</Label></div>
				<Turnstile containerId="upload-turnstile" onSuccess={(tk) => verifyTsToken(tk)} onExpired={() => { tsToken = null; turnstileVerified = false; }} />
				{#if uploading}<div class="h-2 overflow-hidden rounded-full bg-secondary"><div class="h-full bg-primary transition-all" style="width:{uploadProgress}%"></div></div>{/if}
				<Button type="submit" size="lg" class="w-full" disabled={uploading || !turnstileVerified}>{uploading ? '上传中...' : turnstileVerifying ? '验证中...' : $t('upload.submit')}</Button>
			</div>
		</div>
	</form>
</div>
