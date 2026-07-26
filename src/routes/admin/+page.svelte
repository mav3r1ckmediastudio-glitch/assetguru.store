<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import MetricCard from '$lib/components/MetricCard.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { adminOrderSeries, adminRevenueSeries, adminCases, adminCounts, adminMetrics, auditEvents, moderationQueue, platformSettings, vendorApplications } from '$lib/stores/admin';

  $: queue = $moderationQueue.filter(item => item.status === 'Queued' || item.status === 'In review').slice(0,4);
  $: vendors = $vendorApplications.filter(item => item.status === 'Pending' || item.status === 'More information').slice(0,3);
  $: cases = $adminCases.filter(item => item.status === 'Open' || item.status === 'Investigating').slice(0,4);
</script>

<svelte:head><title>Admin control centre — AssetGuru</title></svelte:head>
<header class="admin-page-head">
  <div><span class="eyebrow">Platform operations</span><h1>Marketplace <span class="gradient-text">control centre.</span></h1><p>Live moderation, vendors, catalogue health, disputes and commercial performance from the production database.</p></div>
  <div class="admin-head-actions"><a class="button button-secondary" href="/admin/audit"><Icon name="list" size={18}/> Audit log</a><a class="button button-promo" href="/admin/moderation"><Icon name="shield" size={18}/> Review queue</a></div>
</header>

<div class="metrics">
  <MetricCard label="30-day GMV" value={`£${$adminMetrics.gmv.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}`} delta={`${$adminMetrics.paidItems} paid items`} icon="chart" tone="magenta" hint="completed commercial items"/>
  <MetricCard label="30-day orders" value={$adminMetrics.orders.toLocaleString('en-GB')} delta={`£${$adminMetrics.averageOrder.toFixed(2)} average`} icon="cart" tone="cyan" hint="completed orders"/>
  <MetricCard label="Moderation queue" value={$adminCounts.moderation.toString()} delta={$adminCounts.moderation ? 'Needs review' : 'All clear'} icon="shield" tone="violet" hint="active submissions"/>
  <MetricCard label="Open cases" value={$adminCounts.cases.toString()} delta={$adminCounts.urgent ? `${$adminCounts.urgent} urgent` : 'No urgent cases'} icon="tag" tone={$adminCounts.urgent ? 'amber' : 'green'} hint="buyer and policy cases"/>
</div>

