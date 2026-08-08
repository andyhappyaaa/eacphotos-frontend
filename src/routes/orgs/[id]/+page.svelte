<script>
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { isLoggedIn, authLoading, currentUser } from '$lib/stores/auth';
  import { api } from '$lib/api';
  import { showToast } from '$lib/stores/toast';
  import { ArrowLeft, Settings, UserPlus, LogOut, Shield } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
  import { Separator } from '$lib/components/ui/separator';

  let orgId = $derived(page.params.id);
  let org = $state(null);
  let members = $state([]);
  let photos = $state([]);
  let loading = $state(true);
  let isMember = $state(false);
  let isAdmin = $state(false);

  let showSettings = $state(false);
  let editName = $state(''); let editDesc = $state(''); let editBg = $state('');
  let showInvite = $state(false);
  let inviteUsername = $state('');

  onMount(async () => {
    await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
    if (!$isLoggedIn) { window.location.href = '/login'; return; }
    loadOrg();
  });

  async function loadOrg() {
    loading = true;
    try {
      const r = await api('/api/orgs/' + orgId);
      const d = await r.json();
      org = d.org; members = d.members || []; photos = d.photos || [];
      isMember = d.isMember; isAdmin = d.isAdmin;
    } catch(e) { showToast('加载失败','error'); }
    finally { loading = false; }
  }

  async function join() { try { await api('/api/orgs/'+orgId+'/join', {method:'POST'}); showToast('已加入','success'); loadOrg(); } catch(e) { showToast('加入失败','error'); } }
  async function leave() { if (!confirm('确定退出该组织？')) return; try { await api('/api/orgs/'+orgId+'/leave', {method:'POST'}); showToast('已退出','success'); loadOrg(); } catch(e) { showToast(e.message||'退出失败','error'); } }
  async function kick(userId) { if (!confirm('确定踢出该成员？')) return; try { await api('/api/orgs/'+orgId+'/kick', {method:'POST',body:JSON.stringify({targetUserId:userId})}); showToast('已踢出','success'); loadOrg(); } catch(e) { showToast('操作失败','error'); } }
  async function invite() { try { await api('/api/orgs/'+orgId+'/invite', {method:'POST',body:JSON.stringify({username:inviteUsername})}); showToast('已邀请','success'); inviteUsername=''; loadOrg(); } catch(e) { showToast(e.message||'邀请失败','error'); } }
  async function saveSettings() { try { await api('/api/orgs/'+orgId+'/settings', {method:'POST',body:JSON.stringify({name:editName,description:editDesc,bg_image:editBg})}); showToast('已保存','success'); showSettings=false; loadOrg(); } catch(e) { showToast('保存失败','error'); } }
  async function toggleJoin() { try { const r = await api('/api/orgs/'+orgId+'/toggle-join', {method:'POST'}); const d = await r.json(); showToast(d.is_open?'已开放加入':'已关闭加入','success'); loadOrg(); } catch(e) { showToast('操作失败','error'); } }
</script>

<svelte:head>
	<link rel="stylesheet" href="https://gcore.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
</svelte:head>



