<script>
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Loader2, CheckCircle, XCircle } from '@lucide/svelte';
  import { buildUrl, useProxy } from '$lib/api';

  let status = $state('loading');
  let message = $state('正在验证授权...');

  onMount(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const oauthError = params.get('error');

      if (oauthError) { status = 'error'; message = '授权被拒绝：' + (params.get('error_description') || oauthError); return; }
      if (!code) { status = 'error'; message = '回调缺少 code 参数'; return; }

      // Verify state (CSRF)
      const savedState = sessionStorage.getItem('oauth_state');
      sessionStorage.removeItem('oauth_state');
      if (!savedState || savedState !== state) { status = 'error'; message = 'state 验证失败，可能是 CSRF 攻击'; return; }

      const verifier = sessionStorage.getItem('pkce_verifier');
      sessionStorage.removeItem('pkce_verifier');
      if (!verifier) { status = 'error'; message = '缺少 PKCE verifier'; return; }

      // Exchange code for tokens（Public 客户端：只传 client_id + code_verifier，无 secret）
      const supabaseUrl = (window.APP_CONFIG?.SUPABASE_URL || '').replace(/\/$/, '');
      const clientId = window.APP_CONFIG?.OAUTH_CLIENT_ID || '';
      const redirectUri = window.location.origin + '/oauth/callback';

      const resp = await fetch(supabaseUrl + '/auth/v1/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: verifier,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        status = 'error';
        message = errData.error_description || errData.error || '换取 token 失败';
        return;
      }

      const tokens = await resp.json();

      // 存 access_token（后端 API 用它验签）
      localStorage.setItem('eac_oauth_access_token', tokens.access_token);
      if (tokens.refresh_token) localStorage.setItem('eac_oauth_refresh_token', tokens.refresh_token);

      // 通知后端记录本次登录时间（会话有效期判断）
      try {
        await fetch(buildUrl('/api/auth/session-touch'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + tokens.access_token,
          },
          credentials: useProxy() ? 'include' : 'omit',
        });
      } catch (e) { /* 忽略会话记录失败 */ }

      status = 'success';
      message = '登录成功！正在跳转...';
      setTimeout(() => { window.location.href = '/dashboard'; }, 800);
    } catch (e) {
      status = 'error';
      message = '网络错误：' + (e.message || e);
    }
  });
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-5">
  <Card class="w-full max-w-[440px] text-center shadow-lg">
    <CardContent class="space-y-4 p-8">
      {#if status === 'loading'}
        <Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
        <h2 class="text-xl font-bold">正在验证授权...</h2>
        <p class="text-sm text-muted-foreground">{message}</p>
      {:else if status === 'success'}
        <CheckCircle class="mx-auto h-14 w-14 text-emerald-500" />
        <h2 class="text-xl font-bold text-emerald-600">登录成功</h2>
        <p class="text-sm text-muted-foreground">{message}</p>
      {:else}
        <XCircle class="mx-auto h-14 w-14 text-destructive" />
        <h2 class="text-xl font-bold text-destructive">登录失败</h2>
        <p class="text-sm text-muted-foreground">{message}</p>
        <div class="flex justify-center gap-3 pt-2">
          <Button href="/">返回首页</Button>
          <Button variant="outline" href="/login">重新登录</Button>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
