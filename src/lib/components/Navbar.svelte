<script>
	import { page } from '$app/state';
	import { isLoggedIn, currentUser, logout } from '$lib/stores/auth';
	import { lang, setLanguage } from '$lib/stores/i18n';
	import { theme, toggleTheme } from '$lib/stores/theme';
	import { getLogoUrl } from '$lib/utils/helpers';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet';
	import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '$lib/components/ui/dropdown-menu';
	import { Sun, Moon, Globe, Menu, Home, Image, LayoutDashboard, Search, Newspaper, LogOut, User, Settings } from '@lucide/svelte';

	let { t } = $props();
	let logoUrl = $derived(getLogoUrl($theme));
	let isAuth = $derived($isLoggedIn);
	let user = $derived($currentUser);
	let currentLang = $derived($lang);
	let mobileOpen = $state(false);

	const navLinks = [
		{ href: '/', key: 'nav.home', icon: Home },
		{ href: '/gallery', key: 'nav.gallery', icon: Image },
		{ href: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
		{ href: '/search', key: 'nav.search', icon: Search },
		{ href: '/news', key: 'nav.news', icon: Newspaper }
	];

	function handleLogout() { logout(); }
	function tVal(key) { return t ? t(key) : key; }
	function handleNav(href) { window.location.href = href; }
</script>

<nav class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-5">
		<!-- Mobile menu trigger (left side) -->
		<Sheet bind:open={mobileOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" class="md:hidden" aria-label="Menu">
					<Menu class="h-[18px] w-[18px]" />
				</Button>
			</SheetTrigger>
			<SheetContent side="left" class="w-[280px] p-0">
				<div class="flex h-full flex-col">
					<div class="flex items-center gap-3 border-b px-5 py-4">
						<img src={logoUrl} alt="" class="h-8 w-auto" />
						<span class="text-sm font-semibold">EAC Photo</span>
					</div>
					<nav class="flex-1 space-y-1 overflow-y-auto p-3">
						{#each navLinks as link}
							{@const isActive = page.url.pathname === link.href || (link.href !== '/' && page.url.pathname.startsWith(link.href))}
							<button
								onclick={() => { mobileOpen = false; handleNav(link.href); }}
								class={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
									isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
								}`}
							>
								<link.icon class="h-4 w-4" />
								{@html tVal(link.key)}
							</button>
						{/each}
					</nav>
					<Separator />
					{#if isAuth && user}
						<div class="p-3">
							<div class="mb-3 flex items-center gap-3 rounded-lg bg-secondary p-3">
								<Avatar class="h-10 w-10"><AvatarImage src={user.avatar} alt="" /><AvatarFallback>{user.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
								<div><p class="text-sm font-medium">{user.username}</p><p class="text-xs text-muted-foreground">{user.email}</p></div>
							</div>
							<Button variant="outline" class="mb-1 w-full justify-start" onclick={() => { mobileOpen = false; handleNav('/dashboard'); }}><LayoutDashboard class="mr-2 h-4 w-4" /> {tVal('nav.dashboard')}</Button>
							<Button variant="outline" class="mb-1 w-full justify-start" onclick={() => { mobileOpen = false; handleNav('/profile'); }}><User class="mr-2 h-4 w-4" /> {tVal('nav.profile')}</Button>
							<Button variant="outline" class="w-full justify-start" onclick={() => { mobileOpen = false; handleNav('/settings'); }}><Settings class="mr-2 h-4 w-4" /> {tVal('nav.settings')}</Button>
							<Separator class="my-3" />
							<Button variant="ghost" class="w-full justify-start text-destructive" onclick={() => { mobileOpen = false; handleLogout(); }}><LogOut class="mr-2 h-4 w-4" /> {tVal('nav.logout')}</Button>
						</div>
					{:else}
						<div class="space-y-2 p-3">
							<Button class="w-full" onclick={() => { mobileOpen = false; handleNav('/login'); }}>{tVal('nav.login')}</Button>
							<Button variant="outline" class="w-full" onclick={() => { mobileOpen = false; handleNav('/register'); }}>{tVal('nav.register')}</Button>
						</div>
					{/if}
				</div>
			</SheetContent>
		</Sheet>

		<!-- Logo -->
		<a href="/" class="flex shrink-0 items-center gap-2">
			<img src={logoUrl} alt="" class="h-9 w-auto" />
		</a>

		<!-- Desktop Nav -->
		<div class="hidden items-center gap-1 md:flex">
			{#each navLinks as link}
				{@const isActive = page.url.pathname === link.href || (link.href !== '/' && page.url.pathname.startsWith(link.href))}
				<a href={link.href} class={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
					{@html tVal(link.key)}
				</a>
			{/each}
		</div>

		<div class="flex-1"></div>

		<!-- Right Actions -->
		<div class="flex items-center gap-1.5">
			<Button variant="ghost" size="icon" onclick={toggleTheme} aria-label="Toggle theme">
				{#if $theme === 'dark'}<Sun class="h-[18px] w-[18px]" />{:else}<Moon class="h-[18px] w-[18px]" />{/if}
			</Button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" aria-label="Language"><Globe class="h-[18px] w-[18px]" /></Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" class="min-w-[120px]">
					<DropdownMenuItem onclick={() => setLanguage('zh')} class={currentLang === 'zh' ? 'bg-secondary' : ''}>🇨🇳 中文</DropdownMenuItem>
					<DropdownMenuItem onclick={() => setLanguage('en')} class={currentLang === 'en' ? 'bg-secondary' : ''}>🇺🇸 English</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<div class="hidden md:flex md:items-center md:gap-1.5">
				{#if isAuth && user}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" class="h-8 gap-2 rounded-full px-2">
								<Avatar class="h-7 w-7"><AvatarImage src={user.avatar} alt="" /><AvatarFallback class="text-xs">{user.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
								<span class="text-sm font-medium">{user.username}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" class="w-48">
							<DropdownMenuItem onclick={() => handleNav('/dashboard')}><LayoutDashboard class="mr-2 h-4 w-4" /> {tVal('nav.dashboard')}</DropdownMenuItem>
							<DropdownMenuItem onclick={() => handleNav('/profile')}><User class="mr-2 h-4 w-4" /> {tVal('nav.profile')}</DropdownMenuItem>
							<DropdownMenuItem onclick={() => handleNav('/settings')}><Settings class="mr-2 h-4 w-4" /> {tVal('nav.settings')}</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onclick={handleLogout} class="text-destructive focus:text-destructive"><LogOut class="mr-2 h-4 w-4" /> {tVal('nav.logout')}</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				{:else}
					<Button variant="outline" size="sm" href="/login">{tVal('nav.login')}</Button>
					<Button size="sm" href="/register">{tVal('nav.register')}</Button>
				{/if}
			</div>
		</div>
	</div>
</nav>
