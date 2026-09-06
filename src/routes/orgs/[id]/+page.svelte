<script>
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { isLoggedIn, authLoading, currentUser } from '$lib/stores/auth';
  import { api } from '$lib/api';
  import { showToast } from '$lib/stores/toast';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
  import { ArrowLeft, Settings, UserPlus, LogOut, Shield } from '@lucide/svelte';

  let orgId = $derived(page.params.id);
  let org = $state(null); let members = $state([]); let photos = $state([]);
  let loading = $state(true); let isMember = $state(false); let isAdmin = $state(false);
  let showSettings = $state(false); let editName = $state(''); let editDesc = $state(''); let editBg = $state('');
  let showInvite = $state(false); let inviteUsername = $state('');

  onMount(async () => {
    await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
    if (!$isLoggedIn) { window.location.href = '/login'; return; }
    loadOrg();
  });

  async function loadOrg() {
    loading = true;
    try { const d = await (await api('/api/orgs/'+orgId)).json(); org=d.org; members=d.members||[]; photos=d.photos||[]; isMember=d.isMember; isAdmin=d.isAdmin; }
    catch(e) { showToast('加载失败','error'); }
    finally { loading = false; }
  }

  async function join() { try { await api('/api/orgs/'+orgId+'/join',{method:'POST'});showToast('已加入','success');loadOrg(); } catch(e) { showToast('加入失败','error'); } }
  async function leave() { if (!confirm('确定退出？')) return; try { await api('/api/orgs/'+orgId+'/leave',{method:'POST'});showToast('已退出','success');loadOrg(); } catch(e) { showToast(e.message||'退出失败','error'); } }
  async function kick(uid) { if (!confirm('确定踢出？')) return; try { await api('/api/orgs/'+orgId+'/kick',{method:'POST',body:JSON.stringify({targetUserId:uid})});showToast('已踢出','success');loadOrg(); } catch(e) { showToast('操作失败','error'); } }
  async function invite() { try { await api('/api/orgs/'+orgId+'/invite',{method:'POST',body:JSON.stringify({username:inviteUsername})});showToast('已邀请','success');inviteUsername='';loadOrg(); } catch(e) { showToast(e.message||'邀请失败','error'); } }
  async function saveSettings() { try { await api('/api/orgs/'+orgId+'/settings',{method:'POST',body:JSON.stringify({name:editName,description:editDesc,bg_image:editBg})});showToast('已保存','success');showSettings=false;loadOrg(); } catch(e) { showToast('保存失败','error'); } }
  async function toggleJoin() { try { const d=await(await api('/api/orgs/'+orgId+'/toggle-join',{method:'POST'})).json();showToast(d.is_open?'已开放加入':'已关闭加入','success');loadOrg(); } catch(e) { showToast('操作失败','error'); } }
</script>

