<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { moderationQueue, setModerationStatus } from '$lib/stores/admin';
  import type { ModerationItem, ModerationStatus } from '$lib/data/admin';

  let search = '';
  let status = 'Active';
  let risk = 'All risk';
  let selected: ModerationItem | null = null;
  let note = '';

  $: filtered = $moderationQueue.filter(item => {
    const active = status === 'All' || (status === 'Active' ? ['Queued','In review','Changes requested'].includes(item.status) : item.status === status);
    const riskMatch = risk === 'All risk' || item.risk === risk;
    const text = `${item.title} ${item.vendor} ${item.category} ${item.id}`.toLowerCase();
    return active && riskMatch && text.includes(search.toLowerCase());
  });

  function choose(item: ModerationItem) { selected = item; note = item.notes ?? ''; }
  function decide(next: ModerationStatus) {
    if (!selected) return;
    setModerationStatus(selected.id, next, note);
    selected = { ...selected, status: next, notes: note };
  }
</script>

<svelte:head><title>Product moderation — AssetGuru Admin</title></svelte:head>
<header class="admin-page-head">
  <div><span class="eyebrow">Trust and quality</span><h1>Product <span class="gradient-text">moderation.</span></h1><p>Review new products and updates against package safety, presentation, compatibility and marketplace quality standards.</p></div>
  <div class="admin-head-actions"><button class="button button-secondary" type="button" onclick={() => { search=''; status='Active'; risk='All risk'; }}><Icon name="sliders" size={18}/> Clear filters</button></div>
</header>

