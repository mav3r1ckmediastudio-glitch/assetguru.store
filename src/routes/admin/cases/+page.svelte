<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { adminCases, adminMetrics, setCaseStatus } from '$lib/stores/admin';
  import type { AdminCase, CaseStatus } from '$lib/data/admin';

  let search='';
  let filter='Active';
  let selected:AdminCase|null=null;
  $: filtered=$adminCases.filter(item => {
    const statusMatch=filter==='All'||(filter==='Active'?['Open','Investigating'].includes(item.status):item.status===filter);
    return statusMatch && `${item.id} ${item.product} ${item.vendor} ${item.buyer} ${item.type}`.toLowerCase().includes(search.toLowerCase());
  });
  $: exposure=$adminCases.filter(c=>['Open','Investigating'].includes(c.status)).reduce((sum,c)=>sum+c.amount,0);
  function decide(status:CaseStatus){if(!selected)return;setCaseStatus(selected.id,status);selected={...selected,status};}
</script>

<svelte:head><title>Cases and disputes — AssetGuru Admin</title></svelte:head>
<header class="admin-page-head"><div><span class="eyebrow">Buyer protection</span><h1>Cases & <span class="gradient-text">disputes.</span></h1><p>Resolve refunds, payment disputes, copyright complaints and content reports with a clear evidence trail.</p></div><div class="admin-head-actions"><a class="button button-secondary" href="/admin/audit"><Icon name="list" size={18}/> Evidence log</a></div></header>

<div class="case-summary"><span><b>{$adminCases.filter(c=>c.status==='Open').length}</b><small>open cases</small></span><span><b>{$adminCases.filter(c=>c.status==='Investigating').length}</b><small>investigating</small></span><span><b>{$adminCases.filter(c=>c.priority==='Urgent'&&c.status!=='Resolved'&&c.status!=='Declined').length}</b><small>urgent</small></span><span><b>£{exposure.toFixed(2)}</b><small>active financial exposure</small></span><span><b>{$adminMetrics.publishedProducts}</b><small>published products</small></span></div>

