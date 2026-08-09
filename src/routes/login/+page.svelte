<script>
  import { onMount } from 'svelte';
  import { isLoggedIn, authLoading } from '$lib/stores/auth';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
  import { Separator } from '$lib/components/ui/separator';
  import { LogIn } from '@lucide/svelte';

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
      <a href="https://auth.eacof.org/login" class="no-underline"><Button class="w-full">✈️ 主站用户登录</Button></a>
      <a href="https://auth.eacof.org/login?site=review" class="no-underline"><Button variant="outline" class="w-full">🛡️ 审核员登录</Button></a>
      <Separator class="my-3">或</Separator>
      <a href="https://auth.eacof.org/register" class="no-underline"><Button variant="ghost" class="w-full text-sm">创建新账号</Button></a>
    </CardContent>
  </Card>
</div>