<div class="dashboard">
  <section class="admin-panel glass performance">
    <div class="admin-panel-head"><div><span class="eyebrow">Commercial health</span><h2>30-day marketplace performance</h2><p>Actual completed order value and order count. Empty launch periods remain at zero.</p></div><a class="text-link" href="/admin/reports">Full reports <Icon name="arrow" size={14}/></a></div>
    <LineChart values={$adminRevenueSeries} secondary={$adminOrderSeries} primaryLabel="GMV" secondaryLabel="Orders" height={245}/>
    <div class="chart-stats"><span><b>£{$adminMetrics.marketplaceRevenue.toFixed(2)}</b><small>Marketplace revenue</small></span><span><b>£{$adminMetrics.averageOrder.toFixed(2)}</b><small>Average order</small></span><span><b>{$adminMetrics.refundRate.toFixed(2)}%</b><small>Refunded item rate</small></span><span><b>{$adminMetrics.averageRating ? `${$adminMetrics.averageRating.toFixed(2)} / 5` : '—'}</b><small>Published review average</small></span></div>
  </section>

  <section class="admin-panel glass health">
    <div class="admin-panel-head"><div><span class="eyebrow">Operational controls</span><h2>Marketplace state</h2></div><em class:paused={$platformSettings.maintenanceMode}>{$platformSettings.maintenanceMode ? 'Maintenance' : 'Open'}</em></div>
    {#each [
      ['Published catalogue',`${$adminMetrics.publishedProducts} assets`,$adminMetrics.publishedProducts ? 'Live' : 'Empty'],
      ['Approved vendors',`${$adminMetrics.activeVendors} accounts`,$adminMetrics.activeVendors ? 'Active' : 'None'],
      ['Human moderation',$platformSettings.requireHumanReview ? 'Required' : 'Optional',$platformSettings.requireHumanReview ? 'On' : 'Off'],
      ['Payout delay',`${$platformSettings.payoutDelay} days`,'Configured'],
      ['Audit records',`${$auditEvents.length} loaded`,$auditEvents.length ? 'Recording' : 'Empty']
    ] as service}
      <div class="service"><i class:warning={service[2] === 'None' || service[2] === 'Empty'}></i><span><b>{service[0]}</b><small>{service[1]}</small></span><strong>{service[2]}</strong></div>
    {/each}
    <a class="button button-secondary" href="/admin/settings">Manage platform settings</a>
  </section>

  <section class="admin-panel glass moderation">
    <div class="admin-panel-head"><div><span class="eyebrow">Publication control</span><h2>Moderation priority</h2></div><a href="/admin/moderation">View all</a></div>
    {#if queue.length}{#each queue as item}<a class="queue-row" href="/admin/moderation"><span class={`risk ${item.risk.toLowerCase()}`}></span><div><b>{item.title}</b><small>{item.vendor} · {item.type} · {item.submitted}</small></div><StatusPill status={item.status}/><Icon name="chevron" size={15}/></a>{/each}{:else}<div class="empty-admin"><Icon name="check" size={23}/><span><b>No products waiting</b><small>New submissions will appear here.</small></span></div>{/if}
  </section>

  <section class="admin-panel glass cases">
    <div class="admin-panel-head"><div><span class="eyebrow">Buyer protection</span><h2>Cases needing attention</h2></div><a href="/admin/cases">Open cases</a></div>
    {#if cases.length}{#each cases as item}<a class="case-row" href="/admin/cases"><i class:urgent={item.priority === 'Urgent'}><Icon name="alert" size={17}/></i><span><b>{item.id} · {item.type}</b><small>{item.product} · {item.vendor}</small></span><em>{item.opened}</em></a>{/each}{:else}<div class="empty-admin"><Icon name="shield" size={23}/><span><b>No open cases</b><small>Refund and policy cases will appear here.</small></span></div>{/if}
  </section>

  <section class="admin-panel glass vendors">
    <div class="admin-panel-head"><div><span class="eyebrow">Creator network</span><h2>Vendor applications</h2></div><a href="/admin/vendors">Review all</a></div>
    {#if vendors.length}{#each vendors as item}<a class="vendor-row" href="/admin/vendors"><i>{item.name.split(' ').map(part=>part[0]).slice(0,2).join('')}</i><span><b>{item.name}</b><small>{item.country || 'Location not supplied'} · {item.products}</small></span><StatusPill status={item.status}/></a>{/each}{:else}<div class="empty-admin"><Icon name="store" size={23}/><span><b>No pending applications</b><small>Vendor registrations will appear here.</small></span></div>{/if}
  </section>

  <section class="admin-panel glass activity">
    <div class="admin-panel-head"><div><span class="eyebrow">Accountability</span><h2>Recent platform activity</h2></div><a href="/admin/audit">Full audit log</a></div>
    {#if $auditEvents.length}{#each $auditEvents.slice(0,5) as event}<div class="event"><span data-tone={event.tone}></span><div><b>{event.action}</b><small>{event.actor} · {event.role} · {event.target}</small></div><time>{event.time}</time></div>{/each}{:else}<div class="empty-admin"><Icon name="list" size={23}/><span><b>No actions recorded</b><small>Production mutations will be written to the audit log.</small></span></div>{/if}
  </section>
</div>
<style>
  .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.dashboard{margin-top:14px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(310px,.65fr);gap:14px}.performance{grid-column:1}.health{grid-column:2;grid-row:1 / span 2}.chart-stats{margin-top:8px;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #183352}.chart-stats span{padding:14px 8px 2px;display:grid}.chart-stats b{font-size:14px}.chart-stats small{margin-top:4px;color:#718096;font-size:8px}.health .admin-panel-head em{padding:6px 8px;border-radius:7px;color:#24d89a;background:rgb(36 216 154/.08);font-size:8px;font-style:normal;font-weight:900}.service{min-height:51px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border-top:1px solid #122a43}.health .admin-panel-head em.paused{color:#ffb547;background:rgb(255 181 71/.08)}.service>i{width:8px;height:8px;border-radius:50%;background:#24d89a;box-shadow:0 0 10px #24d89a}.service>i.warning{background:#718096;box-shadow:none}.service span{display:grid}.service b{font-size:9px}.service small{margin-top:3px;color:#718096;font-size:7px}.service strong{color:#24d89a;font-size:9px}.health .button{width:100%;margin-top:12px}.admin-panel-head>a{color:#00e5ff;font-size:9px;font-weight:800}.queue-row{min-height:61px;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:10px;align-items:center;border-top:1px solid #122a43}.queue-row .risk{width:8px;height:8px;border-radius:50%;background:currentColor;box-shadow:0 0 9px currentColor}.queue-row .risk.low{color:#24d89a}.queue-row .risk.medium{color:#ffb547}.queue-row .risk.high{color:#ff526d}.queue-row>div{min-width:0;display:grid}.queue-row b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.queue-row small{margin-top:4px;color:#718096;font-size:8px}.queue-row :global(svg){color:#718096}.case-row{min-height:58px;display:grid;grid-template-columns:36px 1fr auto;gap:10px;align-items:center;border-top:1px solid #122a43}.case-row>i{width:36px;height:36px;display:grid;place-items:center;border-radius:9px;color:#ffb547;background:rgb(255 181 71/.08);font-style:normal}.case-row>i.urgent{color:#ff526d;background:rgb(255 82 109/.09)}.case-row span{display:grid}.case-row b{font-size:9px}.case-row small{margin-top:3px;color:#718096;font-size:7px}.case-row em{color:#aab5c8;font-size:8px;font-style:normal}.vendor-row{min-height:61px;display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;border-top:1px solid #122a43}.vendor-row>i{width:40px;height:40px;display:grid;place-items:center;border:1px solid #27547a;border-radius:10px;color:#031018;background:linear-gradient(135deg,#00e5ff,#8b5cf6);font-style:normal;font-size:9px;font-weight:950}.vendor-row span{display:grid}.vendor-row b{font-size:9px}.vendor-row small{margin-top:3px;color:#718096;font-size:7px}.activity{grid-column:1/-1}.event{min-height:52px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border-top:1px solid #122a43}.event>span{width:8px;height:8px;border-radius:50%;background:#718096}.event>span[data-tone='good']{background:#24d89a;box-shadow:0 0 8px #24d89a}.event>span[data-tone='warn']{background:#ffb547;box-shadow:0 0 8px #ffb547}.event>div{display:grid}.event b{font-size:9px}.event small{margin-top:3px;color:#718096;font-size:7px}.event time{color:#718096;font-size:8px}
  @media(max-width:1250px){.metrics{grid-template-columns:repeat(2,1fr)}.dashboard{grid-template-columns:1fr}.dashboard>section{grid-column:1;grid-row:auto}}@media(max-width:700px){.metrics,.chart-stats{grid-template-columns:1fr 1fr}.queue-row{grid-template-columns:auto 1fr auto}.queue-row :global(svg){display:none}}
.empty-admin{min-height:100px;display:flex;align-items:center;justify-content:center;gap:11px;color:#00e5ff}.empty-admin span{display:grid}.empty-admin b{color:#f5f8ff;font-size:10px}.empty-admin small{margin-top:4px;color:#718096;font-size:8px}
</style>
