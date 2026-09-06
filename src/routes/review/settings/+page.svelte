<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAdmin, isSuperAdmin, authLoading } from "$lib/stores/auth";
  import { api } from '$lib/api';
  import { showToast } from '$lib/stores/toast';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { Badge } from '$lib/components/ui/badge';
  import { Separator } from '$lib/components/ui/separator';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';
  import { Switch } from '$lib/components/ui/switch';
  import { ArrowLeft, RefreshCw, Save, Plus, Trash2, Image, Newspaper, SlidersHorizontal, Users, Shield, Briefcase } from '@lucide/svelte';

  let activeTab = $state('carousel');
  let loading = $state(false);
  let carouselItems = $state('');
  let ann = $state({ title:'',content:'',layout:'default',show_github_updates:false,github_repo:'',is_active:true });
  let rules = $state([]);
  let newRuleText = $state('');
  let banSearch = $state(''); let banResult = $state(null);
  let banReason = $state(''); let banDays = $state(7);
  let reviewers = $state([]);
  let newRv = $state({username:'',email:'',password:'',role:'reviewer'});
  let jobs = $state([]);
  let jobForm = $state({id:'',title:'',department:'',location:'',employment_type:'Full-time',salary_min:'',salary_max:'',description:'',requirements:'',is_active:true,sort_order:0});
  let showJobForm = $state(false);

  onMount(async () => {
    await new Promise(r => { let u = authLoading.subscribe(v => { if (!v) { u(); r(); } }); });
    if (!$isAdmin) { window.location.href = '/login'; return; }
    loadTab('carousel');
  });

  async function loadTab(tab) {
    activeTab = tab; loading = true;
    try {
      if (tab === 'carousel' || tab === 'announcement') {
        const [cr, ar] = await Promise.all([
          api('/api/admin/carousel', { method:'POST', body: JSON.stringify({}) }),
          api('/api/admin/announcement', { method:'POST', body: JSON.stringify({}) })
        ]);
        carouselItems = JSON.stringify((await cr.json()).carousel||[], null, 2);
        const ad = await ar.json();
        if (ad.announcement) { ann = { ...ad.announcement }; if (ad.announcement.github_repo) ann.github_repo = ad.announcement.github_repo; }
      }
      if (tab === 'rules') { const r = await api('/api/admin/upload-rules', { method:'POST', body:JSON.stringify({}) }); rules = (await r.json()).rules || []; }
      if (tab === 'reviewers') { const r = await api('/api/admin/reviewers', { method:'POST', body:'{}'}); reviewers = (await r.json()).reviewers || []; }
      if (tab === 'jobs') { const r = await api('/api/admin/job-positions', { method:'POST', body:JSON.stringify({action:'list'})}); jobs = (await r.json()).positions || []; }
    } catch(e) { showToast('加载失败','error'); }
    finally { loading = false; }
  }

  async function saveCarousel() { try { JSON.parse(carouselItems); await api('/api/admin/carousel', { method:'POST', body: JSON.stringify({ carousel: JSON.parse(carouselItems) }) }); showToast('已保存','success'); } catch(e) { showToast('JSON 格式错误','error'); } }
  async function saveAnnouncement() { try { await api('/api/admin/announcement', { method:'POST', body: JSON.stringify({...ann, action:'set'}) }); showToast('已保存','success'); } catch(e) { showToast('保存失败','error'); } }
  async function fetchNews() { try { const r = await api('/api/admin/fetch-news', { method:'POST', body:'{}'}); showToast((await r.json()).message,'success'); } catch(e) { showToast('拉取失败','error'); } }
  async function addRule() { if (!newRuleText) return; try { const r = await api('/api/admin/upload-rules', { method:'POST', body:JSON.stringify({action:'add',text:newRuleText})}); rules = (await r.json()).rules||[]; newRuleText=''; } catch(e) { showToast('添加失败','error'); } }
  async function toggleRule(id) { try { const r = await api('/api/admin/upload-rules', { method:'POST', body:JSON.stringify({action:'toggle',id})}); rules = (await r.json()).rules||[]; } catch(e) { showToast('操作失败','error'); } }
  async function deleteRule(id) { if (!confirm('删除此规则？')) return; try { const r = await api('/api/admin/upload-rules', { method:'POST', body:JSON.stringify({action:'delete',id})}); rules = (await r.json()).rules||[]; } catch(e) { showToast('删除失败','error'); } }
  async function searchBan() { if (!banSearch) return; try { const r = await api('/api/admin/users/bans', { method:'POST', body:JSON.stringify({action:'search',username:banSearch})}); banResult = await r.json(); } catch(e) { showToast('搜索失败','error'); } }
  async function banUser(uid) { if (!banReason) { showToast('请输入原因','error'); return; } try { await api('/api/admin/users/bans', { method:'POST', body:JSON.stringify({action:'ban',userId:uid,reason:banReason,durationDays:banDays})}); showToast('已封禁','success'); banResult=null; banSearch=''; banReason=''; } catch(e) { showToast('操作失败','error'); } }
  async function unbanUser(uid) { try { await api('/api/admin/users/bans', { method:'POST', body:JSON.stringify({action:'unban',userId:uid})}); showToast('已解封','success'); searchBan(); } catch(e) { showToast('操作失败','error'); } }
  async function createReviewer() { if (!newRv.username||!newRv.email||!newRv.password) { showToast('请填写完整','error'); return; } try { await api('/api/admin/create-reviewer', { method:'POST', body:JSON.stringify(newRv)}); showToast('已创建','success'); newRv={username:'',email:'',password:'',role:'reviewer'}; loadTab('reviewers'); } catch(e) { showToast('创建失败','error'); } }
  async function updateRole(rid, role) { try { await api('/api/admin/update-role', { method:'POST', body:JSON.stringify({reviewerId:rid,role})}); showToast('已更新','success'); loadTab('reviewers'); } catch(e) { showToast('更新失败','error'); } }
  async function deleteReviewer(rid) { if (!confirm('确定删除该审核员？')) return; try { await api('/api/admin/delete-reviewer', { method:'POST', body:JSON.stringify({reviewerId:rid})}); showToast('已删除','success'); loadTab('reviewers'); } catch(e) { showToast('删除失败','error'); } }
  async function saveJob() { try { await api('/api/admin/job-positions', { method:'POST', body:JSON.stringify({action:jobForm.id?'update':'create',position:jobForm})}); showToast('已保存','success'); showJobForm=false; jobForm={id:'',title:'',department:'',location:'',employment_type:'Full-time',salary_min:'',salary_max:'',description:'',requirements:'',is_active:true,sort_order:0}; loadTab('jobs'); } catch(e) { showToast('保存失败','error'); } }
  async function deleteJob(jid) { if (!confirm('删除该职位？')) return; try { await api('/api/admin/job-positions', { method:'POST', body:JSON.stringify({action:'delete',id:jid})}); showToast('已删除','success'); loadTab('jobs'); } catch(e) { showToast('删除失败','error'); } }
  function editJob(j) { jobForm={...j}; showJobForm=true; }

  const tabs = [
    { key:'carousel', label:'轮播图', icon: Image },
    { key:'announcement', label:'公告', icon: SlidersHorizontal },
    { key:'news', label:'新闻拉取', icon: Newspaper },
    { key:'rules', label:'上传规则', icon: Shield },
    { key:'bans', label:'用户封禁', icon: Users },
    { key:'reviewers', label:'审核员', icon: Briefcase },
    { key:'jobs', label:'招聘', icon: Briefcase },
    { key:'photos', label:'图片管理', icon: Image },
  ];
