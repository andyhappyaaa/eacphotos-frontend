<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { updatePassword } from '$lib/stores/auth';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { showToast } from '$lib/stores/toast';
  import { Loader2, CheckCircle, XCircle, Lock, Shield } from '@lucide/svelte';

  let phase = $state('loading');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let submitting = $state(false);
  let error = $state('');

  onMount(async () => {
    // Supabase puts the recovery token in the URL hash: #access_token=xxx&type=recovery
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const type = params.get('type');
    const accessToken = params.get('access_token');

    if (type === 'recovery' && accessToken) {
      // Supabase recovery - set the session from the hash
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const url = window.APP_CONFIG?.SUPABASE_URL || '';
        const key = window.APP_CONFIG?.SUPABASE_PUBLISHABLE_KEY || '';
        if (url && key) {
          const sb = createClient(url, key);
          const { error: setErr } = await sb.auth.setSession({ access_token: accessToken, refresh_token: params.get('refresh_token') || '' });
          if (setErr) throw new Error(setErr.message);
        }
      } catch (e) { console.warn('Failed to set Supabase recovery session:', e); }
      phase = 'form';
    } else {
      // Show form directly - user already has session via Supabase cookie
      phase = 'form';
    }
  });

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    if (newPassword.length < 8) { error = '新密码至少 8 位'; return; }
    if (newPassword !== confirmPassword) { error = '两次密码不一致'; return; }
    submitting = true;
    try {
      await updatePassword(newPassword);
      phase = 'success';
      showToast('密码已修改，请重新登录', 'success');
      setTimeout(() => { goto('/login'); }, 2000);
    } catch (err) { error = err.message || '修改失败'; }
    finally { submitting = false; }
  }
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
  <Card class="w-full max-w-[440px] shadow-lg">
    <CardContent class="space-y-4 p-8 text-center">
      {#if phase === 'loading'}
        <Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
        <h2 class="text-xl font-bold">正在准备...</h2>

      {:else if phase === 'success'}
        <CheckCircle class="mx-auto h-14 w-14 text-emerald-500" />
        <h2 class="text-xl font-bold text-emerald-600">密码修改成功</h2>
        <p class="text-sm text-muted-foreground">正在跳转到登录页面...</p>

      {:else}
        <CardHeader class="space-y-1 p-0 pb-4">
          <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Shield class="h-6 w-6 text-primary" /></div>
          <CardTitle class="text-2xl">修改密码</CardTitle>
          <CardDescription>请设置新的登录密码</CardDescription>
        </CardHeader>

        <form onsubmit={handleSubmit} class="space-y-4 text-left">
          <div class="space-y-1.5">
            <Label for="new-pwd" class="text-sm">新密码</Label>
            <div class="relative"><Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="new-pwd" type="password" bind:value={newPassword} required placeholder="至少 8 位" minlength="8" class="pl-10" /></div>
          </div>
          <div class="space-y-1.5">
            <Label for="confirm-pwd" class="text-sm">确认新密码</Label>
            <Input id="confirm-pwd" type="password" bind:value={confirmPassword} required placeholder="再次输入" />
          </div>
          {#if error}<div class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>{/if}
          <Button type="submit" class="w-full" disabled={submitting}>{#if submitting}<Loader2 class="mr-2 h-4 w-4 animate-spin"/>{/if}{submitting?'提交中...':'修改密码'}</Button>
        </form>
      {/if}
    </CardContent>
  </Card>
</div>
