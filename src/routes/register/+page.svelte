<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isLoggedIn, authLoading, register, verifyTurnstile } from '$lib/stores/auth';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import Turnstile from '$lib/components/Turnstile.svelte';
  import { showToast } from '$lib/stores/toast';
  import { UserPlus, Mail, Lock, Loader2 } from '@lucide/svelte';

  onMount(async () => {
    await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
    if ($isLoggedIn) { window.location.href = '/dashboard'; }
  });

  let username = $state(''); let email = $state(''); let password = $state('');
  let confirmPassword = $state(''); let agreeTerms = $state(false);
  let error = $state(''); let loading = $state(false);
  let tsToken = $state(null); let turnstileVerified = $state(false); let turnstileVerifying = $state(false);

  async function verifyTsToken(tk) {
    tsToken = tk; turnstileVerifying = true;
    try { await verifyTurnstile(tk); turnstileVerified = true; }
    catch (e) { error = '人机验证失败'; turnstileVerified = false; }
    finally { turnstileVerifying = false; }
  }

  async function handleSubmit(e) {
    e.preventDefault(); error = '';
    if (password !== confirmPassword) { error = '两次密码不一致'; return; }
    if (!agreeTerms) { error = '请同意服务条款和隐私政策'; return; }
    loading = true;
    try {
      const result = await register(email, password, username);
      if (result.user && !result.session) {
        showToast('注册成功！请检查邮箱验证邮件。', 'success');
        goto('/login');
      } else {
        showToast('注册成功！', 'success');
        goto('/dashboard');
      }
    } catch (err) { error = err.message || '注册失败'; }
    finally { loading = false; }
  }
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
  <Card class="w-full max-w-[420px] shadow-lg">
    <CardHeader class="space-y-1 text-center pb-4">
      <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><UserPlus class="h-6 w-6 text-primary" /></div>
      <CardTitle class="text-2xl">注册</CardTitle>
      <CardDescription>创建你的 eac photos 账号</CardDescription>
    </CardHeader>
    <CardContent>
      <form onsubmit={handleSubmit} class="space-y-4">
        <div class="space-y-1.5">
          <Label for="username" class="text-sm">用户名</Label>
          <Input id="username" bind:value={username} required placeholder="你的昵称" />
        </div>
        <div class="space-y-1.5">
          <Label for="email" class="text-sm"><Mail class="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />邮箱</Label>
          <Input id="email" type="email" bind:value={email} required placeholder="your@email.com" />
        </div>
        <div class="space-y-1.5">
          <Label for="password" class="text-sm"><Lock class="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />密码</Label>
          <Input id="password" type="password" bind:value={password} required placeholder="至少 8 位" minlength="8" />
        </div>
        <div class="space-y-1.5">
          <Label for="confirm" class="text-sm">确认密码</Label>
          <Input id="confirm" type="password" bind:value={confirmPassword} required placeholder="再次输入密码" />
        </div>
        <div class="flex items-center gap-2">
          <Checkbox id="terms" bind:checked={agreeTerms} />
          <Label for="terms" class="text-xs">我同意 <a href="/terms" class="underline" target="_blank">服务条款</a> 和 <a href="/privacy" class="underline" target="_blank">隐私政策</a></Label>
        </div>
        <Turnstile containerId="reg-ts" onSuccess={verifyTsToken} onExpired={()=>{tsToken=null;turnstileVerified=false;}} />
        {#if error}<p class="text-sm text-destructive">{error}</p>{/if}
        <Button type="submit" class="w-full" disabled={loading||!turnstileVerified}>{#if loading||turnstileVerifying}<Loader2 class="mr-2 h-4 w-4 animate-spin"/>{/if}{loading?'注册中...':'注册'}</Button>
      </form>
      <p class="mt-4 text-center text-sm text-muted-foreground">已有账号？<a href="/login" class="font-medium text-primary hover:underline">立即登录</a></p>
    </CardContent>
  </Card>
</div>
