<script>
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { sendEmailCode } from '$lib/stores/auth';

	let email = $state('');
	let sent = $state(false);
	let error = $state('');
	let loading = $state(false);

	async function handleSend() {
		error = '';
		loading = true;
		try {
			await sendEmailCode(email);
			sent = true;
		} catch (e) {
			error = e.message || '发送失败';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center p-5">
	<Card class="w-full max-w-md">
		<CardHeader class="text-center">
			<CardTitle>忘记密码</CardTitle>
			<CardDescription>输入您的注册邮箱，我们将发送重置链接</CardDescription>
		</CardHeader>
		<CardContent>
			{#if sent}
				<p class="text-center text-sm">密码重置链接已发送至 <strong>{email}</strong>，请检查收件箱。</p>
			{:else}
				<div class="mb-4">
					<Label for="email">邮箱地址</Label>
					<Input id="email" type="email" bind:value={email} required class="mt-1" />
				</div>
				{#if error}<p class="mb-4 text-sm text-destructive">{error}</p>{/if}
				<Button class="w-full" onclick={handleSend} disabled={loading}>
					{loading ? '...' : '发送重置链接'}
				</Button>
			{/if}
		</CardContent>
	</Card>
</div>
