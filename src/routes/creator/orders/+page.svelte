<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { creatorOrders, creatorOrdersPagination, creatorSectionLoading, loadCreatorOrders } from '$lib/stores/creator';
  import type { CreatorOrder, OrderStatus } from '$lib/data/creator';
  import { showToast } from '$lib/stores/marketplace';

  let search = '';
  let status: OrderStatus | 'All' = 'All';
  let selected: CreatorOrder | null = null;
  let dateRange = 'Last 30 days';
  const orderStatuses: (OrderStatus | 'All')[] = ['All','Paid','Pending','Refund requested','Refunded'];

  onMount(() => { void loadCreatorOrders(1).catch((error) => showToast(error instanceof Error ? error.message : 'Orders could not be loaded','warning')); });

  $: visible = $creatorOrders.filter((order) => {
    const q = search.toLowerCase();
    const days=dateRange==='Last 7 days'?7:dateRange==='Last 30 days'?30:dateRange==='Last 90 days'?90:365;
    const cutoff=Date.now()-days*86400000;
    return Date.parse(order.createdAt)>=cutoff && (status === 'All' || order.status === status) && (!q || `${order.id} ${order.buyer} ${order.product}`.toLowerCase().includes(q));
  });
  $: gross = visible.reduce((sum,order)=>sum+order.total,0);
  $: net = visible.reduce((sum,order)=>sum+order.net,0);

  function exportCsv(){
    const csv=['Order,Buyer,Product,Total,Fee,Net,Status',...visible.map((o)=>[o.id,o.buyer,o.product,o.total,o.fee,o.net,o.status].join(','))].join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='assetguru-orders.csv'; a.click(); URL.revokeObjectURL(url); showToast('Order export created','success');
  }
</script>

<svelte:head><title>Orders — Creator Hub — AssetGuru</title></svelte:head>
<header class="page-head"><div><span class="eyebrow">Sales operations</span><h1>Orders and <span class="gradient-text">customers.</span></h1><p>Track purchases, licences, refunds and buyer support context without exposing unrelated marketplace data.</p></div><div class="head-actions"><select bind:value={dateRange}><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option><option>This year</option></select><button class="button button-secondary" type="button" onclick={exportCsv}><Icon name="download" size={17}/> Export CSV</button></div></header>

<div class="metrics glass"><span><small>Orders shown</small><b>{visible.length}</b></span><span><small>Gross sales</small><b>£{gross.toFixed(2)}</b></span><span><small>Marketplace fees</small><b>−£{(gross-net).toFixed(2)}</b></span><span><small>Estimated net</small><strong>£{net.toFixed(2)}</strong></span></div>

