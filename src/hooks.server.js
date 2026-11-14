import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';

export const handle = sequence(Sentry.sentryHandle());
export const handleError = Sentry.handleErrorWithSentry();
