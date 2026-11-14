import { env } from '$env/dynamic/public';
import * as Sentry from '@sentry/sveltekit';

// DSN 通过 Vercel 环境变量 PUBLIC_SENTRY_DSN 注入（SvelteKit 用 $env/dynamic/public 读取）
let dsn = '';
try {
	dsn = env.PUBLIC_SENTRY_DSN || '';
} catch {
	// PUBLIC_SENTRY_DSN 未配置，Sentry 不启用
}

if (dsn) {
	Sentry.init({
		dsn,
		tracesSampleRate: 1.0
	});
}
