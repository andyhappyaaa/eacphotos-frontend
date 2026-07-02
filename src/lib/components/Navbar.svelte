<script>
	import { page } from '$app/state';
	import { isLoggedIn, currentUser, logout } from '$lib/stores/auth';
	import { lang, setLanguage } from '$lib/stores/i18n';
	import { theme, toggleTheme } from '$lib/stores/theme';
	import { getLogoUrl } from '$lib/utils/helpers';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { Sun, Moon, Globe } from '@lucide/svelte';

	let { t } = $props();

	let logoUrl = $derived(getLogoUrl($theme));
	let isAuth = $derived($isLoggedIn);
	let user = $derived($currentUser);
	let currentLang = $derived($lang);

	const navLinks = [
		{ href: '/', key: 'nav.home' },
		{ href: '/gallery', key: 'nav.gallery' },
		{ href: '/dashboard', key: 'nav.dashboard' },
		{ href: '/search', key: 'nav.search' },
		{ href: '/news', key: 'nav.news' }
	];

	function handleLogout() {
		logout();
	}

	function tVal(key) {
		return t ? t(key) : key;
	}
</script>

<nav class="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="container mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5">
		<!-- Logo -->
		<a href="/" class="flex-shrink-0">
			<img src={logoUrl} alt="EAC Photo" class="h-10 w-auto" />
		</a>

		<!-- Nav Links -->
		<div class="hidden items-center gap-2 md:flex">
			{#each navLinks as link}
				{@const isActive = page.url.pathname === link.href}
				<a
					href={link.href}
					class={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground ${
						isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
					}`}
				>
					{@html tVal(link.key)}
				</a>
			{/each}
		</div>

		<!-- Right Actions -->
		<div class="flex items-center gap-3">
			<!-- Theme Toggle -->
			<Button variant="ghost" size="icon" onclick={toggleTheme} aria-label="Toggle theme">
				{#if $theme === 'dark'}
					<Moon class="h-5 w-5" />
				{:else}
					<Sun class="h-5 w-5" />
				{/if}
			</Button>

			<!-- Language Select -->
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon">
						<Globe class="h-5 w-5" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onclick={() => setLanguage('zh')} class={currentLang === 'zh' ? 'bg-secondary' : ''}>
						🇨🇳 中文
					</DropdownMenuItem>
					<DropdownMenuItem onclick={() => setLanguage('en')} class={currentLang === 'en' ? 'bg-secondary' : ''}>
						🇺🇸 English
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<!-- Auth -->
			{#if isAuth && user}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" class="rounded-full">
							<Avatar class="h-8 w-8">
								<AvatarImage src={user.avatar} alt={user.username} />
								<AvatarFallback>{user.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
							</Avatar>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" class="w-48">
						<DropdownMenuItem href="/dashboard">📊 {tVal('nav.dashboard')}</DropdownMenuItem>
						<DropdownMenuItem href="/profile">👤 {tVal('nav.profile')}</DropdownMenuItem>
						<DropdownMenuItem href="/settings">⚙️ {tVal('nav.settings')}</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onclick={handleLogout} class="text-destructive">
							👋 {tVal('nav.logout')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			{:else}
				<div class="flex gap-2">
					<Button variant="outline" href="/login" size="sm">
						{tVal('nav.login')}
					</Button>
					<Button href="/register" size="sm">
						{tVal('nav.register')}
					</Button>
				</div>
			{/if}
		</div>
	</div>
</nav>
