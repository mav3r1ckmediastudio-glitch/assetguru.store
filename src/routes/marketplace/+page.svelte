<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import AssetCard from '$lib/components/AssetCard.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { categories, type Asset } from '$lib/data/marketplace';
  import { catalogueAverageRating, catalogueTotal, fetchCataloguePage } from '$lib/stores/catalogue';

  let search = page.url.searchParams.get('q') ?? '';
  let selectedCategories: string[] = page.url.searchParams.get('category') ? [page.url.searchParams.get('category') as string] : [];
  let price = page.url.searchParams.get('price') === 'free' ? 'Free' : 'Any price';
  let rating = 'Any rating';
  let version = 'Any MAX version';
  let sourceFilesOnly = false;
  let saleOnly = false;
  let sort = 'Trending';
  let view: 'grid' | 'list' = 'grid';
  let filtersOpen = false;
  let results:Asset[]=[];
  let pagination={page:1,pageSize:24,total:0,totalPages:0,hasMore:false};
  let loading=false;
  let loadError='';
  let mounted=false;
  let lastFilterKey='';
  let refreshTimer:ReturnType<typeof setTimeout>|undefined;
  let requestGeneration=0;

  function toggleCategory(name: string) {
    selectedCategories = selectedCategories.includes(name)
      ? selectedCategories.filter((item) => item !== name)
      : [...selectedCategories, name];
  }

  function clearFilters() {
    selectedCategories = [];
    price = 'Any price';
    rating = 'Any rating';
    version = 'Any MAX version';
    sourceFilesOnly = false;
    saleOnly = false;
    search = '';
  }

  function buildParams(pageNumber:number){
    const params=new URLSearchParams({page:String(pageNumber),pageSize:'24',includeMeta:'0'});
    if(search.trim())params.set('q',search.trim());
    for(const category of selectedCategories)params.append('category',category);
    if(price==='Free')params.set('price','free');
    if(price==='Under £15')params.set('price','under-15');
    if(price==='£15–£25')params.set('price','15-25');
    if(price==='£25+')params.set('price','25-plus');
    if(rating!=='Any rating')params.set('rating',rating.split('+')[0]);
    if(version!=='Any MAX version')params.set('version',version);
    if(sourceFilesOnly)params.set('sourceFiles','1');
    const sortKey=sort==='Newest'?'newest':sort==='Top rated'?'top-rated':sort==='Price low to high'?'price-low':sort==='Price high to low'?'price-high':'trending';
    params.set('sort',sortKey);
    return params;
  }

  async function refreshCatalogue(){
    const generation=++requestGeneration;
    loading=true;
    loadError='';
    try{
      const data=await fetchCataloguePage(buildParams(1));
      if(generation!==requestGeneration)return;
      results=data.assets??[];
      pagination=data.pagination??{page:1,pageSize:24,total:results.length,totalPages:1,hasMore:false};
    }catch(error){
      if(generation!==requestGeneration)return;
      results=[];
      pagination={page:1,pageSize:24,total:0,totalPages:0,hasMore:false};
      loadError=error instanceof Error?error.message:'Catalogue could not be loaded';
    }finally{
      if(generation===requestGeneration)loading=false;
    }
  }

  async function loadMore(){
    if(loading||!pagination.hasMore)return;
    const generation=++requestGeneration;
    loading=true;
    loadError='';
    try{
      const data=await fetchCataloguePage(buildParams(pagination.page+1));
      if(generation!==requestGeneration)return;
      const merged=new Map(results.map(asset=>[asset.slug,asset]));
      for(const asset of data.assets??[])merged.set(asset.slug,asset);
      results=[...merged.values()];
      pagination=data.pagination;
    }catch(error){
      if(generation===requestGeneration)loadError=error instanceof Error?error.message:'More assets could not be loaded';
    }finally{
      if(generation===requestGeneration)loading=false;
    }
  }

  $: filterKey=JSON.stringify({search,selectedCategories,price,rating,version,sourceFilesOnly,sort});
  $: if(mounted&&filterKey!==lastFilterKey){
    lastFilterKey=filterKey;
    if(refreshTimer)clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>void refreshCatalogue(),search.trim()?280:0);
  }
  $: displayed=saleOnly?results.filter(asset=>Boolean(asset.oldPrice)):results;
  $: activeFilterCount = selectedCategories.length
    + (price !== 'Any price' ? 1 : 0)
    + (rating !== 'Any rating' ? 1 : 0)
    + (version !== 'Any MAX version' ? 1 : 0)
    + Number(sourceFilesOnly)
    + Number(saleOnly);

  onMount(()=>{
    mounted=true;
    lastFilterKey=filterKey;
    void refreshCatalogue();
    return ()=>{
      requestGeneration+=1;
      if(refreshTimer)clearTimeout(refreshTimer);
    };
  });
