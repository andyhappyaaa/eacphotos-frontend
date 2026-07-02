import { toast as sonner } from 'svelte-sonner';

/**
 * Toast notification store - wraps svelte-sonner for convenience.
 */

export function showToast(message, type = 'info') {
	switch (type) {
		case 'success':
			sonner.success(message);
			break;
		case 'error':
			sonner.error(message);
			break;
		case 'warning':
			sonner.warning(message);
			break;
		default:
			sonner(message);
	}
}
