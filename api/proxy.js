export const config = { api: { bodyParser: false } };

import crypto from 'crypto';

function generateTOTP(secret, timestamp) {
	const ts = timestamp || Date.now();
	const step = Math.floor(ts / 1000 / 30);
	const hmac = crypto.createHmac('sha256', secret);
	const buf = Buffer.alloc(8);
	buf.writeUInt32BE(0, 0);
	buf.writeUInt32BE(step, 4);
	hmac.update(buf);
	const d = hmac.digest();
	const off = d[d.length - 1] & 0x0f;
	return (((d[off] & 0x7f) << 24) | ((d[off + 1] & 0xff) << 16) | ((d[off + 2] & 0xff) << 8) | (d[off + 3] & 0xff)) % 1000000;
}

function getAuthHeaders(secret) {
	const now = Date.now();
	return {
		'X-Auth-Codes': [generateTOTP(secret, now - 30000), generateTOTP(secret, now), generateTOTP(secret, now + 30000)].join(','),
		'X-Auth-Timestamp': String(now)
	};
}

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
	const AUTH_SECRET = (process.env.AUTH_SECRET || process.env.VITE_AUTH_SECRET || '').trim();
	if (!BACKEND_URL || !AUTH_SECRET) return res.status(500).json({ error: '缺少 BACKEND_URL 或 AUTH_SECRET' });

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

	const forwardHeaders = getAuthHeaders(AUTH_SECRET);
	if (reqCt) forwardHeaders['Content-Type'] = reqCt;

	const extractToken = name => {
		for (const kv of (req.headers.cookie || '').split(';')) {
			const [k, v] = kv.trim().split('=');
			if (k === name) return decodeURIComponent(v);
		}
		return null;
	};
	const sessionToken = extractToken('eac_session') || extractToken('eac_oauth') || (req.headers.authorization || '').replace('Bearer ', '');
	if (sessionToken) forwardHeaders['Authorization'] = 'Bearer ' + sessionToken;

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

		const COOKIE_OPTS = 'HttpOnly; Secure; SameSite=Lax; Path=/';
		const ct = fetchResp.headers.get('content-type') || '';
		if (ct.includes('application/json')) {
			const data = await fetchResp.json();
			if ((targetPath === '/api/auth/login' || targetPath === '/api/auth/register') && data.token)
				res.setHeader('Set-Cookie', 'eac_session=' + encodeURIComponent(data.token) + '; ' + COOKIE_OPTS + '; Max-Age=259200');
			if (targetPath === '/api/auth/logout')
				res.setHeader('Set-Cookie', 'eac_session=; ' + COOKIE_OPTS + '; Max-Age=0');
			return res.status(fetchResp.status).json(data);
		}
		return res.status(fetchResp.status).send(await fetchResp.text());
	} catch (e) {
		console.error('[proxy]', e);
		return res.status(502).json({ error: 'proxy error', message: e.message });
	}
}
