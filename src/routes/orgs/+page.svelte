<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isLoggedIn, authLoading } from '$lib/stores/auth';
  import { api } from '$lib/api';
  import { showToast } from '$lib/stores/toast';
  import { ArrowLeft, Plus, Users, Search, Loader2 } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Card, CardContent } from '$lib/components/ui/card';

  let myOrgs = $state([]);
  let discoverable = $state([]);
  let loading = $state(true);
  let showCreate = $state(false);
  let createName = $state(''); let createDesc = $state(''); let createBg = $state('');
  let creating = $state(false);

  onMount(async () => {
    await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
    if (!$isLoggedIn) { window.location.href = '/login'; return; }
    loadOrgs();
  });

  async function loadOrgs() {
    loading = true;
    try {
      const r = await api('/api/orgs/list');
      const d = await r.json();
      myOrgs = d.mine || [];
      discoverable = d.discoverable || [];
    } catch(e) { showToast('加载失败','error'); }
    finally { loading = false; }
  }

  async function createOrg() {
    if (!createName) { showToast('请输入组织名称','error'); return; }
    creating = true;
    try {
      const r = await api('/api/orgs/create', { method:'POST', body: JSON.stringify({ name: createName, description: createDesc, bg_image: createBg }) });
      const d = await r.json();
      showToast('组织创建成功','success');
      showCreate = false; createName=''; createDesc=''; createBg='';
      goto('/orgs/' + d.id);
    } catch(e) { showToast('创建失败','error'); }
    finally { creating = false; }
  }

  async function joinOrg(orgId) {
    try {
      await api('/api/orgs/' + orgId + '/join', { method:'POST' });
      showToast('已加入','success');
      loadOrgs();
    } catch(e) { showToast('加入失败','error'); }
  }
</script>

<div class="container mx-auto max-w-[1100px] px-4 py-6">
  <div class="d-flex align-items-center justify-content-between mb-4">
    <div class="d-flex align-items-center gap-2">
      <a href="/dashboard" class="d-inline-flex align-items-center gap-1 text-muted text-decoration-none small"><ArrowLeft class="h-4 w-4"/>返回</a>
      <h1 class="fs-4 fw-bold mb-0 ms-2">组织</h1>
    </div>
    <button class="btn btn-primary btn-sm d-flex align-items-center gap-1" onclick={()=>showCreate=true}>
      <Plus class="h-4 w-4"/>创建组织
    </button>
  </div>

  {#if showCreate}
    <Card class="mb-4">
      <CardContent class="p-4">
        <h3 class="fs-6 fw-semibold mb-3">创建新组织</h3>
        <div class="d-flex flex-column gap-2">
          <Input placeholder="组织名称" bind:value={createName} maxlength="100" />
          <Input placeholder="简介 (可选)" bind:value={createDesc} />
          <Input placeholder="背景图片 URL (可选)" bind:value={createBg} />
          <div class="d-flex gap-2">
            <button class="btn btn-primary btn-sm" onclick={createOrg} disabled={creating}>{creating?'创建中...':'创建'}</button>
            <button class="btn btn-outline-secondary btn-sm" onclick={()=>{showCreate=false;createName='';createDesc='';createBg='';}}>取消</button>
          </div>
        </div>
      </CardContent>
    </Card>
  {/if}

  {#if loading}
    <div class="text-center py-5"><Loader2 class="h-6 w-6 animate-spin text-muted"/></div>
  {/if}

  {#if myOrgs.length > 0}
    <h3 class="fs-5 fw-semibold mb-3">我的组织</h3>
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 mb-4">
      {#each myOrgs as org}
        <div class="col">
          <a href="/orgs/{org.id}" class="text-decoration-none">
            <Card class="h-100 hover-shadow">
              <CardContent class="p-0">
                <div class="rounded-top" style="height:100px;background:linear-gradient(135deg,var(--bs-primary),var(--bs-indigo)) center/cover {org.bg_image?'url('+org.bg_image+')':''};"></div>
                <div class="p-3">
                  <h4 class="fs-6 fw-semibold mb-1">{org.name}</h4>
                  <p class="small text-muted mb-2">{org.mc||0} 成员 · {org.role}</p>
                </div>
              </CardContent>
            </Card>
          </a>
        </div>
      {/each}
    </div>
  {/if}

  {#if discoverable.length > 0}
    <h3 class="fs-5 fw-semibold mb-3">发现组织</h3>
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
      {#each discoverable as org}
        <div class="col">
          <Card class="h-100">
            <CardContent class="p-0">
              <div class="rounded-top" style="height:80px;background:var(--bs-tertiary-bg) center/cover {org.bg_image?'url('+org.bg_image+')':''};"></div>
              <div class="p-3">
                <h4 class="fs-6 fw-semibold mb-1">{org.name}</h4>
                <p class="small text-muted mb-2">{org.mc||0} 成员</p>
                <p class="small text-muted line-clamp-2 mb-3">{org.description||''}</p>
                <button class="btn btn-outline-primary btn-sm w-100" onclick={(e)=>{e.preventDefault();joinOrg(org.id);}}>加入组织</button>
              </div>
            </CardContent>
          </Card>
        </div>
      {/each}
    </div>
  {/if}

  {#if !loading && myOrgs.length === 0 && discoverable.length === 0}
    <div class="text-center py-5 text-muted">
      <Users class="h-12 w-12 mb-3 opacity-20" style="width:60px;height:60px;"/>
      <p>还没有组织</p>
      <p class="small">创建你的第一个组织，或等待其他组织开放加入</p>
    </div>
  {/if}
</div>
