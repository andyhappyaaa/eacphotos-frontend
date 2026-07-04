/**
 * Vercel Serverless Function — 后端 API 代理
 *
 * —— 安全模型 ——
 * 1. TOTP 鉴权：服务端生成 X-Auth-Codes (SHA-256)，AUTH_SECRET 不暴露到浏览器
 * 2. CSRF 防护：写操作校验 Origin/Referer 匹配允许域名
 * 3. 路径限制：仅代理 /api/ 路径，含穿越检测
 * 4. 超管端点：额外需要 OAuth Bearer token（来自 HttpOnly cookie）
 * 5. multipart 上传：关闭 Vercel 自动 bodyParser，原始字节透传
 */

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

/** Collect the raw request body as a Buffer (bodyParser disabled) */
function readRawBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
		req.on('end', () => resolve(Buffer.concat(chunks)));
		req.on('error', reject);
	});
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
	} else {
		if (origin && !hostOk(origin)) return res.status(403).json({ error: 'origin' });
		if (referer && !hostOk(referer)) return res.status(403).json({ error: 'referer' });
		if (!origin && !referer && req.headers['authorization']) return res.status(403).json({ error: 'auth' });
	}

	// — Path —
	const targetPath = req.query.path;
	if (!targetPath || typeof targetPath !== 'string' || !targetPath.startsWith('/api/')) return res.status(400).json({ error: 'bad path' });
	const decoded = (() => { try { return decodeURIComponent(targetPath); } catch { return targetPath; } })();
	if (decoded.includes('..')) return res.status(400).json({ error: 'bad path' });

	const url = new URL(BACKEND_URL + targetPath);
	for (const [k, v] of Object.entries(req.query)) {
		if (k !== 'path') url.searchParams.set(k, Array.isArray(v) ? v[0] : v);
	}

	// — Auth headers —
	const authHeaders = getAuthHeaders(AUTH_SECRET);
	const reqCt = (req.headers['content-type'] || '').toLowerCase();
	const isMultipart = reqCt.includes('multipart/form-data');
	const forwardHeaders = { ...authHeaders };
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		forwardHeaders['Content-Type'] = reqCt || 'application/json';
	}

	// — Tokens from cookies —
	const extractToken = (name) => {
		const c = (req.headers.cookie || '').split(';').map(s => s.trim());
		for (const kv of c) if (kv.startsWith(name + '=')) return decodeURIComponent(kv.slice(name.length + 1));
		return null;
	};
	const sessionToken = extractToken('eac_session') || extractToken('eac_oauth') || req.headers['authorization']?.replace('Bearer ', '');
	if (sessionToken) forwardHeaders['Authorization'] = 'Bearer ' + sessionToken;

	// — Body —
	let body;
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		if (isMultipart) {
			// multipart: 读原始 buffer（bodyParser 已关闭，原生 packet 完整）
			body = await readRawBody(req);
		} else {
			body = await readRawBody(req);
			// 非 multipart: 已收到原始 JSON 字符串，不做额外处理
		}
	}

	console.log(`[proxy] ${req.method} ${targetPath} multipart=${isMultipart} bodyLen=${body ? body.length : 0}`);

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
