<script>
	import { login } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Separator } from '$lib/components/ui/separator';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '$lib/components/ui/card';
	import { goto } from '$app/navigation';
	import { t } from '$lib/stores/i18n';
	import { LogIn, Lock, Mail, Eye, EyeOff, AlertCircle } from '@lucide/svelte';

	let tFn = $derived($t);
	let username = $state('');
	let password = $state('');
	let rememberMe = $state(false);
	let error = $state('');
	let loading = $state(false);
	let showPassword = $state(false);

	async function handleSubmit(e) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const result = await login(username, password, rememberMe);
			if (result.requires2FA) { goto('/2fa'); return; }
			goto('/');
		} catch (e) {
			error = e.message || '登录失败';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
	<Card class="w-full max-w-[420px] shadow-lg">
		<CardHeader class="space-y-1 text-center pb-6">
			<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<LogIn class="h-6 w-6 text-primary" />
			</div>
			<CardTitle class="text-2xl">{@html tFn('login.title')}</CardTitle>
			<CardDescription>{@html tFn('login.subtitle')}</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="space-y-2">
					<Label for="username" class="text-sm">{@html tFn('login.username')}</Label>
					<div class="relative">
						<Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input id="username" type="text" bind:value={username} required placeholder="username or email" class="pl-10" />
					</div>
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label for="password" class="text-sm">{@html tFn('login.password')}</Label>
						<a href="/forgot-password" class="text-xs text-muted-foreground hover:text-primary">忘记密码？</a>
					</div>
					<div class="relative">
						<Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input id="password" type={showPassword ? 'text' : 'password'} bind:value={password} required placeholder="••••••••" class="pl-10 pr-10" />
						<button type="button" onclick={() => (showPassword = !showPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabindex="-1">
							{#if showPassword}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
						</button>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Checkbox id="remember" bind:checked={rememberMe} />
					<Label for="remember" class="text-sm font-normal">{@html tFn('login.remember')}</Label>
				</div>
				{#if error}
					<div class="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
						<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
						<span>{error}</span>
					</div>
				{/if}
				<Button type="submit" class="w-full" disabled={loading}>
					{#if loading}
						<span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
					{/if}
					{loading ? '登录中...' : tFn('login.submit')}
				</Button>
			</form>

			<Separator class="my-5">{@html tFn('login.or')}</Separator>

			<Button variant="outline" class="w-full" href="/oauth-start">
				🛡️ {@html tFn('login.reviewerLogin')}
			</Button>
		</CardContent>
		<CardFooter class="justify-center text-sm text-muted-foreground">
			<p>{@html tFn('login.noAccount')} <a href="/register" class="font-medium text-primary hover:underline">{@html tFn('login.register')}</a></p>
		</CardFooter>
	</Card>
</div>
