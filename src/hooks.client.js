import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

// 直接在 hooks 里初始化（不依赖 sentry.client.config 自动发现）
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

export const handleError = Sentry.handleErrorWithSentry();
