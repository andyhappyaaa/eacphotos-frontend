<script>
	import { get } from 'svelte/store';
	import { register, sendEmailCode } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '$lib/components/ui/card';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import { goto } from '$app/navigation';
	import { t } from '$lib/stores/i18n';
	import { showToast } from '$lib/stores/toast';
	import { UserPlus, Mail, Lock, AlertCircle } from '@lucide/svelte';

	let tFn = $derived(get(t));
	let username = $state(''); let email = $state(''); let emailCode = $state('');
	let password = $state(''); let confirmPassword = $state(''); let agreeTerms = $state(false);
	let error = $state(''); let loading = $state(false); let sendingCode = $state(false);
	let tsToken = $state(null); let tsRef = $state(null);

	async function handleSendCode() {
		if (!email) return; sendingCode = true;
		try { await sendEmailCode(email); showToast('验证码已发送', 'success'); }
		catch (err) { error = err.message || '发送失败'; } finally { sendingCode = false; }
	}

	async function handleSubmit(e) {
		e.preventDefault(); error = '';
		if (password !== confirmPassword) { error = '两次密码不一致'; return; }
		if (!agreeTerms) { error = '请同意服务条款和隐私政策'; return; }
		loading = true;
		try { await register(username, email, password, emailCode, agreeTerms); window.location.href = '/dashboard'; }
		catch (err) { error = err.message || '注册失败'; } finally { loading = false; }
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
	<Card class="w-full max-w-[440px] shadow-lg">
		<CardHeader class="space-y-1 text-center pb-4">
			<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><UserPlus class="h-6 w-6 text-primary" /></div>
			<CardTitle class="text-2xl">{@html tFn('register.title')}</CardTitle>
			<CardDescription>{@html tFn('register.subtitle')}</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleSubmit} class="space-y-3.5">
				<div class="space-y-1.5">
					<Label for="username" class="text-sm">{@html tFn('register.username')}</Label>
					<Input id="username" type="text" bind:value={username} required class="h-9" />
				</div>
				<div class="space-y-1.5">
					<Label for="email" class="text-sm">{@html tFn('register.email')}</Label>
					<div class="flex gap-2"><Input id="email" type="email" bind:value={email} required class="h-9 flex-1" /><Button type="button" variant="secondary" size="sm" onclick={handleSendCode} disabled={sendingCode || !email}>{sendingCode ? '发送中...' : tFn('register.sendCode')}</Button></div>
				</div>
				<div class="space-y-1.5">
					<Label for="emailCode" class="text-sm">{@html tFn('register.emailCode')}</Label>
					<Input id="emailCode" type="text" bind:value={emailCode} maxlength="6" placeholder="000000" class="h-9" />
				</div>
				<div class="space-y-1.5">
					<Label for="password" class="text-sm">{@html tFn('register.password')}</Label>
					<Input id="password" type="password" bind:value={password} required class="h-9" />
				</div>
				<div class="space-y-1.5">
					<Label for="confirmPassword" class="text-sm">{tFn('register.confirmPassword')}</Label>
					<Input id="confirmPassword" type="password" bind:value={confirmPassword} required class="h-9" />
				</div>
				<div class="flex items-start gap-2">
					<Checkbox id="agree" bind:checked={agreeTerms} class="mt-1" />
					<Label for="agree" class="text-xs">{@html tFn('register.agree')}</Label>
				</div>
				<Turnstile containerId="register-turnstile" onSuccess={(tk) => (tsToken = tk)} onExpired={() => (tsToken = null)} />
				{#if error}<div class="flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive"><AlertCircle class="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>{/if}
				<Button type="submit" class="w-full" disabled={loading}>{loading ? '注册中...' : tFn('register.submit')}</Button>
			</form>
		</CardContent>
		<CardFooter class="justify-center text-sm text-muted-foreground">
			<p>{@html tFn('register.hasAccount')} <a href="/login" class="font-medium text-primary hover:underline">{@html tFn('register.login')}</a></p>
		</CardFooter>
	</Card>
</div>
