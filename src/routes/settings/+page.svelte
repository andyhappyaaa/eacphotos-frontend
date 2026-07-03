<script>
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isLoggedIn, currentUser } from '$lib/stores/auth';
	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { showToast } from '$lib/stores/toast';
	import { t } from '$lib/stores/i18n';

	let user = $derived(get(currentUser));
	let bio = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let oldPassword = $state('');

	onMount(() => {
		if (!$isLoggedIn) goto('/login');
		loadProfile();
	});

	async function loadProfile() {
		if (!user) return;
		try {
			const r = await api(`/api/users/${user.id}`);
			const p = await r.json();
			bio = p.bio || '';
		} catch (e) { /* */ }
	}

	async function handleAvatarUpload(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		const formData = new FormData();
		formData.append('avatar', file);
		try {
			await api('/api/users/avatar', { method: 'POST', body: formData, headers: {} });
			showToast('头像上传成功', 'success');
		} catch (err) {
			showToast('上传失败', 'error');
		}
	}

	async function updateProfile(e) {
		e.preventDefault();
		try {
			await api('/api/users/me', { method: 'PUT', body: JSON.stringify({ bio }) });
			showToast('保存成功', 'success');
		} catch (err) {
			showToast('保存失败', 'error');
		}
	}

	async function changePassword(e) {
		e.preventDefault();
		if (newPassword !== confirmPassword) { showToast('密码不一致', 'error'); return; }
		try {
			await api('/api/users/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) });
			showToast('密码已更改', 'success');
			newPassword = ''; confirmPassword = ''; oldPassword = '';
		} catch (err) {
			showToast('修改失败', 'error');
		}
	}
</script>

<div class="container mx-auto max-w-[800px] px-5 py-8">
	<h1 class="mb-6 text-3xl font-bold">⚙️ 设置</h1>

	<Tabs defaultValue="profile">
		<TabsList>
			<TabsTrigger value="profile">个人资料</TabsTrigger>
			<TabsTrigger value="password">修改密码</TabsTrigger>
			<TabsTrigger value="preferences">偏好设置</TabsTrigger>
		</TabsList>

		<TabsContent value="profile" class="mt-6">
			<div class="space-y-6 rounded-xl border p-6">
				<div>
					<h3 class="font-semibold">🖼️ 头像</h3>
					<Input type="file" accept="image/*" onchange={handleAvatarUpload} class="mt-2" />
				</div>
				<form onsubmit={updateProfile}>
					<div class="mb-4">
						<Label for="bio">简介</Label>
						<textarea id="bio" bind:value={bio} rows="4" class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"></textarea>
					</div>
					<Button type="submit">保存</Button>
				</form>
			</div>
		</TabsContent>

		<TabsContent value="password" class="mt-6">
			<form onsubmit={changePassword} class="space-y-4 rounded-xl border p-6">
				<div>
					<Label for="oldPw">当前密码</Label>
					<Input id="oldPw" type="password" bind:value={oldPassword} required class="mt-1" />
				</div>
				<div>
					<Label for="newPw">新密码</Label>
					<Input id="newPw" type="password" bind:value={newPassword} required class="mt-1" />
				</div>
				<div>
					<Label for="confirmPw">确认新密码</Label>
					<Input id="confirmPw" type="password" bind:value={confirmPassword} required class="mt-1" />
				</div>
				<Button type="submit">修改密码</Button>
			</form>
		</TabsContent>

		<TabsContent value="preferences" class="mt-6">
			<div class="space-y-4 rounded-xl border p-6">
				<h3 class="font-semibold">偏好设置</h3>
				<p class="text-sm text-muted-foreground">语言和主题设置可通过导航栏快速切换</p>
			</div>
		</TabsContent>
	</Tabs>
</div>
