<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import MetricCard from '$lib/components/MetricCard.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { creatorOrders, creatorProfile, revenueSeries, salesSeries, reviewQueue, creatorProducts, creatorTotals, payoutHistory } from '$lib/stores/creator';

  let range = '30 days';
  $: topProducts = [...$creatorProducts].filter((item) => item.status === 'Published').sort((a,b) => b.revenue-a.revenue).slice(0,5);
  $: pending = $creatorProducts.filter((item) => item.status === 'In review' || item.status === 'Changes required');
  $: averageOrder = $creatorTotals.sales ? $creatorTotals.revenue / $creatorTotals.sales : 0;
  $: pendingPayout = $payoutHistory.filter((item) => item.status === 'Pending').reduce((sum, item) => sum + Number(item.net || 0), 0);
</script>

<svelte:head><title>Creator Dashboard — AssetGuru</title></svelte:head>

<header class="page-head">
  <div><span class="eyebrow">Creator hub</span><h1>Creator <span class="gradient-text">dashboard.</span></h1><p>Manage your catalogue, understand buyer behaviour and keep every release moving.</p></div>
  <div class="head-actions"><select bind:value={range}><option>7 days</option><option>30 days</option><option>90 days</option><option>12 months</option></select><a class="button button-primary" href="/creator/products/new"><Icon name="upload" size={18}/> Upload new asset</a></div>
</header>

<div class="metrics">
  <MetricCard label="Total revenue" value={`£${$creatorTotals.revenue.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}`} delta="Live total" icon="chart" tone="magenta"/>
  <MetricCard label="Total sales" value={$creatorTotals.sales.toLocaleString('en-GB')} delta="Completed items" icon="cart" tone="cyan"/>
  <MetricCard label="Store views" value={$creatorTotals.views.toLocaleString('en-GB')} delta="Catalogue views" icon="eye" tone="violet"/>
  <MetricCard label="Store rating" value={`${$creatorProfile.rating} ★`} delta={`${$creatorProfile.reviews} reviews`} icon="star" tone="amber" hint="published buyer reviews"/>
</div>

