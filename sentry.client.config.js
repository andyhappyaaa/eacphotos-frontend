import * as Sentry from '@sentry/sveltekit';

// DSN 通过 Vercel 环境变量 PUBLIC_SENTRY_DSN 注入（非密钥，可暴露给前端）
const dsn = import.meta.env.PUBLIC_SENTRY_DSN;

if (dsn) {
	Sentry.init({
		dsn,
		tracesSampleRate: 1.0
	});
}
