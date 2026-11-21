import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';

// 直接在 hooks 里初始化（不依赖 sentry.server.config 自动发现）
const dsn = process.env.PUBLIC_SENTRY_DSN;
if (dsn) {
	Sentry.init({
		dsn,
		tracesSampleRate: 1.0
	});
}

export const handle = sequence(Sentry.sentryHandle());
export const handleError = Sentry.handleErrorWithSentry();
