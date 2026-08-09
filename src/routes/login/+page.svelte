<script>
  import { onMount } from 'svelte';
  import { isLoggedIn, authLoading, login } from '$lib/stores/auth';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';
  import { LogIn } from '@lucide/svelte';

  let isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.');

  onMount(async () => {
    await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
    if ($isLoggedIn) { window.location.href = '/dashboard'; }
  });
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
  <Card class="w-full max-w-[400px] shadow-lg text-center">
    <CardHeader class="space-y-1 pb-4">
      <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><LogIn class="h-6 w-6 text-primary" /></div>
      <CardTitle class="text-2xl">登录</CardTitle>
      <CardDescription>选择登录方式</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <a href="https://auth.eacof.org/login" class="w-full no-underline">
        <Button class="w-full">✈️ 主站用户登录</Button>
      </a>
      <a href="https://auth.eacof.org/login?site=review" class="w-full no-underline">
        <Button variant="outline" class="w-full">🛡️ 审核员登录</Button>
      </a>
      <Separator class="my-3">或</Separator>
      <div class="space-y-2">
        <a href="https://auth.eacof.org/register" class="w-full no-underline">
          <Button variant="ghost" class="w-full text-sm">创建新账号</Button>
        </a>
      </div>

      {#if !isProd}
        <Separator class="my-3">本地开发</Separator>
        <p class="text-xs text-muted-foreground">本地开发环境使用 Supabase 直连（非 auth worker）</p>
        <DevLogin />
      {/if}
    </CardContent>
  </Card>
</div>

{#snippet DevLogin()}
  <script>
    let email = $state(''); let password = $state('');
    let error = $state(''); let loading = $state(false);

    async function doLogin(e) {
      e.preventDefault(); error = ''; loading = true;
      try { await login(email, password); window.location.href = '/dashboard'; }
      catch (err) { error = err.message || '登录失败'; } finally { loading = false; }
    }
  </script>
  <form onsubmit={doLogin} class="space-y-2 text-left">
    <Label for="dev-email" class="text-xs">邮箱</Label>
    <Input id="dev-email" type="email" bind:value={email} required placeholder="dev@localhost" class="h-8 text-sm" />
    <Label for="dev-pwd" class="text-xs">密码</Label>
    <Input id="dev-pwd" type="password" bind:value={password} required placeholder="••••••" class="h-8 text-sm" />
    {#if error}<p class="text-xs text-destructive">{error}</p>{/if}
    <Button type="submit" size="sm" class="w-full" disabled={loading}>{loading?'登录中...':'登录'}</Button>
  </form>
{/snippet}
