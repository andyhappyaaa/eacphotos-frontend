<script>
  import { onMount } from 'svelte';

  let error = $state('');

  function b64url(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function genVerifier() {
    const b = new Uint8Array(32);
    crypto.getRandomValues(b);
    return b64url(b);
  }
  async function genChallenge(verifier) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return b64url(hash);
  }

  onMount(async () => {
    try {
      const supabaseUrl = (window.APP_CONFIG?.SUPABASE_URL || '').replace(/\/$/, '');
      if (!supabaseUrl) { error = '系统未配置 Supabase'; return; }

      // 1. 生成 PKCE
      const verifier = genVerifier();
      const challenge = await genChallenge(verifier);
      const state = genVerifier();

      // 2. 存 verifier 和 state（callback 时用）
      sessionStorage.setItem('pkce_verifier', verifier);
      sessionStorage.setItem('oauth_state', state);

      // 3. 跳转 Supabase 授权端点
      const redirectUri = window.location.origin + '/oauth/callback';
      const url = new URL(supabaseUrl + '/auth/v1/oauth/authorize');
      url.searchParams.set('client_id', 'mainsite');
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
      url.searchParams.set('state', state);
      url.searchParams.set('scope', 'openid email profile');

      window.location.replace(url.toString());
    } catch (e) {
      error = '跳转失败: ' + (e.message || e);
    }
  });
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center">
  {#if error}
    <p class="text-destructive">{error}</p>
  {:else}
    <p class="text-muted-foreground">正在跳转到登录页面...</p>
  {/if}
</div>
