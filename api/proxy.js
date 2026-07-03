/**
 * Vercel Serverless Function - 后端 API 代理
 *
 * 工作原理：
 * 1. 前端调用 /api/proxy?path=/api/photos/featured（不需要任何密钥）
 * 2. 此函数在服务端生成 TOTP 验证码（使用 AUTH_SECRET）
 * 3. 转发请求到 Cloudflare Worker 后端
 * 4. 返回响应给前端
 *
 * 优点：
 * - AUTH_SECRET 完全在服务端，永不暴露给浏览器
 * - 前端 JS 代码精简，无需生成 TOTP
 * - 防止 CSRF：可叠加 Origin/Referer 检查
 *
 * 环境变量（在 Vercel Dashboard 配置）：
 * - BACKEND_URL: 后端 Worker 地址（例如 https://eac-photo-backend.workers.dev）
 * - AUTH_SECRET: 与后端共享的鉴权密钥
 */

import crypto from 'crypto';

// 生成 TOTP 验证码（服务端实现）
function generateTOTP(secret, timestamp = Date.now()) {
    const timeStep = Math.floor(timestamp / 1000 / 30);
    const hmac = crypto.createHmac('sha1', secret);

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
    const codes = [
        generateTOTP(secret, now - 30000),
        generateTOTP(secret, now),
        generateTOTP(secret, now + 30000)
    ];
    return {
        'X-Auth-Codes': codes.join(','),
        'X-Auth-Timestamp': now.toString()
    };
}

