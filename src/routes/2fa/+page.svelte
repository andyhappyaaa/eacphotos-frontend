<script>
	import { verify2FA } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { InputOTP, InputOTPGroup, InputOTPSlot } from '$lib/components/ui/input-otp';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { goto } from '$app/navigation';

	let code = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleVerify() {
		error = '';
		loading = true;
		try {
			await verify2FA(code);
			goto('/');
		} catch (e) {
			error = e.message || '验证失败';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center p-5">
	<Card class="w-full max-w-md">
		<CardHeader class="text-center">
			<CardTitle>两步验证</CardTitle>
		</CardHeader>
		<CardContent>
			<p class="mb-4 text-sm text-muted-foreground">请输入验证器应用中的6位验证码</p>
			<div class="mb-4 flex justify-center">
				<InputOTP bind:value={code} maxlength={6}>
					<InputOTPGroup>
						<InputOTPSlot value={code[0] || ''} index={0} />
						<InputOTPSlot value={code[1] || ''} index={1} />
						<InputOTPSlot value={code[2] || ''} index={2} />
						<InputOTPSlot value={code[3] || ''} index={3} />
						<InputOTPSlot value={code[4] || ''} index={4} />
						<InputOTPSlot value={code[5] || ''} index={5} />
					</InputOTPGroup>
				</InputOTP>
			</div>
			{#if error}<p class="mb-4 text-sm text-destructive">{error}</p>{/if}
			<Button class="w-full" onclick={handleVerify} disabled={loading || code.length !== 6}>
				{loading ? '...' : '验证'}
			</Button>
			<Button variant="ghost" class="mt-2 w-full" href="/login">取消</Button>
		</CardContent>
	</Card>
</div>
