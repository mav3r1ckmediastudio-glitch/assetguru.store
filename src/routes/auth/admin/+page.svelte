<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  export let data;
  export let form;
  let mode: 'login' | 'create' = form?.mode === 'create' ? 'create' : 'login';
</script>

<svelte:head><title>Owner administration — AssetGuru</title></svelte:head>

<section class="owner-auth section">
  <div class="owner-card glass">
    <div class="owner-mark"><Icon name="shield" size={32}/></div>
    <span class="eyebrow">Restricted owner access</span>
    <h1>AssetGuru <span class="gradient-text">administration.</span></h1>
    <p>This entry point is reserved for the marketplace owner. It opens vendor approvals, moderation, catalogue controls, commission settings, cases, reports and the audit log.</p>

    {#if !data.configured}
      <div class="setup-warning"><Icon name="alert" size={19}/><span><b>Owner access is not configured</b><small>Add <code>ADMIN_EMAIL</code> and <code>ADMIN_ACCESS_CODE</code> to the Netlify environment variables, then redeploy.</small></span></div>
    {/if}
    {#if form?.message}<div class="auth-error">{form.message}</div>{/if}

    <div class="mode-switch" aria-label="Admin access mode">
      <button class:active={mode === 'login'} type="button" onclick={() => mode = 'login'}>Admin sign in</button>
      <button class:active={mode === 'create'} type="button" onclick={() => mode = 'create'}>First-time owner setup</button>
    </div>

    <form method="POST" action={mode === 'create' ? '?/create' : '?/login'}>
      {#if mode === 'create'}
        <label>Owner display name<input name="displayName" value={form?.displayName ?? ''} required autocomplete="name"/></label>
      {/if}
      <label>Owner email<input name="email" type="email" value={form?.email ?? ''} required autocomplete="email"/></label>
      <label>Admin password<input name="password" type="password" minlength={mode === 'create' ? 12 : undefined} required autocomplete={mode === 'create' ? 'new-password' : 'current-password'}/></label>
      <label>Private admin access code<input name="accessCode" type="password" required autocomplete="off"/></label>
      <button class="button button-primary" type="submit" disabled={!data.configured}><Icon name="lock" size={17}/>{mode === 'create' ? 'Create owner account' : 'Enter admin control centre'}</button>
    </form>

    <div class="owner-notes"><Icon name="shield" size={18}/><span><b>Use a separate admin email</b><small>Buyer and creator accounts have their own roles. A dedicated owner account keeps administration separate from storefront testing.</small></span></div>
    <a class="back" href="/">← Return to marketplace</a>
  </div>
</section>

<style>
  .owner-auth{min-height:calc(100dvh - 140px);display:grid;place-items:center;padding-block:54px}.owner-card{width:min(590px,calc(100% - 28px));padding:36px;border-radius:20px}.owner-mark{width:62px;height:62px;display:grid;place-items:center;margin-bottom:17px;border:1px solid rgb(255 63 216/.45);border-radius:18px;color:#ff3fd8;background:linear-gradient(135deg,rgb(139 92 246/.2),rgb(255 63 216/.1));box-shadow:0 0 30px rgb(255 63 216/.13)}h1{margin:12px 0;font-size:clamp(2.5rem,5vw,4.2rem);line-height:.95;letter-spacing:-.06em}.owner-card>p{color:#aab5c8;line-height:1.65}.mode-switch{margin:22px 0 4px;padding:4px;display:grid;grid-template-columns:1fr 1fr;border:1px solid #183352;border-radius:10px;background:#040a15}.mode-switch button{min-height:40px;border:0;border-radius:7px;color:#718096;background:transparent;cursor:pointer;font-weight:800}.mode-switch button.active{color:#f5f8ff;background:#0b1a30;box-shadow:inset 0 0 0 1px #27547a}.owner-card form{display:grid}.owner-card label{margin-top:15px;display:grid;gap:7px;color:#aab5c8;font-size:11px;font-weight:750}.owner-card input{min-height:49px;padding:0 13px;border:1px solid #183352;border-radius:9px;color:#f5f8ff;background:#050a16;outline:0}.owner-card input:focus{border-color:#ff3fd8;box-shadow:0 0 0 3px rgb(255 63 216/.08)}.owner-card form .button{width:100%;margin-top:22px}.owner-card form .button:disabled{opacity:.45;cursor:not-allowed}.auth-error,.setup-warning{margin-top:15px;padding:12px;border-radius:10px;font-size:10px}.auth-error{border:1px solid rgb(255 82 109/.4);color:#ff8da0;background:rgb(255 82 109/.08)}.setup-warning{display:flex;gap:10px;border:1px solid rgb(255 181 71/.4);color:#ffb547;background:rgb(255 181 71/.07)}.setup-warning span,.owner-notes span{display:grid}.setup-warning b,.owner-notes b{color:#f5f8ff}.setup-warning small,.owner-notes small{margin-top:4px;color:#aab5c8;line-height:1.5}.setup-warning code{color:#ffb547}.owner-notes{margin-top:18px;padding:13px;display:flex;gap:10px;border:1px solid #183352;border-radius:10px;color:#00e5ff;background:#050a16}.back{display:block;margin-top:17px;color:#00e5ff;text-align:center;font-size:10px}@media(max-width:560px){.owner-card{padding:24px}.mode-switch{grid-template-columns:1fr}}
</style>
