/**
 * Auth guard for protected pages.
 * Import and call `requireAuth()` in onMount of any page that needs login.
 *
 * Usage:
 *   import { requireAuth } from '$lib/auth-guard';
 *   onMount(() => { requireAuth(); });
 *
 * If not logged in, redirects to /login.
 * Returns true if authenticated, false if redirected.
 */
import { isLoggedIn, isReviewer, waitForAuth } from '$lib/stores/auth';
import { get } from 'svelte/store';
import { browser } from '$app/environment';

export async function requireAuth() {
  if (!browser) return false;
  // 等待 auth 初始化完成（最多 3 秒，避免卡死导致「无反应」）
  await waitForAuth();
  if (get(isLoggedIn) || get(isReviewer)) {
    console.log('[auth-guard] authenticated');
    return true;
  }
  console.log('[auth-guard] not authenticated, redirecting to login');
  // 未登录：跳登录页并带上 redirect，登录后回到当前页面
  const current = window.location.pathname + window.location.search;
  window.location.href = '/login?redirect=' + encodeURIComponent(current);
  return false;
}
