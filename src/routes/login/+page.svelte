<script>
	import { login } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '$lib/components/ui/card';
	import { goto } from '$app/navigation';
	import { t } from '$lib/stores/i18n';

	let tFn = $derived($t);
	let username = $state('');
	let password = $state('');
	let rememberMe = $state(false);
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const result = await login(username, password, rememberMe);
			if (result.requires2FA) {
				goto('/2fa');
				return;
			}
			goto('/');
		} catch (e) {
			error = e.message || '登录失败';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center p-5">
	<Card class="w-full max-w-md">
		<CardHeader class="text-center">
			<img src="https://r2.eacof.org/logo-light.png" alt="EAC Photo" class="mx-auto mb-4 h-12 w-auto" />
			<CardTitle class="text-2xl">{@html tFn('login.title')}</CardTitle>
			<CardDescription>{@html tFn('login.subtitle')}</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleSubmit}>
				<div class="mb-4">
					<Label for="username">{@html tFn('login.username')}</Label>
					<Input id="username" type="text" bind:value={username} required placeholder="username or email" class="mt-1" />
				</div>
				<div class="mb-4">
					<Label for="password">{@html tFn('login.password')}</Label>
					<Input id="password" type="password" bind:value={password} required placeholder="••••••••" class="mt-1" />
				</div>
				<div class="mb-4 flex items-center gap-2">
					<Checkbox id="remember" bind:checked={rememberMe} />
					<Label for="remember" class="text-sm">{@html tFn('login.remember')}</Label>
				</div>
				{#if error}
					<p class="mb-4 text-sm text-destructive">{error}</p>
				{/if}
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? '...' : tFn('login.submit')}
				</Button>
			</form>
		</CardContent>
		<CardFooter class="flex flex-col gap-2 text-center text-sm text-muted-foreground">
			<p>
				{@html tFn('login.noAccount')}
				<a href="/register" class="text-primary hover:underline">{@html tFn('login.register')}</a>
			</p>
			<a href="/forgot-password" class="text-primary hover:underline">忘记密码？</a>
		</CardFooter>
	</Card>
</div>
