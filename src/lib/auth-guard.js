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
import { isLoggedIn, isReviewer, authLoading } from '$lib/stores/auth';
import { get } from 'svelte/store';
import { browser } from '$app/environment';

export async function requireAuth(): Promise<boolean> {
  if (!browser) return false;
  // Wait for auth init
  await new Promise<void>(resolve => {
    const unsub = authLoading.subscribe(loading => {
      if (!loading) { unsub(); resolve(); }
    });
  });
  if (get(isLoggedIn) || get(isReviewer)) return true;
  window.location.href = '/login';
  return false;
}
