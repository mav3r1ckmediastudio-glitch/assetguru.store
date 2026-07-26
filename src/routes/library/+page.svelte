<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { getAsset } from '$lib/data/marketplace';
  import { downloadHistory, entitlements, recordDownload } from '$lib/stores/buyer';

  let query = '';
  let category = 'All';
  let sort = 'Recently purchased';
  let selectedVersions: Record<string,string> = {};
  $: owned = $entitlements.flatMap((entry) => {
    const asset = getAsset(entry.slug);
    return asset ? [{...entry, asset}] : [];
  });
  $: categories = ['All', ...new Set(owned.map((entry) => entry.asset.category))];
  $: filtered = owned.filter((entry) => {
    const haystack = `${entry.asset.title} ${entry.asset.creator} ${entry.asset.category} ${entry.asset.tags.join(' ')}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (category === 'All' || entry.asset.category === category);
  }).sort((a,b) => sort === 'A–Z' ? a.asset.title.localeCompare(b.asset.title) : sort === 'Recently updated' ? b.asset.updated.localeCompare(a.asset.updated) : 0);
  const selectedVersion = (slug:string, fallback:string) => selectedVersions[slug] ?? fallback;
  function setVersion(slug:string,event:Event){selectedVersions={...selectedVersions,[slug]:(event.currentTarget as HTMLSelectElement).value};}
</script>

<svelte:head><title>My library — AssetGuru</title></svelte:head>
<section class="library-head"><div class="content-wrap"><div><span class="eyebrow">Your licensed collection</span><h1>AssetGuru <span class="gradient-text">Library.</span></h1><p>Download current or purchased versions, inspect licences and keep every GameGuru MAX project compatible.</p></div><a class="button button-secondary" href="/account"><Icon name="user" size={18}/> Buyer dashboard</a></div></section>
<section class="section library-section"><div class="content-wrap">
  <div class="toolbar glass"><label><Icon name="search" size={17}/><input bind:value={query} placeholder="Search your library"/></label><select bind:value={category}>{#each categories as option}<option>{option}</option>{/each}</select><select bind:value={sort}><option>Recently purchased</option><option>Recently updated</option><option>A–Z</option></select><span><b>{filtered.length}</b> owned assets</span></div>
  {#if filtered.length}
    <div class="library-grid">
      {#each filtered as item}
        <article class="library-card glass">
          <a class="cover" href={`/marketplace/${item.asset.slug}`}><img src={item.asset.image} alt=""/><span>{item.asset.category}</span></a>
          <div class="card-copy"><div class="title-line"><div><h2>{item.asset.title}</h2><a href={`/creators/${item.asset.creatorSlug}`}>{item.asset.creator} ✓</a></div><span class:current={item.purchasedVersion === item.asset.version}>{item.purchasedVersion === item.asset.version ? 'Current' : 'Update ready'}</span></div><p>{item.asset.summary}</p><div class="meta"><span><small>Licence</small><b>{item.licence === 'extended' ? 'Extended team' : 'Standard commercial'}</b></span><span><small>Purchased</small><b>{item.purchasedAt}</b></span><span><small>Size</small><b>{item.asset.downloadSize}</b></span></div><div class="download-row"><label>Version<select value={selectedVersion(item.asset.slug,item.asset.version)} onchange={(event)=>setVersion(item.asset.slug,event)}><option value={item.asset.version}>v{item.asset.version} — latest</option>{#if item.purchasedVersion !== item.asset.version}<option value={item.purchasedVersion}>v{item.purchasedVersion} — purchased</option>{/if}<option value="1.0.0">v1.0.0 — archive</option></select></label><button class="button button-primary" type="button" onclick={()=>recordDownload(item.asset.slug,selectedVersion(item.asset.slug,item.asset.version))}><Icon name="download" size={17}/> Prepare download</button></div><div class="card-foot"><span><Icon name="shield" size={15}/> Entitlement verified</span><a href={`/account/orders/${item.orderId}`}>Order {item.orderId}</a><a href="/account/support">Get support</a></div></div>
        </article>
      {/each}
    </div>
    <aside class="history glass"><div class="panel-head"><div><span class="eyebrow">Account activity</span><h2>Recent downloads</h2></div><a href="/account/updates">Check updates</a></div>{#each $downloadHistory.slice(0,6) as event}{#if getAsset(event.slug)}<div class="history-row"><Icon name="download" size={16}/><span><b>{getAsset(event.slug)?.title}</b><small>Version {event.version}</small></span><time>{event.downloadedAt}</time></div>{/if}{/each}</aside>
  {:else}
    <div class="empty glass"><Icon name="library" size={48}/><h2>No matching assets.</h2><p>Clear your filters or explore the marketplace to add something new.</p><a class="button button-primary" href="/marketplace">Explore marketplace</a></div>
  {/if}
</div></section>

<style>
  .library-head{padding:54px 0 34px;border-bottom:1px solid #183352;background:radial-gradient(circle at 75% 0,rgb(139 92 246/.16),transparent 28rem)}.library-head>.content-wrap{display:flex;align-items:end;justify-content:space-between;gap:24px}.library-head h1{margin:12px 0 8px;font-size:clamp(3rem,5vw,5.4rem);letter-spacing:-.06em}.library-head p{margin:0;color:#aab5c8;max-width:760px}.library-section{padding-top:26px}.toolbar{margin-bottom:16px;padding:11px;display:grid;grid-template-columns:minmax(240px,1fr) 190px 190px auto;gap:9px;align-items:center;border-radius:13px}.toolbar label{min-height:43px;padding:0 12px;display:flex;align-items:center;gap:9px;border:1px solid #183352;border-radius:9px;color:#00e5ff;background:#050a16}.toolbar input{width:100%;border:0;outline:0;color:#f5f8ff;background:transparent}.toolbar select{min-height:43px;padding:0 11px;border:1px solid #183352;border-radius:9px;color:#f5f8ff;background:#050a16}.toolbar>span{padding:0 10px;color:#718096;font-size:9px;white-space:nowrap}.toolbar>span b{color:#00e5ff}.library-grid{display:grid;gap:14px}.library-card{padding:13px;display:grid;grid-template-columns:280px minmax(0,1fr);gap:18px;border-radius:16px}.cover{position:relative;min-height:220px}.cover img{width:100%;height:100%;object-fit:cover;border-radius:10px}.cover span{position:absolute;top:10px;left:10px;padding:5px 8px;border:1px solid #27547a;border-radius:6px;color:#00e5ff;background:rgb(2 4 13/.78);font-size:8px;text-transform:uppercase}.card-copy{min-width:0}.title-line{display:flex;justify-content:space-between;gap:15px}.title-line h2{margin:5px 0 4px;font-size:21px}.title-line a{color:#00e5ff;font-size:9px}.title-line>span{height:max-content;padding:5px 8px;border-radius:6px;color:#ffc857;background:rgb(255 200 87/.1);font-size:8px;font-weight:850}.title-line>span.current{color:#24d89a;background:rgb(36 216 154/.1)}.card-copy>p{color:#aab5c8;font-size:11px;line-height:1.6}.meta{margin:15px 0;display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid #122a43}.meta span{padding:12px 4px;display:grid}.meta small{color:#718096;font-size:8px}.meta b{margin-top:3px;font-size:10px}.download-row{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:10px;align-items:end}.download-row label{display:grid;gap:6px;color:#718096;font-size:8px}.download-row select{min-height:44px;padding:0 10px;border:1px solid #183352;border-radius:9px;color:#f5f8ff;background:#050a16}.card-foot{margin-top:13px;padding-top:12px;display:flex;gap:16px;border-top:1px solid #122a43;color:#718096;font-size:8px}.card-foot span{display:flex;align-items:center;gap:5px;color:#24d89a}.card-foot a:hover{color:#00e5ff}.history{margin-top:16px;padding:19px;border-radius:16px}.panel-head{margin-bottom:9px;display:flex;justify-content:space-between}.panel-head h2{margin:6px 0 0}.panel-head>a{color:#00e5ff;font-size:9px}.history-row{min-height:50px;display:grid;grid-template-columns:28px 1fr auto;gap:9px;align-items:center;border-top:1px solid #122a43;color:#8b5cf6}.history-row span{display:grid}.history-row b{color:#f5f8ff;font-size:9px}.history-row small,.history-row time{color:#718096;font-size:8px}.empty{max-width:760px;margin:0 auto;padding:70px 28px;border-radius:18px;text-align:center;color:#00e5ff}.empty h2{color:#f5f8ff}.empty p{color:#aab5c8}.empty .button{display:inline-flex;width:auto}
  @media(max-width:1000px){.toolbar{grid-template-columns:1fr 1fr}.toolbar label{grid-column:1/-1}.library-card{grid-template-columns:220px 1fr}}@media(max-width:720px){.library-head>.content-wrap{align-items:start;flex-direction:column}.library-card{grid-template-columns:1fr}.cover{min-height:190px}.toolbar{grid-template-columns:1fr}.toolbar label{grid-column:auto}.meta{grid-template-columns:1fr}.download-row{grid-template-columns:1fr}.card-foot{flex-wrap:wrap}.title-line{align-items:start}}
</style>
