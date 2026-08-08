<script>
	import { page } from '$app/state';
	import { isLoggedIn, currentUser, logout } from '$lib/stores/auth';
	import { lang, setLanguage } from '$lib/stores/i18n';
	import { theme, toggleTheme } from '$lib/stores/theme';
	import { getLogoUrl } from '$lib/utils/helpers';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '$lib/components/ui/dropdown-menu';
	import { Sun, Moon, Globe, Menu, Home, Image, LayoutDashboard, Search, Newspaper, LogOut, User } from '@lucide/svelte';

	let { t } = $props();

	const navLinks = [
		{ href: '/', key: 'nav.home', icon: Home },
		{ href: '/gallery', key: 'nav.gallery', icon: Image },
		{ href: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
		{ href: '/search', key: 'nav.search', icon: Search },
		{ href: '/news', key: 'nav.news', icon: Newspaper }
	];

	function handleLogout() { logout(); }
	function tVal(key) { return t ? t(key) : key; }
	function handleNav(href) {
		// Close Bootstrap offcanvas by clicking backdrop or programmatically
		const oc = document.querySelector('.navbar-offcanvas');
		if (oc) {
			const bs = bootstrap.Offcanvas.getInstance(oc);
			if (bs) bs.hide();
		}
		window.location.href = href;
	}
</script>

<nav class="navbar navbar-expand-md sticky-top border-bottom bg-body-tertiary bg-opacity-90 backdrop-blur py-0 px-0" style="z-index:50;">
	<div class="container-fluid mx-auto px-3" style="max-width:1400px;height:57px;">
		<!-- Mobile hamburger -->
		<button class="btn border-0 d-md-none px-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#navbarOffcanvas" aria-controls="navbarOffcanvas" aria-label="菜单">
			<Menu class="h-5 w-5" />
		</button>

		<!-- Logo -->
		<a href="/" class="navbar-brand d-flex align-items-center gap-2 py-0">
			<img src={getLogoUrl($theme)} alt="" class="h-8 w-auto" />
		</a>

		<!-- Desktop nav links -->
		<div class="d-none d-md-flex align-items-center gap-1 ms-2">
			{#each navLinks as link}
				{@const isActive = page.url.pathname === link.href || (link.href !== '/' && page.url.pathname.startsWith(link.href))}
				<a href={link.href} class="btn btn-sm {isActive ? 'btn-ghost-active' : 'btn-ghost'} d-inline-flex align-items-center gap-1 px-2 py-1 small fw-medium">
					{@html tVal(link.key)}
				</a>
			{/each}
		</div>

		<div class="flex-1 d-none d-md-block"></div>

		<!-- Right icons -->
		<div class="d-flex align-items-center gap-1">
			<button class="btn btn-sm btn-ghost px-1" onclick={toggleTheme} aria-label="Toggle theme">
				{#if $theme === 'dark'}<Sun class="h-4 w-4" />{:else}<Moon class="h-4 w-4" />{/if}
			</button>

			<div class="dropdown">
				<button class="btn btn-sm btn-ghost px-1" data-bs-toggle="dropdown" aria-label="Language">
					<Globe class="h-4 w-4" />
				</button>
				<ul class="dropdown-menu dropdown-menu-end">
					<li><button class="dropdown-item {$lang === 'zh' ? 'active' : ''}" onclick={() => setLanguage('zh')}>简体中文</button></li>
					<li><button class="dropdown-item {$lang === 'zh-TW' ? 'active' : ''}" onclick={() => setLanguage('zh-TW')}>繁體中文</button></li>
					<li><button class="dropdown-item {$lang === 'en' ? 'active' : ''}" onclick={() => setLanguage('en')}>English</button></li>
				</ul>
			</div>

			<!-- Desktop user menu -->
			<div class="d-none d-md-flex align-items-center gap-1">
				{#if $isLoggedIn && $currentUser}
					<div class="dropdown">
						<button class="btn btn-sm btn-ghost d-flex align-items-center gap-2 rounded-pill px-2" data-bs-toggle="dropdown">
							<Avatar class="h-7 w-7"><AvatarImage src={$currentUser.avatar} alt="" /><AvatarFallback class="text-xs">{$currentUser.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
							<span class="small fw-medium">{$currentUser.username}</span>
						</button>
						<ul class="dropdown-menu dropdown-menu-end">
							<li><button class="dropdown-item" onclick={() => handleNav('/dashboard')}><LayoutDashboard class="me-2 h-4 w-4" /> {tVal('nav.dashboard')}</button></li>
							<li><button class="dropdown-item" onclick={() => handleNav('/profile')}><User class="me-2 h-4 w-4" /> {tVal('nav.profile')}</button></li>
							<li><hr class="dropdown-divider" /></li>
							<li><button class="dropdown-item text-danger" onclick={handleLogout}><LogOut class="me-2 h-4 w-4" /> {tVal('nav.logout')}</button></li>
						</ul>
					</div>
				{:else}
					<Button variant="outline" size="sm" href="/login">{tVal('nav.login')}</Button>
					<Button size="sm" href="/register">{tVal('nav.register')}</Button>
				{/if}
			</div>
		</div>
	</div>
</nav>

<!-- Bootstrap Offcanvas: mobile sidebar -->
<div class="offcanvas offcanvas-start navbar-offcanvas" tabindex="-1" id="navbarOffcanvas" aria-labelledby="navbarOffcanvasLabel" style="width:280px;">
	<div class="offcanvas-header border-bottom">
		<div class="d-flex align-items-center gap-2">
			<img src={getLogoUrl($theme)} alt="" class="h-7 w-auto" />
			<span class="small fw-semibold">Photo</span>
		</div>
		<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
	</div>
	<div class="offcanvas-body d-flex flex-column p-0">
		<nav class="flex-1 overflow-y-auto p-3 d-flex flex-column gap-0.5">
			{#each navLinks as link}
				{@const isActive = page.url.pathname === link.href || (link.href !== '/' && page.url.pathname.startsWith(link.href))}
				<button onclick={() => handleNav(link.href)} class="btn btn-ghost w-100 text-start d-flex align-items-center gap-3 px-3 py-2 small fw-medium {isActive ? 'btn-ghost-active' : ''}">
					<link.icon class="h-4 w-4" />{@html tVal(link.key)}
				</button>
			{/each}
		</nav>
		<Separator />
		{#if $isLoggedIn && $currentUser}
			<div class="p-3">
				<div class="d-flex align-items-center gap-3 rounded-2 p-3 bg-body-secondary mb-3">
					<Avatar class="h-10 w-10"><AvatarImage src={$currentUser.avatar} alt="" /><AvatarFallback>{$currentUser.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
					<div><p class="mb-0 small fw-medium">{$currentUser.username}</p><p class="mb-0 small text-body-tertiary">{$currentUser.email}</p></div>
				</div>
				<button class="btn btn-outline-secondary btn-sm w-100 mb-1 justify-content-start" onclick={() => handleNav('/dashboard')}><LayoutDashboard class="me-2 h-4 w-4" /> {tVal('nav.dashboard')}</button>
				<button class="btn btn-outline-secondary btn-sm w-100 mb-1 justify-content-start" onclick={() => handleNav('/profile')}><User class="me-2 h-4 w-4" /> {tVal('nav.profile')}</button>
				<hr class="my-3" />
				<button class="btn btn-ghost btn-sm w-100 justify-content-start text-danger" onclick={handleLogout}><LogOut class="me-2 h-4 w-4" /> {tVal('nav.logout')}</button>
			</div>
		{:else}
			<div class="d-flex flex-column gap-2 p-3">
				<button class="btn btn-primary btn-sm w-100" onclick={() => handleNav('/login')}>{tVal('nav.login')}</button>
				<button class="btn btn-outline-secondary btn-sm w-100" onclick={() => handleNav('/register')}>{tVal('nav.register')}</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.btn-ghost { background: transparent; color: var(--bs-secondary-color); border-color: transparent; }
	.btn-ghost:hover { background: var(--bs-tertiary-bg); color: var(--bs-body-color); }
	.btn-ghost-active { background: rgba(var(--bs-primary-rgb, 13,110,253), 0.1); color: var(--bs-primary, #0d6efd); border-color: transparent; }
	.navbar { --bs-navbar-padding-y: 0; }
</style>
