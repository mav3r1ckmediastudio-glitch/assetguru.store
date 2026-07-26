<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { catalogueCategories, updateCategory } from '$lib/stores/admin';

  let search='';
  let selected='';
  $: filtered=$catalogueCategories.filter(c=>`${c.name} ${c.slug}`.toLowerCase().includes(search.toLowerCase()));
  $: total=$catalogueCategories.reduce((sum,c)=>sum+c.products,0);
  $: published=$catalogueCategories.reduce((sum,c)=>sum+c.published,0);
  $: pending=$catalogueCategories.reduce((sum,c)=>sum+c.pending,0);
</script>

<svelte:head><title>Catalogue governance — AssetGuru Admin</title></svelte:head>
<header class="admin-page-head">
  <div><span class="eyebrow">Discovery architecture</span><h1>Catalogue <span class="gradient-text">governance.</span></h1><p>Control category visibility, homepage prominence, commission exceptions and the metadata buyers rely on to find compatible assets.</p></div>
  <div class="admin-head-actions"><button class="button button-primary" type="button" onclick={()=>selected='new'}><Icon name="plus" size={18}/> New category</button></div>
</header>

<div class="summary">
  <span><b>{total.toLocaleString('en-GB')}</b><small>catalogued products</small></span><span><b>{published.toLocaleString('en-GB')}</b><small>published</small></span><span><b>{pending}</b><small>awaiting moderation</small></span><span><b>{$catalogueCategories.filter(c=>c.featured).length}</b><small>featured categories</small></span><span><b>{$catalogueCategories.filter(c=>c.visible).length}</b><small>visible categories</small></span>
</div>