<div class="toolbar glass"><label><Icon name="search" size={18}/><input bind:value={search} placeholder="Search order, buyer or product…"/></label><div class="statuses">{#each orderStatuses as item}<button class:active={status===item} type="button" onclick={() => status=item}>{item}</button>{/each}</div></div>

<div class="orders-layout">
  <section class="order-list glass">
    <div class="table-head"><span>Order</span><span>Buyer / product</span><span>Date</span><span>Total</span><span>Your net</span><span>Status</span></div>
    {#each visible as order}
      <button class:selected={selected?.id===order.id} type="button" onclick={() => selected=order}>
        <span><b>{order.id}</b><small>{order.licence} licence</small></span>
        <span class="buyer"><i>{order.initials}</i><span><b>{order.buyer}</b><small>{order.product}</small></span></span>
        <time>{order.date}</time><strong>£{order.total.toFixed(2)}</strong><strong class="net">£{order.net.toFixed(2)}</strong><StatusPill status={order.status}/>
      </button>
    {/each}

    {#if $creatorOrdersPagination.hasMore}<div class="load-more"><button class="button button-secondary" type="button" disabled={$creatorSectionLoading.orders} onclick={() => loadCreatorOrders($creatorOrdersPagination.page + 1,true)}>{$creatorSectionLoading.orders ? 'Loading…' : 'Load more orders'}</button></div>{/if}
    {#if !visible.length}<div class="empty"><Icon name="search" size={30}/><b>No matching orders</b><small>Try a different customer, product or status.</small></div>{/if}
  </section>

  {#if selected}
    <aside class="order-detail glass">
      <div class="detail-head"><div><span class="eyebrow">Order detail</span><h2>{selected.id}</h2></div><StatusPill status={selected.status}/></div>
      <div class="customer"><i>{selected.initials}</i><span><b>{selected.buyer}</b><small>Verified AssetGuru buyer</small></span><a href={`/support?order=${encodeURIComponent(selected.id)}`} aria-label="Open support"><Icon name="mail" size={16}/></a></div>
      <dl><div><dt>Product</dt><dd>{selected.product}</dd></div><div><dt>Licence</dt><dd>{selected.licence} commercial</dd></div><div><dt>Purchased</dt><dd>{selected.date}</dd></div><div><dt>Fulfilment</dt><dd>{selected.status==='Paid'?'Entitlement active':selected.status==='Refunded'?'Entitlement revoked':'Processing'}</dd></div></dl>
      <div class="money"><span><small>Buyer paid</small><b>£{selected.total.toFixed(2)}</b></span><span><small>Marketplace fee</small><b>−£{selected.fee.toFixed(2)}</b></span><span><small>Your net</small><strong>£{selected.net.toFixed(2)}</strong></span></div>
      {#if selected.status === 'Refund requested'}<div class="refund"><Icon name="alert" size={19}/><span><b>Refund under administrator review</b><small>AssetGuru administrators control refund decisions and will reverse the associated entitlement and transfer when a refund is approved.</small></span></div>{/if}
      <div class="detail-actions"><a href={`/support?order=${encodeURIComponent(selected.id)}`}><Icon name="support" size={16}/> Open support for this order</a>{#if selected.status === 'Refund requested'}<span class="warning"><Icon name="clock" size={16}/> Awaiting admin decision</span>{/if}</div>
      <div class="privacy"><Icon name="lock" size={16}/><span><b>Privacy-aware customer view</b><small>Only information required for fulfilment, support and lawful records is shown.</small></span></div>
    </aside>
  {/if}
</div>

<style>
  .page-head{margin-bottom:18px;display:flex;align-items:end;justify-content:space-between;gap:20px}.page-head h1{margin:10px 0 7px;font-size:clamp(2.6rem,4vw,4.2rem);line-height:.96;letter-spacing:-.06em}.page-head p{max-width:760px;margin:0;color:#aab5c8}.head-actions{display:flex;gap:8px}.head-actions select{min-height:46px;padding:0 34px 0 12px;border:1px solid #183352;border-radius:9px;color:#f5f8ff;background:#07111f}.metrics{padding:15px;display:grid;grid-template-columns:repeat(4,1fr);border-radius:14px}.metrics span{display:grid;padding:2px 16px}.metrics span+span{border-left:1px solid #183352}.metrics small{color:#718096;font-size:8px}.metrics b,.metrics strong{margin-top:5px;font-size:20px}.metrics strong{color:#24d89a}.toolbar{margin:12px 0;padding:8px;display:grid;grid-template-columns:1fr auto;gap:10px;border-radius:13px}.toolbar>label{min-height:42px;padding:0 11px;display:flex;align-items:center;gap:9px;border:1px solid #183352;border-radius:8px;color:#00e5ff;background:#050a16}.toolbar input{width:100%;border:0;outline:0;color:#f5f8ff;background:transparent}.statuses{padding:3px;display:flex;border:1px solid #183352;border-radius:8px;background:#050a16}.statuses button{padding:0 10px;border:0;border-radius:6px;color:#718096;background:transparent;cursor:pointer;font-size:8px;font-weight:750}.statuses button.active{color:#06111b;background:#00e5ff}.orders-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:12px;align-items:start}.order-list{overflow:hidden;border-radius:14px}.table-head,.order-list>button{display:grid;grid-template-columns:90px minmax(220px,1.5fr) 100px 70px 75px 110px;gap:10px;align-items:center}.table-head{min-height:41px;padding:0 13px;color:#718096;background:#071225;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.order-list>button{width:100%;min-height:66px;padding:8px 13px;border:0;border-top:1px solid #122a43;color:#aab5c8;background:transparent;cursor:pointer;text-align:left}.order-list>button:hover,.order-list>button.selected{background:rgb(0 229 255/.045)}.order-list>button.selected{box-shadow:inset 3px 0 0 #00e5ff}.order-list>button>span:first-child,.buyer>span{display:grid}.order-list b{color:#f5f8ff;font-size:9px}.order-list small,.order-list time{color:#718096;font-size:7px}.buyer{display:flex!important;gap:9px;align-items:center}.buyer>i{width:31px;height:31px;display:grid;place-items:center;border-radius:50%;color:#00e5ff;background:#10213a;font-size:8px;font-style:normal;font-weight:900}.order-list strong{color:#f5f8ff;font-size:9px}.order-list .net{color:#24d89a}.empty{padding:70px 20px;display:grid;place-items:center;gap:7px;color:#718096}.empty b{color:#f5f8ff}.order-detail{position:sticky;top:102px;padding:19px;border-radius:14px}.detail-head{display:flex;align-items:start;justify-content:space-between}.detail-head h2{margin:8px 0 0}.customer{margin:17px 0;padding:13px;display:grid;grid-template-columns:40px 1fr auto;gap:9px;align-items:center;border:1px solid #183352;border-radius:10px;background:#071225}.customer>i{width:39px;height:39px;display:grid;place-items:center;border-radius:50%;color:#00e5ff;background:#10213a;font-size:9px;font-style:normal;font-weight:900}.customer span{display:grid}.customer b{font-size:10px}.customer small{color:#718096;font-size:7px}.customer a{width:31px;height:31px;display:grid;place-items:center;border:1px solid #27547a;border-radius:7px;color:#00e5ff;background:#050a16}.order-detail dl{margin:0}.order-detail dl div{padding:9px 0;display:grid;grid-template-columns:95px 1fr;gap:8px;border-top:1px solid #122a43;font-size:8px}.order-detail dt{color:#718096}.order-detail dd{margin:0;color:#aab5c8;text-align:right}.money{margin:14px 0;padding:12px;border:1px solid #183352;border-radius:10px;background:#050a16}.money span{padding:7px 0;display:flex;align-items:center;justify-content:space-between}.money small{color:#718096;font-size:7px}.money b,.money strong{font-size:10px}.money strong{color:#24d89a}.refund{padding:12px;display:flex;gap:9px;border:1px solid rgb(255 181 71/.35);border-radius:9px;color:#ffb547;background:rgb(255 181 71/.07)}.refund span{display:grid}.refund b{color:#f5f8ff;font-size:9px}.refund small{margin-top:3px;color:#aab5c8;font-size:7px;line-height:1.45}.detail-actions{margin-top:12px;display:grid;gap:7px}.detail-actions a,.detail-actions span{min-height:38px;padding:0 10px;display:flex;align-items:center;gap:8px;border:1px solid #183352;border-radius:8px;color:#aab5c8;background:#071225;font-size:8px}.detail-actions a:hover{color:#00e5ff;border-color:#00e5ff}.detail-actions .warning{color:#ffb547;border-color:rgb(255 181 71/.4)}.privacy{margin-top:12px;padding:11px;display:flex;gap:8px;color:#8b5cf6}.privacy span{display:grid}.privacy b{color:#f5f8ff;font-size:8px}.privacy small{margin-top:3px;color:#718096;font-size:7px;line-height:1.45}
  .load-more{padding:14px;display:flex;justify-content:center;border-top:1px solid #122a43}.load-more .button{min-width:210px}
  @media(max-width:1100px){.orders-layout{grid-template-columns:1fr}.order-detail{position:static}.table-head,.order-list>button{grid-template-columns:85px minmax(210px,1fr) 90px 65px 75px 100px}}
  @media(max-width:800px){.page-head{align-items:start;flex-direction:column}.metrics{grid-template-columns:repeat(2,1fr)}.metrics span:nth-child(3){border-left:0;border-top:1px solid #183352}.metrics span:nth-child(4){border-top:1px solid #183352}.toolbar{grid-template-columns:1fr}.statuses{overflow-x:auto}.statuses button{min-height:35px;white-space:nowrap}.order-list{overflow-x:auto}.table-head,.order-list>button{min-width:760px}}
</style>
