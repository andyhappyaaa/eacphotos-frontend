/**
 * Supabase client singleton.
 * Reads SUPABASE_URL / SUPABASE_ANON_KEY from window.APP_CONFIG (injected by /api/env).
 */

let _client = null;

export function getSupabase() {
  if (_client) return _client;
  if (typeof window === 'undefined') return null;

  const url = window.APP_CONFIG?.SUPABASE_URL || '';
  const key = window.APP_CONFIG?.SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    console.warn('[supabase] SUPABASE_URL or SUPABASE_ANON_KEY not configured');
    return null;
  }

  // Dynamic import to avoid bundling on server
  import('@supabase/supabase-js').then(m => {
    _client = m.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  });
  return _client;
}

// Lazy init — call once on app start
export async function initSupabase() {
  if (typeof window === 'undefined') return null;
  const url = window.APP_CONFIG?.SUPABASE_URL || '';
  const key = window.APP_CONFIG?.SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    _client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return _client;
  } catch (e) { console.error('[supabase] init error:', e); return null; }
}
