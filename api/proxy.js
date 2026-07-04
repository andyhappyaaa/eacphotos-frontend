// 必须放在所有 import 之前，Vercel 才能识别
export const config = { api: { bodyParser: false } };

import crypto from 'crypto';

function generateTOTP(secret, timestamp) {
	const timeStep = Math.floor((timestamp || Date.now()) / 1000 / 30);
	const hmac = crypto.createHmac('sha256', secret);
	const timeBuffer = Buffer.alloc(8);
	timeBuffer.writeUInt32BE(0, 0);
	timeBuffer.writeUInt32BE(timeStep, 4);
	hmac.update(timeBuffer);
	const digest = hmac.digest();
	const off = digest[digest.length - 1] & 0x0F;
	return (((digest[off] & 0x7F) << 24) | ((digest[off + 1] & 0xFF) << 16) | ((digest[off + 2] & 0xFF) << 8) | (digest[off + 3] & 0xFF)) % 1000000;
}

function getAuthHeaders(secret) {
	const now = Date.now();
	return {
		'X-Auth-Codes': [generateTOTP(secret, now - 30000), generateTOTP(secret, now), generateTOTP(secret, now + 30000)].join(','),
		'X-Auth-Timestamp': String(now)
	};
}

export default async function handler(req, res) {
	const BACKEND_URL = process.env.BACKEND_URL || process.env.VITE_API_URL || '';
	const AUTH_SECRET = process.env.AUTH_SECRET || process.env.VITE_AUTH_SECRET || '';
	if (!BACKEND_URL || !AUTH_SECRET) {
		return res.status(500).json({ error: '缺少 BACKEND_URL 或 AUTH_SECRET' });
	}

	// — CSRF —
	const host = req.headers['x-forwarded-host'] || req.headers.host || '';
	const origin = req.headers.origin || '';
	const referer = req.headers.referer || '';
	const allowedHosts = new Set(host ? [host] : []);
	if (process.env.ALLOWED_ORIGINS) {
		process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean).forEach(h => {
			try { allowedHosts.add(new URL(h.startsWith('http') ? h : 'https://' + h).host); } catch {}
		});
	}
	const hostOk = (v) => { if (!v) return false; try { return allowedHosts.has(new URL(v).host); } catch { return false; } };
	if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
		if (!hostOk(origin) && !hostOk(referer)) return res.status(403).json({ error: 'CSRF' });
	}

	// — Path —
	const targetPath = req.query.path;
	if (!targetPath || typeof targetPath !== 'string' || !targetPath.startsWith('/api/')) return res.status(400).json({ error: 'bad path' });
	if (decodeURIComponent(targetPath).includes('..')) return res.status(400).json({ error: 'bad path' });

	const url = new URL(BACKEND_URL + targetPath);
	for (const [k, v] of Object.entries(req.query)) {
		if (k !== 'path') url.searchParams.set(k, Array.isArray(v) ? v[0] : v);
	}

	// — Headers —
	const authHeaders = getAuthHeaders(AUTH_SECRET);
	const reqCt = req.headers['content-type'] || '';
	const isMultipart = reqCt.toLowerCase().includes('multipart/form-data');
	const forwardHeaders = { ...authHeaders };
	// multipart: 必须透传原始 Content-Type（含 boundary=...），否则 Worker 无法解析 FormData
	if (reqCt) forwardHeaders['Content-Type'] = reqCt;

	// — Tokens —
	const extractToken = (name) => {
		const c = (req.headers.cookie || '').split(';').map(s => s.trim());
		for (const kv of c) if (kv.startsWith(name + '=')) return decodeURIComponent(kv.slice(name.length + 1));
		return null;
	};
	const sessionToken = extractToken('eac_session') || extractToken('eac_oauth') || (req.headers.authorization || '').replace('Bearer ', '');
	if (sessionToken) forwardHeaders['Authorization'] = 'Bearer ' + sessionToken;

	// — Body: bodyParser=false 时 req.body 已是原始 Buffer，直接透传 —
	let body;
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		if (req.body && Buffer.isBuffer(req.body)) {
			body = req.body;
		} else if (req.body && typeof req.body === 'string') {
			body = req.body;
		} else if (req.body && typeof req.body === 'object') {
			// Vercel 偶尔会用 querystring 预解析 multipart（罕见），回退 JSON
			body = JSON.stringify(req.body);
		}
	}

	try {
		const fetchResp = await fetch(url.toString(), { method: req.method, headers: forwardHeaders, body });

		for (const [k, v] of fetchResp.headers) {
			if (!['content-encoding','transfer-encoding','connection'].includes(k.toLowerCase())) res.setHeader(k, v);
		}

		const COOKIE_OPTS = 'HttpOnly; Secure; SameSite=Lax; Path=/';
		if (fetchResp.headers.get('content-type')?.includes('application/json')) {
			const data = await fetchResp.json();
			if ((targetPath === '/api/auth/login' || targetPath === '/api/auth/register') && data.token) {
				res.setHeader('Set-Cookie', `eac_session=${encodeURIComponent(data.token)}; ${COOKIE_OPTS}; Max-Age=259200`);
			}
			if (targetPath === '/api/auth/logout') {
				res.setHeader('Set-Cookie', `eac_session=; ${COOKIE_OPTS}; Max-Age=0`);
			}
			return res.status(fetchResp.status).json(data);
		}
		return res.status(fetchResp.status).send(await fetchResp.text());
	} catch (e) {
		console.error('[proxy]', e);
		return res.status(502).json({ error: 'proxy error', message: e.message });
	}
}
