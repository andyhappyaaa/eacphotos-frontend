<script>
	import { isLoggedIn, login, passkeyLoginOptions, passkeyLoginVerify, verifyTurnstile } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Separator } from '$lib/components/ui/separator';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '$lib/components/ui/card';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from '$lib/stores/i18n';
	import { showToast } from '$lib/stores/toast';
	import { LogIn, Lock, Mail, Eye, EyeOff, AlertCircle, Fingerprint, Loader2 } from '@lucide/svelte';


	let username = $state(''); let password = $state(''); let rememberMe = $state(false);
	let error = $state(''); let loading = $state(false); let showPassword = $state(false);
	let tsToken = $state(null);
	let turnstileVerified = $state(false);
	let turnstileVerifying = $state(false);

	onMount(() => { if ($isLoggedIn) window.location.href = '/dashboard'; });

	async function verifyTsToken(tk) {
		tsToken = tk; turnstileVerifying = true;
		try { await verifyTurnstile(tk); turnstileVerified = true; }
		catch (e) { error = '人机验证失败，请重试'; turnstileVerified = false; }
		finally { turnstileVerifying = false; }
	}

	// Passkey state
	let passkeyLoading = $state(false); let passkeyError = $state('');

	async function handleSubmit(e) {
		e.preventDefault(); error = ''; loading = true;
		try {
			const result = await login(username, password, rememberMe);
			if (result.requires2FA) { window.location.href = '/2fa'; return; }
			window.location.href = '/dashboard';
		} catch (err) { error = err.message || '登录失败'; } finally { loading = false; }
	}

	async function handlePasskeyLogin() {
		passkeyError = ''; passkeyLoading = true;
		try {
			if (!window.PublicKeyCredential) { passkeyError = '您的浏览器不支持 Passkey'; passkeyLoading = false; return; }
			const opts = await passkeyLoginOptions(username);
			const cred = await navigator.credentials.get({ publicKey: opts.publicKey });
			if (!cred) { passkeyError = '用户取消'; passkeyLoading = false; return; }
			await passkeyLoginVerify(cred, false);
			window.location.href = '/dashboard';
		} catch (err) { passkeyError = err.message || 'Passkey 登录失败'; } finally { passkeyLoading = false; }
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
	<Card class="w-full max-w-[420px] shadow-lg">
		<CardHeader class="space-y-1 text-center pb-4">
			<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><LogIn class="h-6 w-6 text-primary" /></div>
			<CardTitle class="text-2xl">{@html $t('login.title')}</CardTitle>
			<CardDescription>{@html $t('login.subtitle')}</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="space-y-2">
					<Label for="username" class="text-sm">{@html $t('login.username')}</Label>
					<div class="relative"><Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="username" type="text" bind:value={username} required placeholder="username or email" class="pl-10" /></div>
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between"><Label for="password" class="text-sm">{@html $t('login.password')}</Label><a href="/forgot-password" class="text-xs text-muted-foreground hover:text-primary">忘记密码？</a></div>
					<div class="relative"><Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type={showPassword ? 'text' : 'password'} bind:value={password} required placeholder="••••••••" class="pl-10 pr-10" />
						<button type="button" onclick={() => (showPassword = !showPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabindex="-1">{#if showPassword}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}</button>
					</div>
				</div>
				<div class="flex items-center gap-2"><Checkbox id="remember" bind:checked={rememberMe} /><Label for="remember" class="text-sm font-normal">{@html $t('login.remember')}</Label></div>
				{#if error}<div class="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle class="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>{/if}
				<Turnstile containerId="login-turnstile" onSuccess={(tk) => verifyTsToken(tk)} onExpired={() => { tsToken = null; turnstileVerified = false; }} />
				<Button type="submit" class="w-full" disabled={loading || !turnstileVerified}>{#if loading || turnstileVerifying}<Loader2 class="mr-2 h-4 w-4 animate-spin" />{/if}{loading ? '登录中...' : turnstileVerifying ? '验证中...' : $t('login.submit')}</Button>
			</form>

			<Separator class="my-5">{@html $t('login.or')}</Separator>

			<div class="space-y-2.5">
				<Button variant="outline" class="w-full" href="/oauth-start">{@html $t('login.reviewerLogin')}</Button>
				<Button variant="outline" class="w-full gap-2" onclick={handlePasskeyLogin} disabled={passkeyLoading}>
					<Fingerprint class="h-4 w-4" /> {passkeyLoading ? '验证中...' : '使用 Passkey 登录'}
				</Button>
			</div>
			{#if passkeyError}<p class="mt-2 text-center text-xs text-destructive">{passkeyError}</p>{/if}
		</CardContent>
		<CardFooter class="justify-center text-sm text-muted-foreground">
			<p>{@html $t('login.noAccount')} <a href="/register" class="font-medium text-primary hover:underline">{@html $t('login.register')}</a></p>
		</CardFooter>
	</Card>
</div>