<div class="dashboard-grid">
  <section class="guru-panel glass">
    <div class="guru-orb"><Icon name="spark" size={30}/></div>
    <span class="eyebrow">Guru insight</span><h2>Welcome back, {$creatorProfile.name}.</h2><p>{#if $creatorProducts.length === 0}Your storefront is ready. Upload the first asset, complete the package checks and submit it for moderation.{:else if pending.length}You have <b>{pending.length}</b> {pending.length === 1 ? 'release' : 'releases'} in the moderation workflow.{:else}Your live catalogue contains <b>{$creatorTotals.published}</b> {$creatorTotals.published === 1 ? 'asset' : 'assets'} and is ready for buyers.{/if}</p>
    <div class="tip"><Icon name="spark" size={17}/><span><b>Next best action</b><small>{pending.length ? 'Review moderation notes and keep release details current.' : 'Add a complete preview gallery and clear compatibility notes to every release.'}</small></span></div>
    <a class="button button-secondary" href={pending[0] ? `/creator/products/${pending[0].slug}` : '/creator/products/new'}>{pending[0] ? 'Open submission' : 'Upload first asset'}</a>
  </section>

  <section class="revenue glass">
    <div class="panel-head"><div><span class="eyebrow">Performance</span><h2>Revenue overview</h2></div><select bind:value={range}><option>7 days</option><option>30 days</option><option>90 days</option></select></div>
    <LineChart values={$revenueSeries} secondary={$salesSeries.map((value)=>value*20)} primaryLabel="Revenue" secondaryLabel="Sales trend"/>
    <div class="revenue-foot"><span><small>Revenue</small><b>£{$creatorTotals.revenue.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}</b><em>Vendor net</em></span><span><small>Sales</small><b>{$creatorTotals.sales.toLocaleString('en-GB')}</b><em>Paid items</em></span><span><small>Average net</small><b>£{averageOrder.toFixed(2)}</b><em>Per sale</em></span></div>
  </section>

  <section class="store-preview glass">
    <div class="panel-head"><div><span class="eyebrow">Live storefront</span><h2>Store preview</h2></div><a href={$creatorProfile.slug ? `/creators/${$creatorProfile.slug}` : "/creators"}>View store →</a></div>
    <img class="banner" src={$creatorProfile.banner} alt=""/>
    <div class="store-id"><img src={$creatorProfile.avatar} alt=""/><span><b>{$creatorProfile.name} <em>{$creatorProfile.tier}</em></b><small>{$creatorProfile.tagline}</small></span></div>
    <div class="store-stats"><span><b>{$creatorTotals.published}</b><small>live products</small></span><span><b>{$creatorProfile.rating}</b><small>rating</small></span><span><b>{$creatorProfile.followers.toLocaleString('en-GB')}</b><small>followers</small></span></div>
    <a class="button button-secondary" href="/creator/storefront">Customise storefront</a>
  </section>

  <section class="quick glass">
    <div class="panel-head"><div><span class="eyebrow">Workflow</span><h2>Quick actions</h2></div></div>
    <a href="/creator/products/new"><Icon name="upload" size={19}/><span><b>Upload a new asset</b><small>Start a guided submission</small></span><Icon name="chevron" size={16}/></a>
    <a href="/creator/products"><Icon name="package" size={19}/><span><b>Manage products</b><small>{$creatorTotals.pending} items need attention</small></span><Icon name="chevron" size={16}/></a>
    <a href="/creator/storefront"><Icon name="store" size={19}/><span><b>Edit storefront</b><small>Brand, copy and featured asset</small></span><Icon name="chevron" size={16}/></a>
    <a href="/creator/earnings"><Icon name="tag" size={19}/><span><b>View payouts</b><small>£{pendingPayout.toFixed(2)} currently pending</small></span><Icon name="chevron" size={16}/></a>
  </section>

  <section class="top-products glass">
    <div class="panel-head"><div><span class="eyebrow">Catalogue</span><h2>Top products</h2></div><a href="/creator/products">View all</a></div>
    {#if topProducts.length}
      {#each topProducts as product, index}
        <a class="product-row" href={`/creator/products/${product.slug}`}><i>{index+1}</i><img src={product.image} alt=""/><span><b>{product.title}</b><small>{product.category} · {product.sales.toLocaleString('en-GB')} sales</small></span><strong>£{product.revenue.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><em>{product.rating ? `${product.rating} ★` : 'New'}</em></a>
      {/each}
    {:else}<div class="empty-inline"><Icon name="package" size={24}/><span><b>No published products</b><small>Your approved releases will appear here.</small></span></div>{/if}
  </section>

  <section class="moderation glass">
    <div class="panel-head"><div><span class="eyebrow">Publishing</span><h2>Moderation queue</h2></div><a href="/creator/products">Manage</a></div>
    {#if pending.length}
      {#each pending as item}<a href={`/creator/products/${item.slug}`} class="moderation-row"><img src={item.image} alt=""/><span><b>{item.title}</b><small>{item.status === 'Changes required' ? item.moderationNote : 'Submitted and waiting for marketplace review.'}</small></span><StatusPill status={item.status}/></a>{/each}
    {:else}<div class="empty-inline"><Icon name="check" size={24}/><span><b>All clear</b><small>No products are waiting for review.</small></span></div>{/if}
  </section>

  <section class="orders glass">
    <div class="panel-head"><div><span class="eyebrow">Live sales</span><h2>Recent customers</h2></div><a href="/creator/orders">View orders</a></div>
    {#if $creatorOrders.length}{#each $creatorOrders.slice(0,5) as order}<a href="/creator/orders" class="order-row"><i>{order.initials}</i><span><b>{order.buyer}</b><small>{order.product}</small></span><time>{order.date}</time><strong>£{order.total.toFixed(2)}</strong></a>{/each}{:else}<div class="empty-inline"><Icon name="cart" size={24}/><span><b>No sales yet</b><small>Paid orders will appear here.</small></span></div>{/if}
  </section>

  <section class="reviews glass">
    <div class="panel-head"><div><span class="eyebrow">Buyer voice</span><h2>Recent reviews</h2></div><a href="/creator/products">See products</a></div>
    {#if $reviewQueue.length}{#each $reviewQueue as review}<article><header><b>{review.buyer}</b><span>{'★'.repeat(review.rating)}</span><small>{review.date}</small></header><p>“{review.quote}”</p><em>{review.product}</em></article>{/each}{:else}<div class="empty-inline"><Icon name="star" size={24}/><span><b>No reviews yet</b><small>Published buyer feedback will appear here.</small></span></div>{/if}
  </section>
</div>

<style>
  .page-head{margin-bottom:20px;display:flex;align-items:end;justify-content:space-between;gap:24px}.page-head h1{margin:10px 0 7px;font-size:clamp(2.5rem,4vw,4.3rem);line-height:.96;letter-spacing:-.06em}.page-head p{margin:0;color:#aab5c8}.head-actions{display:flex;gap:9px}.head-actions select,.panel-head select{min-height:45px;padding:0 34px 0 12px;border:1px solid #183352;border-radius:9px;color:#f5f8ff;background:#07111f}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.dashboard-grid{margin-top:14px;display:grid;grid-template-columns:280px minmax(0,1.35fr) minmax(290px,.8fr);gap:14px}.dashboard-grid>section{min-width:0;border-radius:16px}.guru-panel{padding:21px}.guru-orb{width:72px;height:72px;margin-bottom:16px;display:grid;place-items:center;border:1px solid #00e5ff;border-radius:22px;color:#00e5ff;background:radial-gradient(circle at 50% 45%,rgb(0 229 255/.22),#071225 58%);box-shadow:0 0 34px rgb(0 229 255/.18);animation:float 4s ease-in-out infinite}.guru-panel h2{margin:11px 0 7px}.guru-panel>p{color:#aab5c8;font-size:11px;line-height:1.65}.guru-panel>p b{color:#f5f8ff}.tip{margin:17px 0;padding:12px;display:flex;gap:9px;border:1px solid #2d3d66;border-radius:10px;color:#8b5cf6;background:rgb(139 92 246/.07)}.tip span{display:grid}.tip b{color:#f5f8ff;font-size:10px}.tip small{margin-top:4px;color:#8d9bb1;font-size:8px;line-height:1.45}.guru-panel .button{width:100%}.revenue{padding:20px;grid-column:2}.store-preview{padding:16px;grid-column:3;grid-row:1 / span 2}.panel-head{margin-bottom:15px;display:flex;align-items:start;justify-content:space-between;gap:14px}.panel-head h2{margin:6px 0 0;font-size:18px}.panel-head>a{color:#00e5ff;font-size:9px;font-weight:800}.revenue-foot{margin-top:8px;padding-top:14px;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #183352}.revenue-foot span{display:grid}.revenue-foot small{color:#718096;font-size:8px}.revenue-foot b{margin:3px 0;font-size:17px}.revenue-foot em{color:#24d89a;font-size:8px;font-style:normal}.banner{width:100%;height:135px;object-fit:cover;border:1px solid #183352;border-radius:11px}.store-id{margin:13px 0;display:flex;gap:10px;align-items:center}.store-id>img{width:45px;height:45px;border:1px solid #27547a;border-radius:11px}.store-id span{display:grid}.store-id b{font-size:12px}.store-id em{padding:2px 5px;border-radius:4px;color:#07111f;background:#00e5ff;font-size:7px;font-style:normal}.store-id small{margin-top:3px;color:#718096;font-size:8px;line-height:1.35}.store-stats{padding:13px 0;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #183352;border-bottom:1px solid #183352}.store-stats span{display:grid;text-align:center}.store-stats span+span{border-left:1px solid #183352}.store-stats b{font-size:13px}.store-stats small{color:#718096;font-size:7px}.store-preview .button{width:100%;margin-top:14px}.quick{padding:18px}.quick .panel-head{margin-bottom:7px}.quick>a{padding:12px 5px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border-top:1px solid #122a43;color:#00e5ff}.quick>a span{display:grid}.quick>a b{color:#f5f8ff;font-size:10px}.quick>a small{margin-top:2px;color:#718096;font-size:8px}.top-products{padding:18px;grid-column:2}.product-row{min-height:58px;display:grid;grid-template-columns:20px 58px minmax(0,1fr) auto auto;gap:10px;align-items:center;border-top:1px solid #122a43}.product-row>i{color:#718096;font-size:9px;font-style:normal}.product-row img{width:58px;height:38px;object-fit:cover;border-radius:6px}.product-row span{display:grid}.product-row b{font-size:10px}.product-row small{color:#718096;font-size:8px}.product-row strong{font-size:10px}.product-row em{color:#24d89a;font-size:8px;font-style:normal}.moderation,.orders,.reviews{padding:18px}.moderation{grid-column:1}.moderation-row{padding:12px 0;display:grid;grid-template-columns:55px 1fr auto;gap:10px;align-items:center;border-top:1px solid #122a43}.moderation-row img{width:55px;height:40px;object-fit:cover;border-radius:6px}.moderation-row span{display:grid}.moderation-row b{font-size:9px}.moderation-row small{margin-top:3px;color:#718096;font-size:7px;line-height:1.4}.orders{grid-column:2}.order-row{min-height:49px;display:grid;grid-template-columns:31px 1fr auto auto;gap:9px;align-items:center;border-top:1px solid #122a43}.order-row>i{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;color:#00e5ff;background:#10213a;font-size:8px;font-style:normal;font-weight:900}.order-row span{display:grid}.order-row b{font-size:9px}.order-row small,.order-row time{color:#718096;font-size:7px}.order-row strong{font-size:9px}.reviews{grid-column:3}.reviews article{padding:11px 0;border-top:1px solid #122a43}.reviews header{display:flex;gap:8px;align-items:center}.reviews header b{font-size:9px}.reviews header span{color:#ffc857;font-size:8px}.reviews header small{margin-left:auto;color:#718096;font-size:7px}.reviews p{margin:7px 0;color:#aab5c8;font-size:8px;line-height:1.5}.reviews article>em{color:#00e5ff;font-size:7px;font-style:normal}.empty-inline{padding:22px;display:flex;gap:10px;align-items:center;color:#24d89a}.empty-inline span{display:grid}.empty-inline b{color:#f5f8ff}.empty-inline small{color:#718096;font-size:8px}
  @media(max-width:1350px){.dashboard-grid{grid-template-columns:250px 1fr}.store-preview{grid-column:1;grid-row:auto}.revenue{grid-column:2}.top-products,.orders{grid-column:2}.moderation,.reviews{grid-column:1}}
  @media(max-width:900px){.metrics{grid-template-columns:repeat(2,1fr)}.dashboard-grid{grid-template-columns:1fr}.dashboard-grid>section{grid-column:1;grid-row:auto}.page-head{align-items:start;flex-direction:column}.head-actions{width:100%}.head-actions select{flex:1}}
  @media(max-width:560px){.metrics{grid-template-columns:1fr}.head-actions{display:grid}.revenue-foot{gap:10px}.product-row{grid-template-columns:18px 52px 1fr auto}.product-row em{display:none}.orders .order-row{grid-template-columns:31px 1fr auto}.order-row time{display:none}}
</style>
