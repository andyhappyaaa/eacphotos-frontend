const fs = require('fs');
let c = fs.readFileSync('src/routes/dashboard/+page.svelte', 'utf8');

const settingsHTML =
`\t\t\t\t\t\t</TabsContent>
\t\t\t\t\t\t<TabsContent value="settings">
\t\t\t\t\t\t\t<h2 class="mb-5 text-xl font-bold">⚙️ 账号设置</h2>
\t\t\t\t\t\t\t<div class="space-y-4">
\t\t\t\t\t\t\t\t<Card><CardContent class="flex items-start gap-4 p-5">
\t\t\t\t\t\t\t\t\t<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Lock class="h-5 w-5 text-primary" /></div>
\t\t\t\t\t\t\t\t\t<div class="flex-1"><h3 class="font-semibold">🔐 修改密码</h3><p class="text-sm text-muted-foreground">向您的注册邮箱发送确认链接来修改密码。</p><Button size="sm" class="mt-3" onclick={handleSendPasswordConfirm}>📧 发送确认邮件</Button></div>
\t\t\t\t\t\t\t\t</CardContent></Card>
\t\t\t\t\t\t\t\t<Card><CardContent class="flex items-start gap-4 p-5">
\t\t\t\t\t\t\t\t\t<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Shield class="h-5 w-5 text-primary" /></div>
\t\t\t\t\t\t\t\t\t<div class="flex-1">
\t\t\t\t\t\t\t\t\t\t<h3 class="font-semibold">🔒 两步验证（2FA）</h3>
\t\t\t\t\t\t\t\t\t\t<p class="text-sm text-muted-foreground">当前状态：<strong class="text-foreground">{tfaEnabled ? '已启用 ✅' : '未启用'}</strong></p>
\t\t\t\t\t\t\t\t\t\t{#if tfaError}<p class="mt-1 text-xs text-destructive">{tfaError}</p>{/if}
\t\t\t\t\t\t\t\t\t\t{#if !tfaEnabled && !showTfaSetup}
\t\t\t\t\t\t\t\t\t\t\t<Button size="sm" class="mt-3 gap-1" onclick={handleSetup2FA} disabled={tfaLoading}>{#if tfaLoading}<Loader2 class="h-3 w-3 animate-spin" />{/if}启用 2FA</Button>
\t\t\t\t\t\t\t\t\t\t{/if}
\t\t\t\t\t\t\t\t\t\t{#if showTfaSetup && tfaSecret}
\t\t\t\t\t\t\t\t\t\t\t<div class="mt-4 space-y-3 rounded-lg bg-secondary/50 p-4">
\t\t\t\t\t\t\t\t\t\t\t\t<p class="text-sm">请使用验证器扫描下方二维码或手动输入密钥：</p>
\t\t\t\t\t\t\t\t\t\t\t\t<QRCode text={'otpauth://totp/eac photos:' + ($currentUser?.username||'') + '?secret=' + tfaSecret + '&issuer=eac%20photos'} size={180} />
\t\t\t\t\t\t\t\t\t\t\t\t<p class="text-sm">密钥：<code class="rounded bg-secondary px-2 py-0.5 text-xs font-mono select-all">{tfaSecret}</code></p>
\t\t\t\t\t\t\t\t\t\t\t\t<div class="flex gap-2"><Input type="text" bind:value={tfaSetupCode} maxlength="6" placeholder="000000" class="h-9 w-24 text-center" /><Button size="sm" onclick={handleEnable2FA} disabled={tfaLoading}>验证并完成</Button><Button size="sm" variant="ghost" onclick={() => { showTfaSetup = false; tfaSecret = ''; }}>取消</Button></div>
\t\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t\t{/if}
\t\t\t\t\t\t\t\t\t\t{#if tfaEnabled && !showTfaDisable}
\t\t\t\t\t\t\t\t\t\t\t<Button size="sm" variant="destructive" class="mt-3" onclick={() => (showTfaDisable = true)}>取消 2FA</Button>
\t\t\t\t\t\t\t\t\t\t{/if}
\t\t\t\t\t\t\t\t\t\t{#if showTfaDisable}
\t\t\t\t\t\t\t\t\t\t\t<div class="mt-4 space-y-3 rounded-lg bg-destructive/5 border border-destructive/30 p-4">
\t\t\t\t\t\t\t\t\t\t\t\t<p class="text-sm">输入验证器验证码确认关闭：</p>
\t\t\t\t\t\t\t\t\t\t\t\t<Input type="text" bind:value={tfaDisableCode} maxlength="6" placeholder="000000" class="h-9 w-24 text-center" />
\t\t\t\t\t\t\t\t\t\t\t\t<Button size="sm" variant="destructive" onclick={handleDisable2FA} disabled={tfaLoading}>确认关闭 2FA</Button>
\t\t\t\t\t\t\t\t\t\t\t\t<Button size="sm" variant="ghost" onclick={() => { showTfaDisable = false; tfaDisableCode = ''; }}>取消</Button>
\t\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t\t{/if}
\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t</CardContent></Card>
\t\t\t\t\t\t\t\t<Card><CardContent class="flex items-start gap-4 p-5">
\t\t\t\t\t\t\t\t\t<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Fingerprint class="h-5 w-5 text-primary" /></div>
\t\t\t\t\t\t\t\t\t<div class="flex-1">
\t\t\t\t\t\t\t\t\t\t<h3 class="font-semibold">🔐 浏览器通行密钥（Passkey）</h3>
\t\t\t\t\t\t\t\t\t\t<p class="text-sm text-muted-foreground">使用指纹、面容或 PIN 一键登录，无需密码。</p>
\t\t\t\t\t\t\t\t\t\t{#if passkeyLoading}
\t\t\t\t\t\t\t\t\t\t\t<div class="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 class="h-3 w-3 animate-spin" /> 加载中...</div>
\t\t\t\t\t\t\t\t\t\t{:else}
\t\t\t\t\t\t\t\t\t\t\t{#if passkeys.length > 0}
\t\t\t\t\t\t\t\t\t\t\t\t<div class="mt-3 space-y-1.5">
\t\t\t\t\t\t\t\t\t\t\t\t\t{#each passkeys as pk}
\t\t\t\t\t\t\t\t\t\t\t\t\t\t<div class="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5 text-sm">
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<span>🔑 {pk.name || pk.id?.slice(0, 8) || 'Passkey'} {pk.created_at ? '· ' + new Date(pk.created_at).toLocaleDateString() : ''}</span>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive" onclick={() => handleDeletePasskey(pk.id)}><Trash2 class="h-3.5 w-3.5" /></Button>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t\t\t\t\t{/each}
\t\t\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t\t\t{/if}
\t\t\t\t\t\t\t\t\t\t\t<Button size="sm" class="mt-3 gap-1" onclick={handleAddPasskey}><Plus class="h-3.5 w-3.5" /> 添加新的 Passkey</Button>
\t\t\t\t\t\t\t\t\t\t{/if}
\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t</CardContent></Card>
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t</TabsContent>
\t\t\t\t\t\t<!-- ── 审核队列（仅审核员）── -->`;

c = c.replace('</TabsContent>\n\t\t\t\t\t\t\t<!-- ── 审核队列（仅审核员）── -->', settingsHTML);
console.log('Settings tab content inserted');

// Also add tab routing for settings
c = c.replace(
  "else if (tab === 'manage') await loadAllPhotos();\n\t\t\t",
  "else if (tab === 'settings') { tfaEnabled = !!$currentUser?.twoFactorEnabled; loadPasskeys(); }\n\t\t\telse if (tab === 'manage') await loadAllPhotos();\n\t\t\t"
);
console.log('Settings tab routing restored');

fs.writeFileSync('src/routes/dashboard/+page.svelte', c);
console.log('Dashboard settings complete');
