/**
 * Vercel Serverless Function - OAuth2 token exchange
 *
 * 浏览器拿到 authorization code 后，通过此端点向主后端换取 access_token。
 * client_secret 在服务端，不暴露给浏览器。
 *
 * ⚠️ 安全增强：access_token 写入 HttpOnly Secure cookie，JS 无法读取（防 XSS）。
 * 后续请求到 /api/proxy/* 时 cookie 自动带上，proxy 提取后转发给 Worker。
 *
 * Cookie 属性：
 *   eac_oauth=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
 *
 * 环境变量：
 * - BACKEND_URL: 主后端地址
 * - OAUTH_CLIENT_ID: OAuth 客户端 ID（默认 'mainsite'）
 * - OAUTH_CLIENT_SECRET: OAuth 客户端密钥
 * - PUBLIC_SITE_URL: 主站公开 URL，用于构造 redirect_uri
 * - COOKIE_DOMAIN (可选): 用于缩小 Domain 作用范围
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    // 同源校验
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const origin = req.headers.origin || '';
    if (origin) {
        try {
            if (new URL(origin).host !== host) {
                return res.status(403).json({ error: 'forbidden_origin' });
            }
        } catch {
            return res.status(403).json({ error: 'invalid_origin' });
        }
    }

    const BACKEND_URL = process.env.BACKEND_URL;
    const CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'mainsite';
    const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || process.env.AUTH_SECRET;
    const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || `https://${host}`;

    if (!BACKEND_URL || !CLIENT_SECRET) {
        return res.status(500).json({ error: 'server_misconfigured', error_description: '后端未配置 BACKEND_URL 或 OAUTH_CLIENT_SECRET' });
    }

    const { code } = req.body || {};
    if (!code) {
        return res.status(400).json({ error: 'invalid_request', error_description: '缺少 code 参数' });
    }

    const redirectUri = PUBLIC_SITE_URL.replace(/\/$/, '') + '/oauth/callback';

    try {
        const r = await fetch(BACKEND_URL.replace(/\/$/, '') + '/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: redirectUri
            })
        });
        const data = await r.json();

        if (!r.ok || !data.access_token) {
            return res.status(r.status).json(data);
        }

        // ── HttpOnly Secure cookie 存储 access_token ──
        const COOKIE_NAME = 'eac_oauth';
        const maxAge = data.expires_in || 3600;
        const domain = (process.env.COOKIE_DOMAIN || '').trim();
        const domainPart = domain ? `; Domain=${domain}` : '';

        const cookieValue = `${COOKIE_NAME}=${encodeURIComponent(data.access_token)}; HttpOnly; Secure; SameSite=Lax; Path=/${domainPart}; Max-Age=${maxAge}`;

        res.setHeader('Set-Cookie', cookieValue);

        // 返回成功但不含 token（仅告知类型和过期）
        return res.status(200).json({
            success: true,
            token_type: data.token_type || 'Bearer',
            expires_in: maxAge,
            scope: data.scope || 'reviewer'
        });
    } catch (e) {
        return res.status(502).json({ error: 'backend_unreachable', error_description: e.message });
    }
}
