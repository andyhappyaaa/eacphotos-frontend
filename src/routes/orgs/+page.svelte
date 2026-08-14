<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isLoggedIn, authLoading } from '$lib/stores/auth';
  import { api } from '$lib/api';
  import { showToast } from '$lib/stores/toast';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { ArrowLeft, Plus, Users, Loader2 } from '@lucide/svelte';

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
    try { const d = await (await api('/api/orgs/list')).json(); myOrgs = d.mine || []; discoverable = d.discoverable || []; }
    catch(e) { showToast('加载失败','error'); }
    finally { loading = false; }
  }
  async function createOrg() {
    if (!createName) { showToast('请输入组织名称','error'); return; }
    creating = true;
    try { const d = await (await api('/api/orgs/create', { method:'POST', body: JSON.stringify({ name: createName, description: createDesc, bg_image: createBg }) })).json(); showToast('组织创建成功','success'); showCreate=false; createName=''; createDesc=''; createBg=''; goto('/orgs/'+d.id); }
    catch(e) { showToast('创建失败','error'); }
    finally { creating = false; }
  }
  async function joinOrg(orgId) { try { await api('/api/orgs/'+orgId+'/join', { method:'POST' }); showToast('已加入','success'); loadOrgs(); } catch(e) { showToast('加入失败','error'); } }
</script>

<div class="container mx-auto max-w-[1100px] px-4 py-6">
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="sm" class="h-8 gap-1 text-xs" onclick={() => goto('/dashboard')}><ArrowLeft class="h-4 w-4"/>返回</Button>
      <h1 class="text-xl font-bold ml-2">组织</h1>
    </div>
    <Button size="sm" class="h-8 gap-1" onclick={()=>showCreate=true}><Plus class="h-4 w-4"/>创建组织</Button>
  </div>

  {#if showCreate}
    <Card class="mb-4"><CardContent class="p-4 space-y-3">
      <h3 class="text-sm font-semibold">创建新组织</h3>
      <Input class="h-8 text-sm" placeholder="组织名称" bind:value={createName} maxlength="100"/>
      <Input class="h-8 text-sm" placeholder="简介 (可选)" bind:value={createDesc}/>
      <Input class="h-8 text-sm" placeholder="背景图片 URL (可选)" bind:value={createBg}/>
      <div class="flex gap-2">
        <Button size="sm" onclick={createOrg} disabled={creating}>{creating?'创建中...':'创建'}</Button>
        <Button variant="outline" size="sm" onclick={()=>{showCreate=false;createName='';createDesc='';createBg='';}}>取消</Button>
      </div>
    </CardContent></Card>
  {/if}

  {#if loading}
    <div class="py-12 text-center"><Loader2 class="mx-auto h-6 w-6 animate-spin text-muted-foreground"/></div>
  {/if}

  {#if myOrgs.length > 0}
    <h3 class="text-base font-semibold mb-3">我的组织</h3>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
      {#each myOrgs as org}
        <a href="/orgs/{org.id}" class="no-underline">
          <Card class="h-full overflow-hidden transition-shadow hover:shadow-md">
            <CardContent class="p-0">
              <div class="h-24 rounded-t-lg bg-gradient-to-br from-slate-700 to-slate-900" style="background-image:{org.bg_image?'url('+org.bg_image+')':''};background-size:cover;background-position:center;"></div>
              <div class="p-3">
                <h4 class="text-sm font-semibold">{org.name}</h4>
                <p class="text-xs text-muted-foreground">{org.mc||0} 成员 · {org.role}</p>
              </div>
            </CardContent>
          </Card>
        </a>
      {/each}
    </div>
  {/if}

  {#if discoverable.length > 0}
    <h3 class="text-base font-semibold mb-3">发现组织</h3>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each discoverable as org}
        <Card class="overflow-hidden">
          <CardContent class="p-0">
            <div class="h-20 rounded-t-lg bg-muted" style="background-image:{org.bg_image?'url('+org.bg_image+')':''};background-size:cover;background-position:center;"></div>
            <div class="p-3">
              <h4 class="text-sm font-semibold">{org.name}</h4>
              <p class="text-xs text-muted-foreground">{org.mc||0} 成员</p>
              <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{org.description||''}</p>
              <Button size="sm" variant="outline" class="mt-3 h-7 w-full text-xs" onclick={(e)=>{e.preventDefault();joinOrg(org.id);}}>加入组织</Button>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}

  {#if !loading && myOrgs.length===0 && discoverable.length===0}
    <div class="py-16 text-center text-muted-foreground">
      <Users class="mx-auto mb-3 opacity-20" style="width:60px;height:60px;"/>
      <p class="text-lg">还没有组织</p>
      <p class="text-sm">创建你的第一个组织，或等待其他组织开放加入</p>
    </div>
  {/if}
</div>
