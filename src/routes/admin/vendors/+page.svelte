<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { adminLoadError, adminLoaded, adminLoading, loadAdminData, setVendorCommission, setVendorStatus, vendorApplications } from '$lib/stores/admin';
  import { showToast } from '$lib/stores/marketplace';
  import type { VendorApplication, VendorStatus } from '$lib/data/admin';

  let search = '';
  let filter = 'All';
  let selected: VendorApplication | null = null;
  let reason = '';
  let commission = 15;
  let refreshing = false;
  $: filtered = $vendorApplications.filter(v => (filter === 'All' || v.status === filter) && `${v.name} ${v.handle} ${v.country} ${v.email}`.toLowerCase().includes(search.toLowerCase()));
  $: pendingVendors = $vendorApplications.filter(v=>v.status==='Pending'||v.status==='More information');
  $: approvedVendors = $vendorApplications.filter(v => v.status === 'Approved');
  $: payoutOnboarding = approvedVendors.length ? `${Math.round(approvedVendors.filter(v=>v.stripe==='Ready').length/approvedVendors.length*100)}%` : '—';
  $: approvalHours = approvedVendors.map(v=>v.approvedAt ? (new Date(v.approvedAt).getTime()-new Date(v.appliedAt).getTime())/3600000 : NaN).filter(Number.isFinite).sort((a,b)=>a-b);
  $: medianApproval = approvalHours.length ? `${(approvalHours.length%2 ? approvalHours[Math.floor(approvalHours.length/2)] : (approvalHours[approvalHours.length/2-1]+approvalHours[approvalHours.length/2])/2).toFixed(1)}h` : '—';
  $: if(selected){const latest=$vendorApplications.find(v=>v.id===selected?.id);if(latest&&latest!==selected)selected=latest;if(!latest&&$adminLoaded)selected=null;}

  onMount(()=>{
    void refresh(false);
  });

  function choose(v:VendorApplication){ selected=v; reason=v.reason ?? ''; commission=v.commission; }
  async function decide(status:VendorStatus){
    if(!selected)return;
    await setVendorStatus(selected.id,status,reason);
    selected={...selected,status,reason:reason || selected.reason};
  }
  async function saveCommission(){ if(!selected) return; const next=Math.max(0,Math.min(100,Number(commission)||0)); if(await setVendorCommission(selected.id,next)){ selected={...selected,commission:next}; commission=next; } }
  async function refresh(showMessage=true){
    if(refreshing)return;
    refreshing=true;
    if(showMessage)showToast('Refreshing vendor applications…','info');
    try{
      await loadAdminData(true);
      if(showMessage)showToast('Vendor applications refreshed','success');
    }catch(error){
      if(showMessage)showToast(error instanceof Error?error.message:'Vendor applications could not be refreshed','warning');
    }finally{refreshing=false;}
  }
</script>

<svelte:head><title>Vendor administration — AssetGuru</title></svelte:head>
<header class="admin-page-head">
  <div><span class="eyebrow">Creator network</span><h1>Vendor <span class="gradient-text">administration.</span></h1><p>Approve serious creators quickly, keep onboarding transparent and intervene when marketplace trust is at risk.</p></div>
  <div class="admin-head-actions"><button class="button button-secondary" type="button" disabled={refreshing||$adminLoading} onclick={()=>refresh(true)}><Icon name="refresh" size={18}/> {refreshing||$adminLoading?'Refreshing…':'Refresh vendors'}</button><a class="button button-secondary" href="/admin/settings"><Icon name="sliders" size={18}/> Vendor rules</a></div>
</header>

