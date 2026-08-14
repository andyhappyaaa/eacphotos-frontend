<script>
  import { onMount } from 'svelte';

  onMount(() => {
    window.location.replace('https://auth.eacof.org/register');
  });
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center">
  <p class="text-muted-foreground">正在跳转到注册页面...</p>
</div>
