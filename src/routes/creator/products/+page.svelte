<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { creatorProductCounts, creatorProducts, creatorProductsPagination, creatorSectionLoading, loadCreatorProducts, removeCreatorProduct, setProductStatus } from '$lib/stores/creator';
  import type { ProductStatus } from '$lib/data/creator';
  import { showToast } from '$lib/stores/marketplace';

  let search = '';
  let status: ProductStatus | 'All' = 'All';
  let sort = 'Recently updated';
  let selected: string[] = [];
  let view: 'table' | 'cards' = 'table';
  let ready = false;
  let lastQuery = '';
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  const statusTabs: { label: string; status: ProductStatus | 'All'; icon: 'package'|'check'|'clock'|'alert'|'list' }[] = [
    { label:'All products', status:'All', icon:'package' },
    { label:'Published', status:'Published', icon:'check' },
    { label:'In review', status:'In review', icon:'clock' },
    { label:'Needs attention', status:'Changes required', icon:'alert' },
    { label:'Drafts', status:'Draft', icon:'list' }
  ];
  function statusCount(value: ProductStatus | 'All') {
    if (value === 'All') return $creatorProductCounts.all;
    if (value === 'Published') return $creatorProductCounts.published;
    if (value === 'In review') return $creatorProductCounts.inReview;
    if (value === 'Changes required') return $creatorProductCounts.changesRequired;
    if (value === 'Draft') return $creatorProductCounts.drafts;
    return $creatorProductCounts.retired;
  }

  $: filtered = $creatorProducts;
  $: queryKey = `${search.trim()}|${status}|${sort}`;
  $: if (ready && queryKey !== lastQuery) {
    lastQuery = queryKey;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { selected=[]; void refresh(1); }, 250);
  }

  onMount(() => {
    ready = true;
    lastQuery = queryKey;
    void refresh(1);
    return () => { if (searchTimer) clearTimeout(searchTimer); };
  });

  async function refresh(page:number,append=false){
    try { await loadCreatorProducts({ page, pageSize:24, search, status, sort, append }); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Products could not be loaded','warning'); }
  }
  function toggle(slug:string){ selected = selected.includes(slug) ? selected.filter((item)=>item!==slug) : [...selected,slug]; }
  async function bulkStatus(next:ProductStatus){
    const slugs=[...selected];
    for(const slug of slugs) await setProductStatus(slug,next);
    selected=[];
    await refresh(1);
  }
  async function removeDraft(slug:string){ await removeCreatorProduct(slug); await refresh(1); }
</script>

<svelte:head><title>Products — Creator Hub — AssetGuru</title></svelte:head>
<header class="page-head"><div><span class="eyebrow">Catalogue control</span><h1>Your <span class="gradient-text">products.</span></h1><p>Create, publish and update every asset from one reliable workspace.</p></div><a class="button button-primary" href="/creator/products/new"><Icon name="upload" size={18}/> Upload new asset</a></header>

<div class="summary-strip glass">
  {#each statusTabs as item}
    <button class:active={status === item.status} type="button" onclick={() => status = item.status}><Icon name={item.icon} size={17}/><span><b>{statusCount(item.status)}</b><small>{item.label}</small></span></button>
  {/each}
</div>

<div class="toolbar glass">
  <label class="search"><Icon name="search" size={18}/><input bind:value={search} placeholder="Search your products…"/></label>
  <select bind:value={sort}><option>Recently updated</option><option>Revenue</option><option>Sales</option><option>Title</option></select>
  <div class="view"><button class:active={view==='table'} type="button" onclick={() => view='table'}><Icon name="list" size={17}/></button><button class:active={view==='cards'} type="button" onclick={() => view='cards'}><Icon name="grid" size={17}/></button></div>
</div>

{#if selected.length}
  <div class="bulk glass"><b>{selected.length} selected</b><button type="button" onclick={() => bulkStatus('Published')}>Publish</button><button type="button" onclick={() => bulkStatus('Draft')}>Move to drafts</button><button type="button" onclick={() => selected=[]}>Clear</button></div>
{/if}

{#if view === 'table'}
  <div class="product-table glass">
    <div class="table-head"><span></span><span>Product</span><span>Status</span><span>Price</span><span>Sales</span><span>Revenue</span><span>Updated</span><span></span></div>
    {#each filtered as product}
      <article>
        <input type="checkbox" checked={selected.includes(product.slug)} onchange={() => toggle(product.slug)}/>
        <a class="product" href={`/creator/products/${product.slug}`}><img src={product.image} alt="" loading="lazy" decoding="async"/><span><b>{product.title}</b><small>{product.category} · v{product.version}</small>{#if product.moderationNote}<em><Icon name="alert" size={12}/> Action required</em>{/if}</span></a>
        <StatusPill status={product.status}/>
        <strong>{product.price === 0 ? 'Free' : `£${product.price.toFixed(2)}`}</strong>
        <span>{product.sales.toLocaleString('en-GB')}</span>
        <strong>£{product.revenue.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
        <span>{product.updated}</span>
        <div class="row-actions"><a href={`/marketplace/${product.slug}`} title="View public listing"><Icon name="eye" size={16}/></a><a href={`/creator/products/${product.slug}`} title="Edit"><Icon name="sliders" size={16}/></a>{#if product.status === 'Draft'}<button type="button" title="Delete draft" onclick={() => removeDraft(product.slug)}><Icon name="trash" size={16}/></button>{/if}</div>
      </article>
    {/each}
  </div>
{:else}
  <div class="card-grid">
    {#each filtered as product}<article class="product-card glass"><div class="image"><img src={product.image} alt="" loading="lazy" decoding="async"/><StatusPill status={product.status}/></div><div class="card-copy"><small>{product.category}</small><h2>{product.title}</h2><p>v{product.version} · Updated {product.updated}</p><div class="card-metrics"><span><b>{product.sales.toLocaleString('en-GB')}</b><small>sales</small></span><span><b>£{product.revenue.toLocaleString('en-GB',{maximumFractionDigits:0})}</b><small>revenue</small></span><span><b>{product.rating || '—'}</b><small>rating</small></span></div><a class="button button-secondary" href={`/creator/products/${product.slug}`}>Manage product</a></div></article>{/each}
  </div>
{/if}

{#if $creatorProductsPagination.hasMore}
  <div class="load-more"><button class="button button-secondary" type="button" disabled={$creatorSectionLoading.products} onclick={() => refresh($creatorProductsPagination.page + 1,true)}>{ $creatorSectionLoading.products ? 'Loading…' : `Load 24 more · ${$creatorProductsPagination.total - $creatorProducts.length} remaining` }</button></div>
{/if}

{#if !filtered.length && !$creatorSectionLoading.products}<div class="empty glass"><Icon name="package" size={38}/><h2>No products found.</h2><p>Try another status or search term.</p></div>{/if}

<style>
  .page-head{margin-bottom:20px;display:flex;align-items:end;justify-content:space-between;gap:24px}.page-head h1{margin:10px 0 7px;font-size:clamp(2.6rem,4vw,4.2rem);line-height:.96;letter-spacing:-.06em}.page-head p{margin:0;color:#aab5c8}.summary-strip{padding:9px;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;border-radius:14px}.summary-strip button{min-height:58px;padding:8px 12px;display:flex;align-items:center;gap:9px;border:1px solid transparent;border-radius:9px;color:#718096;background:transparent;cursor:pointer;text-align:left}.summary-strip button:hover,.summary-strip button.active{color:#00e5ff;border-color:#27547a;background:#08162a}.summary-strip button span{display:grid}.summary-strip button b{color:#f5f8ff;font-size:15px}.summary-strip button small{font-size:8px}.toolbar{margin-top:12px;padding:8px;display:grid;grid-template-columns:1fr auto auto;gap:9px;border-radius:13px}.search{min-height:43px;padding:0 12px;display:flex;align-items:center;gap:9px;border:1px solid #183352;border-radius:9px;color:#00e5ff;background:#050a16}.search input{width:100%;border:0;outline:0;color:#f5f8ff;background:transparent}.toolbar select{padding:0 32px 0 12px;border:1px solid #183352;border-radius:9px;color:#f5f8ff;background:#050a16}.view{padding:3px;display:flex;border:1px solid #183352;border-radius:9px;background:#050a16}.view button{width:35px;border:0;border-radius:6px;color:#718096;background:transparent;cursor:pointer}.view button.active{color:#06111b;background:#00e5ff}.bulk{margin-top:10px;padding:10px 14px;display:flex;align-items:center;gap:8px;border-radius:11px}.bulk b{margin-right:auto;font-size:10px}.bulk button{padding:7px 10px;border:1px solid #27547a;border-radius:7px;color:#00e5ff;background:#071225;cursor:pointer;font-size:9px}.product-table{margin-top:12px;overflow:hidden;border-radius:14px}.table-head,.product-table article{display:grid;grid-template-columns:26px minmax(250px,1.6fr) 110px 72px 65px 95px 85px 92px;gap:12px;align-items:center}.table-head{min-height:42px;padding:0 14px;color:#718096;background:#071225;font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.08em}.product-table article{min-height:76px;padding:9px 14px;border-top:1px solid #122a43;color:#aab5c8;font-size:9px}.product-table article:hover{background:rgb(8 18 36/.65)}.product-table input{accent-color:#00e5ff}.product{display:flex;gap:10px;align-items:center;min-width:0}.product>img{width:76px;height:50px;object-fit:cover;border-radius:7px}.product>span{display:grid;min-width:0}.product b{overflow:hidden;color:#f5f8ff;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.product small{margin-top:3px;color:#718096;font-size:8px}.product em{margin-top:4px;display:flex;align-items:center;gap:4px;color:#ffb547;font-size:7px;font-style:normal}.row-actions{display:flex;justify-content:flex-end;gap:5px}.row-actions a,.row-actions button{width:28px;height:28px;display:grid;place-items:center;border:1px solid #183352;border-radius:7px;color:#718096;background:#071225;cursor:pointer}.row-actions a:hover,.row-actions button:hover{color:#00e5ff;border-color:#00e5ff}.card-grid{margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.product-card{overflow:hidden;border-radius:14px}.image{position:relative}.image>img{width:100%;aspect-ratio:16/9;object-fit:cover}.image :global(.pill){position:absolute;top:10px;left:10px}.card-copy{padding:16px}.card-copy>small{color:#00e5ff;font-size:8px;text-transform:uppercase}.card-copy h2{margin:7px 0 4px;font-size:16px}.card-copy p{margin:0;color:#718096;font-size:8px}.card-metrics{margin:15px 0;padding:12px 0;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #183352;border-bottom:1px solid #183352}.card-metrics span{display:grid;text-align:center}.card-metrics span+span{border-left:1px solid #183352}.card-metrics b{font-size:12px}.card-metrics small{color:#718096;font-size:7px}.product-card .button{width:100%}.empty{margin-top:12px;padding:70px 20px;border-radius:15px;text-align:center;color:#718096}.empty h2{color:#f5f8ff}
  .load-more{margin-top:14px;display:flex;justify-content:center}.load-more .button{min-width:240px}
  @media(max-width:1280px){.table-head,.product-table article{grid-template-columns:26px minmax(220px,1.4fr) 105px 65px 60px 90px 82px}.table-head span:nth-child(7),.product-table article>span:nth-child(7){display:none}.card-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:860px){.summary-strip{grid-template-columns:repeat(5,150px);overflow-x:auto}.product-table{overflow-x:auto}.table-head,.product-table article{min-width:850px}.page-head{align-items:start;flex-direction:column}.toolbar{grid-template-columns:1fr auto}.toolbar select{display:none}.card-grid{grid-template-columns:1fr}}
</style>
