<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { createModerationDownload, loadAdminData, loadModerationDetail, moderationQueue, setModerationStatus } from '$lib/stores/admin';
  import { showToast } from '$lib/stores/marketplace';
  import { parseShowcaseVideoUrl } from '$lib/showcase-video';
  import type { ModerationDetail, ModerationItem, ModerationStatus } from '$lib/data/admin';

  let search = '';
  let status = 'Active';
  let risk = 'All risk';
  let selected: ModerationItem | null = null;
  let detail: ModerationDetail | null = null;
  let note = '';
  let detailLoading = false;
  let detailError = '';
  let actionBusy = false;
  let downloadBusy: 'package' | 'documentation' | '' = '';
  let showcaseVideo: ReturnType<typeof parseShowcaseVideoUrl> = null;

  $: filtered = $moderationQueue.filter(item => {
    const active = status === 'All' || (status === 'Active' ? ['Queued','In review','Changes requested'].includes(item.status) : item.status === status);
    const riskMatch = risk === 'All risk' || item.risk === risk;
    const text = `${item.title} ${item.vendor} ${item.category} ${item.id}`.toLowerCase();
    return active && riskMatch && text.includes(search.toLowerCase());
  });
  $: showcaseVideo = parseShowcaseVideoUrl(detail?.showcaseVideoUrl);

  const money = (value:number|undefined) => value === undefined ? '—' : new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(value);
  const words = (values:string[]) => values.length ? values.join(', ') : 'None supplied';

  async function choose(item: ModerationItem) {
    selected = item;
    detail = null;
    note = item.notes ?? '';
    detailError = '';
    detailLoading = true;
    try {
      detail = await loadModerationDetail(item.id);
      note = detail.moderationNotes ?? item.notes ?? '';
    } catch (error) {
      detailError = error instanceof Error ? error.message : 'The submission details could not be loaded.';
    } finally {
      detailLoading = false;
    }
  }

  async function decide(next: ModerationStatus) {
    if (!selected || actionBusy) return;
    if (['Changes requested','Rejected'].includes(next) && note.trim().length < 10) {
      showToast('Add a clear moderator note of at least 10 characters.', 'warning');
      return;
    }
    if (next === 'Approved' && !confirm(`Approve “${selected.title}” and publish it to the marketplace?`)) return;
    if (next === 'Rejected' && !confirm(`Reject “${selected.title}”? The creator will be notified with your notes.`)) return;
    actionBusy = true;
    const completed = await setModerationStatus(selected.id, next, note.trim());
    if (completed) {
      await loadAdminData(true);
      selected = null;
      detail = null;
      note = '';
    }
    actionBusy = false;
  }

  async function download(kind:'package'|'documentation') {
    if (!selected || downloadBusy) return;
    downloadBusy = kind;
    try {
      const result = await createModerationDownload(selected.id, kind);
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(`${kind === 'package' ? 'Package' : 'Documentation'} download prepared.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'The moderation download could not be prepared.', 'warning');
    } finally {
      downloadBusy = '';
    }
  }
</script>

<svelte:head><title>Product moderation — AssetGuru Admin</title></svelte:head>
<header class="admin-page-head">
  <div><span class="eyebrow">Trust and quality</span><h1>Product <span class="gradient-text">moderation.</span></h1><p>Inspect the complete listing, verified files and moderation history before making a publication decision.</p></div>
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

  <section class="admin-panel glass workspace">
    {#if detailLoading}
      <div class="empty-review"><div><Icon name="refresh" size={38}/></div><h2>Loading the full submission</h2><p>Retrieving listing content, verified uploads and moderation history.</p></div>
    {:else if detailError}
      <div class="empty-review error"><div><Icon name="alert" size={38}/></div><h2>Submission details could not be loaded</h2><p>{detailError}</p>{#if selected}<button class="button button-secondary" type="button" onclick={() => selected && choose(selected)}>Try again</button>{/if}</div>
    {:else if detail}
      <div class="workspace-head">
        <div><div class="status-line"><span class={`admin-risk ${detail.risk.toLowerCase()}`}>{detail.risk} risk</span><StatusPill status={detail.status}/></div><h2>{detail.title}</h2><p>{detail.vendor.name} · {detail.category}{detail.subcategory ? ` → ${detail.subcategory}` : ''} · {detail.type}</p></div>
        <div class="workspace-actions">
          <button class="button button-secondary" type="button" disabled={!detail.version || Boolean(downloadBusy)} onclick={()=>download('package')}><Icon name="download" size={18}/>{downloadBusy==='package'?'Preparing…':'Download ZIP'}</button>
          {#if detail.version?.documentationName}<button class="button button-secondary" type="button" disabled={Boolean(downloadBusy)} onclick={()=>download('documentation')}><Icon name="download" size={18}/>{downloadBusy==='documentation'?'Preparing…':'Download guide'}</button>{/if}
        </div>
      </div>

      <div class="facts">
        <span><b>{detail.version?.size ?? 'No package'}</b><small>Package size</small></span>
        <span><b>{detail.version?.version ?? '—'}</b><small>Submitted version</small></span>
        <span><b>{detail.images.length}</b><small>Preview images</small></span>
        <span><b>{detail.updated}</b><small>Last updated</small></span>
      </div>

      <section class="review-section">
        <div class="section-title"><div><span class="eyebrow">Listing preview</span><h3>Presentation gallery</h3></div><span class:warning={!detail.images.length}>{detail.images.length ? `${detail.images.length} stored images` : 'No images supplied'}</span></div>
        {#if detail.images.length}
          <div class="gallery">{#each detail.images as image,index}<figure class:cover={index===0 || image.imageType==='cover'}><img src={image.url} alt={image.altText || `${detail.title} preview ${index+1}`}/><figcaption><b>{index===0 || image.imageType==='cover' ? 'Cover image' : `Preview ${index+1}`}</b><small>{image.altText || 'No alt text supplied'}</small></figcaption></figure>{/each}</div>
        {:else}<div class="inline-warning"><Icon name="alert" size={20}/><span><b>No preview gallery</b><small>This product should not be approved without representative images.</small></span></div>{/if}
        {#if showcaseVideo}<div class="video"><iframe src={showcaseVideo.embedUrl} title={`${detail.title} showcase video`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>{:else}<div class="optional-note"><Icon name="eye" size={18}/><span><b>No showcase video supplied</b><small>This field is optional.</small></span></div>{/if}
      </section>

      <section class="review-section copy-section">
        <div class="section-title"><div><span class="eyebrow">Buyer-facing content</span><h3>Product description</h3></div></div>
        <div class="summary"><b>Short summary</b><p>{detail.summary || 'No summary supplied.'}</p></div>
        <div class="description"><b>Full description</b><p>{detail.description || 'No description supplied.'}</p></div>
        <div class="split-lists"><div><b>Key features</b>{#if detail.features.length}<ul>{#each detail.features as item}<li>{item}</li>{/each}</ul>{:else}<p>None supplied</p>{/if}</div><div><b>Package contents</b>{#if detail.contents.length}<ul>{#each detail.contents as item}<li>{item}</li>{/each}</ul>{:else}<p>None supplied</p>{/if}</div></div>
      </section>

      <section class="review-section">
        <div class="section-title"><div><span class="eyebrow">Technical review</span><h3>Compatibility and package</h3></div></div>
        <dl class="detail-grid">
          <div><dt>Category</dt><dd>{detail.category} → {detail.subcategory || 'No subcategory'}</dd></div><div><dt>GameGuru MAX compatibility</dt><dd>{detail.compatibility}</dd></div>
          <div><dt>Minimum MAX version</dt><dd>{detail.maxVersion}</dd></div><div><dt>Performance profile</dt><dd>{detail.performance}</dd></div>
          <div><dt>Source files</dt><dd>{detail.sourceFiles ? 'Included' : 'Not included'}</dd></div><div><dt>Dependencies</dt><dd>{detail.dependencies || 'None'}</dd></div>
          <div><dt>File formats</dt><dd>{words(detail.formats)}</dd></div><div><dt>Search tags</dt><dd>{words(detail.tags)}</dd></div>
        </dl>
        {#if detail.version}
          <div class="file-card">
            <div class:failed={!detail.version.packageVerified}><Icon name={detail.version.packageVerified?'check':'alert'} size={20}/></div>
            <span><b>{detail.version.packageName}</b><small>{detail.version.size} · Version {detail.version.version} · {detail.version.packageVerified?'Object verified':'Object could not be verified'}</small></span>
            <button class="admin-mini-button good" type="button" disabled={Boolean(downloadBusy)} onclick={()=>download('package')}>Download securely</button>
          </div>
          {#if detail.version.documentationName}<div class="file-card"><div class:failed={detail.version.documentationVerified===false}><Icon name={detail.version.documentationVerified===false?'alert':'check'} size={20}/></div><span><b>{detail.version.documentationName}</b><small>{detail.version.documentationVerified===false?'Documentation could not be verified':'Documentation available'}</small></span><button class="admin-mini-button" type="button" disabled={Boolean(downloadBusy)} onclick={()=>download('documentation')}>Download guide</button></div>{/if}
          <div class="release-notes"><b>Release notes</b><p>{detail.version.releaseNotes || 'No release notes supplied.'}</p></div>
        {:else}<div class="inline-warning"><Icon name="alert" size={20}/><span><b>No submitted package version</b><small>The product cannot be approved.</small></span></div>{/if}
      </section>

      <section class="review-section">
        <div class="section-title"><div><span class="eyebrow">Commercial terms</span><h3>Pricing and licence</h3></div></div>
        <div class="price-cards"><span><b>{money(detail.price)}</b><small>Standard licence</small></span><span><b>{money(detail.extendedPrice)}</b><small>Extended licence</small></span></div>
        <div class="licence"><b>Creator licence summary</b><p>{detail.licence || 'No licence summary supplied.'}</p></div>
      </section>

      <section class="review-section">
        <div class="section-title"><div><span class="eyebrow">Creator accountability</span><h3>Seller and declaration</h3></div></div>
        <dl class="detail-grid"><div><dt>Creator</dt><dd>{detail.vendor.name} {detail.vendor.handle}</dd></div><div><dt>Creator status</dt><dd>{detail.vendor.status}</dd></div><div><dt>Support email</dt><dd>{detail.vendor.email || 'Not supplied'}</dd></div><div><dt>Location</dt><dd>{detail.vendor.location || 'Not supplied'}</dd></div><div><dt>Response time</dt><dd>{detail.vendor.responseTime || 'Not supplied'}</dd></div><div><dt>Joined</dt><dd>{detail.vendor.joined}</dd></div></dl>
        <div class:warning={!detail.declaration.recorded} class="declaration"><Icon name={detail.declaration.recorded?'check':'alert'} size={22}/><span><b>{detail.declaration.recorded?'Creator declaration recorded':'Creator declaration needs manual confirmation'}</b><small>{detail.declaration.text}</small></span></div>
      </section>

      <section class="review-section">
        <div class="section-title"><div><span class="eyebrow">Traceability</span><h3>Moderation history</h3></div></div>
        <div class="history">{#each detail.history as event}<div><i></i><span><b>{event.action}</b><small>{event.actorRole} · {event.created}{event.notes ? ` · ${event.notes}` : ''}</small></span></div>{:else}<p>No product audit history was found.</p>{/each}</div>
      </section>

      <section class="decision-section">
        <div><span class="eyebrow">Final decision</span><h3>Moderator notes and outcome</h3><p>Explain any requested changes or rejection clearly. Approval notes are optional but useful for the audit trail.</p></div>
        <label class="notes"><span>Moderator notes</span><textarea class="admin-textarea" bind:value={note} placeholder="Record approval rationale, required changes or rejection grounds…"></textarea></label>
        <div class="review-actions">
          <button class="button danger-action" type="button" disabled={actionBusy} onclick={()=>decide('Rejected')}><Icon name="close" size={18}/>{actionBusy?'Working…':'Reject'}</button>
          <button class="button warning-action" type="button" disabled={actionBusy} onclick={()=>decide('Changes requested')}><Icon name="alert" size={18}/>Request changes</button>
          <button class="button approve-action" type="button" disabled={actionBusy || !detail.version?.packageVerified || detail.images.length<3} onclick={()=>decide('Approved')}><Icon name="check" size={18}/>Approve and publish</button>
        </div>
        {#if !detail.version?.packageVerified || detail.images.length<3}<div class="approval-block"><Icon name="lock" size={17}/><span>Approval is blocked until the package verifies and at least three preview images are present.</span></div>{/if}
      </section>
    {:else}
      <div class="empty-review"><div><Icon name="shield" size={38}/></div><h2>Select a submission</h2><p>Choose an item from the queue to open its complete listing, files, seller details and decision controls.</p></div>
    {/if}
  </section>
</div>

<style>
  .moderation-layout{display:grid;grid-template-columns:minmax(390px,.72fr) minmax(0,1.28fr);gap:14px;align-items:start}.list-panel{padding:14px;position:sticky;top:92px}.queue-summary{margin-bottom:12px;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #183352;border-radius:11px;background:#050a16}.queue-summary span{padding:12px;display:grid;border-right:1px solid #183352}.queue-summary span:last-child{border:0}.queue-summary b{font-size:16px}.queue-summary small{margin-top:4px;color:#8d9bb1;font-size:9px}.submission-list{display:grid;max-height:calc(100vh - 340px);overflow:auto}.submission-list>button{width:100%;min-height:82px;padding:12px 10px;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:11px;align-items:center;border:0;border-bottom:1px solid #122a43;color:#f5f8ff;background:transparent;text-align:left;cursor:pointer}.submission-list>button:hover,.submission-list>button.selected{background:#081224}.submission-list>button.selected{box-shadow:inset 3px 0 0 #ff3fd8}.risk-dot{width:9px;height:9px;border-radius:50%;background:currentColor;box-shadow:0 0 9px currentColor}.risk-dot.low{color:#24d89a}.risk-dot.medium{color:#ffb547}.risk-dot.high{color:#ff526d}.submission-list button>div{min-width:0;display:grid}.submission-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.submission-list button div small{margin-top:5px;color:#aab5c8;font-size:10px}.submission-list em{margin-top:5px;color:#718096;font-size:9px;font-style:normal}.submission-list .meta{display:grid;justify-items:end;gap:7px}.submission-list .meta small{color:#8d9bb1;font-size:9px}.workspace{padding:22px}.workspace-head{display:flex;align-items:start;justify-content:space-between;gap:20px}.workspace-head h2{margin:10px 0 5px;font-size:clamp(1.8rem,3vw,2.8rem);letter-spacing:-.045em}.workspace-head p{margin:0;color:#aab5c8;font-size:12px}.status-line{display:flex;align-items:center;gap:12px}.workspace-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}.workspace-actions .button{min-width:150px}.facts{margin:20px 0;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #183352;border-radius:13px;background:#050a16}.facts span{padding:15px 12px;display:grid;border-right:1px solid #183352}.facts span:last-child{border:0}.facts b{font-size:16px}.facts small{margin-top:5px;color:#8d9bb1;font-size:9px}.review-section{padding:24px 0;border-top:1px solid #183352}.section-title{margin-bottom:15px;display:flex;align-items:start;justify-content:space-between;gap:15px}.section-title h3,.decision-section h3{margin:7px 0 0;font-size:19px}.section-title>span{padding:7px 9px;border-radius:8px;color:#24d89a;background:rgb(36 216 154/.08);font-size:9px;font-weight:850}.section-title>span.warning{color:#ffb547;background:rgb(255 181 71/.08)}.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.gallery figure{min-width:0;margin:0;overflow:hidden;border:1px solid #183352;border-radius:12px;background:#050a16}.gallery figure.cover{border-color:#00e5ff;box-shadow:0 0 0 1px rgb(0 229 255/.2)}.gallery img{width:100%;aspect-ratio:16/10;display:block;object-fit:cover;background:#02060e}.gallery figcaption{padding:10px;display:grid}.gallery figcaption b{font-size:11px}.gallery figcaption small{margin-top:4px;overflow:hidden;color:#8d9bb1;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.video{margin-top:14px;overflow:hidden;border:1px solid #183352;border-radius:12px;background:#02060e}.video iframe{width:100%;aspect-ratio:16/9;display:block;border:0}.optional-note,.inline-warning,.declaration{padding:13px;display:flex;gap:11px;align-items:center;border:1px solid #183352;border-radius:11px;background:#050a16}.optional-note{margin-top:12px;color:#8d9bb1}.inline-warning{color:#ffb547;border-color:rgb(255 181 71/.35);background:rgb(255 181 71/.05)}.optional-note span,.inline-warning span,.declaration span{display:grid}.optional-note b,.inline-warning b,.declaration b{font-size:11px}.optional-note small,.inline-warning small,.declaration small{margin-top:4px;color:#aab5c8;font-size:10px;line-height:1.5}.copy-section p,.release-notes p,.licence p,.decision-section p{margin:6px 0 0;color:#c5cede;font-size:12px;line-height:1.7;white-space:pre-wrap}.summary,.description,.release-notes,.licence{padding:14px;border:1px solid #183352;border-radius:11px;background:#050a16}.description,.release-notes,.licence{margin-top:10px}.summary>b,.description>b,.release-notes>b,.licence>b,.split-lists b{font-size:11px}.split-lists{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.split-lists>div{padding:14px;border:1px solid #183352;border-radius:11px;background:#050a16}.split-lists ul{margin:9px 0 0;padding-left:18px;color:#c5cede;font-size:11px;line-height:1.7}.split-lists p{color:#8d9bb1}.detail-grid{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#183352;border:1px solid #183352;border-radius:11px;overflow:hidden}.detail-grid>div{padding:12px;display:grid;gap:5px;background:#050a16}.detail-grid dt{color:#8d9bb1;font-size:9px}.detail-grid dd{margin:0;color:#f5f8ff;font-size:11px;line-height:1.45}.file-card{margin-top:10px;padding:11px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:center;border:1px solid #183352;border-radius:11px;background:#050a16}.file-card>div{width:38px;height:38px;display:grid;place-items:center;border-radius:10px;color:#24d89a;background:rgb(36 216 154/.08)}.file-card>div.failed{color:#ff526d;background:rgb(255 82 109/.08)}.file-card span{min-width:0;display:grid}.file-card b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.file-card small{margin-top:4px;color:#8d9bb1;font-size:9px}.price-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}.price-cards span{padding:15px;display:grid;border:1px solid #183352;border-radius:11px;background:#050a16}.price-cards b{font-size:20px}.price-cards small{margin-top:5px;color:#8d9bb1;font-size:9px}.declaration{margin-top:10px;color:#24d89a;border-color:rgb(36 216 154/.35);background:rgb(36 216 154/.05)}.declaration.warning{color:#ffb547;border-color:rgb(255 181 71/.35);background:rgb(255 181 71/.05)}.history{display:grid}.history>div{min-height:50px;display:grid;grid-template-columns:auto 1fr;gap:11px;align-items:center;border-top:1px solid #122a43}.history>div:first-child{border-top:0}.history i{width:9px;height:9px;border-radius:50%;background:#8b5cf6;box-shadow:0 0 9px #8b5cf6}.history span{display:grid}.history b{font-size:11px;text-transform:capitalize}.history small{margin-top:4px;color:#8d9bb1;font-size:9px;line-height:1.45}.history>p{color:#8d9bb1;font-size:11px}.decision-section{padding:22px;border:1px solid #27547a;border-radius:14px;background:linear-gradient(135deg,rgb(0 229 255/.035),rgb(139 92 246/.035))}.notes{margin-top:15px;display:grid;gap:8px}.notes>span{color:#c5cede;font-size:10px;font-weight:850}.review-actions{margin-top:12px;display:grid;grid-template-columns:1fr 1fr 1.25fr;gap:8px}.review-actions .button{min-height:46px}.danger-action{color:#ff526d;border:1px solid rgb(255 82 109/.38);background:rgb(255 82 109/.06)}.warning-action{color:#ffb547;border:1px solid rgb(255 181 71/.38);background:rgb(255 181 71/.06)}.approve-action{color:#031018;border:1px solid #24d89a;background:#24d89a}.approval-block{margin-top:10px;padding:10px;display:flex;gap:9px;align-items:center;color:#ffb547;border:1px solid rgb(255 181 71/.3);border-radius:9px;background:rgb(255 181 71/.05);font-size:10px}.empty-review{padding:110px 30px;text-align:center}.empty-review>div{width:76px;height:76px;margin:0 auto 18px;display:grid;place-items:center;border:1px solid rgb(255 63 216/.35);border-radius:24px;color:#ff3fd8;background:rgb(255 63 216/.07)}.empty-review.error>div{color:#ffb547;border-color:rgb(255 181 71/.35);background:rgb(255 181 71/.07)}.empty-review h2{margin:0 0 8px}.empty-review p{margin:0 auto 16px;max-width:500px;color:#8d9bb1;font-size:12px;line-height:1.6}.button:disabled,.admin-mini-button:disabled{opacity:.45;cursor:not-allowed}
  @media(max-width:1350px){.moderation-layout{grid-template-columns:1fr}.list-panel{position:static}.submission-list{max-height:430px}.gallery{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.queue-summary,.facts{grid-template-columns:1fr 1fr}.queue-summary span:nth-child(2),.facts span:nth-child(2){border-right:0}.queue-summary span:nth-child(-n+2),.facts span:nth-child(-n+2){border-bottom:1px solid #183352}.submission-list>button{grid-template-columns:auto 1fr auto}.submission-list>button>svg{display:none}.workspace{padding:15px}.workspace-head{display:grid}.workspace-actions{justify-content:stretch}.workspace-actions .button{width:100%}.gallery,.split-lists,.detail-grid,.price-cards,.review-actions{grid-template-columns:1fr}.file-card{grid-template-columns:auto minmax(0,1fr)}.file-card .admin-mini-button{grid-column:1/-1}.facts span:nth-child(3){border-right:1px solid #183352}}
</style>
