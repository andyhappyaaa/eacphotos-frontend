<script>
  import { onMount } from 'svelte';
  import { isLoggedIn, authLoading } from '$lib/stores/auth';

  onMount(async () => {
    await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
    if ($isLoggedIn) { window.location.href = '/dashboard'; return; }
    window.location.replace('https://auth.eacof.org/register');
  });
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center">
  <p class="text-muted-foreground">正在跳转到注册页面...</p>
</div>