</script>

<div class="container mx-auto px-4 py-4" style="max-width:1200px;">
  <div class="flex items-center gap-2 mb-4">
    <Button variant="ghost" size="sm" class="h-8 gap-1 text-xs" onclick={() => goto('/dashboard')}><ArrowLeft class="h-4 w-4"/>返回仪表盘</Button>
    <h1 class="m-0 text-xl font-bold">系统设置</h1>
    <Button variant="outline" size="sm" class="ml-auto h-8" onclick={()=>loadTab(activeTab)} disabled={loading}><RefreshCw class="mr-1 h-3.5 w-3.5 {loading?'animate-spin':''}"/></Button>
  </div>

  <div class="flex flex-wrap gap-1 mb-4 border-b pb-2">
    {#each tabs as t}
      <Button variant={activeTab===t.key?'secondary':'ghost'} size="sm" class="h-7 text-xs gap-1" onclick={()=>loadTab(t.key)}><t.icon class="h-3.5 w-3.5"/>{t.label}</Button>
    {/each}
  </div>

  <div style="min-height:400px;">
    {#if activeTab === 'carousel'}
      <Card><CardContent class="p-4 space-y-3">
        <h3 class="text-sm font-semibold">首页轮播图</h3>
        <p class="text-xs text-muted-foreground">JSON 格式: [{'"img":"url","title":"标题"'}]</p>
        <textarea class="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs" rows="8" bind:value={carouselItems}></textarea>
        <Button size="sm" onclick={saveCarousel}><Save class="mr-1 h-3.5 w-3.5"/>保存</Button>
      </CardContent></Card>
    {/if}

    {#if activeTab === 'announcement'}
      <Card><CardContent class="p-4 space-y-3">
        <h3 class="text-sm font-semibold">站点公告</h3>
        <Input class="h-8 text-sm" placeholder="标题" bind:value={ann.title}/>
        <textarea class="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs" rows="6" placeholder="HTML 内容" bind:value={ann.content}></textarea>
        <div class="flex flex-wrap items-center gap-3">
          <select class="h-8 rounded-lg border bg-background px-2 text-xs" bind:value={ann.layout}><option value="default">默认</option><option value="compact">紧凑</option></select>
          <label class="flex items-center gap-1.5 text-xs"><input type="checkbox" class="h-3.5 w-3.5 rounded" bind:checked={ann.show_github_updates}/> GitHub 更新</label>
          {#if ann.show_github_updates}
            <Input class="h-8 w-72 text-xs" placeholder="owner/repo (逗号分隔多仓库)" bind:value={ann.github_repo}/>
          {/if}
          <label class="flex items-center gap-1.5 text-xs"><input type="checkbox" class="h-3.5 w-3.5 rounded" bind:checked={ann.is_active}/> 启用</label>
        </div>
        <Button size="sm" onclick={saveAnnouncement}><Save class="mr-1 h-3.5 w-3.5"/>保存公告</Button>
      </CardContent></Card>
    {/if}

    {#if activeTab === 'news'}
      <Card><CardContent class="flex items-center justify-between p-4">
        <div><h3 class="text-sm font-semibold">拉取新闻</h3><p class="text-xs text-muted-foreground">从 AeroRoutes RSS 获取最新航空新闻</p></div>
        <Button size="sm" onclick={fetchNews}><RefreshCw class="mr-1 h-3.5 w-3.5"/>立即拉取</Button>
      </CardContent></Card>
    {/if}

    {#if activeTab === 'rules'}
      <Card><CardContent class="p-4 space-y-3">
        <h3 class="text-sm font-semibold">上传规则</h3>
        <div class="flex gap-2">
          <Input class="h-8 flex-1 text-sm" placeholder="新规则内容" bind:value={newRuleText}/>
          <Button size="sm" onclick={addRule}><Plus class="mr-1 h-3.5 w-3.5"/>添加</Button>
        </div>
        {#each rules as r}
          <div class="flex items-center justify-between border-b py-2">
            <div class="flex items-center gap-2">
              <Badge variant={r.active!==false?'default':'secondary'} class="cursor-pointer text-[10px]" onclick={()=>toggleRule(r.id)}>{r.active!==false?'启用':'禁用'}</Badge>
              <span class="text-xs">{r.text}</span>
            </div>
            <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive" onclick={()=>deleteRule(r.id)}><Trash2 class="h-3 w-3"/></Button>
          </div>
        {/each}
      </CardContent></Card>
    {/if}

    {#if activeTab === 'bans'}
      <Card><CardContent class="p-4 space-y-3">
        <h3 class="text-sm font-semibold">用户封禁</h3>
        <div class="flex gap-2">
          <Input class="h-8 w-60 text-sm" placeholder="搜索用户名" bind:value={banSearch}/>
          <Button size="sm" onclick={searchBan}>搜索</Button>
        </div>
        {#if banResult?.user}
          <div class="rounded-lg bg-secondary/50 p-3 text-sm">
            <strong>{banResult.user.username}</strong> ({banResult.user.email}) · 封禁记录: {banResult.bans?.length||0} 次
          </div>
          {#each banResult.bans||[] as b}
            <div class="flex justify-between border-b py-1 text-xs">
              <span>{b.reason||'无原因'} · {new Date(b.banned_at||b.created_at).toLocaleDateString()}{b.expires_at?' → '+new Date(b.expires_at).toLocaleDateString():' · 永久'}</span>
              <Badge variant={b.is_active?'destructive':'secondary'} class="text-[10px]">{b.is_active?'活跃':'已解除'}</Badge>
            </div>
          {/each}
          <div class="flex gap-2 flex-wrap items-center">
            <Input class="h-8 w-48 text-xs" placeholder="封禁原因" bind:value={banReason}/>
            <select class="h-8 rounded-lg border bg-background px-2 text-xs" bind:value={banDays}><option value={7}>7 天</option><option value={30}>30 天</option><option value={365}>1 年</option><option value={0}>永久</option></select>
            <Button variant="destructive" size="sm" onclick={()=>banUser(banResult.user.id)}>封禁</Button>
            <Button variant="secondary" size="sm" onclick={()=>unbanUser(banResult.user.id)}>解封</Button>
          </div>
        {:else if banResult?.error}
          <p class="text-xs text-destructive">{banResult.error}</p>
        {/if}
      </CardContent></Card>
    {/if}

    {#if activeTab === 'reviewers'}
      <Card><CardContent class="p-4 space-y-3">
        <h3 class="text-sm font-semibold">审核员管理</h3>
        {#if $isSuperAdmin}
          <div class="flex flex-wrap gap-2">
            <Input class="h-8 w-28 text-xs" placeholder="用户名" bind:value={newRv.username}/>
            <Input class="h-8 w-44 text-xs" placeholder="邮箱" bind:value={newRv.email}/>
            <Input class="h-8 w-28 text-xs" type="password" placeholder="密码" bind:value={newRv.password}/>
            <select class="h-8 rounded-lg border bg-background px-2 text-xs" bind:value={newRv.role}><option value="reviewer">审核员</option><option value="admin">管理员</option><option value="superadmin">超管</option></select>
            <Button size="sm" onclick={createReviewer}><Plus class="mr-1 h-3.5 w-3.5"/>添加</Button>
          </div>
        {/if}
        <table class="w-full text-sm">
          <thead><tr class="border-b text-left text-xs text-muted-foreground"><th class="py-1.5">用户名</th><th class="py-1.5">邮箱</th><th class="py-1.5">角色</th><th class="py-1.5">2FA</th><th class="py-1.5">操作</th></tr></thead>
          <tbody>
            {#each reviewers as rv}
              <tr class="border-b">
                <td class="py-1.5">{rv.username}</td><td class="py-1.5 text-xs">{rv.email}</td>
                <td class="py-1.5">
                  {#if $isSuperAdmin}
                    <select class="h-7 rounded border bg-background px-1 text-xs" value={rv.role} onchange={(e)=>updateRole(rv.id,e.target.value)}>
                      <option value="reviewer">审核员</option><option value="admin">管理员</option><option value="superadmin">超管</option>
                    </select>
                  {:else}<Badge variant="secondary" class="text-[10px]">{rv.role}</Badge>{/if}
                </td>
                <td class="py-1.5">{rv.two_factor_enabled?'✓':'—'}</td>
                <td class="py-1.5">{#if $isSuperAdmin}<Button variant="ghost" size="icon" class="h-6 w-6 text-muted-foreground hover:text-destructive" onclick={()=>deleteReviewer(rv.id)}><Trash2 class="h-3 w-3"/></Button>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </CardContent></Card>
    {/if}

    {#if activeTab === 'jobs'}
      <Card><CardContent class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold">招聘职位</h3>
          {#if $isSuperAdmin}<Button size="sm" onclick={()=>{jobForm={id:'',title:'',department:'',location:'',employment_type:'Full-time',salary_min:'',salary_max:'',description:'',requirements:'',is_active:true,sort_order:0};showJobForm=true;}}><Plus class="mr-1 h-3.5 w-3.5"/>新增</Button>{/if}
        </div>
        {#each jobs as j}
          <div class="flex items-center justify-between border-b py-2">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{j.title}</span>
              <span class="text-xs text-muted-foreground">{j.department} · {j.location} · {j.employment_type}</span>
              <Badge variant={j.is_active?'default':'secondary'} class="text-[10px]">{j.is_active?'启用':'停用'}</Badge>
            </div>
            <div>{#if $isSuperAdmin}
              <Button variant="ghost" size="sm" class="h-7 text-xs" onclick={()=>editJob(j)}>编辑</Button>
              <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive" onclick={()=>deleteJob(j.id)}><Trash2 class="h-3 w-3"/></Button>
            {/if}</div>
          </div>
        {/each}
      </CardContent></Card>

      {#if showJobForm && $isSuperAdmin}
        <Card class="mt-3"><CardContent class="p-4 space-y-3">
          <h3 class="text-sm font-semibold">{jobForm.id?'编辑':'新增'}职位</h3>
          <div class="grid grid-cols-2 gap-2">
            <Input class="h-8 text-xs" placeholder="职位名称*" bind:value={jobForm.title}/>
            <Input class="h-8 text-xs" placeholder="部门" bind:value={jobForm.department}/>
            <Input class="h-8 text-xs" placeholder="地点" bind:value={jobForm.location}/>
            <select class="h-8 rounded-lg border bg-background px-2 text-xs" bind:value={jobForm.employment_type}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Volunteer</option></select>
            <Input class="h-8 text-xs" placeholder="薪资下限" bind:value={jobForm.salary_min}/>
            <Input class="h-8 text-xs" placeholder="薪资上限" bind:value={jobForm.salary_max}/>
          </div>
          <textarea class="w-full rounded-lg border bg-background px-3 py-2 text-xs" rows="3" placeholder="职位描述" bind:value={jobForm.description}></textarea>
          <textarea class="w-full rounded-lg border bg-background px-3 py-2 text-xs" rows="2" placeholder="任职要求" bind:value={jobForm.requirements}></textarea>
          <div class="flex gap-2">
            <Button size="sm" onclick={saveJob}>保存</Button>
            <Button variant="outline" size="sm" onclick={()=>showJobForm=false}>取消</Button>
          </div>
        </CardContent></Card>
      {/if}
    {/if}

    {#if activeTab === 'photos'}
      <Card><CardContent class="flex flex-col items-center gap-2 p-6">
        <h3 class="text-sm font-semibold">图片管理</h3>
        <p class="text-xs text-muted-foreground">搜索、查看和删除所有照片</p>
        <Button variant="outline" size="sm" onclick={()=>goto('/review/photos')}>打开图片管理</Button>
      </CardContent></Card>
    {/if}
  </div>
</div>
