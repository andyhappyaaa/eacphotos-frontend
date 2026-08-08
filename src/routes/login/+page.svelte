<script>
  import { onMount } from 'svelte';
  import { isLoggedIn, authLoading, login, verifyTurnstile } from '$lib/stores/auth';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';
  import Turnstile from '$lib/components/Turnstile.svelte';
  import { LogIn, Lock, Mail, Eye, EyeOff, Loader2 } from '@lucide/svelte';

  let email = $state(''); let password = $state(''); let showPassword = $state(false);
  let error = $state(''); let loading = $state(false);
  let tsToken = $state(null); let turnstileVerified = $state(false); let turnstileVerifying = $state(false);

  onMount(async () => {
    await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
    if ($isLoggedIn) { window.location.href = '/dashboard'; }
  });

  async function verifyTsToken(tk) {
    tsToken = tk; turnstileVerifying = true;
    try { await verifyTurnstile(tk); turnstileVerified = true; }
    catch (e) { error = '人机验证失败'; turnstileVerified = false; }
    finally { turnstileVerifying = false; }
  }

  async function doLogin(e) {
    e.preventDefault(); error = ''; loading = true;
    try { await login(email, password); window.location.href = '/dashboard'; }
    catch (err) { error = err.message || '登录失败'; } finally { loading = false; }
  }
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
  <Card class="w-full max-w-[420px] shadow-lg">
    <CardHeader class="space-y-1 text-center pb-4">
      <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><LogIn class="h-6 w-6 text-primary" /></div>
      <CardTitle class="text-2xl">登录</CardTitle>
      <CardDescription>使用邮箱和密码登录 eac photos</CardDescription>
    </CardHeader>
    <CardContent>
      <form onsubmit={doLogin} class="space-y-4">
        <div class="space-y-1.5">
          <Label for="email" class="text-sm">邮箱</Label>
          <div class="relative"><Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" bind:value={email} required placeholder="your@email.com" class="pl-10" /></div>
        </div>
        <div class="space-y-1.5">
          <div class="flex justify-between"><Label for="pwd" class="text-sm">密码</Label><a href="/forgot-password" class="text-xs text-muted-foreground hover:text-primary">忘记密码？</a></div>
          <div class="relative"><Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="pwd" type={showPassword?'text':'password'} bind:value={password} required placeholder="••••••••" class="pl-10 pr-10" /><button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onclick={()=>(showPassword=!showPassword)}>{#if showPassword}<EyeOff class="h-4 w-4"/>{:else}<Eye class="h-4 w-4"/>{/if}</button></div>
        </div>
        <Turnstile containerId="login-ts" onSuccess={verifyTsToken} onExpired={()=>{tsToken=null;turnstileVerified=false;}}/>
        {#if error}<p class="text-sm text-destructive">{error}</p>{/if}
        <Button type="submit" class="w-full" disabled={loading||!turnstileVerified}>{#if loading||turnstileVerifying}<Loader2 class="mr-2 h-4 w-4 animate-spin"/>{/if}{loading?'登录中...':'登录'}</Button>
      </form>
    </CardContent>
    <div class="px-8 pb-6 text-center">
      <Separator class="my-5">或</Separator>
      <Button variant="outline" class="w-full" onclick={()=>{window.location.href='/oauth-start'}}>审核员登录</Button>
      <p class="mt-4 text-sm text-muted-foreground">还没有账号？<a href="/register" class="font-medium text-primary hover:underline">立即注册</a></p>
    </div>
  </Card>
</div>
