<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { auditEvents } from '$lib/stores/admin';
  let search='';
  let role='All roles';
  $: filtered=$auditEvents.filter(event => (role==='All roles'||event.role===role) && `${event.id} ${event.actor} ${event.role} ${event.action} ${event.target}`.toLowerCase().includes(search.toLowerCase()));
</script>

<svelte:head><title>Audit log — AssetGuru Admin</title></svelte:head>
<header class="admin-page-head"><div><span class="eyebrow">Platform accountability</span><h1>Immutable <span class="gradient-text">audit log.</span></h1><p>A traceable record of moderation, financial, catalogue and administrator actions across the marketplace.</p></div><div class="admin-head-actions"><button class="button button-secondary" type="button"><Icon name="download" size={18}/> Export log</button></div></header>

<section class="admin-panel glass">
  <div class="admin-toolbar"><input class="admin-search" bind:value={search} placeholder="Search actor, action, target or ID…"/><select class="admin-select" bind:value={role}><option>All roles</option><option>Administrator</option><option>Moderator</option><option>Finance</option><option>Automation</option></select><select class="admin-select"><option>Newest first</option><option>Oldest first</option></select></div>
  <div class="retention"><Icon name="lock" size={18}/><span><b>Audit retention enabled</b><small>Administrative events are append-only in production and retained according to legal and security policy.</small></span><strong>365 days</strong></div>
  <div class="timeline">
    {#each filtered as event}
      <article><span class="marker" data-tone={event.tone}></span><div class="event-main"><span><b>{event.action}</b><small>{event.target}</small></span><em>{event.id}</em></div><div class="actor"><i>{event.actor.split(' ').map(part=>part[0]).slice(0,2).join('')}</i><span><b>{event.actor}</b><small>{event.role}</small></span></div><time>{event.time}</time></article>
    {:else}<div class="admin-empty"><Icon name="list" size={28}/><strong>No audit events match</strong><span>Try a broader search or role filter.</span></div>{/each}
  </div>
</section>

<style>
  .retention{margin-bottom:14px;padding:13px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid rgb(0 229 255/.24);border-radius:11px;color:#00e5ff;background:rgb(0 229 255/.05)}.retention span{display:grid}.retention b{color:#f5f8ff;font-size:9px}.retention small{margin-top:3px;color:#8d9bb1;font-size:8px}.retention strong{font-size:9px}.timeline{display:grid}.timeline article{position:relative;min-height:70px;padding:10px 8px 10px 28px;display:grid;grid-template-columns:minmax(0,1fr) 190px 100px;gap:16px;align-items:center;border-top:1px solid #122a43}.timeline article::before{content:'';position:absolute;left:11px;top:0;bottom:0;width:1px;background:#183352}.marker{position:absolute;z-index:1;left:7px;width:9px;height:9px;border:2px solid #050a16;border-radius:50%;background:#718096}.marker[data-tone='good']{background:#24d89a;box-shadow:0 0 9px #24d89a}.marker[data-tone='warn']{background:#ffb547;box-shadow:0 0 9px #ffb547}.event-main{min-width:0;display:flex;align-items:center;justify-content:space-between;gap:10px}.event-main>span{min-width:0;display:grid}.event-main b{font-size:10px}.event-main small{margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#718096;font-size:8px}.event-main em{padding:5px 7px;border:1px solid #183352;border-radius:6px;color:#718096;font-size:7px;font-style:normal}.actor{display:flex;gap:8px;align-items:center}.actor>i{width:33px;height:33px;display:grid;place-items:center;border:1px solid #27547a;border-radius:9px;color:#00e5ff;background:#081224;font-style:normal;font-size:7px;font-weight:900}.actor span{display:grid}.actor b{font-size:8px}.actor small{margin-top:3px;color:#718096;font-size:7px}.timeline time{color:#718096;font-size:8px;text-align:right}
  @media(max-width:800px){.timeline article{grid-template-columns:1fr auto}.actor{grid-column:1}.timeline time{grid-column:2;grid-row:1}.event-main{grid-column:1/-1}.retention{grid-template-columns:auto 1fr}.retention>strong{display:none}}
</style>
