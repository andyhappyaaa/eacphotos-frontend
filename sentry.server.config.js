import * as Sentry from '@sentry/sveltekit';

const dsn = import.meta.env.PUBLIC_SENTRY_DSN;

if (dsn) {
	Sentry.init({
		dsn,
		tracesSampleRate: 1.0
	});
}
