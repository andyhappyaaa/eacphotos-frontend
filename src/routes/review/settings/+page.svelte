<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAdmin, isSuperAdmin, authLoading } from "$lib/stores/auth";
  import { api } from '$lib/api';
  import { showToast } from '$lib/stores/toast';
  import { ArrowLeft, RefreshCw, Save, Plus, Trash2, Image, Newspaper, SlidersHorizontal, Users, Shield, Briefcase } from '@lucide/svelte';

  let activeTab = $state('carousel');
  let loading = $state(false);

  // Carousel
  let carouselItems = $state('');
  // Announcement
  let ann = $state({ title:'',content:'',layout:'default',show_github_updates:false,github_repo:'',is_active:true });
  // Upload rules
  let rules = $state([]);
  let newRuleText = $state('');
  // User bans
  let banSearch = $state(''); let banResult = $state(null);
  let banReason = $state(''); let banDays = $state(7);
  // Reviewers
  let reviewers = $state([]);
  let newRv = $state({username:'',email:'',password:'',role:'reviewer'});
  // Jobs
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
        const cd = await cr.json(); carouselItems = JSON.stringify(cd.carousel||[], null, 2);
        const ad = await ar.json();
        if (ad.announcement) { ann = { ...ad.announcement }; }
        if (ad.announcement?.github_repo) ann.github_repo = ad.announcement.github_repo;
      }
      if (tab === 'rules') { const r = await api('/api/admin/upload-rules', { method:'POST', body:JSON.stringify({}) }); rules = (await r.json()).rules || []; }
      if (tab === 'reviewers') { const r = await api('/api/admin/reviewers', { method:'POST', body:'{}'}); reviewers = (await r.json()).reviewers || []; }
      if (tab === 'jobs') { const r = await api('/api/admin/job-positions', { method:'POST', body:JSON.stringify({action:'list'})}); jobs = (await r.json()).positions || []; }
    } catch(e) { showToast('加载失败','error'); }
    finally { loading = false; }
  }

  async function saveCarousel() { try { JSON.parse(carouselItems); await api('/api/admin/carousel', { method:'POST', body: JSON.stringify({ carousel: JSON.parse(carouselItems) }) }); showToast('已保存','success'); } catch(e) { showToast('JSON格式错误','error'); } }
  async function saveAnnouncement() { try { await api('/api/admin/announcement', { method:'POST', body: JSON.stringify({...ann, action:'set'}) }); showToast('已保存','success'); } catch(e) { showToast('保存失败','error'); } }
  async function fetchNews() { try { const r = await api('/api/admin/fetch-news', { method:'POST', body:'{}'}); showToast((await r.json()).message,'success'); } catch(e) { showToast('拉取失败','error'); } }

  // Rules
  async function addRule() { if (!newRuleText) return; try { const r = await api('/api/admin/upload-rules', { method:'POST', body:JSON.stringify({action:'add',text:newRuleText})}); rules = (await r.json()).rules||[]; newRuleText=''; } catch(e) { showToast('添加失败','error'); } }
  async function toggleRule(id) { try { const r = await api('/api/admin/upload-rules', { method:'POST', body:JSON.stringify({action:'toggle',id})}); rules = (await r.json()).rules||[]; } catch(e) { showToast('操作失败','error'); } }
  async function deleteRule(id) { if (!confirm('删除此规则？')) return; try { const r = await api('/api/admin/upload-rules', { method:'POST', body:JSON.stringify({action:'delete',id})}); rules = (await r.json()).rules||[]; } catch(e) { showToast('删除失败','error'); } }

  // Bans
  async function searchBan() { if (!banSearch) return; try { const r = await api('/api/admin/users/bans', { method:'POST', body:JSON.stringify({action:'search',username:banSearch})}); banResult = await r.json(); } catch(e) { showToast('搜索失败','error'); } }
  async function banUser(uid) { if (!banReason) { showToast('请输入原因','error'); return; } try { await api('/api/admin/users/bans', { method:'POST', body:JSON.stringify({action:'ban',userId:uid,reason:banReason,durationDays:banDays})}); showToast('已封禁','success'); banResult=null; banSearch=''; banReason=''; } catch(e) { showToast('操作失败','error'); } }
  async function unbanUser(uid) { try { await api('/api/admin/users/bans', { method:'POST', body:JSON.stringify({action:'unban',userId:uid})}); showToast('已解封','success'); searchBan(); } catch(e) { showToast('操作失败','error'); } }

  // Reviewers
  async function createReviewer() { if (!newRv.username||!newRv.email||!newRv.password) { showToast('请填写完整','error'); return; } try { await api('/api/admin/create-reviewer', { method:'POST', body:JSON.stringify(newRv)}); showToast('已创建','success'); newRv={username:'',email:'',password:'',role:'reviewer'}; loadTab('reviewers'); } catch(e) { showToast('创建失败','error'); } }
  async function updateRole(rid, role) { try { await api('/api/admin/update-role', { method:'POST', body:JSON.stringify({reviewerId:rid,role})}); showToast('已更新','success'); loadTab('reviewers'); } catch(e) { showToast('更新失败','error'); } }
  async function deleteReviewer(rid) { if (!confirm('确定删除该审核员？')) return; try { await api('/api/admin/delete-reviewer', { method:'POST', body:JSON.stringify({reviewerId:rid})}); showToast('已删除','success'); loadTab('reviewers'); } catch(e) { showToast('删除失败','error'); } }

  // Jobs
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

