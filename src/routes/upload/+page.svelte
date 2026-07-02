<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isLoggedIn, currentUser } from '$lib/stores/auth';
	import { uploadWithProgress } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { showToast } from '$lib/stores/toast';
	import { t } from '$lib/stores/i18n';

	let tFn = $derived($t);
	let title = $state('');
	let photoDate = $state('');
	let registration = $state('');
	let airline = $state('');
	let aircraftType = $state('');
	let location = $state('');
	let serialNumber = $state('');
	let description = $state('');
	let message = $state('');
	let isHot = $state(false);
	let agreeTerms = $state(true);
	let selectedFiles = $state([]);
	let uploading = $state(false);
	let uploadProgress = $state(0);

	onMount(() => {
		if (!$isLoggedIn) goto('/login');
	});

	function handleFileSelect(e) {
		const files = Array.from(e.target.files || []);
		selectedFiles = [...selectedFiles, ...files];
	}

	function removeFile(index) {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	}

	async function handleSubmit(e) {
		e.preventDefault();
		if (selectedFiles.length === 0) { showToast('请选择图片', 'error'); return; }
		uploading = true;
		try {
			const formData = new FormData();
			selectedFiles.forEach((f) => formData.append('photos', f));
			formData.append('title', title);
			formData.append('date', photoDate);
			formData.append('registration', registration);
			formData.append('airline', airline);
			formData.append('aircraftType', aircraftType);
			formData.append('location', location);
			if (serialNumber) formData.append('serialNumber', serialNumber);
			if (description) formData.append('description', description);
			if (message) formData.append('message', message);
			if (isHot) formData.append('isHot', 'true');

			await uploadWithProgress('/api/photos/upload', formData, (p) => (uploadProgress = p));
			showToast('上传成功', 'success');
			goto('/dashboard');
		} catch (e) {
			showToast(e.message || '上传失败', 'error');
		} finally {
			uploading = false;
			uploadProgress = 0;
		}
	}
</script>

<div class="container mx-auto max-w-[1200px] px-5 py-8">
	<div class="mb-8 text-center">
		<h1 class="text-3xl font-bold">{@html tFn('upload.title')}</h1>
		<p class="mt-2 text-muted-foreground">{@html tFn('upload.subtitle')}</p>
	</div>

	<form onsubmit={handleSubmit}>
		<div class="grid gap-8 lg:grid-cols-[350px_1fr]">
			<!-- File Drop Zone -->
			<div>
				<div class="rounded-xl border-2 border-dashed p-8 text-center">
					<div class="mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
					</div>
					<p>拖放文件或点击上传</p>
					<p class="mt-1 text-xs text-muted-foreground">支持 JPG, PNG, WEBP (最大 20MB)</p>
					<Input type="file" accept="image/jpeg,image/png,image/webp" multiple onchange={handleFileSelect} class="mt-3" />
				</div>
				{#if selectedFiles.length > 0}
					<div class="mt-4 space-y-2">
						{#each selectedFiles as file, i}
							<div class="flex items-center justify-between rounded-lg bg-secondary p-2 text-sm">
								<span>{file.name}</span>
								<Button variant="ghost" size="icon" onclick={() => removeFile(i)}>✕</Button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Form Fields -->
			<div class="space-y-4">
				<div>
					<Label for="title">{@html tFn('upload.title')}</Label>
					<Input id="title" bind:value={title} maxlength="100" required class="mt-1" />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<Label for="date">{@html tFn('upload.date')}</Label>
						<Input id="date" type="date" bind:value={photoDate} required class="mt-1" />
					</div>
					<div>
						<Label for="reg">{@html tFn('upload.registration')}</Label>
						<Input id="reg" bind:value={registration} required class="mt-1" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<Label for="airline">{@html tFn('upload.airline')}</Label>
						<Input id="airline" bind:value={airline} required class="mt-1" />
					</div>
					<div>
						<Label for="acType">{@html tFn('upload.aircraftType')}</Label>
						<Input id="acType" bind:value={aircraftType} required class="mt-1" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<Label for="loc">{@html tFn('upload.location')}</Label>
						<Input id="loc" bind:value={location} required class="mt-1" />
					</div>
					<div>
						<Label for="sn">{@html tFn('upload.serialNumber')}</Label>
						<Input id="sn" bind:value={serialNumber} class="mt-1" />
					</div>
				</div>
				<div>
					<Label for="desc">{@html tFn('upload.description')}</Label>
					<textarea id="desc" bind:value={description} rows="3" class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"></textarea>
				</div>
				<div class="flex items-center gap-2">
					<Checkbox id="isHot" bind:checked={isHot} />
					<Label for="isHot" class="text-sm">{@html tFn('upload.markAsHot')}</Label>
				</div>
				<div class="flex items-center gap-2">
					<Checkbox id="agreeTerms" bind:checked={agreeTerms} />
					<Label for="agreeTerms" class="text-sm">{@html tFn('upload.socialShare')}</Label>
				</div>
				{#if uploading}
					<div class="h-2 overflow-hidden rounded-full bg-secondary">
						<div class="h-full bg-primary transition-all" style="width:{uploadProgress}%"></div>
					</div>
				{/if}
				<Button type="submit" size="lg" class="w-full" disabled={uploading}>
					{uploading ? '上传中...' : tFn('upload.submit')}
				</Button>
			</div>
		</div>
	</form>
</div>
