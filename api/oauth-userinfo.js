/**
 * Vercel Serverless Function - 转发到主后端 /oauth/userinfo
 * 浏览器带 Bearer token 调用此端点，由 Vercel 转发给主后端
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'method_not_allowed' });
    }
    const BACKEND_URL = process.env.BACKEND_URL;
    if (!BACKEND_URL) return res.status(500).json({ error: 'server_misconfigured' });

    const auth = req.headers['authorization'] || '';
    if (!auth) return res.status(401).json({ error: 'missing_token' });

    try {
        const r = await fetch(BACKEND_URL.replace(/\/$/, '') + '/oauth/userinfo', {
            method: 'GET',
            headers: { 'Authorization': auth }
        });
        const data = await r.json();
        return res.status(r.status).json(data);
    } catch (e) {
        return res.status(502).json({ error: 'backend_unreachable', error_description: e.message });
    }
}