<svelte:head>
	<link rel="stylesheet" href="https://gcore.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
</svelte:head>

<div class="container mx-auto px-4 py-4" style="max-width:1200px;">
  <div class="d-flex align-items-center gap-2 mb-3">
    <button class="btn btn-sm btn-ghost d-flex align-items-center gap-1" onclick={() => goto('/dashboard')}><ArrowLeft class="h-4 w-4"/>返回仪表盘</button>
    <h1 class="fs-4 fw-bold mb-0">系统设置</h1>
    <button class="btn btn-sm btn-outline-secondary ms-auto" onclick={()=>loadTab(activeTab)} disabled={loading}><RefreshCw class="h-4 w-4 {loading?'animate-spin':''}"/></button>
  </div>

  <!-- Tabs -->
  <ul class="nav nav-tabs mb-3 flex-wrap">
    {#each tabs as t}
      <li class="nav-item"><button class="nav-link {activeTab===t.key?'active':''}" onclick={()=>loadTab(t.key)}><t.icon class="h-4 w-4 me-1"/>{t.label}</button></li>
    {/each}
  </ul>

  <div style="min-height:400px;">
    <!-- Carousel -->
    {#if activeTab === 'carousel'}
      <div class="card"><div class="card-body">
        <h3 class="card-title fs-6 fw-semibold">首页轮播图</h3>
        <p class="text-muted small">JSON格式: [ img: url, title: title ]</p>
        <textarea class="form-control font-monospace small" rows="8" bind:value={carouselItems}></textarea>
        <button class="btn btn-primary btn-sm mt-2" onclick={saveCarousel}><Save class="h-4 w-4 me-1"/>保存</button>
      </div></div>
    {/if}

    <!-- Announcement -->
    {#if activeTab === 'announcement'}
      <div class="card"><div class="card-body">
        <h3 class="card-title fs-6 fw-semibold">站点公告</h3>
        <input class="form-control form-control-sm mb-2" placeholder="标题" bind:value={ann.title}/>
        <textarea class="form-control form-control-sm mb-2 font-monospace small" rows="6" placeholder="HTML内容" bind:value={ann.content}></textarea>
        <div class="d-flex gap-3 flex-wrap align-items-center mb-2">
          <select class="form-select form-select-sm w-auto" bind:value={ann.layout}><option value="default">默认</option><option value="compact">紧凑</option></select>
          <label class="form-check-label small"><input type="checkbox" class="form-check-input" bind:checked={ann.show_github_updates}/> GitHub更新</label>
          {#if ann.show_github_updates}
            <input class="form-control form-control-sm w-auto" placeholder="owner/repo (逗号分隔多仓库)" bind:value={ann.github_repo} style="width:280px;"/>
          {/if}
          <label class="form-check-label small"><input type="checkbox" class="form-check-input" bind:checked={ann.is_active}/> 启用</label>
        </div>
        <button class="btn btn-primary btn-sm" onclick={saveAnnouncement}><Save class="h-4 w-4 me-1"/>保存公告</button>
      </div></div>
    {/if}

    <!-- News -->
    {#if activeTab === 'news'}
      <div class="card"><div class="card-body d-flex align-items-center justify-content-between">
        <div><h3 class="card-title fs-6 fw-semibold mb-1">拉取新闻</h3><p class="text-muted small mb-0">从Bing+AeroRoutes RSS获取最新航空新闻</p></div>
        <button class="btn btn-primary btn-sm" onclick={fetchNews}><RefreshCw class="h-4 w-4 me-1"/>立即拉取</button>
      </div></div>
    {/if}

    <!-- Upload Rules -->
    {#if activeTab === 'rules'}
      <div class="card"><div class="card-body">
        <h3 class="card-title fs-6 fw-semibold">上传规则</h3>
        <div class="d-flex gap-2 mb-3">
          <input class="form-control form-control-sm" placeholder="新规则内容" bind:value={newRuleText}/>
          <button class="btn btn-primary btn-sm" onclick={addRule}><Plus class="h-4 w-4 me-1"/>添加</button>
        </div>
        {#each rules as r}
          <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
            <div class="d-flex align-items-center gap-2">
              <span class="badge {r.active!==false?'bg-success':'bg-secondary'}" style="cursor:pointer" onclick={()=>toggleRule(r.id)}>{r.active!==false?'✓ 启用':'✗ 禁用'}</span>
              <span class="small">{r.text}</span>
            </div>
            <button class="btn btn-ghost btn-sm text-danger" onclick={()=>deleteRule(r.id)}><Trash2 class="h-3 w-3"/></button>
          </div>
        {/each}
      </div></div>
    {/if}

    <!-- User Bans -->
    {#if activeTab === 'bans'}
      <div class="card"><div class="card-body">
        <h3 class="card-title fs-6 fw-semibold">用户封禁</h3>
        <div class="d-flex gap-2 mb-3">
          <input class="form-control form-control-sm" placeholder="搜索用户名" bind:value={banSearch} style="max-width:250px;"/>
          <button class="btn btn-primary btn-sm" onclick={searchBan}>搜索</button>
        </div>
        {#if banResult?.user}
          <div class="alert alert-secondary">
            <strong>{banResult.user.username}</strong> ({banResult.user.email})
            <span class="ms-2">封禁记录: {banResult.bans?.length||0}次</span>
          </div>
          {#each banResult.bans||[] as b}
            <div class="d-flex justify-content-between py-1 border-bottom small">
              <span>{b.reason||'无原因'} · {new Date(b.banned_at||b.created_at).toLocaleDateString()}{b.expires_at?' → '+new Date(b.expires_at).toLocaleDateString():' · 永久'}</span>
              <span class="badge {b.is_active?'bg-danger':'bg-secondary'}">{b.is_active?'活跃':'已解除'}</span>
            </div>
          {/each}
          <div class="d-flex gap-2 mt-3">
            <input class="form-control form-control-sm" placeholder="封禁原因" bind:value={banReason} style="max-width:200px;"/>
            <select class="form-select form-select-sm w-auto" bind:value={banDays}><option value={7}>7天</option><option value={30}>30天</option><option value={365}>1年</option><option value={0}>永久</option></select>
            <button class="btn btn-danger btn-sm" onclick={()=>banUser(banResult.user.id)}>封禁</button>
            <button class="btn btn-warning btn-sm" onclick={()=>unbanUser(banResult.user.id)}>解封当前</button>
          </div>
        {:else if banResult?.error}
          <p class="text-danger small">{banResult.error}</p>
        {/if}
      </div></div>
    {/if}

    <!-- Reviewers -->
    {#if activeTab === 'reviewers'}
      <div class="card"><div class="card-body">
        <h3 class="card-title fs-6 fw-semibold">审核员管理</h3>
        {#if $isSuperAdmin}
          <div class="d-flex gap-2 mb-3 flex-wrap">
            <input class="form-control form-control-sm" placeholder="用户名" bind:value={newRv.username} style="width:130px;"/>
            <input class="form-control form-control-sm" placeholder="邮箱" bind:value={newRv.email} style="width:180px;"/>
            <input class="form-control form-control-sm" type="password" placeholder="密码" bind:value={newRv.password} style="width:130px;"/>
            <select class="form-select form-select-sm w-auto" bind:value={newRv.role}><option value="reviewer">审核员</option><option value="admin">管理员</option><option value="superadmin">超管</option></select>
            <button class="btn btn-primary btn-sm" onclick={createReviewer}><Plus class="h-4 w-4 me-1"/>添加</button>
          </div>
        {/if}
        <table class="table table-sm">
          <thead><tr><th>用户名</th><th>邮箱</th><th>角色</th><th>2FA</th><th>操作</th></tr></thead>
          <tbody>
            {#each reviewers as rv}
              <tr>
                <td>{rv.username}</td><td class="small">{rv.email}</td>
                <td>
                  {#if $isSuperAdmin}
                    <select class="form-select form-select-sm" style="width:100px;" value={rv.role} onchange={(e)=>updateRole(rv.id,e.target.value)}>
                      <option value="reviewer">审核员</option><option value="admin">管理员</option><option value="superadmin">超管</option>
                    </select>
                  {:else}
                    <span class="badge bg-secondary">{rv.role}</span>
                  {/if}
                </td>
                <td>{rv.two_factor_enabled?'✅':'❌'}</td>
                <td>{#if $isSuperAdmin}<button class="btn btn-ghost btn-sm text-danger" onclick={()=>deleteReviewer(rv.id)}><Trash2 class="h-3 w-3"/></button>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div></div>
    {/if}

    <!-- Jobs -->
    {#if activeTab === 'jobs'}
      <div class="card"><div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h3 class="card-title fs-6 fw-semibold mb-0">招聘职位</h3>
          {#if $isSuperAdmin}<button class="btn btn-primary btn-sm" onclick={()=>{jobForm={id:'',title:'',department:'',location:'',employment_type:'Full-time',salary_min:'',salary_max:'',description:'',requirements:'',is_active:true,sort_order:0};showJobForm=true;}}><Plus class="h-4 w-4 me-1"/>新增</button>{/if}
        </div>
        {#each jobs as j}
          <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
              <span class="fw-medium">{j.title}</span>
              <span class="text-muted small ms-2">{j.department} · {j.location} · {j.employment_type}</span>
              <span class="badge {j.is_active?'bg-success':'bg-secondary'} ms-2">{j.is_active?'启用':'停用'}</span>
            </div>
            <div>{#if $isSuperAdmin}
              <button class="btn btn-ghost btn-sm" onclick={editJob(j)}>编辑</button>
              <button class="btn btn-ghost btn-sm text-danger" onclick={()=>deleteJob(j.id)}><Trash2 class="h-3 w-3"/></button>
            {/if}</div>
          </div>
        {/each}
      </div></div>

      {#if showJobForm && $isSuperAdmin}
        <div class="card mt-3"><div class="card-body">
          <h4 class="fs-6 fw-semibold mb-3">{jobForm.id?'编辑':'新增'}职位</h4>
          <div class="row g-2">
            <div class="col-md-6"><input class="form-control form-control-sm" placeholder="职位名称*" bind:value={jobForm.title}/></div>
            <div class="col-md-3"><input class="form-control form-control-sm" placeholder="部门" bind:value={jobForm.department}/></div>
            <div class="col-md-3"><input class="form-control form-control-sm" placeholder="地点" bind:value={jobForm.location}/></div>
            <div class="col-md-3"><select class="form-select form-select-sm" bind:value={jobForm.employment_type}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Volunteer</option></select></div>
            <div class="col-md-3"><input class="form-control form-control-sm" placeholder="薪资下限" bind:value={jobForm.salary_min}/></div>
            <div class="col-md-3"><input class="form-control form-control-sm" placeholder="薪资上限" bind:value={jobForm.salary_max}/></div>
            <div class="col-12"><textarea class="form-control form-control-sm" rows="3" placeholder="职位描述" bind:value={jobForm.description}></textarea></div>
            <div class="col-12"><textarea class="form-control form-control-sm" rows="2" placeholder="任职要求" bind:value={jobForm.requirements}></textarea></div>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-primary btn-sm" onclick={saveJob}>保存</button>
            <button class="btn btn-outline-secondary btn-sm" onclick={()=>showJobForm=false}>取消</button>
          </div>
        </div></div>
      {/if}
    {/if}

    <!-- Photos -->
    {#if activeTab === 'photos'}
      <div class="card"><div class="card-body text-center">
        <h3 class="card-title fs-6 fw-semibold">图片管理</h3>
        <p class="text-muted small">搜索、查看和删除所有照片</p>
        <button class="btn btn-primary btn-sm" onclick={()=>goto('/review/photos')}>打开图片管理</button>
      </div></div>
    {/if}
  </div>
</div>

<style>
  .btn-ghost { background:transparent; color:var(--bs-secondary-color); border:none; }
  .btn-ghost:hover { background:var(--bs-tertiary-bg); color:var(--bs-body-color); }
  .nav-link { cursor:pointer; }
</style>
