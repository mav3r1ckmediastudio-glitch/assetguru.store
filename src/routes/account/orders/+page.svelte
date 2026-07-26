<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { getAsset } from '$lib/data/marketplace';
  import { buyerOrders } from '$lib/stores/buyer';
  let query=''; let status='All';
  $: filtered=$buyerOrders.filter((order)=>{
    const productNames=order.items.map((item)=>getAsset(item.slug)?.title ?? item.slug).join(' ');
    return `${order.id} ${productNames}`.toLowerCase().includes(query.toLowerCase()) && (status==='All'||order.status===status);
  });
</script>
<svelte:head><title>Order history — AssetGuru</title></svelte:head>
<header class="page-head"><div><span class="eyebrow">Buyer account</span><h1>Order <span class="gradient-text">history.</span></h1><p>Receipts, licences, payment records and item-level support for every purchase.</p></div><a class="button button-primary" href="/marketplace"><Icon name="browse" size={18}/> Find more assets</a></header>
<div class="filters glass"><label><Icon name="search" size={16}/><input bind:value={query} placeholder="Search orders or products"/></label><select bind:value={status}><option>All</option><option>Pending</option><option>Complete</option><option>Partially refunded</option><option>Refunded</option><option>Failed</option></select><span>{filtered.length} orders</span></div>
<section class="orders glass">
  {#each filtered as order}
    <a class="order" href={`/account/orders/${order.id}`}>
      <div class="order-id"><span><b>{order.id}</b><small>{order.date}</small></span><em class:warning={order.status !== 'Complete'}>{order.status}</em></div>
      <div class="thumbs">{#each order.items.slice(0,4) as item}{#if getAsset(item.slug)}<img src={getAsset(item.slug)?.image} alt=""/>{/if}{/each}</div>
      <div class="summary"><span><b>{order.items.length} {order.items.length===1?'asset':'assets'}</b><small>{order.items.map((item)=>getAsset(item.slug)?.title).filter(Boolean).join(' · ')}</small></span><span><b>{order.payment}</b><small>Payment method</small></span></div>
      <strong>£{order.total.toFixed(2)}</strong><Icon name="chevron" size={18}/>
    </a>
  {:else}<div class="empty"><Icon name="cart" size={38}/><h2>No matching orders.</h2><p>Try another order number or status.</p></div>{/each}
</section>
<style>
  .page-head{margin-bottom:20px;display:flex;align-items:end;justify-content:space-between;gap:24px}.page-head h1{margin:10px 0 7px;font-size:clamp(2.5rem,4vw,4.3rem);line-height:.96;letter-spacing:-.06em}.page-head p{margin:0;color:#aab5c8}.filters{margin-bottom:14px;padding:10px;display:grid;grid-template-columns:1fr 200px auto;gap:9px;align-items:center;border-radius:13px}.filters label{min-height:43px;padding:0 12px;display:flex;align-items:center;gap:8px;border:1px solid #183352;border-radius:9px;color:#00e5ff;background:#050a16}.filters input{width:100%;border:0;outline:0;color:#f5f8ff;background:transparent}.filters select{min-height:43px;padding:0 10px;border:1px solid #183352;border-radius:9px;color:#f5f8ff;background:#050a16}.filters>span{padding:0 8px;color:#718096;font-size:9px}.orders{padding:12px 18px;border-radius:16px}.order{min-height:118px;display:grid;grid-template-columns:190px 185px minmax(0,1fr) auto auto;gap:16px;align-items:center;border-top:1px solid #122a43}.order:first-child{border-top:0}.order:hover{background:rgb(8 18 36/.45)}.order-id{display:grid;gap:8px}.order-id>span{display:grid}.order-id b{font-size:11px}.order-id small{margin-top:3px;color:#718096;font-size:8px}.order-id em{width:max-content;padding:5px 7px;border-radius:6px;color:#24d89a;background:rgb(36 216 154/.09);font-size:7px;font-style:normal}.order-id em.warning{color:#ffc857;background:rgb(255 200 87/.09)}.thumbs{display:flex}.thumbs img{width:70px;height:48px;object-fit:cover;border:2px solid #050a16;border-radius:8px}.thumbs img+img{margin-left:-20px}.summary{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:14px}.summary span{min-width:0;display:grid}.summary b{font-size:9px}.summary small{margin-top:3px;overflow:hidden;color:#718096;font-size:8px;text-overflow:ellipsis;white-space:nowrap}.order>strong{color:#00e5ff}.order>:global(svg){color:#718096}.empty{padding:60px;text-align:center;color:#00e5ff}.empty h2{color:#f5f8ff}.empty p{color:#718096}
  @media(max-width:1100px){.order{grid-template-columns:160px 150px 1fr auto}.order>:global(svg){display:none}.summary{grid-template-columns:1fr}.summary span:last-child{display:none}}@media(max-width:720px){.page-head{align-items:start;flex-direction:column}.filters{grid-template-columns:1fr}.order{padding:17px 0;grid-template-columns:1fr auto}.thumbs{grid-row:2;grid-column:1/-1}.summary{grid-column:1/-1}.order>strong{grid-column:2;grid-row:1}.order-id{grid-column:1}.orders{padding-inline:14px}}
</style>
