<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import AssetCard from '$lib/components/AssetCard.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { assetPrice, assets, getCreator, type LicenceKey } from '$lib/data/marketplace';
  import { addToCart, favourites, toggleFavourite } from '$lib/stores/marketplace';
  import { parseShowcaseVideoUrl } from '$lib/showcase-video';

  let selectedMedia = '';
  let videoSelected = false;
  let showcaseVideo: ReturnType<typeof parseShowcaseVideoUrl> = null;
  let tab = 'Overview';
  let licence: LicenceKey = 'standard';

  $: asset = $assets.find((item) => item.slug === page.params.slug);
  $: creator = asset ? getCreator(asset.creatorSlug) : undefined;
  $: favourite = asset ? $favourites.includes(asset.slug) : false;
  $: displayPrice = asset ? assetPrice(asset, licence) : 0;
  $: related = asset ? $assets.filter((item) => item.slug !== asset.slug && (item.category === asset.category || item.creatorSlug === asset.creatorSlug)).slice(0, 4) : [];
  $: showcaseVideo = parseShowcaseVideoUrl(asset?.showcaseVideoUrl);
  $: if (!showcaseVideo) videoSelected = false;
  $: if (asset && !asset.gallery.includes(selectedMedia)) { selectedMedia = asset.image; videoSelected = false; }

  function buyNow() {
    if (!asset) return;
    addToCart(asset.slug, licence, asset.title);
    goto('/basket');
  }
</script>

<svelte:head>
  <title>{asset?.title ?? 'Asset unavailable'} — AssetGuru</title>
  <meta name="description" content={asset?.summary ?? 'GameGuru MAX marketplace asset'}/>
