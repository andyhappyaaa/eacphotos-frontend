<script>
  import { sendPasswordReset } from '$lib/stores/auth';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Mail, Loader2, CheckCircle2 } from '@lucide/svelte';

  let email = $state('');
  let sent = $state(false);
  let error = $state('');
  let loading = $state(false);

  async function handleSend(e) {
    e.preventDefault();
    error = ''; loading = true;
    try { await sendPasswordReset(email); sent = true; }
    catch (err) { error = err.message || '发送失败'; }
    finally { loading = false; }
  }
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
  <Card class="w-full max-w-[400px] shadow-lg">
    <CardHeader class="text-center pb-2">
      {#if sent}
        <CheckCircle2 class="mx-auto mb-2 h-10 w-10 text-emerald-500" />
        <CardTitle>邮件已发送</CardTitle>
        <CardDescription>请检查 {email} 的收件箱，点击邮件中的链接重置密码。</CardDescription>
      {:else}
        <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Mail class="h-6 w-6 text-primary" /></div>
        <CardTitle class="text-2xl">忘记密码</CardTitle>
        <CardDescription>输入邮箱，我们将发送密码重置链接</CardDescription>
      {/if}
    </CardHeader>
    {#if !sent}
      <CardContent>
        <form onsubmit={handleSend} class="space-y-4">
          <div class="space-y-1.5">
            <Label for="email" class="text-sm">邮箱</Label>
            <Input id="email" type="email" bind:value={email} required placeholder="your@email.com" />
          </div>
          {#if error}<p class="text-sm text-destructive">{error}</p>{/if}
          <Button type="submit" class="w-full" disabled={loading}>{#if loading}<Loader2 class="mr-2 h-4 w-4 animate-spin"/>{/if}{loading?'发送中...':'发送重置链接'}</Button>
        </form>
        <p class="mt-4 text-center text-sm text-muted-foreground"><a href="/login" class="font-medium text-primary hover:underline">返回登录</a></p>
      </CardContent>
    {/if}
  </Card>
</div>
