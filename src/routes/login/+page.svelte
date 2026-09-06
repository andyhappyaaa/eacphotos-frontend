<script>
  import { onMount } from 'svelte';
  import { isLoggedIn, authLoading, login, oauthLogin } from '$lib/stores/auth';
  import { showToast } from '$lib/stores/toast';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';
  import { LogIn } from '@lucide/svelte';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);

  onMount(async () => {
    await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
    if ($isLoggedIn) window.location.href = '/dashboard';
  });

  async function submitLogin(e) {
    e.preventDefault();
    if (loading) return;
    loading = true;
    try {
      await login(email.trim(), password);
      showToast('登录成功', 'success');
      window.location.href = '/dashboard';
    } catch (err) {
      showToast(err?.message || '登录失败，请检查邮箱和密码', 'error');
    } finally {
      loading = false;
    }
  }

  async function socialLogin(provider) {
    try { await oauthLogin(provider); }
    catch (err) { showToast(err?.message || '登录失败', 'error'); }
  }
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
  <Card class="w-full max-w-[400px] shadow-lg text-center">
    <CardHeader class="space-y-1 pb-4">
      <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><LogIn class="h-6 w-6 text-primary" /></div>
      <CardTitle class="text-2xl">登录</CardTitle>
      <CardDescription>使用 eac photos 账号登录</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <form class="space-y-3 text-left" onsubmit={submitLogin}>
        <input bind:value={email} type="email" autocomplete="email" placeholder="邮箱" required class="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <input bind:value={password} type="password" autocomplete="current-password" placeholder="密码" required class="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <Button type="submit" class="w-full" disabled={loading}>{loading ? '登录中...' : '登录'}</Button>
      </form>
      <div class="flex justify-between text-xs text-muted-foreground">
        <a href="https://auth.eacof.org/register" class="hover:text-foreground">创建新账号</a>
        <a href="https://auth.eacof.org/forgot-password?site=main" class="hover:text-foreground">忘记密码？</a>
      </div>
      <Separator class="my-3">或</Separator>
      <Button variant="outline" class="w-full" onclick={() => socialLogin('github')}>GitHub 登录</Button>
      <a href="https://auth.eacof.org/login?site=review" class="block no-underline"><Button variant="ghost" class="w-full text-sm">🛡️ 审核员登录</Button></a>
    </CardContent>
  </Card>
</div>