</svelte:head>
{#if asset}


<section class="product section">
  <div class="content-wrap">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/marketplace">Marketplace</a><span>›</span><a href={`/marketplace?category=${encodeURIComponent(asset.category)}`}>{asset.category}</a><span>›</span><em>{asset.title}</em></nav>

    <div class="product-grid">
      <div class="media-panel">
        <div class="main-media glass">{#if videoSelected&&showcaseVideo}<iframe src={showcaseVideo.embedUrl} title={`${asset.title} showcase video`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>{:else}<img src={selectedMedia} alt={asset.title}/><div class="media-overlay"><span>{asset.badge ?? asset.subcategory}</span><b>{asset.compatibility}</b></div>{/if}</div>
        <div class="thumbs">
          {#each asset.gallery as media, index}
            <button class:active={!videoSelected&&selectedMedia === media} type="button" onclick={() => { selectedMedia = media; videoSelected = false; }}><img src={media} alt={`${asset.title} preview ${index + 1}`}/></button>
          {/each}
          {#if showcaseVideo}<button class:active={videoSelected} class="video-thumb" type="button" onclick={() => videoSelected = true}><Icon name="eye" size={24}/><span>{showcaseVideo.provider==='youtube'?'YouTube':'Vimeo'}</span></button>{/if}
        </div>
        <div class="media-note"><Icon name="eye" size={17}/><span>Media supplied by the creator is moderated before publication.</span></div>
      </div>

      <aside class="buy glass">
        <div class="buy-top"><span class="eyebrow">{asset.category}</span><button class:favourited={favourite} class="heart" type="button" aria-label="Toggle favourite" onclick={() => toggleFavourite(asset.slug, asset.title)}><Icon name="heart" size={20}/></button></div>
        <h1>{asset.title}</h1>
        <a class="creator" href={`/creators/${asset.creatorSlug}`}><img src={asset.creatorAvatar} alt=""/><span>by <strong>{asset.creator}</strong><small>✓ Verified creator · {creator?.responseTime}</small></span><Icon name="chevron" size={17}/></a>
        <div class="score"><span><Icon name="star" size={16}/> {asset.rating}</span><a href="#reviews">{asset.reviews} verified reviews</a><small>{asset.sales.toLocaleString('en-GB')} sales</small></div>
        <p class="summary">{asset.summary}</p>

        <fieldset class="licences">
          <legend>Choose licence</legend>
          <label class:active={licence === 'standard'}><input type="radio" bind:group={licence} value="standard"/><span><b>Standard commercial</b><small>For you or one legal entity</small></span><strong>£{asset.price.toFixed(2)}</strong></label>
          <label class:active={licence === 'extended'}><input type="radio" bind:group={licence} value="extended"/><span><b>Extended team</b><small>For a larger production team</small></span><strong>£{(asset.extendedPrice ?? asset.price * 2.5).toFixed(2)}</strong></label>
        </fieldset>

        <div class="price-line"><span>{asset.price === 0 ? 'Free' : `£${displayPrice.toFixed(2)}`}</span>{#if asset.oldPrice && licence === 'standard'}<s>£{asset.oldPrice.toFixed(2)}</s>{/if}<small>VAT calculated at checkout where applicable</small></div>
        <button class="button button-primary" type="button" onclick={() => addToCart(asset.slug, licence, asset.title)}><Icon name="cart" size={18}/> Add to basket</button>
        <button class="button button-secondary" type="button" onclick={buyNow}><Icon name="spark" size={18}/> Buy now</button>

        <div class="assurances"><span><Icon name="max" size={19}/><b>{asset.compatibility}</b><small>Tested build</small></span><span><Icon name="shield" size={19}/><b>Moderated</b><small>Listing and package reviewed</small></span><span><Icon name="download" size={19}/><b>Library access</b><small>Updates and re-downloads</small></span></div>
      </aside>
    </div>

    <div class="details-grid">
      <section class="details glass">
        <nav>{#each ['Overview','Compatibility','Package contents','Reviews'] as item}<button class:active={tab === item} type="button" onclick={() => tab = item}>{item}</button>{/each}</nav>
        {#if tab === 'Overview'}
          <div class="tab overview"><h2>{asset.summary}</h2><p>{asset.description}</p><h3>Key features</h3><div class="feature-grid">{#each asset.features as feature}<span><Icon name="check" size={16}/>{feature}</span>{/each}</div><div class="tag-list">{#each asset.tags as tag}<a href={`/marketplace?q=${encodeURIComponent(tag)}`}>#{tag}</a>{/each}</div></div>
        {:else if tab === 'Compatibility'}
          <div class="tab"><h2>Compatibility without guesswork.</h2><p>These fields are mandatory for AssetGuru listings, so buyers can judge an asset before committing.</p><div class="specs"><span><small>Tested version</small><b>{asset.compatibility}</b></span><span><small>Current release</small><b>{asset.version}</b></span><span><small>Dependencies</small><b>{asset.dependencies}</b></span><span><small>Performance tier</small><b>{asset.performance}</b></span><span><small>Download size</small><b>{asset.downloadSize}</b></span><span><small>Source files</small><b>{asset.sourceFiles ? 'Included' : 'Not included'}</b></span></div><div class="formats"><strong>Included formats</strong>{#each asset.formats as format}<span>{format}</span>{/each}</div></div>
        {:else if tab === 'Package contents'}
          <div class="tab"><h2>Organised, documented and ready to use.</h2><p>The package manifest is supplied by the creator and displayed before purchase so buyers can verify what is included.</p><div class="contents">{#each asset.contents as item, index}<span><b>{String(index + 1).padStart(2,'0')}</b><Icon name="package" size={20}/><em>{item}</em></span>{/each}</div></div>
        {:else}
          <div class="tab reviews" id="reviews"><div class="review-summary"><strong>{asset.reviews ? asset.rating : '—'}</strong><span><b>{asset.reviews ? `${'★'.repeat(Math.round(asset.rating))}${'☆'.repeat(5-Math.round(asset.rating))}` : 'No ratings yet'}</b><small>{asset.reviews ? `Based on ${asset.reviews} verified ${asset.reviews===1?'purchase':'purchases'}` : 'Verified buyer reviews will appear here.'}</small></span></div>{#if asset.recentReviews.length}{#each asset.recentReviews as review}<article><header><b>{review.title}</b><span>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span><small>{review.buyer} · Verified purchase · {review.date}</small></header><p>{review.text}</p></article>{/each}{:else}<div class="review-empty"><Icon name="star" size={28}/><b>No published reviews yet</b><small>Buyers can review this asset after a completed purchase.</small></div>{/if}</div>
        {/if}
      </section>

      <aside class="side-info">
        <section class="compat-card glass"><span>Compatibility profile</span><h3>Ready for GameGuru MAX</h3><div class="meter"><i style={`width:${asset.rating * 20}%`}></i></div><p>Structured metadata, reviewed package and active creator support.</p><dl><div><dt>Performance</dt><dd>{asset.performance}</dd></div><div><dt>Last update</dt><dd>{asset.updated}</dd></div><div><dt>Download</dt><dd>{asset.downloadSize}</dd></div><div><dt>Support</dt><dd>Active</dd></div></dl></section>
        {#if creator}<section class="vendor-card glass"><img src={creator.avatar} alt=""/><div><small>Sold by</small><h3>{creator.name}</h3><p>{creator.tagline}</p></div><div class="vendor-stats"><span><b>{creator.rating}</b><small>rating</small></span><span><b>{creator.sales.toLocaleString('en-GB')}</b><small>sales</small></span><span><b>{creator.followers.toLocaleString('en-GB')}</b><small>followers</small></span></div><a class="button button-secondary" href={`/creators/${creator.slug}`}><Icon name="store" size={17}/> Visit creator store</a></section>{/if}
      </aside>
    </div>

    <section class="related"><div class="related-head"><div><span class="eyebrow">Keep exploring</span><h2>Related assets</h2></div><a class="text-link" href={`/marketplace?category=${encodeURIComponent(asset.category)}`}>Browse {asset.category} →</a></div><div>{#each related as item}<AssetCard asset={item}/>{/each}</div></section>
  </div>
</section>

{:else}
<section class="section"><div class="content-wrap"><div class="empty-state glass"><span class="eyebrow">Marketplace</span><h1>Asset unavailable.</h1><p>This product does not exist or is not currently published.</p><a class="button button-primary" href="/marketplace">Return to marketplace</a></div></div></section>
{/if}

<style>
  .breadcrumbs{margin-bottom:20px;display:flex;align-items:center;gap:8px;color:#718096;font-size:11px}.breadcrumbs a:hover{color:#00e5ff}.breadcrumbs em{color:#aab5c8;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.product-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(350px,.55fr);gap:18px}.media-panel{min-width:0}.main-media{position:relative;padding:12px;border-radius:17px;overflow:hidden}.main-media>img,.main-media>iframe{width:100%;aspect-ratio:16/9;border-radius:11px}.main-media>img{object-fit:cover}.main-media>iframe{display:block;border:0;background:#02040d}.media-overlay{position:absolute;right:24px;bottom:24px;left:24px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}.media-overlay span,.media-overlay b{padding:7px 10px;border:1px solid #27547a;border-radius:8px;background:rgb(2 4 13/.78);backdrop-filter:blur(10px);font-size:9px;text-transform:uppercase;letter-spacing:.08em}.media-overlay span{color:#00e5ff}.thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:10px}.thumbs button{padding:4px;border:1px solid #183352;border-radius:10px;background:#050a16;cursor:pointer}.thumbs button.active{border-color:#00e5ff;box-shadow:0 0 18px rgb(0 229 255/.16)}.thumbs img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px}.video-thumb{min-height:84px;display:grid;place-items:center;align-content:center;gap:5px;color:#00e5ff}.video-thumb span{font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.08em}.media-note{margin-top:11px;padding:11px 13px;display:flex;gap:9px;align-items:center;color:#718096;font-size:10px}.media-note :global(svg){color:#8b5cf6;flex:0 0 auto}
  .buy{padding:27px;border-radius:17px;position:sticky;top:102px}.buy-top{display:flex;justify-content:space-between;align-items:center}.heart{width:42px;height:42px;display:grid;place-items:center;border:1px solid #183352;border-radius:10px;color:#aab5c8;background:#081224;cursor:pointer}.heart.favourited{color:#ff3fd8;border-color:#ff3fd8}.buy h1{margin:13px 0 16px;font-size:clamp(2rem,3vw,3.15rem);line-height:1;letter-spacing:-.055em}.creator{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;padding:8px;border:1px solid transparent;border-radius:10px}.creator:hover{border-color:#183352;background:#050a16}.creator img{width:42px;height:42px;border-radius:50%}.creator>span{display:grid;color:#718096;font-size:10px}.creator strong{color:#f5f8ff;font-size:13px}.creator small{color:#00e5ff}.score{margin:16px 0;display:flex;flex-wrap:wrap;align-items:center;gap:10px}.score>span{display:flex;align-items:center;gap:4px;color:#ffc857;font-weight:850}.score a,.score small{color:#718096;font-size:10px}.score a:hover{color:#00e5ff}.summary{color:#aab5c8;line-height:1.65}.licences{margin:20px 0 0;padding:0;border:0}.licences legend{margin-bottom:8px;color:#f5f8ff;font-size:11px;font-weight:850}.licences label{margin-top:7px;padding:12px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid #183352;border-radius:10px;color:#aab5c8;background:#050a16;cursor:pointer}.licences label.active{border-color:#00e5ff;background:rgb(0 229 255/.06)}.licences input{accent-color:#00e5ff}.licences span{display:grid}.licences span b{color:#f5f8ff;font-size:11px}.licences span small{color:#718096;font-size:9px}.licences label>strong{color:#00e5ff;font-size:12px}.price-line{margin:20px 0 12px;display:grid;grid-template-columns:auto auto 1fr;gap:8px;align-items:baseline}.price-line>span{color:#00e5ff;font-size:29px;font-weight:900}.price-line s{color:#718096}.price-line small{justify-self:end;color:#718096;font-size:8px}.buy>.button{width:100%;margin-top:8px}.assurances{margin-top:18px;padding-top:16px;border-top:1px solid #183352;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.assurances span{display:grid;justify-items:center;gap:4px;color:#00e5ff;text-align:center}.assurances b{color:#f5f8ff;font-size:9px}.assurances small{color:#718096;font-size:8px}
  .details-grid{margin-top:20px;display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start}.details{overflow:hidden;border-radius:17px}.details>nav{display:flex;overflow-x:auto;border-bottom:1px solid #183352}.details>nav button{min-height:56px;padding:0 22px;border:0;border-bottom:2px solid transparent;color:#718096;background:transparent;cursor:pointer;white-space:nowrap}.details>nav button.active{color:#00e5ff;border-color:#00e5ff}.tab{padding:30px}.tab h2{margin:0 0 13px;font-size:clamp(1.5rem,2.4vw,2.35rem);letter-spacing:-.04em}.tab h3{margin-top:28px}.tab p{color:#aab5c8;line-height:1.75}.feature-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.feature-grid span{padding:12px;display:flex;align-items:center;gap:9px;border:1px solid #183352;border-radius:9px;color:#aab5c8;background:#050a16;font-size:11px}.feature-grid :global(svg){color:#24d89a}.tag-list,.formats{margin-top:24px;display:flex;flex-wrap:wrap;gap:8px}.tag-list a,.formats span{padding:7px 10px;border:1px solid #183352;border-radius:99px;color:#aab5c8;background:#081224;font-size:10px}.tag-list a:hover{color:#00e5ff;border-color:#00e5ff}.formats strong{width:100%;font-size:11px}.specs{display:grid;grid-template-columns:repeat(2,1fr);gap:11px}.specs span{padding:15px;border:1px solid #183352;border-radius:10px;background:#050a16}.specs small,.specs b{display:block}.specs small{color:#718096;font-size:9px;text-transform:uppercase;letter-spacing:.07em}.specs b{margin-top:5px;font-size:12px}.contents{display:grid;gap:8px}.contents span{min-height:52px;padding:0 14px;display:grid;grid-template-columns:34px auto 1fr;gap:10px;align-items:center;border:1px solid #183352;border-radius:9px;background:#050a16}.contents b{color:#718096}.contents :global(svg){color:#8b5cf6}.contents em{font-style:normal}.review-summary{margin-bottom:18px;padding:18px;display:flex;align-items:center;gap:16px;border:1px solid #183352;border-radius:11px;background:#050a16}.review-summary>strong{font-size:44px}.review-summary span{display:grid}.review-summary b{color:#ffc857;letter-spacing:.12em}.review-summary small{color:#718096}.reviews article{padding:18px 0;border-top:1px solid #183352}.reviews header{display:grid;grid-template-columns:auto 1fr auto;gap:10px}.reviews header span{color:#ffc857}.reviews header small{color:#718096}.reviews article p{margin-bottom:0}.review-empty{min-height:150px;display:grid;place-items:center;align-content:center;gap:7px;color:#ffc857;text-align:center}.review-empty b{color:#f5f8ff}.review-empty small{color:#718096}.side-info{display:grid;gap:15px}.compat-card,.vendor-card{padding:22px;border-radius:15px}.compat-card>span,.vendor-card>div>small{color:#8b5cf6;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.1em}.compat-card h3{margin:8px 0 15px}.meter{height:8px;overflow:hidden;border-radius:99px;background:#122a43}.meter i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#00e5ff,#24d89a)}.compat-card p,.vendor-card p{color:#718096;font-size:11px;line-height:1.55}.compat-card dl{margin:18px 0 0}.compat-card dl div{padding:10px 0;display:flex;justify-content:space-between;border-top:1px solid #122a43;font-size:11px}.compat-card dt{color:#718096}.compat-card dd{margin:0}.vendor-card>img{width:60px;height:60px;border-radius:50%;float:left;margin:0 13px 10px 0}.vendor-card h3{margin:4px 0}.vendor-stats{clear:both;margin:18px 0;display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid #122a43}.vendor-stats span{padding:12px 4px;display:grid;text-align:center}.vendor-stats b{color:#00e5ff}.vendor-stats small{color:#718096;font-size:8px}.vendor-card .button{width:100%}
  .related{margin-top:60px}.related-head{margin-bottom:18px;display:flex;justify-content:space-between;align-items:end}.related h2{margin:7px 0 0}.related>div:last-child{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  @media(max-width:1120px){.product-grid{grid-template-columns:1fr}.buy{position:static}.details-grid{grid-template-columns:1fr}.side-info{grid-template-columns:repeat(2,1fr)}.related>div:last-child{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:680px){.product{padding-top:32px}.buy{padding:21px}.assurances{grid-template-columns:1fr}.assurances span{grid-template-columns:auto auto 1fr;justify-items:start;text-align:left}.price-line{grid-template-columns:auto auto}.price-line small{grid-column:1/-1;justify-self:start}.tab{padding:22px}.feature-grid,.specs{grid-template-columns:1fr}.side-info{grid-template-columns:1fr}.related-head{align-items:start;flex-direction:column;gap:12px}.related>div:last-child{grid-template-columns:1fr}.reviews header{grid-template-columns:1fr}.media-overlay{right:18px;bottom:18px;left:18px}}
</style>