{#if loading}
  <div class="py-12 text-center"><div class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>
{:else if org}
  <div class="pb-5">
    <div class="flex h-[200px] items-end bg-gradient-to-br from-slate-700 to-slate-900" style="background-image:{org.bg_image?'url('+org.bg_image+')':''};background-size:cover;background-position:center;">
      <div class="w-full px-4 pb-4" style="max-width:1100px;margin:0 auto;background:linear-gradient(transparent,rgba(0,0,0,.5));">
        <div class="flex items-end justify-between pt-14">
          <div>
            <Button variant="ghost" size="sm" class="h-7 gap-1 text-xs text-white/70 hover:text-white" onclick={()=>goto('/orgs')}><ArrowLeft class="h-3 w-3"/>返回</Button>
            <h1 class="mt-1 text-2xl font-bold text-white">{org.name}</h1>
            <p class="text-sm text-white/70">{org.description||''}</p>
            <Badge variant="secondary" class="mt-1 bg-white/20 text-white text-[10px]">{members.length} 成员 · {org.is_open?'开放加入':'需邀请'}</Badge>
          </div>
          <div class="flex gap-2">
            {#if !isMember}
              <Button size="sm" variant="secondary" class="bg-white text-black hover:bg-white/90" onclick={join} disabled={!org.is_open}>加入组织</Button>
            {:else}
              {#if isAdmin}
                <Button size="sm" class="h-7 gap-1 border-white/30 text-xs text-white" variant="outline" onclick={()=>{editName=org.name;editDesc=org.description;editBg=org.bg_image;showSettings=true;}}><Settings class="h-3.5 w-3.5"/>设置</Button>
                <Button size="sm" class="h-7 gap-1 border-white/30 text-xs text-white" variant="outline" onclick={()=>{showInvite=true;}}><UserPlus class="h-3.5 w-3.5"/>邀请</Button>
                <Button size="sm" class="h-7 gap-1 border-white/30 text-xs text-white" variant="outline" onclick={toggleJoin}>{org.is_open?'关闭加入':'开放加入'}</Button>
              {/if}
              <Button size="sm" class="h-7 gap-1 border-white/30 text-xs text-white" variant="outline" onclick={leave}><LogOut class="h-3.5 w-3.5"/>退出</Button>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-4 px-4" style="max-width:1100px;">
      {#if showSettings}
        <Card class="mb-4"><CardContent class="space-y-2 p-4">
          <h3 class="text-sm font-semibold">编辑组织</h3>
          <Input class="h-8 text-sm" placeholder="名称" bind:value={editName} maxlength="100"/>
          <Input class="h-8 text-sm" placeholder="简介" bind:value={editDesc}/>
          <Input class="h-8 text-sm" placeholder="背景图 URL" bind:value={editBg}/>
          <div class="flex gap-2"><Button size="sm" onclick={saveSettings}>保存</Button><Button variant="outline" size="sm" onclick={()=>showSettings=false}>取消</Button></div>
        </CardContent></Card>
      {/if}
      {#if showInvite}
        <Card class="mb-4"><CardContent class="space-y-2 p-4">
          <h3 class="text-sm font-semibold">邀请成员</h3>
          <div class="flex gap-2"><Input class="h-8 text-sm" placeholder="输入用户名" bind:value={inviteUsername}/><Button size="sm" onclick={invite}>邀请</Button><Button variant="outline" size="sm" onclick={()=>showInvite=false}>取消</Button></div>
        </CardContent></Card>
      {/if}

      <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card><CardContent class="p-3">
          <h3 class="mb-3 text-sm font-semibold">成员 ({members.length})</h3>
          {#each members as m}
            <div class="flex items-center justify-between border-b py-2">
              <div class="flex items-center gap-2">
                <Avatar class="h-8 w-8"><AvatarImage src={m.avatar} alt=""/><AvatarFallback>{m.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <div><p class="text-xs font-medium">{m.username}</p><p class="text-[10px] text-muted-foreground">{new Date(m.joined_at).toLocaleDateString()}</p></div>
              </div>
              <div class="flex items-center gap-1">
                {#if m.role==='admin'}<Badge variant="secondary" class="gap-1 text-[10px]"><Shield class="h-3 w-3"/>群主</Badge>{/if}
                {#if isAdmin && m.username!==$currentUser?.username}<Button variant="ghost" size="icon" class="h-6 w-6 text-xs text-muted-foreground hover:text-destructive" onclick={()=>kick(m.user_id)}>✕</Button>{/if}
              </div>
            </div>
          {/each}
        </CardContent></Card>

        <div>
          <h3 class="mb-3 text-sm font-semibold">组织作品</h3>
          {#if photos.length > 0}
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {#each photos as p}
                <a href="/photo/{p.id}" class="overflow-hidden rounded-lg"><img src={p.thumbnail||p.url} alt="" class="aspect-[3/2] w-full rounded-lg object-cover" loading="lazy"/></a>
              {/each}
            </div>
          {:else}
            <p class="text-xs text-muted-foreground">暂无作品</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="py-24 text-center text-muted-foreground"><p>组织不存在</p></div>
{/if}
