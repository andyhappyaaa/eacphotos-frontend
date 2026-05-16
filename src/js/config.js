/**
 * 全局配置 - 集中管理前端环境变量
 * 这些变量需要在构建时通过 Vite 或在 HTML 中通过 window 全局变量提供
 */

// 全局配置对象
window.APP_CONFIG = window.APP_CONFIG || {
    // 后端 API 地址（生产环境会被 Vite 替换或在 HTML 中覆盖）
    API_URL: '',

    // 前后端共享鉴权密钥
    AUTH_SECRET: '',

    // Cloudflare Turnstile 站点密钥
    TURNSTILE_SITE_KEY: ''
};

// 尝试从 Vite 环境变量读取（开发/构建时）
try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        window.APP_CONFIG.API_URL = window.APP_CONFIG.API_URL || import.meta.env.VITE_API_URL || '';
        window.APP_CONFIG.AUTH_SECRET = window.APP_CONFIG.AUTH_SECRET || import.meta.env.VITE_AUTH_SECRET || '';
        window.APP_CONFIG.TURNSTILE_SITE_KEY = window.APP_CONFIG.TURNSTILE_SITE_KEY || import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
    }
} catch (e) {
    // 静态部署时可能无法访问 import.meta.env，忽略错误
}

// 全局便捷访问函数
window.getConfig = function(key, defaultValue = '') {
    return window.APP_CONFIG[key] || defaultValue;
};