<div class="catalogue-grid">
  <section class="admin-panel glass category-panel">
    <div class="admin-panel-head"><div><span class="eyebrow">Taxonomy</span><h2>Marketplace categories</h2><p>Changes are reflected in browsing and vendor listing forms.</p></div></div>
    <div class="admin-toolbar"><input class="admin-search" bind:value={search} placeholder="Search categories…"/><select class="admin-select"><option>Order: marketplace</option><option>Order: products</option><option>Order: pending</option></select></div>
    <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Category</th><th>Products</th><th>Published</th><th>Pending</th><th>Commission</th><th>Featured</th><th>Visible</th></tr></thead><tbody>
      {#each filtered as category}
        <tr>
          <td><button class="category-name" type="button" onclick={()=>selected=category.id}><i><Icon name="package" size={17}/></i><span><strong>{category.name}</strong><small>/{category.slug}</small></span></button></td>
          <td>{category.products}</td><td>{category.published}</td><td><em class:has={category.pending>0}>{category.pending}</em></td><td>{category.commissionOverride ?? 15}%</td>
          <td><button class:on={category.featured} class="switch" type="button" role="switch" aria-checked={category.featured} aria-label={`Toggle ${category.name} featured`} onclick={()=>updateCategory(category.id,{featured:!category.featured})}></button></td>
          <td><button class:on={category.visible} class="switch" type="button" role="switch" aria-checked={category.visible} aria-label={`Toggle ${category.name} visible`} onclick={()=>updateCategory(category.id,{visible:!category.visible})}></button></td>
        </tr>
      {/each}
    </tbody></table></div>
  </section>

  <aside class="side-stack">
    <section class="admin-panel glass metadata">
      <div class="admin-panel-head"><div><span class="eyebrow">Compatibility schema</span><h2>Required metadata</h2></div></div>
      {#each [
        ['GameGuru MAX build','Required for every listing','100%'],['Dependencies','Required with “None” option','98%'],['Package size','Generated automatically','100%'],['Performance tier','Required for 3D and VFX','91%'],['AI assistance','Vendor disclosure','87%'],['Source files','Included / not included','96%']
      ] as item}
        <div class="metadata-row"><Icon name="check" size={15}/><span><b>{item[0]}</b><small>{item[1]}</small></span><strong>{item[2]}</strong></div>
      {/each}
      <button class="button button-secondary" type="button">Edit metadata schema</button>
    </section>

    <section class="admin-panel glass search-health">
      <div class="admin-panel-head"><div><span class="eyebrow">Search quality</span><h2>Discovery health</h2></div></div>
      <div class="quality"><strong>94</strong><span><b>Excellent</b><small>Search quality score</small></span></div>
      {#each [['Zero-result searches','2.8%'],['Products missing tags','41'],['Synonym coverage','86%'],['Broken category links','0']] as item}<div class="health-row"><span>{item[0]}</span><b>{item[1]}</b></div>{/each}
      <a class="button button-secondary" href="/admin/reports">Open search report</a>
    </section>
  </aside>
</div>

{#if selected}
  <div class="modal-backdrop" role="presentation" onclick={(e)=>{if(e.currentTarget===e.target)selected='';}}>
    <section class="modal glass" role="dialog" aria-modal="true" aria-label="Category editor">
      <div class="modal-head"><div><span class="eyebrow">Catalogue editor</span><h2>{selected==='new'?'Create category':$catalogueCategories.find(c=>c.id===selected)?.name}</h2></div><button class="icon-button" type="button" onclick={()=>selected=''}><Icon name="close" size={18}/></button></div>
      <div class="admin-form-grid"><label class="admin-field"><span>Display name</span><input class="admin-input" value={selected==='new'?'':$catalogueCategories.find(c=>c.id===selected)?.name}/></label><label class="admin-field"><span>URL slug</span><input class="admin-input" value={selected==='new'?'':$catalogueCategories.find(c=>c.id===selected)?.slug}/></label><label class="admin-field full"><span>Description</span><textarea class="admin-textarea" placeholder="Describe what belongs in this category…"></textarea></label><label class="admin-field"><span>Commission override</span><input class="admin-input" type="number" min="0" max="50" value={selected==='new'?15:($catalogueCategories.find(c=>c.id===selected)?.commissionOverride??15)}/></label><label class="admin-field"><span>Sort position</span><input class="admin-input" type="number" min="1" value="1"/></label></div>
      <div class="modal-actions"><button class="button button-secondary" type="button" onclick={()=>selected=''}>Cancel</button><button class="button button-primary" type="button" onclick={()=>selected=''}>Save category</button></div>
    </section>
  </div>
{/if}

<style>
  .summary{margin-bottom:14px;display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #183352;border-radius:13px;background:#050a16}.summary span{padding:15px;display:grid;border-right:1px solid #183352}.summary span:last-child{border:0}.summary b{font-size:18px}.summary small{margin-top:4px;color:#718096;font-size:8px}.catalogue-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:14px;align-items:start}.category-panel{padding:14px}.category-name{padding:0;display:flex;gap:9px;align-items:center;border:0;color:#f5f8ff;background:transparent;text-align:left;cursor:pointer}.category-name>i{width:35px;height:35px;display:grid;place-items:center;border:1px solid #27547a;border-radius:9px;color:#00e5ff;background:rgb(0 229 255/.06);font-style:normal}.category-name span{display:grid}.category-name small{margin-top:3px;color:#718096;font-size:7px}.admin-table em{min-width:24px;height:24px;display:grid;place-items:center;border-radius:7px;color:#718096;background:#081224;font-size:8px;font-style:normal}.admin-table em.has{color:#ffb547;background:rgb(255 181 71/.08)}.switch{width:40px;height:22px;padding:2px;border:0;border-radius:99px;background:#24364d;cursor:pointer}.switch::after{content:'';display:block;width:18px;height:18px;border-radius:50%;background:white;transition:.15s}.switch.on{background:#24d89a}.switch.on::after{transform:translateX(18px)}.side-stack{display:grid;gap:14px}.metadata-row{min-height:52px;display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;border-top:1px solid #122a43;color:#24d89a}.metadata-row span{display:grid}.metadata-row b{color:#f5f8ff;font-size:9px}.metadata-row small{margin-top:3px;color:#718096;font-size:7px}.metadata-row strong{font-size:8px}.metadata .button,.search-health .button{width:100%;margin-top:12px}.quality{margin:6px 0 14px;padding:15px;display:flex;gap:12px;align-items:center;border:1px solid rgb(36 216 154/.3);border-radius:12px;background:rgb(36 216 154/.06)}.quality>strong{font-size:36px;color:#24d89a}.quality span{display:grid}.quality b{font-size:11px}.quality small{margin-top:3px;color:#718096;font-size:8px}.health-row{min-height:43px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #122a43;color:#aab5c8;font-size:8px}.health-row b{color:#f5f8ff}.modal-backdrop{position:fixed;z-index:80;inset:0;padding:20px;display:grid;place-items:center;background:rgb(2 4 13/.82);backdrop-filter:blur(8px)}.modal{width:min(620px,100%);padding:22px;border-radius:17px}.modal-head{margin-bottom:18px;display:flex;align-items:start;justify-content:space-between}.modal h2{margin:8px 0 0}.admin-field>span{color:#aab5c8;font-size:9px;font-weight:800}.modal-actions{margin-top:18px;display:flex;justify-content:flex-end;gap:9px}
  @media(max-width:1200px){.catalogue-grid{grid-template-columns:1fr}.side-stack{grid-template-columns:1fr 1fr}}@media(max-width:760px){.summary{grid-template-columns:1fr 1fr;overflow:hidden}.summary span:nth-child(2n){border-right:0}.side-stack{grid-template-columns:1fr}.modal-actions{display:grid}}
</style>
