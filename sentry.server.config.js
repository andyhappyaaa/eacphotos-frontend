import { env } from '$env/dynamic/public';
import * as Sentry from '@sentry/sveltekit';

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
