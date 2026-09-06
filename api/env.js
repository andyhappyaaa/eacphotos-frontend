/**
 * Vercel Serverless Function - 暴露公开配置给前端
 *
 * ⚠️ 安全说明：
 * 此函数只暴露 PUBLIC 配置（如 Turnstile 公钥），不暴露任何密钥
 * AUTH_SECRET 等敏感信息保留在服务端，通过 /api/proxy/* 代理调用
 *
 * 在 Vercel Dashboard 配置环境变量：
 * - TURNSTILE_SITE_KEY (公开 - 可暴露给前端)
 *
 * 服务端使用（不暴露）：
 * - BACKEND_URL (后端 Worker 地址)
 * - AUTH_SECRET (与后端共享的鉴权密钥)
 */
export default function handler(req, res) {
    // 关键：trim 掉环境变量里可能残留的空白/换行/不可见字符
    // 这是 Turnstile 300010 的常见根因——env 变量末尾粘进了空格或换行
    const rawSiteKey = process.env.TURNSTILE_SITE_KEY || process.env.VITE_TURNSTILE_SITE_KEY || '';
    const siteKey = String(rawSiteKey).trim();

    const publicConfig = {
        TURNSTILE_SITE_KEY: siteKey,
        // OAuth 客户端 ID 是公开的（spec 允许暴露），但 secret 仅在服务端
        OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID || '',
		SUPABASE_URL: process.env.SUPABASE_URL || '',
		SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || '',
        // Waline 评论服务端地址（Vercel 部署的 API，不含 /api）
        WALINE_SERVER_URL: process.env.WALINE_SERVER_URL || '',
        // 站点分析（公开 ID）
        GA_MEASUREMENT_ID: (process.env.GA_MEASUREMENT_ID || '').trim(),
        CLARITY_PROJECT_ID: (process.env.CLARITY_PROJECT_ID || '').trim()
    };

    // 调试模式：仅在本地或非生产环境可用
    const isProd = !(req.headers.host || '').includes('localhost') &&
                   !(req.headers.host || '').includes('127.0.0.1') &&
                   (process.env.VERCEL_ENV === 'production' || !process.env.VERCEL_ENV);
    if (req.query && req.query.debug === '1' && !isProd) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({
            TURNSTILE_SITE_KEY: siteKey ? 'configured' : '(empty)',
            length: siteKey.length,
            wasTrimmed: rawSiteKey !== siteKey
        });
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

    const js = `// 由 Vercel Serverless Function 动态生成（仅包含公开配置）
window.APP_CONFIG = ${JSON.stringify(publicConfig, null, 2)};
`;

    res.status(200).send(js);
}