<div class="moderation-layout">
  <section class="admin-panel glass list-panel">
    <div class="admin-toolbar">
      <input class="admin-search" bind:value={search} placeholder="Search title, vendor, category or ID…" aria-label="Search moderation queue"/>
      <select class="admin-select" bind:value={status}><option>Active</option><option>All</option><option>Queued</option><option>In review</option><option>Changes requested</option><option>Approved</option><option>Rejected</option></select>
      <select class="admin-select" bind:value={risk}><option>All risk</option><option>Low</option><option>Medium</option><option>High</option></select>
    </div>
    <div class="queue-summary"><span><b>{filtered.length}</b><small>matching submissions</small></span><span><b>{$moderationQueue.filter(item=>item.status==='Queued').length}</b><small>waiting</small></span><span><b>{$moderationQueue.filter(item=>item.risk==='High' && item.status!=='Approved').length}</b><small>high risk</small></span><span><b>{$moderationQueue.length}</b><small>total loaded</small></span></div>
    <div class="submission-list">
      {#each filtered as item}
        <button type="button" class:selected={selected?.id === item.id} onclick={() => choose(item)}>
          <span class={`risk-dot ${item.risk.toLowerCase()}`}></span>
          <div><strong>{item.title}</strong><small>{item.vendor} · {item.category}</small><em>{item.id} · {item.type} · {item.submitted}</em></div>
          <span class="meta"><StatusPill status={item.status}/><small>{item.files}</small></span>
          <Icon name="chevron" size={15}/>
        </button>
      {:else}
        <div class="admin-empty"><Icon name="check" size={28}/><strong>No matching submissions</strong><span>Adjust the search or queue filters.</span></div>
      {/each}
    </div>
  </section>

  <aside class="admin-panel glass review-panel">
    {#if selected}
      <div class="review-head"><span class={`admin-risk ${selected.risk.toLowerCase()}`}>{selected.risk} risk</span><StatusPill status={selected.status}/></div>
      <h2>{selected.title}</h2><p class="vendor">{selected.vendor} · {selected.category} · {selected.type}</p>
      <div class="package-card">
        <div><Icon name="package" size={20}/><span><b>{selected.files}</b><small>Package size</small></span></div>
        <div><Icon name="list" size={20}/><span><b>{selected.version}</b><small>Submitted version</small></span></div>
        <div><Icon name="shield" size={20}/><span><b>{selected.risk}</b><small>Review risk</small></span></div>
      </div>
      <div class="checklist">
        {#each [
          { label:'Package uploaded', detail:selected.files === '0 MB' ? 'No package size recorded' : `${selected.files} uploaded`, pass:selected.files !== '0 MB' },
          { label:'GameGuru MAX metadata', detail:'Category and version were supplied by the creator', pass:Boolean(selected.category && selected.version) },
          { label:'Preview authenticity', detail:'Human comparison against the uploaded package is required', pass:selected.status === 'Approved' },
          { label:'Moderation notes', detail:note ? 'A moderator note has been recorded' : 'Add rationale before requesting changes or rejecting', pass:Boolean(note) }
        ] as check}
          <div class="check"><i class:pass={check.pass}><Icon name={check.pass ? 'check' : 'alert'} size={15}/></i><span><b>{check.label}</b><small>{check.detail}</small></span></div>
        {/each}
      </div>
      <label class="notes"><span>Moderator notes</span><textarea class="admin-textarea" bind:value={note} placeholder="Record changes, approval rationale or rejection grounds…"></textarea></label>
      <div class="review-actions">
        <button class="admin-mini-button danger" type="button" onclick={() => decide('Rejected')}>Reject</button>
        <button class="admin-mini-button warn" type="button" onclick={() => decide('Changes requested')}>Request changes</button>
        <button class="admin-mini-button" type="button" onclick={() => decide('In review')}>Mark in review</button>
        <button class="admin-mini-button good" type="button" onclick={() => decide('Approved')}>Approve product</button>
      </div>
    {:else}
      <div class="empty-review"><div><Icon name="shield" size={38}/></div><h2>Select a submission</h2><p>Choose an item from the queue to inspect its automated checks, package information and moderation history.</p></div>
    {/if}
  </aside>
</div>

<style>
  .moderation-layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(340px,.75fr);gap:14px;align-items:start}.list-panel{padding:14px}.queue-summary{margin-bottom:12px;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #183352;border-radius:11px;background:#050a16}.queue-summary span{padding:12px;display:grid;border-right:1px solid #183352}.queue-summary span:last-child{border:0}.queue-summary b{font-size:14px}.queue-summary small{margin-top:3px;color:#718096;font-size:7px}.submission-list{display:grid}.submission-list>button{width:100%;min-height:76px;padding:10px 9px;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:11px;align-items:center;border:0;border-bottom:1px solid #122a43;color:#f5f8ff;background:transparent;text-align:left;cursor:pointer}.submission-list>button:hover,.submission-list>button.selected{background:#081224}.submission-list>button.selected{box-shadow:inset 3px 0 0 #ff3fd8}.risk-dot{width:9px;height:9px;border-radius:50%;background:currentColor;box-shadow:0 0 9px currentColor}.risk-dot.low{color:#24d89a}.risk-dot.medium{color:#ffb547}.risk-dot.high{color:#ff526d}.submission-list button>div{min-width:0;display:grid}.submission-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.submission-list button div small{margin-top:4px;color:#aab5c8;font-size:8px}.submission-list em{margin-top:4px;color:#718096;font-size:7px;font-style:normal}.submission-list .meta{display:grid;justify-items:end;gap:7px}.submission-list .meta small{color:#718096;font-size:7px}.submission-list button :global(svg){color:#718096}.review-panel{position:sticky;top:102px}.review-head{display:flex;align-items:center;justify-content:space-between}.review-panel h2{margin:15px 0 5px;font-size:24px;letter-spacing:-.035em}.vendor{margin:0;color:#8d9bb1;font-size:9px}.package-card{margin:17px 0;display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #183352;border-radius:12px;background:#050a16}.package-card>div{padding:13px 9px;display:flex;gap:8px;align-items:center;border-right:1px solid #183352;color:#00e5ff}.package-card>div:last-child{border:0}.package-card span{display:grid}.package-card b{color:#f5f8ff;font-size:10px}.package-card small{margin-top:3px;color:#718096;font-size:7px}.checklist{display:grid}.check{min-height:54px;padding:8px 0;display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;border-top:1px solid #122a43}.check i{width:31px;height:31px;display:grid;place-items:center;border-radius:8px;color:#ffb547;background:rgb(255 181 71/.08);font-style:normal}.check i.pass{color:#24d89a;background:rgb(36 216 154/.08)}.check span{display:grid}.check b{font-size:9px}.check small{margin-top:3px;color:#718096;font-size:7px;line-height:1.4}.notes{margin-top:12px;display:grid;gap:7px}.notes>span{color:#aab5c8;font-size:8px;font-weight:800}.review-actions{margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:7px}.empty-review{padding:80px 24px;text-align:center}.empty-review>div{width:76px;height:76px;margin:0 auto 18px;display:grid;place-items:center;border:1px solid rgb(255 63 216/.35);border-radius:24px;color:#ff3fd8;background:rgb(255 63 216/.07)}.empty-review h2{margin:0 0 7px}.empty-review p{margin:0;color:#718096;font-size:10px;line-height:1.6}
  @media(max-width:1250px){.moderation-layout{grid-template-columns:1fr}.review-panel{position:static}}@media(max-width:680px){.queue-summary{grid-template-columns:1fr 1fr}.queue-summary span:nth-child(2){border-right:0}.queue-summary span:nth-child(-n+2){border-bottom:1px solid #183352}.submission-list>button{grid-template-columns:auto 1fr auto}.submission-list>button>svg{display:none}.package-card{grid-template-columns:1fr}.package-card>div{border-right:0;border-bottom:1px solid #183352}.review-actions{grid-template-columns:1fr}}
</style>
