<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import MetricCard from '$lib/components/MetricCard.svelte';
  import { getAsset } from '$lib/data/marketplace';
  import { availableUpdates, buyerOrders, buyerProfile, entitlements, pendingReviewAssets, supportTickets } from '$lib/stores/buyer';

  $: recentOrders = $buyerOrders.slice(0,3);
  $: recentAssets = $entitlements.slice(0,4).flatMap((entry) => {
    const asset = getAsset(entry.slug);
    return asset ? [{...entry, asset}] : [];
  });
  $: openTickets = $supportTickets.filter((ticket) => ticket.status !== 'Resolved');
  $: spent = $buyerOrders.reduce((sum, order) => sum + order.total, 0);
</script>

<svelte:head><title>Buyer account — AssetGuru</title></svelte:head>
<header class="page-head">
  <div><span class="eyebrow">Buyer hub</span><h1>Welcome back, <span class="gradient-text">{$buyerProfile.name.split(' ')[0]}.</span></h1><p>Your licensed assets, updates, orders and creator support in one place.</p></div>
  <div class="head-actions"><a class="button button-secondary" href="/account/updates"><Icon name="download" size={18}/> {$availableUpdates.length} updates</a><a class="button button-primary" href="/marketplace"><Icon name="browse" size={18}/> Explore assets</a></div>
</header>

<div class="metrics">
  <MetricCard label="Owned assets" value={$entitlements.length.toString()} delta="Permanent library" icon="library" tone="cyan"/>
  <MetricCard label="Available updates" value={$availableUpdates.length.toString()} delta={$availableUpdates.length ? 'Ready to install' : 'Everything current'} icon="download" tone="violet"/>
  <MetricCard label="Orders" value={$buyerOrders.length.toString()} delta={`£${spent.toFixed(2)} lifetime`} icon="cart" tone="magenta"/>
  <MetricCard label="Reviews to write" value={$pendingReviewAssets.length.toString()} delta="Verified purchases" icon="star" tone="amber"/>
</div>

