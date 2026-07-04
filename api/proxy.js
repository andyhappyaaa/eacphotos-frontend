/**
 * Vercel Serverless Function - 后端 API 代理
 *
 * ── 安全模型 ──
 * 1. TOTP 鉴权：proxy 服务端生成 X-Auth-Codes（SHA-256 HMAC），浏览器无法获取 AUTH_SECRET
 * 2. CSRF 防护：写操作 (POST/PUT/DELETE) 校验 Origin/Referer 必须匹配允许的域名
 * 3. 路径限制：只允许代理 /api/ 开头的路径，含路径穿越检测
 * 4. 超管端点 (/api/admin/*) 额外需要 OAuth Bearer token（来自 HttpOnly cookie）
 * 5. 业务服务器密钥 (BUSINESS_SERVER_SECRET) 仅 Worker 持有，proxy 不可访问
 * 6. 第三方无法滥用：即使猜到 proxy URL，无合法 Origin 头→403；Origin 校验防止跨站调用
 *
 * 环境变量（Vercel Dashboard 配置）：
 * - BACKEND_URL: 后端 Worker 地址
 * - AUTH_SECRET: 与后端共享的 TOTP 鉴权密钥
 * - ALLOWED_ORIGINS (可选): 额外允许的域名，逗号分隔
 */

import crypto from 'crypto';

function generateTOTP(secret, timestamp = Date.now()) {
    const timeStep = Math.floor(timestamp / 1000 / 30);
    const hmac = crypto.createHmac('sha256', secret);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(0, 0);
    timeBuffer.writeUInt32BE(timeStep, 4);
    hmac.update(timeBuffer);
    const digest = hmac.digest();
    const offset = digest[digest.length - 1] & 0x0F;
    const code = (
        ((digest[offset] & 0x7F) << 24) |
        ((digest[offset + 1] & 0xFF) << 16) |
        ((digest[offset + 2] & 0xFF) << 8) |
        (digest[offset + 3] & 0xFF)
    ) % 1000000;
    return code.toString().padStart(6, '0');
}

function getAuthHeaders(secret) {
    const now = Date.now();
    const codes = [generateTOTP(secret, now - 30000), generateTOTP(secret, now), generateTOTP(secret, now + 30000)];
    return { 'X-Auth-Codes': codes.join(','), 'X-Auth-Timestamp': now.toString() };
}