<div class="vendor-layout">
  <section class="admin-panel glass list-panel">
    {#if pendingVendors.length}<button class="pending-callout" type="button" onclick={()=>filter='Pending'}><Icon name="store" size={19}/><span><b>{pendingVendors.length} vendor {pendingVendors.length===1?'application':'applications'} awaiting review</b><small>Click to show pending applications. Storefront approval does not require Stripe onboarding.</small></span><Icon name="chevron" size={17}/></button>{/if}
    {#if $adminLoadError}<div class="admin-load-state error"><Icon name="alert" size={19}/><span><b>Vendor data could not be loaded</b><small>{$adminLoadError}</small></span><button type="button" onclick={()=>refresh(true)}>Try again</button></div>{:else if $adminLoading&&!$adminLoaded}<div class="admin-load-state"><Icon name="clock" size={19}/><span><b>Loading vendor applications…</b><small>Checking the live marketplace database.</small></span></div>{/if}
    <div class="admin-toolbar"><input class="admin-search" bind:value={search} placeholder="Search vendors…"/><select class="admin-select" bind:value={filter}><option>All</option><option>Pending</option><option>Approved</option><option>More information</option><option>Suspended</option></select></div>
    <div class="vendor-stats"><span><b>{$vendorApplications.filter(v=>v.status==='Approved').length}</b><small>approved creators</small></span><span><b>{$vendorApplications.filter(v=>v.status==='Pending').length}</b><small>awaiting review</small></span><span><b>{payoutOnboarding}</b><small>approved payout-ready</small></span><span><b>{medianApproval}</b><small>median approval time</small></span></div>
    <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Vendor</th><th>Country</th><th>Stripe</th><th>Risk</th><th>Assets</th><th>Status</th><th></th></tr></thead><tbody>
      {#if $adminLoading&&!$adminLoaded}
        <tr><td colspan="7"><div class="admin-empty loading"><Icon name="clock" size={28}/><strong>Loading vendor applications…</strong></div></td></tr>
      {:else if $adminLoadError}
        <tr><td colspan="7"><div class="admin-empty error"><Icon name="alert" size={28}/><strong>Vendor applications could not be loaded</strong><button class="admin-mini-button" type="button" onclick={()=>refresh(true)}>Try again</button></div></td></tr>
      {:else}{#each filtered as vendor}
        <tr class:selected={selected?.id===vendor.id}>
          <td><button class="vendor-name" type="button" onclick={()=>choose(vendor)}><i>{vendor.name.split(' ').map(p=>p[0]).slice(0,2).join('')}</i><span><strong>{vendor.name}</strong><small>{vendor.handle} · {vendor.email}</small></span></button></td>
          <td>{vendor.country}</td><td><span class:complete={vendor.stripe==='Ready'} class="stripe">{vendor.stripe}</span></td><td><span class={`admin-risk ${vendor.risk.toLowerCase()}`}>{vendor.risk}</span></td><td>{vendor.products}</td><td><StatusPill status={vendor.status}/></td><td><button class="admin-mini-button" type="button" onclick={()=>choose(vendor)}>Review</button></td>
        </tr>
      {:else}<tr><td colspan="7"><div class="admin-empty"><Icon name="store" size={28}/><strong>{filter==='All'?'No vendors have registered yet':`No ${filter.toLowerCase()} vendors`}</strong></div></td></tr>{/each}{/if}
    </tbody></table></div>
  </section>

  <aside class="admin-panel glass detail">
    {#if selected}
      <div class="profile"><i>{selected.name.split(' ').map(p=>p[0]).slice(0,2).join('')}</i><div><span class={`admin-risk ${selected.risk.toLowerCase()}`}>{selected.risk} risk</span><h2>{selected.name}</h2><p>{selected.handle} · {selected.country}</p></div></div>
      <div class="facts"><span><b>{selected.products}</b><small>submitted products</small></span><span><b>{selected.status}</b><small>application status</small></span><span><b>{selected.stripe}</b><small>Stripe onboarding</small></span><span><b>{selected.commission}%</b><small>commission rate</small></span></div>
      <section><h3>Portfolio statement</h3><p>{selected.portfolio}</p></section>
      <section><h3>Application record</h3><dl><div><dt>Application ID</dt><dd>{selected.id}</dd></div><div><dt>Submitted</dt><dd>{selected.submitted}</dd></div><div><dt>Contact</dt><dd>{selected.email}</dd></div><div><dt>Current status</dt><dd><StatusPill status={selected.status}/></dd></div></dl></section>
      <section class="commission-control"><h3>Vendor commission rate</h3><p>Override the marketplace default for this creator. This rate is used when new paid order items are created.</p><div><label><span>Commission percentage</span><input class="admin-input" type="number" min="0" max="100" step="0.1" bind:value={commission}/></label><button class="admin-mini-button good" type="button" onclick={saveCommission}>Save rate</button></div></section>
      <label class="notes"><span>Decision notes / information request</span><textarea class="admin-textarea" bind:value={reason} placeholder="Explain any information request, suspension or approval condition…"></textarea></label>
      <div class="actions">
        {#if selected.status === 'Suspended'}<button class="admin-mini-button good" type="button" onclick={()=>decide('Approved')}>Restore vendor</button>{:else}<button class="admin-mini-button danger" type="button" onclick={()=>decide('Suspended')}>Suspend</button>{/if}
        <button class="admin-mini-button warn" type="button" onclick={()=>decide('More information')}>Request information</button>
        <button class="admin-mini-button good" type="button" onclick={()=>decide('Approved')}>Approve vendor</button>
      </div>
    {:else}
      <div class="empty-detail"><div><Icon name="store" size={38}/></div><h2>Select a vendor</h2><p>Review identity, payout onboarding, portfolio and marketplace risk before making a decision.</p></div>
    {/if}
  </aside>
</div>

<style>
  .pending-callout{width:100%;margin-bottom:12px;padding:13px;display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;border:1px solid rgb(255 63 216/.4);border-radius:11px;color:#ff3fd8;background:rgb(255 63 216/.06);cursor:pointer;text-align:left}.pending-callout span{display:grid}.pending-callout b{color:#f5f8ff;font-size:10px}.pending-callout small{margin-top:4px;color:#aab5c8;font-size:8px;line-height:1.45}.admin-load-state{margin-bottom:12px;padding:12px;display:flex;gap:10px;align-items:center;border:1px solid #27547a;border-radius:10px;color:#00e5ff;background:#071225}.admin-load-state span{display:grid}.admin-load-state b{color:#f5f8ff;font-size:9px}.admin-load-state small{margin-top:3px;color:#aab5c8;font-size:8px}.admin-load-state button{margin-left:auto;min-height:34px;padding:0 10px;border:1px solid #27547a;border-radius:7px;color:#00e5ff;background:#050a16;cursor:pointer}.admin-load-state.error{border-color:rgb(255 181 71/.45);color:#ffb547}.admin-head-actions{display:flex;gap:8px}.admin-head-actions button:disabled{opacity:.55;cursor:wait}.admin-empty.loading{color:#00e5ff}.admin-empty.error{color:#ffb547}.admin-empty.error button{margin-left:10px}.vendor-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(330px,.6fr);gap:14px;align-items:start}.list-panel{padding:14px}.vendor-stats{margin-bottom:12px;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #183352;border-radius:11px;background:#050a16}.vendor-stats span{padding:12px;display:grid;border-right:1px solid #183352}.vendor-stats span:last-child{border:0}.vendor-stats b{font-size:14px}.vendor-stats small{margin-top:3px;color:#718096;font-size:7px}.admin-table tr.selected td{background:rgb(255 63 216/.045)}.vendor-name{padding:0;display:flex;gap:9px;align-items:center;border:0;color:#f5f8ff;background:transparent;text-align:left;cursor:pointer}.vendor-name>i{width:38px;height:38px;display:grid;place-items:center;border:1px solid #27547a;border-radius:10px;color:#031018;background:linear-gradient(135deg,#00e5ff,#8b5cf6);font-style:normal;font-size:8px;font-weight:950}.vendor-name span{display:grid}.vendor-name small{margin-top:3px;color:#718096;font-size:7px}.stripe{color:#ffb547;font-size:8px;font-weight:850}.stripe.complete{color:#24d89a}.detail{position:sticky;top:102px}.profile{display:flex;gap:13px;align-items:center}.profile>i{width:66px;height:66px;display:grid;place-items:center;border:1px solid #00e5ff;border-radius:18px;color:#031018;background:linear-gradient(135deg,#00e5ff,#8b5cf6,#ff3fd8);font-style:normal;font-size:14px;font-weight:950}.profile>div{min-width:0}.profile h2{margin:7px 0 3px;font-size:22px}.profile p{margin:0;color:#718096;font-size:8px}.facts{margin:17px 0;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #183352;border-radius:11px;background:#050a16}.facts span{padding:12px 8px;display:grid;border-right:1px solid #183352}.facts span:last-child{border:0}.facts b{font-size:11px}.facts small{margin-top:4px;color:#718096;font-size:7px}.detail section{padding:13px 0;border-top:1px solid #122a43}.detail h3{margin:0 0 7px;font-size:10px}.detail section>p{margin:0;color:#aab5c8;font-size:9px;line-height:1.6}.detail dl{margin:0;display:grid}.detail dl div{min-height:35px;display:flex;align-items:center;justify-content:space-between;gap:10px}.detail dt{color:#718096;font-size:8px}.detail dd{margin:0;color:#aab5c8;font-size:8px}.commission-control>p{margin:0 0 10px;color:#aab5c8;font-size:8px;line-height:1.55}.commission-control>div{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}.commission-control label{display:grid;gap:7px}.commission-control label span{color:#aab5c8;font-size:8px;font-weight:800}.commission-control .admin-mini-button{min-height:42px}.notes{display:grid;gap:7px}.notes>span{color:#aab5c8;font-size:8px;font-weight:800}.actions{margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.empty-detail{padding:70px 20px;text-align:center}.empty-detail>div{width:76px;height:76px;margin:0 auto 18px;display:grid;place-items:center;border:1px solid #27547a;border-radius:24px;color:#00e5ff;background:rgb(0 229 255/.06)}.empty-detail h2{margin:0 0 7px}.empty-detail p{margin:0;color:#718096;font-size:10px;line-height:1.6}
  @media(max-width:1250px){.vendor-layout{grid-template-columns:1fr}.detail{position:static}}@media(max-width:700px){.facts{grid-template-columns:1fr 1fr}.commission-control>div{grid-template-columns:1fr}.vendor-stats{grid-template-columns:1fr 1fr}.vendor-stats span:nth-child(2){border-right:0}.vendor-stats span:nth-child(-n+2){border-bottom:1px solid #183352}.actions{grid-template-columns:1fr}}
</style>
