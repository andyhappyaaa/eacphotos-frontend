<script>
	import { register, sendEmailCode } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '$lib/components/ui/card';
	import { goto } from '$app/navigation';
	import { t } from '$lib/stores/i18n';

	let tFn = $derived($t);
	let username = $state('');
	let email = $state('');
	let emailCode = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let agreeTerms = $state(false);
	let error = $state('');
	let loading = $state(false);
	let sendingCode = $state(false);

	async function handleSendCode() {
		if (!email) return;
		sendingCode = true;
		try {
			await sendEmailCode(email);
		} catch (e) {
			error = e.message || '发送失败';
		} finally {
			sendingCode = false;
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		error = '';
		if (password !== confirmPassword) { error = '两次密码不一致'; return; }
		if (!agreeTerms) { error = '请同意服务条款和隐私政策'; return; }
		loading = true;
		try {
			await register(username, email, password, emailCode, agreeTerms);
			goto('/');
		} catch (e) {
			error = e.message || '注册失败';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center p-5">
	<Card class="w-full max-w-md">
		<CardHeader class="text-center">
			<CardTitle class="text-2xl">{@html tFn('register.title')}</CardTitle>
			<CardDescription>{@html tFn('register.subtitle')}</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleSubmit}>
				<div class="mb-4">
					<Label for="username">{@html tFn('register.username')}</Label>
					<Input id="username" type="text" bind:value={username} required class="mt-1" />
				</div>
				<div class="mb-4">
					<Label for="email">{@html tFn('register.email')}</Label>
					<div class="flex gap-2 mt-1">
						<Input id="email" type="email" bind:value={email} required class="flex-1" />
						<Button type="button" variant="secondary" onclick={handleSendCode} disabled={sendingCode}>
							{sendingCode ? '...' : tFn('register.sendCode')}
						</Button>
					</div>
				</div>
				<div class="mb-4">
					<Label for="emailCode">{@html tFn('register.emailCode')}</Label>
					<Input id="emailCode" type="text" bind:value={emailCode} maxlength="6" class="mt-1" />
				</div>
				<div class="mb-4">
					<Label for="password">{@html tFn('register.password')}</Label>
					<Input id="password" type="password" bind:value={password} required class="mt-1" />
				</div>
				<div class="mb-4">
					<Label for="confirmPassword">{tFn('register.confirmPassword')}</Label>
					<Input id="confirmPassword" type="password" bind:value={confirmPassword} required class="mt-1" />
				</div>
				<div class="mb-4 flex items-start gap-2">
					<Checkbox id="agree" bind:checked={agreeTerms} class="mt-1" />
					<Label for="agree" class="text-sm">{@html tFn('register.agree')}</Label>
				</div>
				{#if error}<p class="mb-4 text-sm text-destructive">{error}</p>{/if}
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? '...' : tFn('register.submit')}
				</Button>
			</form>
		</CardContent>
		<CardFooter class="text-center text-sm text-muted-foreground">
			<p>{@html tFn('register.hasAccount')} <a href="/login" class="text-primary hover:underline">{@html tFn('register.login')}</a></p>
		</CardFooter>
	</Card>
</div>
