export const config = { api: { bodyParser: false } };

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const BACKEND_URL = (process.env.BACKEND_URL || '').trim();
  if (!BACKEND_URL) return res.status(500).json({ error: 'Missing BACKEND_URL' });

  // CSRF protection
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origin = req.headers.origin || '';
  const allowedHosts = new Set(host ? [host] : []);
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach(h => {
      try { allowedHosts.add(new URL(h.trim().startsWith('http') ? h.trim() : 'https://' + h.trim()).host); } catch {}
    });
  }
  const hostOk = v => { if (!v) return false; try { return allowedHosts.has(new URL(v).host); } catch { return false; } };
  if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
    if (!hostOk(origin) && !hostOk(req.headers.referer)) return res.status(403).json({ error: 'CSRF' });
  }

  const targetPath = req.query.path;
  if (!targetPath || typeof targetPath !== 'string' || !targetPath.startsWith('/api/')) return res.status(400).json({ error: 'bad path' });

  const url = new URL(BACKEND_URL + targetPath);
  for (const [k, v] of Object.entries(req.query)) {
    if (k !== 'path') url.searchParams.set(k, Array.isArray(v) ? v[0] : v);
  }

  const reqCt = req.headers['content-type'] || '';
  const isMultipart = reqCt.toLowerCase().includes('multipart/form-data');
  const rawBody = await collectBody(req);

  // Forward Supabase Authorization header (or extract from cookie)
  const forwardHeaders = {};
  if (reqCt) forwardHeaders['Content-Type'] = reqCt;

  const extractToken = name => {
    for (const kv of (req.headers.cookie || '').split(';')) {
      const [k, v] = kv.trim().split('=');
      if (k === name) return decodeURIComponent(v);
    }
    return null;
  };

  // Priority: Authorization header > Supabase cookie > OAuth cookie
  const authHeader = (req.headers.authorization || '').replace('Bearer ', '');
  const cookieToken = extractToken('sb-access-token') || extractToken('supabase-auth-token') || extractToken('eac_oauth') || extractToken('eac_session');
  const token = authHeader || cookieToken;
  if (token) forwardHeaders['Authorization'] = 'Bearer ' + token;

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (isMultipart) body = rawBody;
    else if (rawBody.length > 0) body = rawBody.toString('utf8');
  }

  try {
    const fetchResp = await fetch(url.toString(), { method: req.method, headers: forwardHeaders, body });

    for (const [k, v] of fetchResp.headers) {
      if (!['content-encoding','transfer-encoding','connection'].includes(k.toLowerCase())) res.setHeader(k, v);
    }

    const ct = fetchResp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await fetchResp.json();
      return res.status(fetchResp.status).json(data);
    }
    const buffer = await fetchResp.arrayBuffer();
    return res.status(fetchResp.status).send(Buffer.from(buffer));
  } catch (e) {
    console.error('[proxy]', e);
    return res.status(502).json({ error: 'proxy error', message: e.message });
  }
}