<div class="cases-layout">
  <section class="admin-panel glass case-list">
    <div class="admin-toolbar"><input class="admin-search" bind:value={search} placeholder="Search cases, buyers, vendors or products…"/><select class="admin-select" bind:value={filter}><option>Active</option><option>All</option><option>Open</option><option>Investigating</option><option>Resolved</option><option>Declined</option></select></div>
    <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Case</th><th>Type</th><th>Product</th><th>Vendor</th><th>Amount</th><th>Age</th><th>Status</th></tr></thead><tbody>
      {#each filtered as item}
        <tr class:selected={selected?.id===item.id} onclick={()=>selected=item}>
          <td><button class="case-id" type="button" onclick={()=>selected=item}><i class:urgent={item.priority==='Urgent'}><Icon name="alert" size={16}/></i><span><strong>{item.id}</strong><small>{item.buyer}</small></span></button></td>
          <td>{item.type}</td><td><strong>{item.product}</strong></td><td>{item.vendor}</td><td>{item.amount?`£${item.amount.toFixed(2)}`:'—'}</td><td>{item.opened}</td><td><StatusPill status={item.status}/></td>
        </tr>
      {:else}<tr><td colspan="7"><div class="admin-empty"><Icon name="check" size={28}/><strong>No matching cases</strong></div></td></tr>{/each}
    </tbody></table></div>
  </section>

  <aside class="admin-panel glass detail">
    {#if selected}
      <div class="detail-head"><span><b>{selected.id}</b><small>{selected.opened}</small></span><StatusPill status={selected.status}/></div>
      <h2>{selected.type}</h2><p class="product">{selected.product}</p>
      <div class="parties"><div><small>Buyer / reporter</small><b>{selected.buyer}</b></div><Icon name="arrow" size={18}/><div><small>Vendor</small><b>{selected.vendor}</b></div></div>
      <section><h3>Case summary</h3><p>{selected.summary}</p></section>
      {#if selected.orderId}<section><h3>Transaction evidence</h3><dl><div><dt>Order</dt><dd>{selected.orderId}</dd></div><div><dt>Value</dt><dd>£{selected.amount.toFixed(2)}</dd></div><div><dt>Payment state</dt><dd>{selected.paymentState??'Unavailable'}</dd></div><div><dt>Download evidence</dt><dd>{selected.downloadCount} signed {selected.downloadCount===1?'download':'downloads'}</dd></div></dl></section>{/if}
      <section><h3>Recommended action</h3><div class="recommendation"><Icon name={selected.priority==='Urgent'?'alert':'shield'} size={19}/><span><b>{selected.priority==='Urgent'?'Immediate human review':'Review evidence and contact parties'}</b><small>{selected.type==='Copyright'?'Keep the listing suspended until rights documentation is verified.':'Apply the published refund and dispute policy consistently.'}</small></span></div></section>
      <div class="actions"><button class="admin-mini-button danger" type="button" onclick={()=>decide('Declined')}>Decline case</button><button class="admin-mini-button warn" type="button" onclick={()=>decide('Investigating')}>Investigate</button><button class="admin-mini-button good" type="button" onclick={()=>decide('Resolved')}>Resolve case</button></div>
    {:else}<div class="empty-detail"><div><Icon name="alert" size={38}/></div><h2>Select a case</h2><p>Open a row to review the parties, transaction evidence and recommended action.</p></div>{/if}
  </aside>
</div>

<style>
  .case-summary{margin-bottom:14px;display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #183352;border-radius:13px;background:#050a16}.case-summary span{padding:15px;display:grid;border-right:1px solid #183352}.case-summary span:last-child{border:0}.case-summary b{font-size:17px}.case-summary small{margin-top:4px;color:#718096;font-size:8px}.cases-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(330px,.6fr);gap:14px;align-items:start}.case-list{padding:14px}.admin-table tr{cursor:pointer}.admin-table tr.selected td{background:rgb(255 63 216/.045)}.case-id{padding:0;display:flex;gap:9px;align-items:center;border:0;color:#f5f8ff;background:transparent;text-align:left;cursor:pointer}.case-id>i{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;color:#ffb547;background:rgb(255 181 71/.08);font-style:normal}.case-id>i.urgent{color:#ff526d;background:rgb(255 82 109/.09)}.case-id span{display:grid}.case-id small{margin-top:3px;color:#718096;font-size:7px}.detail{position:sticky;top:102px}.detail-head{display:flex;justify-content:space-between;gap:12px}.detail-head>span{display:grid}.detail-head b{font-size:10px;color:#00e5ff}.detail-head small{margin-top:3px;color:#718096;font-size:7px}.detail h2{margin:17px 0 4px;font-size:25px}.product{margin:0;color:#aab5c8;font-size:10px}.parties{margin:17px 0;padding:13px;display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;border:1px solid #183352;border-radius:11px;background:#050a16}.parties>div{display:grid}.parties>div:last-child{text-align:right}.parties small{color:#718096;font-size:7px}.parties b{margin-top:4px;font-size:9px}.parties :global(svg){color:#00e5ff}.detail section{padding:13px 0;border-top:1px solid #122a43}.detail h3{margin:0 0 7px;font-size:10px}.detail section>p{margin:0;color:#aab5c8;font-size:9px;line-height:1.6}.detail dl{margin:0;display:grid}.detail dl div{min-height:35px;display:flex;align-items:center;justify-content:space-between;gap:10px}.detail dt{color:#718096;font-size:8px}.detail dd{margin:0;color:#aab5c8;font-size:8px}.recommendation{padding:12px;display:flex;gap:9px;border:1px solid rgb(139 92 246/.32);border-radius:10px;color:#8b5cf6;background:rgb(139 92 246/.07)}.recommendation span{display:grid}.recommendation b{color:#f5f8ff;font-size:9px}.recommendation small{margin-top:4px;color:#8d9bb1;font-size:8px;line-height:1.45}.actions{margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.empty-detail{padding:70px 20px;text-align:center}.empty-detail>div{width:76px;height:76px;margin:0 auto 18px;display:grid;place-items:center;border:1px solid rgb(255 181 71/.35);border-radius:24px;color:#ffb547;background:rgb(255 181 71/.06)}.empty-detail h2{margin:0 0 7px}.empty-detail p{margin:0;color:#718096;font-size:10px;line-height:1.6}
  @media(max-width:1250px){.cases-layout{grid-template-columns:1fr}.detail{position:static}}@media(max-width:760px){.case-summary{grid-template-columns:1fr 1fr}.case-summary span:nth-child(2n){border-right:0}.actions{grid-template-columns:1fr}}
</style>
