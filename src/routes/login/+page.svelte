<script>
	import { login, loginByEmailCode, sendEmailCode, passkeyLoginOptions, passkeyLoginVerify } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Separator } from '$lib/components/ui/separator';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '$lib/components/ui/card';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import { goto } from '$app/navigation';
	import { t } from '$lib/stores/i18n';
	import { showToast } from '$lib/stores/toast';
	import { LogIn, Lock, Mail, Eye, EyeOff, AlertCircle, Key, Fingerprint, Smartphone, User } from '@lucide/svelte';

	let tFn = $derived($t);

	// Password login
	let username = $state(''); let password = $state(''); let rememberMe = $state(false);
	let error = $state(''); let loading = $state(false); let showPassword = $state(false);
	let tsToken = $state(null); let tsRef = $state(null);

	// Email code login
	let emailLoginEmail = $state(''); let emailLoginCode = $state('');
	let emailError = $state(''); let emailLoading = $state(false); let sendingCode = $state(false);

	// Passkey
	let passkeyUsername = $state(''); let passkeyLoading = $state(false);
	let passkeyError = $state('');

	// Turnstile ready callback
	function onTsReady(api) { tsRef = api; }

	async function handleSubmit(e) {
		e.preventDefault(); error = ''; loading = true;
		try {
			const result = await login(username, password, rememberMe);
			if (result.requires2FA) { goto('/2fa'); return; }
			goto('/');
		} catch (err) { error = err.message || '登录失败'; } finally { loading = false; }
	}

	async function handleEmailLogin(e) {
		e.preventDefault(); emailError = ''; emailLoading = true;
		try { await loginByEmailCode(emailLoginEmail, emailLoginCode, false); goto('/'); }
		catch (err) { emailError = err.message || '登录失败'; } finally { emailLoading = false; }
	}

	async function handleSendCode() {
		if (!emailLoginEmail) return; sendingCode = true;
		try { await sendEmailCode(emailLoginEmail); showToast('验证码已发送', 'success'); }
		catch (err) { emailError = err.message || '发送失败'; } finally { sendingCode = false; }
	}

	async function handlePasskeyLogin() {
		passkeyError = ''; passkeyLoading = true;
		try {
			if (!window.PublicKeyCredential) { passkeyError = '您的浏览器不支持 Passkey'; passkeyLoading = false; return; }
			const opts = await passkeyLoginOptions(passkeyUsername);
			const cred = await navigator.credentials.get({ publicKey: opts.publicKey });
			if (!cred) { passkeyError = '用户取消'; passkeyLoading = false; return; }
			await passkeyLoginVerify(cred, false);
			goto('/');
		} catch (err) { passkeyError = err.message || 'Passkey 登录失败'; } finally { passkeyLoading = false; }
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
	<Card class="w-full max-w-[440px] shadow-lg">
		<CardHeader class="space-y-1 text-center pb-4">
			<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><LogIn class="h-6 w-6 text-primary" /></div>
			<CardTitle class="text-2xl">{@html tFn('login.title')}</CardTitle>
			<CardDescription>{@html tFn('login.subtitle')}</CardDescription>
		</CardHeader>
		<CardContent class="pb-4">
			<Tabs defaultValue="password">
				<TabsList class="mb-4 grid w-full grid-cols-3">
					<TabsTrigger value="password">🔑 密码</TabsTrigger>
					<TabsTrigger value="email">📧 验证码</TabsTrigger>
					<TabsTrigger value="passkey">🔐 Passkey</TabsTrigger>
				</TabsList>

				<!-- Password Login -->
				<TabsContent value="password">
					<form onsubmit={handleSubmit} class="space-y-4">
						<div class="space-y-2">
							<Label for="username" class="text-sm">{@html tFn('login.username')}</Label>
							<div class="relative"><Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="username" type="text" bind:value={username} required placeholder="username or email" class="pl-10" /></div>
						</div>
						<div class="space-y-2">
							<div class="flex items-center justify-between"><Label for="password" class="text-sm">{@html tFn('login.password')}</Label><a href="/forgot-password" class="text-xs text-muted-foreground hover:text-primary">忘记密码？</a></div>
							<div class="relative"><Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type={showPassword ? 'text' : 'password'} bind:value={password} required placeholder="••••••••" class="pl-10 pr-10" />
								<button type="button" onclick={() => (showPassword = !showPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabindex="-1">{#if showPassword}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}</button>
							</div>
						</div>
						<div class="flex items-center gap-2"><Checkbox id="remember" bind:checked={rememberMe} /><Label for="remember" class="text-sm font-normal">{@html tFn('login.remember')}</Label></div>
						{#if error}<div class="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle class="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>{/if}
						<Turnstile containerId="login-turnstile" onSuccess={(tk) => (tsToken = tk)} onExpired={() => (tsToken = null)} />
						<Button type="submit" class="w-full" disabled={loading}>{#if loading}<span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>{/if}{loading ? '登录中...' : tFn('login.submit')}</Button>
					</form>
				</TabsContent>

				<!-- Email Code Login -->
				<TabsContent value="email">
					<form onsubmit={handleEmailLogin} class="space-y-4">
						<div class="space-y-2">
							<Label for="emailLogin" class="text-sm">邮箱地址</Label>
							<div class="relative"><Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="emailLogin" type="email" bind:value={emailLoginEmail} required placeholder="your@email.com" class="pl-10" /></div>
						</div>
						<div class="space-y-2">
							<Label for="emailCode" class="text-sm">验证码（6位）</Label>
							<div class="flex gap-2"><Input id="emailCode" type="text" bind:value={emailLoginCode} maxlength="6" placeholder="000000" class="flex-1" /><Button type="button" variant="secondary" onclick={handleSendCode} disabled={sendingCode || !emailLoginEmail}>{sendingCode ? '发送中...' : '发送验证码'}</Button></div>
						</div>
						{#if emailError}<div class="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle class="mt-0.5 h-4 w-4 shrink-0" /><span>{emailError}</span></div>{/if}
						<Button type="submit" class="w-full" disabled={emailLoading || emailLoginCode.length !== 6}>{emailLoading ? '登录中...' : '验证码登录'}</Button>
					</form>
				</TabsContent>

				<!-- Passkey Login -->
				<TabsContent value="passkey">
					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="passkeyUser" class="text-sm">用户名（可选，用于查找账号）</Label>
							<div class="relative"><User class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="passkeyUser" type="text" bind:value={passkeyUsername} placeholder="username" class="pl-10" /></div>
						</div>
						{#if passkeyError}<div class="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle class="mt-0.5 h-4 w-4 shrink-0" /><span>{passkeyError}</span></div>{/if}
						<Button class="w-full gap-2" onclick={handlePasskeyLogin} disabled={passkeyLoading}><Fingerprint class="h-4 w-4" /> {passkeyLoading ? '验证中...' : '使用 Passkey 登录'}</Button>
					</div>
				</TabsContent>
			</Tabs>

			<Separator class="my-4">{@html tFn('login.or')}</Separator>
			<Button variant="outline" class="w-full" href="/oauth-start">🛡️ {@html tFn('login.reviewerLogin')}</Button>
		</CardContent>
		<CardFooter class="justify-center text-sm text-muted-foreground">
			<p>{@html tFn('login.noAccount')} <a href="/register" class="font-medium text-primary hover:underline">{@html tFn('login.register')}</a></p>
		</CardFooter>
	</Card>
</div>
