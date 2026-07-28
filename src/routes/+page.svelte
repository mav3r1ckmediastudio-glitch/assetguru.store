<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import CategoryCard from '$lib/components/CategoryCard.svelte';
  import AssetCard from '$lib/components/AssetCard.svelte';
  import SectionHeading from '$lib/components/SectionHeading.svelte';
  import { assets, categories, creators, featuredAssets, topCreators } from '$lib/data/marketplace';
  import { catalogueTotal } from '$lib/stores/catalogue';

  $: saleAsset = $featuredAssets.find((asset) => asset.oldPrice && asset.oldPrice > asset.price);
  $: collectionAsset = $featuredAssets[0];
</script>

<svelte:head>
  <title>AssetGuru — Premium GameGuru MAX Assets</title>
  <meta name="description" content="Discover premium GameGuru MAX environments, characters, weapons, audio, scripts and creator-made systems." />
</svelte:head>

<section class="hero-section">
  <div class="content-wrap hero-layout">
    <div class="hero glass">
      <div class="hero-copy">
        <span class="eyebrow">The marketplace for GameGuru MAX</span>
        <h1>Build worlds.<br/><span class="gradient-text">Inspire players.</span></h1>
        <p>Production-ready environments, characters, systems and sounds from creators who understand GameGuru MAX.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="/marketplace">Explore marketplace <Icon name="arrow" size={18}/></a>
          <a class="button button-secondary" href="/deals">See this week’s deals <Icon name="tag" size={17}/></a>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <img src="/images/hero-city.webp" alt=""/>
        <span class="scan"></span>
        <div class="hero-chip chip-one"><i></i><span><b>{$catalogueTotal.toLocaleString('en-GB')}</b> curated {$catalogueTotal === 1 ? 'asset' : 'assets'}</span></div>
        <div class="hero-chip chip-two"><Icon name="max" size={19}/><span>Verified for <b>MAX</b></span></div>
      </div>
    </div>

    <aside class="side-stack">
      <section class="top-creators glass">
        <header><div><span>Creator ranking</span><h2>Top sellers</h2></div><a href="/creators">View all →</a></header>
        {#if $topCreators.length}
          <ol>
            {#each $topCreators as creator}
              <li><b>{creator.rank}</b><img src={creator.avatar} alt=""/><span><strong>{creator.name}</strong><small>★ {creator.rating || 'New'} · Approved creator</small></span><em>{creator.sales}<small>sales</small></em></li>
            {/each}
          </ol>
        {:else}
          <div class="empty-side"><Icon name="store" size={23}/><span><b>Sell on AssetGuru</b><small>Create a professional storefront for your GameGuru MAX assets.</small></span></div>
        {/if}
      </section>
      {#if saleAsset}
        <a class="deal glass" href={`/marketplace/${saleAsset.slug}`}>
          <img src={saleAsset.image} alt=""/>
          <span class="discount">Sale</span>
          <div><small>Current offer</small><strong>{saleAsset.title}</strong><span><b>£{saleAsset.price.toFixed(2)}</b><s>£{saleAsset.oldPrice?.toFixed(2)}</s></span></div>
        </a>
      {:else}
        <a class="deal launch-deal glass" href="/auth/signup?role=vendor">
          <div class="launch-deal-mark"><Icon name="upload" size={30}/></div>
          <div><small>Creator marketplace</small><strong>Turn your GameGuru MAX work into a storefront</strong><span><b>Sell assets</b><s>Creator tools included</s></span></div>
        </a>
      {/if}
    </aside>

    <div class="hero-search"><SearchBar /></div>
  </div>
</section>

<section class="trust-strip">
  <div class="content-wrap trust-grid">
    <div><Icon name="spark"/><span><strong>{$catalogueTotal.toLocaleString('en-GB')}</strong><small>Premium assets</small></span></div>
    <div><Icon name="shield"/><span><strong>{$creators.length.toLocaleString('en-GB')}</strong><small>Approved creators</small></span></div>
    <div><Icon name="lock"/><span><strong>Secure</strong><small>Protected checkout</small></span></div>
    <div><Icon name="max"/><span><strong>Made for</strong><small>GameGuru MAX</small></span></div>
  </div>
</section>

{#if $categories.length}
  <section class="section">
    <div class="content-wrap">
      <SectionHeading eyebrow="Find your building blocks" title="Browse categories" description="Everything from a single prop to a complete playable framework, organised around how GameGuru MAX creators actually build." link="View all categories" href="/categories"/>
      <div class="categories-grid">
        {#each $categories as category}<CategoryCard {category}/>{/each}
      </div>
    </div>
  </section>
{/if}

{#if $featuredAssets.length}
  <section class="section featured-section">
    <div class="content-wrap">
      <SectionHeading eyebrow="Curated this week" title="Featured assets" description="Fresh releases, proven bestsellers and staff picks with clear compatibility information." link="Browse marketplace" href="/marketplace"/>
      <div class="assets-grid">
        {#each $featuredAssets.slice(0, 5) as asset}<AssetCard {asset}/>{/each}
      </div>
    </div>
  </section>
{/if}

{#if collectionAsset}
  <section class="section collection-section">
    <div class="content-wrap collection glass">
      <div class="collection-art"><img src={collectionAsset.image} alt={collectionAsset.title}/></div>
      <div class="collection-copy">
        <span class="eyebrow">Featured release</span>
        <h2>{collectionAsset.title}</h2>
        <p>{collectionAsset.summary}</p>
        <div class="collection-stats"><span><b>{$catalogueTotal}</b> live assets</span><span><b>{$creators.length}</b> approved creators</span><span><b>{collectionAsset.maxVersion}</b> compatibility</span></div>
        <a class="button button-promo" href={`/marketplace/${collectionAsset.slug}`}>View featured asset <Icon name="arrow" size={18}/></a>
      </div>
    </div>
  </section>
{/if}

<section class="section creator-cta-section">
  <div class="content-wrap creator-cta">
    <div><span class="eyebrow">Made something brilliant?</span><h2>Give your assets the storefront they deserve.</h2><p>Publish, update and grow your catalogue with professional presentation, clear analytics and a creator-first dashboard.</p></div>
    <a class="button button-primary" href="/auth/signup?role=vendor"><Icon name="upload" size={18}/> Start selling on AssetGuru</a>
  </div>
</section>

<style>
  .hero-section { padding: 24px 0 0; }
  .hero-layout { display: grid; grid-template-columns: minmax(0, 1fr) 322px; gap: 16px; }
  .hero { position: relative; min-height: 490px; overflow: hidden; border-radius: 18px; display: grid; grid-template-columns: minmax(420px, .88fr) 1.12fr; }
  .hero::before { content: ''; position: absolute; inset: 0; z-index: 2; pointer-events: none; background: linear-gradient(90deg, rgb(3 8 20 / .98) 0%, rgb(3 8 20 / .91) 38%, rgb(3 8 20 / .22) 69%, rgb(3 8 20 / .08)); }
  .hero::after { content: ''; position: absolute; inset: 12px; z-index: 3; pointer-events: none; border: 1px solid rgb(0 229 255 / .18); border-radius: 13px; clip-path: polygon(0 0, 38% 0, 40% 3px, 85% 3px, 87% 0, 100% 0, 100% 86%, 97% 90%, 97% 100%, 0 100%); }
  .hero-copy { position: relative; z-index: 4; align-self: center; padding: 64px clamp(32px, 4.6vw, 74px); }
  h1 { margin: 16px 0 20px; font-size: clamp(3.1rem, 5.2vw, 5.45rem); line-height: .92; letter-spacing: -.065em; text-transform: uppercase; }
  .hero-copy > p { max-width: 610px; margin: 0; color: #aab5c8; font-size: clamp(1rem, 1.35vw, 1.22rem); line-height: 1.68; }
  .hero-actions { margin-top: 30px; display: flex; flex-wrap: wrap; gap: 12px; }
  .hero-art { position: absolute; z-index: 1; inset: 0 0 0 31%; overflow: hidden; }
  .hero-art img { width: 100%; height: 100%; object-fit: cover; object-position: center; filter: saturate(1.12) contrast(1.02); }
  .hero-art::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgb(2 4 13 / .05), rgb(2 4 13 / .55)), radial-gradient(circle at 70% 40%, transparent, rgb(2 4 13 / .5)); }
  .scan { position: absolute; z-index: 2; top: 0; right: 8%; width: 56%; height: 2px; background: #00e5ff; box-shadow: 0 0 18px #00e5ff; animation: scan 8s linear infinite; }
  .hero-chip { position: absolute; z-index: 4; display: flex; align-items: center; gap: 9px; padding: 10px 13px; border: 1px solid rgb(0 229 255 / .4); border-radius: 10px; color: #aab5c8; background: rgb(2 4 13 / .78); backdrop-filter: blur(10px); font-size: 11px; box-shadow: 0 8px 28px rgb(0 0 0 / .3); }
  .hero-chip b { color: white; }.hero-chip i { width: 10px; height: 10px; border-radius: 50%; background: #24d89a; box-shadow: 0 0 14px #24d89a; }
  .chip-one { right: 24px; bottom: 88px; }.chip-two { top: 26px; right: 25px; color: #00e5ff; }
  .hero-search { grid-column: 1 / -1; margin: -6px 22px 0; position: relative; z-index: 8; }
  .side-stack { display: grid; grid-template-rows: auto 1fr; gap: 16px; }
  .top-creators { padding: 19px; border-radius: 16px; }
  .top-creators header { display: flex; align-items: start; justify-content: space-between; margin-bottom: 10px; }
  .top-creators header span, .deal small { color: #8b5cf6; font-size: 9px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
  .top-creators h2 { margin: 2px 0 0; font-size: 18px; }.top-creators header a { color: #00e5ff; font-size: 10px; }
  ol { padding: 0; margin: 0; list-style: none; }
  .empty-side{min-height:150px;display:grid;place-items:center;align-content:center;gap:9px;text-align:center;color:#00e5ff}.empty-side span{display:grid}.empty-side b{color:#f5f8ff;font-size:11px}.empty-side small{margin-top:4px;color:#718096;font-size:9px}
  li { min-height: 54px; display: grid; grid-template-columns: 16px 34px 1fr auto; gap: 9px; align-items: center; border-top: 1px solid #122a43; }
  li > b { color: #ffc857; font-size: 11px; }li img { width: 34px; height: 34px; border-radius: 50%; }li > span { display: grid; gap: 2px; min-width: 0; }li strong { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }li small { color: #718096; font-size: 9px; }li em { display: grid; justify-items: end; color: #f5f8ff; font-size: 10px; font-style: normal; }li em small { margin-top: 2px; }
  .deal { position: relative; min-height: 210px; overflow: hidden; border-radius: 16px; }
  .deal > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: brightness(.6) saturate(1.2); }.deal::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgb(3 7 17 / .92), rgb(3 7 17 / .05)); }.launch-deal{background:radial-gradient(circle at 78% 20%,rgb(0 229 255/.16),transparent 38%),linear-gradient(135deg,#071329,#090b1d)}.launch-deal::before{content:'';position:absolute;inset:0;opacity:.22;background-image:linear-gradient(#27547a 1px,transparent 1px),linear-gradient(90deg,#27547a 1px,transparent 1px);background-size:28px 28px}.launch-deal-mark{position:absolute!important;z-index:2!important;top:22px!important;left:22px!important;right:auto!important;bottom:auto!important;width:58px;height:58px;display:grid!important;place-items:center;border:1px solid rgb(0 229 255/.35);border-radius:16px;color:#00e5ff;background:rgb(0 229 255/.07)}
  .deal > div { position: absolute; z-index: 2; left: 20px; right: 20px; bottom: 18px; display: grid; gap: 7px; }.deal strong { max-width: 190px; font-size: 19px; line-height: 1.05; text-transform: uppercase; }.deal div span { display: flex; align-items: baseline; gap: 8px; }.deal div b { color: #00e5ff; font-size: 19px; }.deal s { color: #718096; font-size: 11px; }
  .discount { position: absolute; z-index: 3; top: 12px; right: 12px; padding: 6px 9px; border-radius: 7px; color: #260016; background: #ff3fd8; font-weight: 900; font-size: 12px; }
  .trust-strip { margin-top: 22px; border-block: 1px solid #122a43; background: rgb(5 10 22 / .66); }.trust-grid { min-height: 92px; display: grid; grid-template-columns: repeat(4, 1fr); align-items: center; }.trust-grid > div { display: flex; align-items: center; justify-content: center; gap: 13px; color: #8b5cf6; }.trust-grid > div + div { border-left: 1px solid #183352; }.trust-grid span { display: grid; gap: 2px; }.trust-grid strong { color: #f5f8ff; font-size: 13px; }.trust-grid small { color: #718096; font-size: 11px; }
  .categories-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .featured-section { background: linear-gradient(180deg, transparent, rgb(8 18 36 / .35), transparent); }.assets-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 13px; }
  .collection { padding: 18px; border-radius: 20px; display: grid; grid-template-columns: 1.25fr .75fr; gap: 34px; overflow: hidden; }.collection-art { min-height: 390px; overflow: hidden; border-radius: 14px; border: 1px solid #27547a; }.collection-art img { width: 100%; height: 100%; object-fit: cover; filter: saturate(1.12); }.collection-copy { align-self: center; padding: 24px 34px 24px 0; }.collection-copy h2 { margin: 15px 0; font-size: clamp(2rem, 3.4vw, 3.6rem); line-height: 1; letter-spacing: -.055em; }.collection-copy p { color: #aab5c8; line-height: 1.7; }.collection-stats { margin: 22px 0 28px; display: flex; flex-wrap: wrap; gap: 18px; }.collection-stats span { color: #718096; font-size: 11px; }.collection-stats b { display: block; color: #00e5ff; font-size: 17px; }
  .creator-cta-section { padding-top: 20px; }.creator-cta { position: relative; overflow: hidden; padding: 42px; border: 1px solid #27547a; border-radius: 18px; display: flex; align-items: center; justify-content: space-between; gap: 40px; background: radial-gradient(circle at 80% 30%, rgb(255 63 216 / .18), transparent 30%), linear-gradient(135deg, #071329, #0b1027); }.creator-cta::before { content: ''; position: absolute; inset: 0; opacity: .2; background-image: linear-gradient(#27547a 1px, transparent 1px), linear-gradient(90deg, #27547a 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(90deg, transparent, black); }.creator-cta > * { position: relative; }.creator-cta h2 { margin: 14px 0 8px; font-size: clamp(1.8rem, 3vw, 3rem); letter-spacing: -.045em; }.creator-cta p { max-width: 770px; margin: 0; color: #aab5c8; line-height: 1.65; }.creator-cta .button { flex: 0 0 auto; }
  @media (max-width: 1300px) { .hero-layout { grid-template-columns: 1fr; }.side-stack { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }.hero-search { grid-row: 2; }.assets-grid { grid-template-columns: repeat(4, 1fr); }.assets-grid :global(article:last-child) { display: none; } }
  @media (max-width: 1050px) { .categories-grid { grid-template-columns: repeat(2, 1fr); }.assets-grid { grid-template-columns: repeat(3, 1fr); }.assets-grid :global(article:nth-last-child(-n+2)) { display: none; }.collection { grid-template-columns: 1fr; }.collection-copy { padding: 18px; }.collection-art { min-height: 320px; }.creator-cta { align-items: flex-start; flex-direction: column; } }
  @media (max-width: 780px) { .hero { min-height: 620px; display: block; }.hero::before { background: linear-gradient(180deg, rgb(3 8 20 / .98) 0%, rgb(3 8 20 / .87) 54%, rgb(3 8 20 / .4)); }.hero-copy { padding: 45px 26px; }.hero-art { inset: 38% 0 0; }.hero-chip { display: none; }.hero-actions { max-width: 290px; }.side-stack { grid-template-columns: 1fr; }.top-creators { display: none; }.hero-search { margin-inline: 0; }.trust-grid { grid-template-columns: repeat(2, 1fr); padding-block: 14px; gap: 12px; }.trust-grid > div { min-height: 54px; }.trust-grid > div + div { border: 0; }.assets-grid { grid-template-columns: repeat(2, 1fr); }.assets-grid :global(article:nth-child(n+5)) { display: none; }.collection-art { min-height: 250px; } }
  @media (max-width: 560px) { .hero-section { padding-top: 10px; }.hero { min-height: 585px; }.hero-copy { padding: 36px 19px; }h1 { font-size: clamp(2.65rem, 15vw, 4.2rem); }.hero-actions { display: grid; }.categories-grid, .assets-grid { grid-template-columns: 1fr; }.assets-grid :global(article:nth-child(n+4)) { display: none; }.collection { padding: 10px; gap: 12px; }.collection-copy { padding: 16px 10px 22px; }.creator-cta { padding: 28px 20px; }.trust-grid { grid-template-columns: 1fr 1fr; }.trust-grid > div { justify-content: flex-start; } }
</style>
