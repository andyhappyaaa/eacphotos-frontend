<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		// Handle OAuth callback - extract token from URL and store
		const params = new URLSearchParams(window.location.search);
		const token = params.get('token');
		if (token) {
			// Store reviewer session
			localStorage.setItem('eacphoto_reviewer_session', JSON.stringify({
				accessToken: token,
				expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
			}));
		}
		goto('/dashboard');
	});
</script>
