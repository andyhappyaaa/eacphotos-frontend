/**
 * Vercel Serverless Function — 读取 OAuth 审核员信息
 *
 * 从 HttpOnly cookie `eac_oauth` 中提取 access_token，
 * 转发到后端 /oauth/userinfo 并返回审核员信息（不含 token 明文）。
 *
 * 无 cookie 时返回 { authenticated: false }，前端据此决定是否显示审核功能。
 */

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    const BACKEND_URL = process.env.BACKEND_URL;
    if (!BACKEND_URL) return res.status(500).json({ error: 'server_misconfigured' });

    // 从 HttpOnly cookie 提取 OAuth token
    const cookieHeader = req.headers.cookie || '';
    const cookies = cookieHeader.split(';').map(c => c.trim());
    let oauthToken = '';
    for (const c of cookies) {
        if (c.startsWith('eac_oauth=')) {
            oauthToken = decodeURIComponent(c.substring('eac_oauth='.length));
            break;
        }
    }

    if (!oauthToken) {
        return res.status(200).json({ authenticated: false });
    }

    try {
        const r = await fetch(BACKEND_URL.replace(/\/$/, '') + '/oauth/userinfo', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + oauthToken }
        });
        const data = await r.json();

        if (r.ok) {
            return res.status(200).json({
                authenticated: true,
                reviewer_id: data.sub,
                username: data.username,
                email: data.email,
                role: data.role,
                is_admin: data.is_admin,
                is_super_admin: data.is_super_admin
            });
        }
        return res.status(200).json({ authenticated: false, error: data.error });
    } catch (e) {
        return res.status(502).json({ error: 'backend_unreachable', error_description: e.message });
    }
}
