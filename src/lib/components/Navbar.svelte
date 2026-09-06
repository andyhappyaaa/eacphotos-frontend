<script>
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { isLoggedIn, currentUser, logout } from '$lib/stores/auth';
  import { lang, setLanguage } from '$lib/stores/i18n';
  import { theme, toggleTheme } from '$lib/stores/theme';
  import { Button } from '$lib/components/ui/button';
  import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
  import { Separator } from '$lib/components/ui/separator';
  import { Sun, Moon, Globe, Menu, X } from '@lucide/svelte';

  let { t } = $props();
  let mobileOpen = $state(false);
  let langOpen = $state(false);

  // Logo: read directly from DOM, no store wrestling
  let dark = $state(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  let logoSrc = $derived(dark ? 'https://r2.eacof.org/logo-dark.png' : 'https://r2.eacof.org/logo-light.png');

  onMount(() => {
    dark = document.documentElement.classList.contains('dark');
    const onTheme = () => { dark = document.documentElement.classList.contains('dark'); };
    window.addEventListener('themechange', onTheme);
    return () => window.removeEventListener('themechange', onTheme);
  });

  const navLinks = [
    { href: '/', key: 'nav.home' },
    { href: '/gallery', key: 'nav.gallery' },
    { href: '/dashboard', key: 'nav.dashboard' },
    { href: '/search', key: 'nav.search' },
    { href: '/news', key: 'nav.news' }
  ];

  function tVal(key) { return t ? t(key) : key; }
  function go(href) { mobileOpen = false; langOpen = false; window.location.href = href; }
  function toggleMobile() { mobileOpen = !mobileOpen; if (mobileOpen) langOpen = false; }
  function toggleLanguage() { langOpen = !langOpen; if (langOpen) mobileOpen = false; }
</script>

<nav class="sticky top-0 z-50 w-full border-b bg-background/75 backdrop-blur-xl">
  <div class="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4">
    <!-- Hamburger (mobile) -->
    <button class="rounded-lg p-1.5 hover:bg-secondary md:hidden" onclick={toggleMobile} aria-label="Menu">
      {#if mobileOpen}<X class="h-5 w-5" />{:else}<Menu class="h-5 w-5" />{/if}
    </button>

    <!-- Logo -->
    <a href="/" class="flex shrink-0 items-center gap-2">
      <img src={logoSrc} alt="" class="h-8 w-auto" />
    </a>

    <!-- Desktop links -->
    <div class="hidden items-center gap-0.5 md:flex">
      {#each navLinks as link}
        {@const isActive = page.url.pathname === link.href || (link.href !== '/' && page.url.pathname.startsWith(link.href))}
        <a href={link.href} class="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground {isActive ? 'bg-primary/10 text-primary' : ''}">{tVal(link.key)}</a>
      {/each}
    </div>

    <div class="flex-1"></div>

    <!-- Theme + Lang -->
    <button class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" onclick={toggleTheme} aria-label="Theme">
      {#if $theme === 'dark'}<Sun class="h-[18px] w-[18px]" />{:else}<Moon class="h-[18px] w-[18px]" />{/if}
    </button>

    <div class="relative">
      <button class="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary" onclick={toggleLanguage} aria-label="Language" aria-expanded={langOpen}>
        <Globe class="h-[18px] w-[18px]" />
      </button>
      {#if langOpen}
        <div class="absolute right-0 top-full z-50 mt-1 w-[min(10rem,calc(100vw-2rem))] rounded-lg border bg-popover p-1.5 shadow-md" onclick={(e) => e.stopPropagation()}>
          <button class="w-full rounded px-3 py-2 text-left text-sm {$lang==='zh'?'bg-secondary':''} hover:bg-secondary" onclick={()=>{setLanguage('zh');langOpen=false}}>简体中文</button>
          <button class="w-full rounded px-3 py-2 text-left text-sm {$lang==='zh-TW'?'bg-secondary':''} hover:bg-secondary" onclick={()=>{setLanguage('zh-TW');langOpen=false}}>繁體中文</button>
          <button class="w-full rounded px-3 py-2 text-left text-sm {$lang==='en'?'bg-secondary':''} hover:bg-secondary" onclick={()=>{setLanguage('en');langOpen=false}}>English</button>
        </div>
      {/if}
    </div>

    <!-- Auth -->
    <div class="hidden md:flex md:items-center md:gap-1.5">
      {#if $isLoggedIn && $currentUser}
        <Button variant="ghost" class="h-8 gap-2 rounded-full px-2 text-sm">
          <Avatar class="h-7 w-7"><AvatarImage src={$currentUser.avatar} alt="" /><AvatarFallback class="text-xs">{$currentUser.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
          <span>{$currentUser.username}</span>
        </Button>
        <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-destructive" onclick={logout} title="退出">⏻</Button>
      {:else}
        <Button variant="outline" size="sm" href="/login">{tVal('nav.login')}</Button>
        <Button size="sm" href="/register">{tVal('nav.register')}</Button>
      {/if}
    </div>
  </div>

  <!-- Mobile menu -->
  {#if mobileOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div transition:fade={{ duration: 180 }} class="fixed inset-x-0 bottom-0 top-14 z-40 bg-black/30 md:hidden" onclick={() => (mobileOpen = false)}></div>
    <div transition:fly={{ x: -280, duration: 280 }} class="fixed bottom-0 left-0 top-14 z-50 flex max-h-[calc(100dvh-3.5rem)] w-[clamp(240px,72vw,300px)] max-w-[85vw] flex-col overflow-y-auto overscroll-contain border-r bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl md:hidden">
      {#each navLinks as link}
        {@const isActive = page.url.pathname === link.href || (link.href !== '/' && page.url.pathname.startsWith(link.href))}
        <button class="mb-1 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium {isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}" onclick={() => go(link.href)}>{tVal(link.key)}</button>
      {/each}
      <Separator class="my-3" />
      {#if $isLoggedIn && $currentUser}
        <div class="mb-3 flex items-center gap-3 rounded-lg bg-secondary p-3">
          <Avatar class="h-10 w-10"><AvatarImage src={$currentUser.avatar} alt="" /><AvatarFallback>{$currentUser.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
          <div><p class="text-sm font-medium">{$currentUser.username}</p><p class="text-xs text-muted-foreground">{$currentUser.email}</p></div>
        </div>
        <button class="mb-1 w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary" onclick={() => go('/profile')}>个人主页</button>
        <button class="w-full rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-secondary" onclick={logout}>退出登录</button>
      {:else}
        <Button class="mb-2 w-full" onclick={() => go('/login')}>{tVal('nav.login')}</Button>
        <Button variant="outline" class="w-full" onclick={() => go('/register')}>{tVal('nav.register')}</Button>
      {/if}
    </div>
  {/if}
</nav>