{#if loading}
  <div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>
{:else if org}
  <div class="pb-5">
    <!-- Banner -->
    <div style="height:200px;background:linear-gradient(135deg,var(--bs-primary,#1e293b),var(--bs-indigo,#312e81)) center/cover {org.bg_image?'url('+org.bg_image+')':''};" class="d-flex align-items-end">
      <div class="container mx-auto px-4" style="max-width:1100px;">
        <div class="d-flex align-items-end justify-content-between pb-3" style="background:linear-gradient(transparent,rgba(0,0,0,.6));margin:-3px -16px 0;padding:56px 16px 16px;">
          <div>
            <a href="/orgs" class="text-white-50 text-decoration-none small d-inline-flex align-items-center gap-1 mb-1"><ArrowLeft class="h-3 w-3"/>返回</a>
            <h1 class="fs-3 fw-bold text-white mb-1">{org.name}</h1>
            <p class="text-white-50 mb-0 small">{org.description||''}</p>
            <span class="badge bg-white bg-opacity-25 text-white mt-1">{members.length} 成员 · {org.is_open?'开放加入':'需邀请'}</span>
          </div>
          <div class="d-flex gap-2">
            {#if !isMember}
              <button class="btn btn-light btn-sm" onclick={join} disabled={!org.is_open}>加入组织</button>
            {:else}
              {#if isAdmin}
                <button class="btn btn-outline-light btn-sm" onclick={()=>{editName=org.name;editDesc=org.description;editBg=org.bg_image;showSettings=true;}}><Settings class="h-4 w-4"/>设置</button>
                <button class="btn btn-outline-light btn-sm" onclick={()=>{showInvite=true;}}><UserPlus class="h-4 w-4"/>邀请</button>
                <button class="btn btn-outline-light btn-sm" onclick={toggleJoin}>{org.is_open?'关闭加入':'开放加入'}</button>
              {/if}
              <button class="btn btn-outline-light btn-sm" onclick={leave}><LogOut class="h-4 w-4"/>退出</button>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class="container mx-auto mt-4 px-4" style="max-width:1100px;">
      {#if showSettings}
        <Card class="mb-4"><CardContent class="p-4 d-flex flex-column gap-2">
          <h3 class="fs-6 fw-semibold">编辑组织</h3>
          <Input placeholder="名称" bind:value={editName} maxlength="100"/>
          <Input placeholder="简介" bind:value={editDesc}/>
          <Input placeholder="背景图 URL" bind:value={editBg}/>
          <div class="d-flex gap-2"><button class="btn btn-primary btn-sm" onclick={saveSettings}>保存</button><button class="btn btn-outline-secondary btn-sm" onclick={()=>showSettings=false}>取消</button></div>
        </CardContent></Card>
      {/if}

      {#if showInvite}
        <Card class="mb-4"><CardContent class="p-4">
          <h3 class="fs-6 fw-semibold mb-2">邀请成员</h3>
          <div class="d-flex gap-2"><Input placeholder="输入用户名" bind:value={inviteUsername}/><button class="btn btn-primary btn-sm" onclick={invite}>邀请</button><button class="btn btn-outline-secondary btn-sm" onclick={()=>showInvite=false}>取消</button></div>
        </CardContent></Card>
      {/if}

      <div class="row g-3">
        <!-- Members -->
        <div class="col-lg-4">
          <Card><CardContent class="p-3">
            <h3 class="fs-6 fw-semibold mb-3">成员 ({members.length})</h3>
            {#each members as m}
              <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                <div class="d-flex align-items-center gap-2">
                  <Avatar class="h-8 w-8"><AvatarImage src={m.avatar} alt=""/><AvatarFallback>{m.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                  <div><p class="mb-0 small fw-medium">{m.username}</p><p class="mb-0 text-muted" style="font-size:10px;">{new Date(m.joined_at).toLocaleDateString()}</p></div>
                </div>
                <div class="d-flex align-items-center gap-2">
                  {#if m.role === 'admin'}<Badge variant="secondary" class="text-xs"><Shield class="h-3 w-3 mr-1"/>群主</Badge>{/if}
                  {#if isAdmin && m.username !== $currentUser?.username}<button class="btn btn-ghost btn-sm text-danger p-0" onclick={()=>kick(m.user_id)} title="踢出">✕</button>{/if}
                </div>
              </div>
            {/each}
          </CardContent></Card>
        </div>

        <!-- Photos -->
        <div class="col-lg-8">
          <h3 class="fs-6 fw-semibold mb-3">组织作品</h3>
          {#if photos.length > 0}
            <div class="row row-cols-2 row-cols-md-3 g-2">
              {#each photos as p}
                <div class="col"><a href="/photo/{p.id}"><img src={p.thumbnail||p.url} alt="" class="w-100 rounded object-fit-cover" style="aspect-ratio:3/2;" loading="lazy"/></a></div>
              {/each}
            </div>
          {:else}
            <p class="text-muted small">暂无作品</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="text-center py-5 text-muted"><p>组织不存在</p></div>
{/if}
