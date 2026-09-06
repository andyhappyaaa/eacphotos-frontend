<script>
  import { onMount, onDestroy } from 'svelte';

  let { containerId = 'turnstile-container', onSuccess = () => {}, onExpired = () => {}, onError = () => {}, onReady } = $props();

  let containerEl = $state(null);
  let rendered = $state(false);
  let siteKey = $state('');
  let widgetId = null;

  function getSiteKey() { return String((window.APP_CONFIG?.TURNSTILE_SITE_KEY) || '').trim(); }

  function doRender() {
    if (!containerEl || typeof window.turnstile === 'undefined') return;
    const key = getSiteKey(); siteKey = key;
    if (!key) { setTimeout(doRender, 1500); return; }
    try {
      if (widgetId !== null) { try { window.turnstile.remove(widgetId); } catch(e){} }
      widgetId = window.turnstile.render(containerEl, {
        sitekey: key,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        callback: (tk) => { onSuccess(tk); },
        'expired-callback': () => { onExpired(); },
        'error-callback': (err) => { onError?.(String(err)); }
      });
      rendered = true;
    } catch(e) { console.error('[Turnstile] render:', e); }
  }

  function load() {
    if (typeof window.turnstile !== 'undefined') { doRender(); return; }
    const ex = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/"]');
    if (ex) { ex.addEventListener('load', doRender); return; }
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true;
    s.onload = doRender; s.onerror = () => console.error('[Turnstile] load failed');
    document.head.appendChild(s);
  }

  function onTheme(event) {
    // Turnstile's theme is fixed when the widget is rendered. Recreate it so it
    // follows the site's current light/dark theme. Also invalidate the old
    // token because it belongs to the widget instance that was removed.
    if (widgetId !== null) {
      try { window.turnstile.remove(widgetId); } catch(e) {}
      widgetId = null;
      rendered = false;
      onExpired();
    }
    // Let the DOM finish the theme update before creating the new iframe.
    requestAnimationFrame(() => doRender());
  }

  onMount(() => { load(); window.addEventListener('themechange', onTheme); });
  onDestroy(() => { window.removeEventListener('themechange', onTheme); if (widgetId !== null && window.turnstile) try { window.turnstile.remove(widgetId); } catch(e){} });

  if (onReady) onReady({ reset: () => { if (widgetId !== null && window.turnstile) try { window.turnstile.reset(widgetId); } catch(e){} } });
</script>

<div id={containerId} bind:this={containerEl} class="min-h-[65px]">
  {#if siteKey && !rendered}
    <div class="flex justify-center py-4"><div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>
  {/if}
</div>