<div class="dashboard-grid">
  <section class="library glass">
    <div class="panel-head"><div><span class="eyebrow">Your collection</span><h2>Recently acquired</h2></div><a href="/library">Open library →</a></div>
    <div class="asset-grid">
      {#each recentAssets as item}
        <a class="asset" href={`/marketplace/${item.asset.slug}`}><img src={item.asset.image} alt=""/><span><b>{item.asset.title}</b><small>{item.asset.creator} · v{item.asset.version}</small></span><Icon name="chevron" size={16}/></a>
      {/each}
    </div>
  </section>

  <section class="updates glass">
    <div class="panel-head"><div><span class="eyebrow">Compatibility watch</span><h2>Product updates</h2></div><a href="/account/updates">View all</a></div>
    {#if $availableUpdates.length}
      {#each $availableUpdates.slice(0,3) as update}
        <a class="update-row" href="/account/updates"><img src={update.asset.image} alt=""/><span><b>{update.asset.title}</b><small>v{update.purchasedVersion} → v{update.latestVersion}</small></span><em>Update ready</em></a>
      {/each}
    {:else}
      <div class="empty-inline"><Icon name="check" size={25}/><span><b>Everything is current</b><small>No new versions are waiting.</small></span></div>
    {/if}
  </section>

  <section class="orders glass">
    <div class="panel-head"><div><span class="eyebrow">Purchase history</span><h2>Recent orders</h2></div><a href="/account/orders">View all</a></div>
    {#each recentOrders as order}
      <a class="order-row" href={`/account/orders/${order.id}`}><span><b>{order.id}</b><small>{order.date} · {order.items.length} {order.items.length === 1 ? 'asset' : 'assets'}</small></span><em>{order.status}</em><strong>£{order.total.toFixed(2)}</strong><Icon name="chevron" size={16}/></a>
    {/each}
  </section>

  <section class="support glass">
    <div class="panel-head"><div><span class="eyebrow">Help centre</span><h2>Support activity</h2></div><a href="/account/support">Open support</a></div>
    {#if openTickets.length}
      {#each openTickets.slice(0,3) as ticket}
        <a class="ticket" href="/account/support"><i><Icon name="support" size={18}/></i><span><b>{ticket.subject}</b><small>{ticket.id} · Updated {ticket.updated}</small></span><em>{ticket.status}</em></a>
      {/each}
    {:else}
      <div class="empty-inline"><Icon name="check" size={25}/><span><b>No open tickets</b><small>Your support queue is clear.</small></span></div>
    {/if}
  </section>

  <section class="guru-panel glass">
    <div class="guru-orb"><Icon name="spark" size={31}/></div><span class="eyebrow">Guru insight</span><h2>Your library is becoming a toolkit.</h2><p>You now own assets across environments, scripts, props and UI. A compatibility-aware collection for your next MAX project would make those purchases easier to organise.</p><div class="tip"><Icon name="max" size={18}/><span><b>Suggested next step</b><small>Update Neon Alley Kit before starting a new level.</small></span></div><a class="button button-secondary" href="/account/updates">Review updates</a>
  </section>
</div>

<style>
  .page-head{margin-bottom:20px;display:flex;align-items:end;justify-content:space-between;gap:24px}.page-head h1{margin:10px 0 7px;font-size:clamp(2.5rem,4vw,4.3rem);line-height:.96;letter-spacing:-.06em}.page-head p{margin:0;color:#aab5c8}.head-actions{display:flex;gap:9px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.dashboard-grid{margin-top:14px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:14px}.dashboard-grid>section{min-width:0;padding:19px;border-radius:16px}.panel-head{margin-bottom:14px;display:flex;align-items:start;justify-content:space-between;gap:14px}.panel-head h2{margin:6px 0 0;font-size:18px}.panel-head>a{color:#00e5ff;font-size:9px;font-weight:800}.library{grid-column:1}.asset-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.asset{min-width:0;padding:9px;display:grid;grid-template-columns:94px 1fr auto;gap:10px;align-items:center;border:1px solid #183352;border-radius:11px;background:#050a16}.asset:hover{border-color:#00e5ff}.asset img{width:94px;height:62px;object-fit:cover;border-radius:7px}.asset span{min-width:0;display:grid}.asset b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.asset small{margin-top:4px;color:#718096;font-size:8px}.asset :global(svg){color:#00e5ff}.updates{grid-column:2;grid-row:1 / span 2}.update-row{padding:12px 0;display:grid;grid-template-columns:66px 1fr auto;gap:10px;align-items:center;border-top:1px solid #122a43}.update-row img{width:66px;height:44px;object-fit:cover;border-radius:7px}.update-row span{display:grid}.update-row b{font-size:9px}.update-row small{color:#718096;font-size:8px}.update-row em{padding:5px 7px;border-radius:6px;color:#031018;background:#24d89a;font-size:7px;font-style:normal;font-weight:900}.orders{grid-column:1}.order-row{min-height:56px;display:grid;grid-template-columns:1fr auto auto auto;gap:11px;align-items:center;border-top:1px solid #122a43}.order-row span{display:grid}.order-row b{font-size:10px}.order-row small{margin-top:3px;color:#718096;font-size:8px}.order-row em{padding:5px 7px;border-radius:6px;color:#24d89a;background:rgb(36 216 154/.09);font-size:7px;font-style:normal}.order-row strong{font-size:10px}.order-row :global(svg){color:#718096}.support{grid-column:1}.ticket{padding:12px 0;display:grid;grid-template-columns:35px 1fr auto;gap:10px;align-items:center;border-top:1px solid #122a43}.ticket>i{width:35px;height:35px;display:grid;place-items:center;border-radius:9px;color:#8b5cf6;background:rgb(139 92 246/.1);font-style:normal}.ticket span{display:grid}.ticket b{font-size:9px}.ticket small{margin-top:3px;color:#718096;font-size:7px}.ticket em{color:#ffc857;font-size:7px;font-style:normal}.guru-panel{grid-column:2}.guru-orb{width:70px;height:70px;margin-bottom:15px;display:grid;place-items:center;border:1px solid #00e5ff;border-radius:22px;color:#00e5ff;background:radial-gradient(circle at 50% 45%,rgb(0 229 255/.22),#071225 58%);box-shadow:0 0 34px rgb(0 229 255/.18);animation:float 4s ease-in-out infinite}.guru-panel h2{margin:11px 0 7px}.guru-panel>p{color:#aab5c8;font-size:11px;line-height:1.65}.tip{margin:17px 0;padding:12px;display:flex;gap:9px;border:1px solid #2d3d66;border-radius:10px;color:#8b5cf6;background:rgb(139 92 246/.07)}.tip span{display:grid}.tip b{color:#f5f8ff;font-size:10px}.tip small{margin-top:4px;color:#8d9bb1;font-size:8px;line-height:1.45}.guru-panel .button{width:100%}.empty-inline{padding:22px;display:flex;gap:10px;align-items:center;color:#24d89a}.empty-inline span{display:grid}.empty-inline b{color:#f5f8ff}.empty-inline small{color:#718096;font-size:8px}
  @media(max-width:1250px){.metrics{grid-template-columns:repeat(2,1fr)}.dashboard-grid{grid-template-columns:1fr}.dashboard-grid>section{grid-column:1;grid-row:auto}}@media(max-width:720px){.page-head{align-items:start;flex-direction:column}.head-actions{width:100%;display:grid}.metrics,.asset-grid{grid-template-columns:1fr}.order-row{grid-template-columns:1fr auto}.order-row strong{grid-column:2}.order-row :global(svg){display:none}}
</style>