</script>

<svelte:head>
  <title>Browse GameGuru MAX assets — AssetGuru</title>
  <meta name="description" content="Search and filter curated GameGuru MAX environments, characters, weapons, scripts, audio, UI and production systems."/>
</svelte:head>

<section class="browse-hero">
  <div class="content-wrap">
    <div class="hero-line">
      <div>
        <span class="eyebrow">AssetGuru Marketplace</span>
        <h1>Find the asset that <span class="gradient-text">unlocks your next scene.</span></h1>
        <p>Every listing is structured around GameGuru MAX compatibility, dependencies, support and real production use.</p>
      </div>
      <div class="market-stats glass"><span><b>{$catalogueTotal}</b><small>live listings</small></span><span><b>{$categories.length}</b><small>asset categories</small></span><span><b>{$catalogueAverageRating || '—'}</b><small>average rating</small></span></div>
    </div>

    <form class="market-search" onsubmit={(event) => event.preventDefault()}>
      <Icon name="search" size={22}/>
      <input bind:value={search} placeholder="Search assets, creators, tags or systems…" autocomplete="off"/>
      {#if search}<button class="clear-search" type="button" aria-label="Clear search" onclick={() => search = ''}><Icon name="close" size={17}/></button>{/if}
      <button class="button button-promo" type="submit">Search marketplace</button>
    </form>

    <div class="quick-links" aria-label="Popular searches">
      <span>Popular:</span>
      {#each ['cyberpunk', 'horror', 'Lua system', 'free', 'modular environment'] as term}
        <button type="button" onclick={() => search = term}>{term}</button>
      {/each}
    </div>
  </div>
</section>

<section class="section browse-main">
  <div class="content-wrap browse-layout">
    <aside class:open={filtersOpen} class="filters glass">
      <div class="filter-head">
        <div><Icon name="sliders" size={18}/><strong>Refine results</strong>{#if activeFilterCount}<span>{activeFilterCount}</span>{/if}</div>
        <button type="button" aria-label="Close filters" onclick={() => filtersOpen = false}><Icon name="close" size={19}/></button>
      </div>

      <fieldset>
        <legend>Asset category</legend>
        {#each $categories as category}
          <label>
            <input type="checkbox" checked={selectedCategories.includes(category.name)} onchange={() => toggleCategory(category.name)}/>
            <span>{category.name}</span><small>{category.count.split(' ')[0]}</small>
          </label>
        {/each}
      </fieldset>

      <fieldset>
        <legend>Price</legend>
        {#each ['Any price','Free','Under £15','£15–£25','£25+'] as option}
          <label><input type="radio" name="price" value={option} bind:group={price}/><span>{option}</span></label>
        {/each}
      </fieldset>

      <fieldset>
        <legend>Buyer rating</legend>
        <select bind:value={rating}><option>Any rating</option><option>4.9+ stars</option><option>4.8+ stars</option><option>4.7+ stars</option></select>
      </fieldset>

      <fieldset>
        <legend>Compatibility</legend>
        <select bind:value={version}><option>Any MAX version</option><option>2026+</option><option>2025+</option><option>2024+</option><option>Any MAX build</option></select>
        <label><input type="checkbox" bind:checked={sourceFilesOnly}/><span>Source files included</span></label>
        <label><input type="checkbox" bind:checked={saleOnly}/><span>On sale now</span></label>
      </fieldset>

      <button class="button button-secondary reset" type="button" onclick={clearFilters}>Reset all filters</button>
    </aside>

    <div class="results">
      <div class="results-bar glass">
        <div class="result-count">
          <button class="icon-button mobile-filter" type="button" aria-label="Open filters" onclick={() => filtersOpen = true}><Icon name="sliders" size={18}/></button>
          <div><strong>{saleOnly ? displayed.length : pagination.total} assets</strong><small>{search ? ` matching “${search}”` : ' ready to explore'}</small></div>
        </div>
        <div class="result-tools">
          <label>Sort <select bind:value={sort}><option>Trending</option><option>Newest</option><option>Top rated</option><option>Price low to high</option><option>Price high to low</option></select></label>
          <div class="view-switch" aria-label="View style"><button class:active={view === 'grid'} type="button" onclick={() => view = 'grid'} aria-label="Grid view"><Icon name="grid" size={17}/></button><button class:active={view === 'list'} type="button" onclick={() => view = 'list'} aria-label="List view"><Icon name="list" size={18}/></button></div>
        </div>
      </div>

      {#if selectedCategories.length || price !== 'Any price' || rating !== 'Any rating' || version !== 'Any MAX version' || sourceFilesOnly || saleOnly}
        <div class="active-filters">
          {#each selectedCategories as item}<button type="button" onclick={() => toggleCategory(item)}>{item} ×</button>{/each}
          {#if price !== 'Any price'}<button type="button" onclick={() => price = 'Any price'}>{price} ×</button>{/if}
          {#if rating !== 'Any rating'}<button type="button" onclick={() => rating = 'Any rating'}>{rating} ×</button>{/if}
          {#if version !== 'Any MAX version'}<button type="button" onclick={() => version = 'Any MAX version'}>{version} ×</button>{/if}
          {#if sourceFilesOnly}<button type="button" onclick={() => sourceFilesOnly = false}>Source files ×</button>{/if}
          {#if saleOnly}<button type="button" onclick={() => saleOnly = false}>On sale ×</button>{/if}
        </div>
      {/if}

      {#if displayed.length}
        <div class:listView={view === 'list'} class="asset-grid">
          {#each displayed as asset}<AssetCard {asset} {view}/>{/each}
        </div>
        {#if pagination.hasMore && !saleOnly}<div class="load-more"><button class="button button-secondary" type="button" disabled={loading} onclick={loadMore}>{loading ? 'Loading…' : `Load 24 more assets`}</button><small>{results.length} of {pagination.total} loaded</small></div>{/if}
      {:else if loading}
        <div class="empty glass"><Icon name="clock" size={38}/><h2>Loading marketplace assets…</h2><p>The first 24 lightweight catalogue cards are being prepared.</p></div>
      {:else if loadError}
        <div class="empty glass"><Icon name="alert" size={38}/><h2>Catalogue temporarily unavailable.</h2><p>{loadError}</p><button class="button button-primary" type="button" onclick={refreshCatalogue}>Try again</button></div>
      {:else if pagination.total === 0 && !search && !selectedCategories.length && price === 'Any price' && rating === 'Any rating' && version === 'Any MAX version' && !sourceFilesOnly}
        <div class="empty glass catalogue-empty">
          <Icon name="store" size={42}/><h2>No assets are available yet.</h2><p>Approved creator listings will appear here as they are published.</p><a class="button button-primary" href="/auth/signup?role=vendor"><Icon name="upload" size={17}/> Sell on AssetGuru</a>
        </div>
      {:else}
        <div class="empty glass">
          <Icon name="search" size={38}/><h2>No assets match that combination.</h2><p>Try a broader term or reset the filters. The catalogue should help you discover things, not trap you in a dead end.</p><button class="button button-primary" type="button" onclick={clearFilters}>Clear search and filters</button>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .browse-hero{padding:54px 0 32px;border-bottom:1px solid #122a43;background:radial-gradient(circle at 86% 10%,rgb(139 92 246/.17),transparent 31rem),radial-gradient(circle at 8% 50%,rgb(0 229 255/.08),transparent 26rem)}
  .hero-line{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:34px;align-items:end}.hero-line h1{max-width:980px;margin:14px 0 12px;font-size:clamp(2.6rem,5vw,5.1rem);line-height:.98;letter-spacing:-.06em}.hero-line p{max-width:800px;margin:0;color:#aab5c8;line-height:1.65}.market-stats{padding:15px 18px;border-radius:14px;display:flex;gap:24px}.market-stats span{display:grid}.market-stats b{color:#00e5ff;font-size:20px}.market-stats small{color:#718096;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
  .market-search{margin-top:28px;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:8px 8px 8px 16px;border:1px solid #27547a;border-radius:14px;color:#00e5ff;background:#050a16;box-shadow:0 20px 70px rgb(0 0 0/.25)}.market-search input{height:50px;border:0;outline:0;color:#f5f8ff;background:transparent}.market-search input::placeholder{color:#718096}.clear-search{width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:8px;color:#718096;background:#081224;cursor:pointer}.quick-links{margin-top:13px;display:flex;align-items:center;gap:8px;overflow-x:auto}.quick-links>span{color:#718096;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.quick-links button,.active-filters button{padding:7px 10px;border:1px solid #183352;border-radius:99px;color:#aab5c8;background:#081224;cursor:pointer;white-space:nowrap;font-size:10px}.quick-links button:hover,.active-filters button:hover{color:#00e5ff;border-color:#00e5ff}
  .browse-main{padding-top:32px}.browse-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:20px;align-items:start}.filters{position:sticky;top:102px;padding:18px;border-radius:16px}.filter-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:15px;border-bottom:1px solid #183352}.filter-head>div{display:flex;align-items:center;gap:9px;color:#00e5ff}.filter-head strong{color:#f5f8ff;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.filter-head span{min-width:19px;height:19px;padding:0 5px;display:grid;place-items:center;border-radius:99px;color:#031018;background:#00e5ff;font-size:9px;font-weight:900}.filter-head>button{display:none;border:0;color:#aab5c8;background:transparent;cursor:pointer}.filters fieldset{margin:0;padding:18px 0;border:0;border-bottom:1px solid #122a43}.filters legend{margin-bottom:11px;color:#f5f8ff;font-size:12px;font-weight:800}.filters label{min-height:29px;display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;color:#aab5c8;font-size:11px;cursor:pointer}.filters input{accent-color:#00e5ff}.filters small{color:#718096}.filters select{width:100%;min-height:39px;margin-bottom:9px;padding:0 10px;border:1px solid #183352;border-radius:8px;color:#f5f8ff;background:#050a16}.reset{width:100%;margin-top:18px}
  .results-bar{min-height:58px;padding:8px 10px 8px 14px;border-radius:13px;display:flex;align-items:center;justify-content:space-between;gap:14px}.result-count{display:flex;align-items:center;gap:10px}.result-count>div{display:grid}.result-count strong{font-size:13px}.result-count small{color:#718096;font-size:10px}.mobile-filter{display:none}.result-tools{display:flex;align-items:center;gap:10px}.result-tools label{display:flex;align-items:center;gap:8px;color:#718096;font-size:10px}.result-tools select{min-height:38px;padding:0 28px 0 10px;border:1px solid #183352;border-radius:8px;color:#f5f8ff;background:#050a16}.view-switch{padding:3px;display:flex;border:1px solid #183352;border-radius:9px;background:#050a16}.view-switch button{width:34px;height:31px;display:grid;place-items:center;border:0;border-radius:6px;color:#718096;background:transparent;cursor:pointer}.view-switch button.active{color:#031018;background:#00e5ff}.active-filters{margin:12px 0;display:flex;flex-wrap:wrap;gap:7px}
  .load-more{margin-top:20px;display:grid;place-items:center;gap:8px}.load-more .button{width:auto;min-width:220px}.load-more small{color:#718096;font-size:10px}.asset-grid{margin-top:15px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.asset-grid.listView{grid-template-columns:1fr}.empty{margin-top:15px;padding:75px 24px;border-radius:16px;text-align:center;color:#718096}.empty h2{color:#f5f8ff}.empty p{max-width:620px;margin:0 auto 22px;line-height:1.65}.empty .button{display:inline-flex;width:auto}.catalogue-empty{color:#00e5ff;background:radial-gradient(circle at 50% 20%,rgb(0 229 255/.08),transparent 28rem),#07111f}.catalogue-empty h2{max-width:720px;margin-inline:auto}.catalogue-empty p{max-width:760px}
  @media(max-width:1380px){.asset-grid{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:1040px){.hero-line{grid-template-columns:1fr}.market-stats{width:fit-content}.browse-layout{grid-template-columns:1fr}.filters{display:none;position:fixed;z-index:90;inset:84px 14px 14px;overflow:auto}.filters.open{display:block}.filter-head>button,.mobile-filter{display:grid}.asset-grid{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:780px){.asset-grid{grid-template-columns:repeat(2,1fr)}.market-search{grid-template-columns:auto 1fr auto}.market-search .button{grid-column:1/-1}.market-stats{width:100%;justify-content:space-between}.result-tools label{display:none}}
  @media(max-width:560px){.browse-hero{padding-top:36px}.hero-line h1{font-size:2.55rem}.market-stats{gap:10px;padding:12px}.market-stats b{font-size:17px}.asset-grid{grid-template-columns:1fr}.result-count small{display:none}.view-switch{display:none}.empty .button{width:100%}}
</style>
