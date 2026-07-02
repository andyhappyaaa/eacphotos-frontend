import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				// SPA mode: serve index.html for all unknown routes
				fallback: 'index.html'
			})
		})
	],
	server: {
		// In dev mode, proxy /api requests to the Cloudflare Worker backend
		proxy: {
			'/api': {
				target: 'https://eac-photo-backend.workers.dev',
				changeOrigin: true
			}
		}
	}
});