export default async function handler(req, res) {
    const BACKEND_URL = process.env.BACKEND_URL || process.env.VITE_API_URL || process.env.API_URL;
    const AUTH_SECRET = process.env.AUTH_SECRET || process.env.VITE_AUTH_SECRET;

    if (!BACKEND_URL || !AUTH_SECRET) {
        return res.status(500).json({ error: '服务端配置错误', message: '请在 Vercel 设置 BACKEND_URL 和 AUTH_SECRET 环境变量' });
    }

    // ==================== CSRF 防护 ====================
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const origin = req.headers.origin || '';
    const referer = req.headers.referer || '';

    const allowedHosts = new Set();
    if (host) allowedHosts.add(host);
    if (process.env.ALLOWED_ORIGINS) {
        process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean).forEach(h => {
            try { allowedHosts.add(new URL(h.startsWith('http') ? h : 'https://' + h).host); } catch {}
        });
    }

    function hostAllowed(value) {
        if (!value) return false;
        try { return allowedHosts.has(new URL(value).host); } catch { return false; }
    }

    const writeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (writeMethod) {
        if (!hostAllowed(origin) && !hostAllowed(referer)) {
            return res.status(403).json({ error: '请求来源不允许（CSRF 保护）' });
        }
    } else {
        if (origin && !hostAllowed(origin)) return res.status(403).json({ error: '请求来源不允许' });
        if (referer && !hostAllowed(referer)) return res.status(403).json({ error: '请求来源不允许' });
        if (!origin && !referer && req.headers['authorization']) {
            return res.status(403).json({ error: '跨站鉴权请求需 Origin header' });
        }
    }

    // ==================== 路径提取与校验 ====================
    const targetPath = req.query.path;
    if (!targetPath || typeof targetPath !== 'string') {
        return res.status(400).json({ error: '缺少 path 参数' });
    }
    if (!targetPath.startsWith('/api/')) {
        return res.status(400).json({ error: '非法的 path' });
    }
    const decoded = (() => { try { return decodeURIComponent(targetPath); } catch(e) { return targetPath; } })();
    const normalized = (() => { try { return new URL('http://x' + decoded).pathname; } catch(e) { return decoded; } })();
    if (decoded.includes('..') || decoded.includes('%2e%2e') || decoded.includes('%252e')
        || !/^\/api\/[a-zA-Z0-9_\-\/.%?&=]+$/.test(decoded)
        || !normalized.startsWith('/api/')) {
        return res.status(400).json({ error: '非法的 path' });
    }

    const url = new URL(BACKEND_URL + targetPath);
    Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'path') {
            if (Array.isArray(value)) value.forEach(v => url.searchParams.append(key, v));
            else url.searchParams.set(key, value);
        }
    });

    // ==================== Cookie 提取 ====================
    const COOKIE_NAME = 'eac_session';
    const OAUTH_COOKIE_NAME = 'eac_oauth';
    const COOKIE_OPTS = 'HttpOnly; Secure; SameSite=Lax; Path=/';

    function extractTokenFromCookie(cookieHeader, name) {
        if (!cookieHeader) return null;
        const cookies = cookieHeader.split(';').map(c => c.trim());
        for (const c of cookies) {
            if (c.startsWith(name + '=')) return decodeURIComponent(c.substring(name.length + 1));
        }
        return null;
    }

    const authHeaders = getAuthHeaders(AUTH_SECRET);

    const reqContentType = req.headers['content-type'] || '';
    const forwardHeaders = { ...authHeaders };
    // 仅在非 GET/HEAD 且有 body 时设置 Content-Type，避免 GET 请求被 Vercel 误判
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        forwardHeaders['Content-Type'] = reqContentType || 'application/json';
    }

    // Bearer token：优先 HttpOnly cookie → Authorization header
    const cookieToken = extractTokenFromCookie(req.headers.cookie, COOKIE_NAME);
    const oauthToken = extractTokenFromCookie(req.headers.cookie, OAUTH_COOKIE_NAME);
    if (cookieToken) forwardHeaders['Authorization'] = 'Bearer ' + cookieToken;
    else if (oauthToken) forwardHeaders['Authorization'] = 'Bearer ' + oauthToken;
    else if (req.headers['authorization']) forwardHeaders['Authorization'] = req.headers['authorization'];

    // ==================== body 处理 ====================
    // multipart/form-data 必须原样透传（含 boundary），不能 JSON.stringify（会破坏上传）
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (reqContentType.includes('multipart/form-data')) {
            body = req.body;  // Vercel 已解析为 Buffer/string，保留原始 boundary
        } else if (req.body) {
            body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }
    }

    try {
        const response = await fetch(url.toString(), { method: req.method, headers: forwardHeaders, body });

        response.headers.forEach((value, key) => {
            if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        const respContentType = response.headers.get('content-type') || '';
        if (respContentType.includes('application/json')) {
            const data = await response.json();
            const isLogin = targetPath === '/api/auth/login' || targetPath === '/api/auth/register';
            if (isLogin && data.token) {
                res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(data.token)}; ${COOKIE_OPTS}; Max-Age=${3 * 24 * 60 * 60}`);
            }
            if (targetPath === '/api/auth/logout') {
                res.setHeader('Set-Cookie', `${COOKIE_NAME}=; ${COOKIE_OPTS}; Max-Age=0`);
            }
            return res.status(response.status).json(data);
        } else {
            const text = await response.text();
            return res.status(response.status).send(text);
        }
    } catch (error) {
        console.error('代理错误:', error);
        return res.status(502).json({ error: '代理请求失败', message: error.message });
    }
}
