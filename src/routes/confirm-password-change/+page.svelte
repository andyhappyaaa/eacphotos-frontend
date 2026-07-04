<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { verifyTurnstile } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import Turnstile from '$lib/components/Turnstile.svelte';
	import { showToast } from '$lib/stores/toast';
	import { Loader2, CheckCircle, XCircle, Lock, Shield } from '@lucide/svelte';

	let token = $state('');
	let phase = $state('loading');   // loading | verified | success | error
	let username = $state('');
	let email = $state('');
	let message = $state('');

	let oldPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let tsToken = $state(null);
	let turnstileVerified = $state(false);
	let turnstileVerifying = $state(false);
	let submitting = $state(false);
	let error = $state('');

	async function verifyTsToken(tk) {
		tsToken = tk; turnstileVerifying = true;
		try { await verifyTurnstile(tk); turnstileVerified = true; }
		catch (e) { error = '人机验证失败，请重试'; turnstileVerified = false; }
		finally { turnstileVerifying = false; }
	}

	onMount(async () => {
		token = page.url.searchParams.get('token') || '';
		if (!token) { phase = 'error'; message = '缺少验证令牌'; return; }

		try {
			const r = await fetch('/api/users/me/verify-password-change-token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token })
			});
			const d = await r.json();
			if (!d.valid) { phase = 'error'; message = d.error || '令牌无效或已过期'; return; }
			username = d.username || ''; email = d.email || '';
			phase = 'verified';
		} catch (e) { phase = 'error'; message = '网络错误，请重试'; }
	});

	async function handleSubmit(e) {
		e.preventDefault();
		error = '';
		if (newPassword.length < 8) { error = '新密码至少8位'; return; }
		if (newPassword !== confirmPassword) { error = '两次密码不一致'; return; }
		submitting = true;
		try {
			const body = { token, newPassword };
			if (oldPassword) body.oldPassword = oldPassword;

			const r = await fetch('/api/users/me/complete-password-change', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const d = await r.json();
			if (!r.ok) { error = d.error || '修改失败'; submitting = false; return; }
			phase = 'success';
			showToast('密码已修改，请重新登录', 'success');
			setTimeout(() => { goto('/login'); }, 2500);
		} catch (e) { error = '网络错误，请重试'; }
		finally { submitting = false; }
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
	<Card class="w-full max-w-[440px] shadow-lg">
		<CardContent class="space-y-4 p-8 text-center">
			{#if phase === 'loading'}
				<div class="text-5xl">⏳</div>
				<h2 class="text-xl font-bold">验证令牌...</h2>
				<p class="text-sm text-muted-foreground">正在验证您的修改密码令牌</p>
				<Loader2 class="mx-auto h-6 w-6 animate-spin text-primary" />

			{:else if phase === 'error'}
				<XCircle class="mx-auto h-14 w-14 text-destructive" />
				<h2 class="text-xl font-bold text-destructive">令牌无效</h2>
				<p class="text-sm text-muted-foreground">{message}</p>
				<div class="flex justify-center gap-3 pt-2">
					<Button href="/">返回首页</Button>
					<Button variant="outline" href="/forgot-password">重新发送</Button>
				</div>

			{:else if phase === 'success'}
				<CheckCircle class="mx-auto h-14 w-14 text-emerald-500" />
				<h2 class="text-xl font-bold text-emerald-600">密码修改成功</h2>
				<p class="text-sm text-muted-foreground">正在跳转到登录页面...</p>

			{:else}
				<CardHeader class="space-y-1 p-0 pb-4">
					<div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Shield class="h-6 w-6 text-primary" /></div>
					<CardTitle class="text-2xl">修改密码</CardTitle>
					<CardDescription>
						{username ? `你好，${username}` : ''}<br />
						请设置新的登录密码
					</CardDescription>
				</CardHeader>

				<form onsubmit={handleSubmit} class="space-y-4 text-left">
					<div class="space-y-1.5">
						<Label for="old-pwd" class="text-sm">旧密码</Label>
						<div class="relative">
							<Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input id="old-pwd" type="password" bind:value={oldPassword} required placeholder="用于确认身份" class="pl-10" />
						</div>
					</div>

					<div class="space-y-1.5">
						<Label for="new-pwd" class="text-sm">新密码</Label>
						<Input id="new-pwd" type="password" bind:value={newPassword} required placeholder="至少8位，包含字母和数字" minlength="8" />
					</div>

					<div class="space-y-1.5">
						<Label for="confirm-pwd" class="text-sm">确认新密码</Label>
						<Input id="confirm-pwd" type="password" bind:value={confirmPassword} required placeholder="再次输入新密码" />
					</div>

					<Turnstile containerId="pwd-change-turnstile" onSuccess={(tk) => verifyTsToken(tk)} onExpired={() => { tsToken = null; turnstileVerified = false; }} />

					{#if error}
						<div class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
					{/if}

					<Button type="submit" class="w-full" disabled={submitting || !turnstileVerified}>
						{#if submitting || turnstileVerifying}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						{submitting ? '提交中...' : turnstileVerifying ? '验证中...' : '修改密码'}
					</Button>
				</form>
			{/if}
		</CardContent>
	</Card>
</div>
