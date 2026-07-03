<script>
	import { verify2FA } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { goto } from '$app/navigation';
	import { Shield } from '@lucide/svelte';

	let code = $state(''); let error = $state(''); let loading = $state(false);

	async function handleVerify(e) {
		e.preventDefault(); error = ''; loading = true;
		try { await verify2FA(code); window.location.href = '/dashboard'; }
		catch (err) { error = err.message || '验证失败'; } finally { loading = false; }
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
	<Card class="w-full max-w-[400px] shadow-lg">
		<CardHeader class="space-y-1 text-center pb-4">
			<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Shield class="h-6 w-6 text-primary" /></div>
			<CardTitle class="text-2xl">两步验证</CardTitle>
			<CardDescription>请输入验证器应用中的6位验证码</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleVerify} class="space-y-4">
				<div class="space-y-1.5">
					<label for="code" class="text-xs font-medium">验证码</label>
					<Input id="code" type="text" bind:value={code} inputmode="numeric" maxlength="6" placeholder="000000" class="text-center text-2xl tracking-[0.5em] font-mono" autocomplete="one-time-code" />
				</div>
				{#if error}<p class="text-sm text-destructive">{error}</p>{/if}
				<Button type="submit" class="w-full" disabled={loading || code.length !== 6}>{loading ? '验证中...' : '验证'}</Button>
				<Button variant="ghost" class="w-full" href="/login">取消</Button>
			</form>
		</CardContent>
	</Card>
</div>