export default async function handler(req, res) {
    // 环境变量检查
    const BACKEND_URL = process.env.BACKEND_URL || process.env.VITE_API_URL || process.env.API_URL;
    const AUTH_SECRET = process.env.AUTH_SECRET || process.env.VITE_AUTH_SECRET;

    if (!BACKEND_URL || !AUTH_SECRET) {
        return res.status(500).json({
            error: '服务端配置错误',
            message: '请在 Vercel 设置 BACKEND_URL 和 AUTH_SECRET 环境变量'
        });
    }

    // ==================== 防请求伪造（CSRF / 跨站调用）====================
    // 同源校验：要求请求来自允许的主机
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const origin = req.headers.origin || '';
    const referer = req.headers.referer || '';

    const allowedHosts = new Set();
    if (host) allowedHosts.add(host);
    if (process.env.ALLOWED_ORIGINS) {
        process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean).forEach(h => {
            try { allowedHosts.add(new URL(h.startsWith('http') ? h : `https://${h}`).host); } catch {}
        });
    }

    function hostAllowed(value) {
        if (!value) return false;
        try { return allowedHosts.has(new URL(value).host); } catch { return false; }
    }

    const writeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (writeMethod) {
        // 写操作必须同源（POST/PUT/PATCH/DELETE）
        if (!hostAllowed(origin) && !hostAllowed(referer)) {
            return res.status(403).json({ error: '请求来源不允许（CSRF 保护）' });
        }
    } else {
        // GET：严格校验 Origin，无 Origin+无 Referer 仅放行简单 GET（同源导航）
        if (origin) {
            if (!hostAllowed(origin)) return res.status(403).json({ error: '请求来源不允许' });
        } else if (referer) {
            if (!hostAllowed(referer)) return res.status(403).json({ error: '请求来源不允许' });
        }
        // 无 Origin 且无 Referer：浏览器同源 GET 不发送 Origin — 仅放行无特殊 Header 的请求
        // 带 Authorization 的 GET 必须有 Origin（防止 CSRF 利用 cookie 窃取数据）
        if (!origin && !referer && req.headers['authorization']) {
            return res.status(403).json({ error: '跨站鉴权请求需 Origin header' });
        }
    }

    // 从查询参数或路径获取目标路径
    const targetPath = req.query.path;
    if (!targetPath || typeof targetPath !== 'string') {
        return res.status(400).json({ error: '缺少 path 参数' });
    }

    // 安全检查：只允许代理 /api/ 开头的路径
    if (!targetPath.startsWith('/api/')) {
        return res.status(400).json({ error: '非法的 path' });
    }

    // 防止路径穿越：归一化 + URL 解码后再检查
    const decoded = (() => { try { return decodeURIComponent(targetPath); } catch(e) { return targetPath; } })();
    const normalized = (() => { try { return new URL('http://x' + decoded).pathname; } catch(e) { return decoded; } })();

    if (decoded.includes('..') || decoded.includes('%2e%2e') || decoded.includes('%252e')
        || !/^\/api\/[a-zA-Z0-9_\-\/.%?&=]+$/.test(decoded)
        || !normalized.startsWith('/api/')) {
        return res.status(400).json({ error: '非法的 path' });
    }

    // 构建目标 URL（保留其他查询参数）
    const url = new URL(BACKEND_URL + targetPath);
    Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'path') {
            if (Array.isArray(value)) {
                value.forEach(v => url.searchParams.append(key, v));
            } else {
                url.searchParams.set(key, value);
            }
        }
    });

    // ==================== HttpOnly Cookie 安全存储 ====================
    // 浏览器 → proxy：Cookie: eac_session=<token>
    // proxy → Worker：Authorization: Bearer <token>
    // Worker → proxy：JSON { token, user }
    // proxy → 浏览器：Set-Cookie: eac_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/
    // 前端 JS 永远不接触 token 明文，杜绝 XSS 窃取

    const COOKIE_NAME = 'eac_session';
    const OAUTH_COOKIE_NAME = 'eac_oauth';
    const COOKIE_OPTS = 'HttpOnly; Secure; SameSite=Lax; Path=/';

    // 从 cookie 提取 token，注入 Authorization header
    function extractTokenFromCookie(cookieHeader, name) {
        if (!cookieHeader) return null;
        const cookies = cookieHeader.split(';').map(c => c.trim());
        for (const c of cookies) {
            if (c.startsWith(name + '=')) {
                return decodeURIComponent(c.substring(name.length + 1));
            }
        }
        return null;
    }

    // 生成鉴权头
    const authHeaders = getAuthHeaders(AUTH_SECRET);

    // 准备转发的请求头
    const forwardHeaders = {
        ...authHeaders,
        'Content-Type': req.headers['content-type'] || 'application/json'
    };

    // 从 HttpOnly cookie 提取 token（优先 eac_session），回退到 Authorization header
    // 同时检查 eac_oauth（审核员 OAuth cookie）— 用于 /api/admin/* 等管理员端点
    const cookieToken = extractTokenFromCookie(req.headers.cookie, COOKIE_NAME);
    const oauthToken = extractTokenFromCookie(req.headers.cookie, OAUTH_COOKIE_NAME);

    if (cookieToken) {
        forwardHeaders['Authorization'] = `Bearer ${cookieToken}`;
    } else if (oauthToken) {
        // OAuth 审核员 token — 通过 cookie 自动带到 proxy
        forwardHeaders['Authorization'] = `Bearer ${oauthToken}`;
    } else if (req.headers['authorization']) {
        forwardHeaders['Authorization'] = req.headers['authorization'];
    }

    // 构建请求体
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.body) {
            body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }
    }

    try {
        const response = await fetch(url.toString(), {
            method: req.method,
            headers: forwardHeaders,
            body
        });

        // 复制响应头
        response.headers.forEach((value, key) => {
            if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await response.json();

            // ── Cookie 安全存储：登录/注册响应中 token 同时写入 cookie + 返回前端 ──
            const isLoginPath = targetPath === '/api/auth/login' || targetPath === '/api/auth/register';

            if (isLoginPath && data.token) {
                res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(data.token)}; ${COOKIE_OPTS}; Max-Age=${3 * 24 * 60 * 60}`);
            }
            // 登出时清除 cookie
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
        return res.status(502).json({
            error: '代理请求失败',
            message: error.message
        });
    }
}
