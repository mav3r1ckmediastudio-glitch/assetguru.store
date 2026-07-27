<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import AssetCard from '$lib/components/AssetCard.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { authUser } from '$lib/stores/session';
  import { apiRequest } from '$lib/api';
  import { showToast } from '$lib/stores/marketplace';

  export let data: PageData;

  let creator = data.creator;
  const loadError = data.loadError ?? false;
  let creatorAssets = data.creatorAssets ?? [];
  const slug = data.slug;
  let tab = 'Products';
  let sort = 'Popular';
  let query = '';
  let followed = false;
  let followBusy = false;

  onMount(async () => {
    try {
      const state=await apiRequest<{following:boolean}>(`/api/creator-follows/${slug}`);
      followed=state.following;
    } catch {
      followed=false;
    }
  });

  async function toggleFollow(){
    if(!$authUser){await goto(`/auth/login?returnTo=${encodeURIComponent(`/creators/${slug}`)}`);return;}
    if(!creator||followBusy)return;
    followBusy=true;
    try{
      const next=!followed;
      await apiRequest(`/api/creator-follows/${creator.slug}`,{method:next?'POST':'DELETE'});
      followed=next;
      creator={...creator,followers:Math.max(0,creator.followers+(next?1:-1))};
      showToast(next?'Creator followed':'Creator unfollowed','success');
    }catch(error){showToast(error instanceof Error?error.message:'Follow preference could not be updated','warning');}
    finally{followBusy=false;}
  }

  $: visible = creatorAssets
    .filter((asset) => !query || `${asset.title} ${asset.category} ${asset.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'Newest' ? Date.parse(b.updated) - Date.parse(a.updated) : sort === 'Price low' ? a.price - b.price : b.sales - a.sales);
</script>

<svelte:head><title>{creator?.name ?? 'Creator unavailable'} — Creator Store on AssetGuru</title><meta name="description" content={creator?.tagline ?? 'AssetGuru creator storefront'}/></svelte:head>
{#if creator}


<section class="store-hero">
  <img class="banner" src={creator.banner} alt=""/>
  <div class="hero-shade"></div>
  <div class="content-wrap store-identity">
    <img class="avatar" src={creator.avatar} alt=""/>
    <div class="identity-copy"><div class="name-row"><h1>{creator.name}</h1>{#if creator.verified}<span><Icon name="check" size={13}/> Verified creator</span>{/if}</div><p>{creator.tagline}</p><div class="specialties">{#each creator.specialties as item}<em>{item}</em>{/each}</div></div>
    <div class="store-actions"><button class:followed class="button button-primary" type="button" disabled={followBusy} onclick={toggleFollow}><Icon name={followed ? 'check' : 'plus'} size={17}/>{followBusy ? 'Saving…' : followed ? 'Following' : 'Follow creator'}</button><a class="button button-secondary" href="/support"><Icon name="mail" size={17}/> Contact</a></div>
  </div>
</section>

<section class="store-nav-wrap">
  <div class="content-wrap store-nav">
    <nav>{#each ['Products','About','Reviews','Support'] as item}<button class:active={tab === item} type="button" onclick={() => tab = item}>{item}</button>{/each}</nav>
    <div class="headline-stats"><span><b>{creator.rating}</b><small>★ rating</small></span><span><b>{creator.sales.toLocaleString('en-GB')}</b><small>sales</small></span><span><b>{creator.followers.toLocaleString('en-GB')}</b><small>followers</small></span><span><b>{creatorAssets.length}</b><small>products</small></span></div>
  </div>
</section>

<section class="section">
  <div class="content-wrap">
    {#if tab === 'Products'}
      <div class="product-tools glass"><label><Icon name="search" size={18}/><input bind:value={query} placeholder={`Search ${creator.name} products…`}/></label><span>{visible.length} products</span><select bind:value={sort}><option>Popular</option><option>Newest</option><option>Price low</option></select></div>
      <div class="product-grid">{#each visible as asset}<AssetCard {asset}/>{/each}</div>
    {:else if tab === 'About'}
      <div class="about-grid"><article class="glass about"><span class="eyebrow">The studio</span><h2>About {creator.name}</h2><p>{creator.bio}</p><div class="details"><span><small>Member since</small><b>{creator.joined}</b></span><span><small>Based in</small><b>{creator.location}</b></span><span><small>Typical response</small><b>{creator.responseTime}</b></span><span><small>Marketplace status</small><b>Verified professional</b></span></div></article><aside class="glass principles"><h3>Store standards</h3><span><Icon name="shield" size={18}/><b>Every product moderated</b><small>Compatibility and package claims are reviewed.</small></span><span><Icon name="clock" size={18}/><b>Active support</b><small>{creator.responseTime}.</small></span><span><Icon name="download" size={18}/><b>Versioned updates</b><small>Buyers retain access to product updates.</small></span></aside></div>
    {:else if tab === 'Reviews'}
      <div class="reviews glass"><div class="score"><strong>{creator.rating || '—'}</strong><span>{creator.rating ? '★★★★★' : 'No ratings yet'}<small>{creator.reviews} verified store {creator.reviews===1?'review':'reviews'}</small></span></div>{#if creator.recentReviews.length}{#each creator.recentReviews as review}<article><header><b>{review.title}</b><span>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span><small>{review.date} · Verified buyer</small></header><p>{review.text}</p></article>{/each}{:else}<div class="review-empty"><Icon name="star" size={28}/><b>No published reviews yet</b><small>Verified buyers can review products after purchase.</small></div>{/if}</div>
    {:else}
      <div class="support glass"><Icon name="support" size={42}/><h2>Product support stays attached to the product.</h2><p>{creator.supportPromise || `Buyers can open a ticket from their library with the order, asset version and GameGuru MAX build already included. That gives ${creator.name} the context needed to help quickly.`}</p>{#if creator.updateCommitment}<h3>Update commitment</h3><p>{creator.updateCommitment}</p>{/if}{#if creator.licenceNotes}<h3>Licence notes</h3><p>{creator.licenceNotes}</p>{/if}<a class="button button-secondary" href="/support">Open support</a></div>
    {/if}
  </div>
</section>

{:else}
<section class="section"><div class="content-wrap"><div class="empty-state glass"><span class="eyebrow">Creators</span><h1>{loadError ? 'Storefront temporarily unavailable.' : 'Creator unavailable.'}</h1><p>{loadError ? 'The storefront could not be loaded. Refresh the page to try again.' : 'This storefront does not exist or has not been approved.'}</p><a class="button button-primary" href="/creators">Browse creators</a></div></div></section>
{/if}

<style>
  .store-hero{position:relative;min-height:390px;display:flex;align-items:end;overflow:hidden;border-bottom:1px solid #183352}.banner{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.hero-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgb(2 4 13/.05),rgb(2 4 13/.94)),linear-gradient(90deg,rgb(2 4 13/.74),transparent 70%)}.store-identity{position:relative;z-index:2;padding-bottom:35px;display:grid;grid-template-columns:auto 1fr auto;gap:22px;align-items:end}.avatar{width:118px;height:118px;border:3px solid #00e5ff;border-radius:50%;background:#071022;box-shadow:0 0 38px rgb(0 229 255/.22)}.name-row{display:flex;align-items:center;gap:13px}.name-row h1{margin:0;font-size:clamp(2.7rem,5vw,5rem);letter-spacing:-.06em}.name-row span{padding:6px 9px;display:flex;align-items:center;gap:5px;border:1px solid rgb(0 229 255/.55);border-radius:99px;color:#00e5ff;background:rgb(0 229 255/.08);font-size:9px;font-weight:800;text-transform:uppercase}.identity-copy p{max-width:700px;margin:7px 0 12px;color:#aab5c8;font-size:16px}.specialties{display:flex;flex-wrap:wrap;gap:7px}.specialties em{padding:6px 9px;border:1px solid #27547a;border-radius:99px;color:#aab5c8;background:rgb(5 10 22/.68);font-size:9px;font-style:normal}.store-actions{display:flex;gap:9px}.store-actions .button{width:auto}.store-actions .followed{background:#24d89a}.store-actions button:disabled{opacity:.6;cursor:wait}.store-nav-wrap{border-bottom:1px solid #183352;background:rgb(5 10 22/.88);backdrop-filter:blur(12px)}.store-nav{min-height:78px;display:flex;align-items:center;justify-content:space-between;gap:24px}.store-nav nav{height:78px;display:flex}.store-nav nav button{height:100%;padding:0 23px;border:0;border-bottom:2px solid transparent;color:#718096;background:transparent;cursor:pointer}.store-nav nav button.active{color:#00e5ff;border-color:#00e5ff}.headline-stats{display:flex;gap:25px}.headline-stats span{display:grid;text-align:right}.headline-stats b{font-size:15px}.headline-stats small{color:#718096;font-size:8px;text-transform:uppercase;letter-spacing:.08em}
  .product-tools{margin-bottom:16px;padding:9px 12px;border-radius:12px;display:grid;grid-template-columns:1fr auto auto;gap:13px;align-items:center}.product-tools label{min-height:42px;display:flex;align-items:center;gap:10px;color:#00e5ff}.product-tools input{width:100%;border:0;outline:0;color:#f5f8ff;background:transparent}.product-tools>span{color:#718096;font-size:10px}.product-tools select{min-height:38px;padding:0 28px 0 10px;border:1px solid #183352;border-radius:8px;color:#f5f8ff;background:#050a16}.product-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.about-grid{display:grid;grid-template-columns:1fr 350px;gap:18px}.about,.principles,.reviews,.support{padding:30px;border-radius:17px}.about h2{font-size:32px}.about>p{max-width:820px;color:#aab5c8;line-height:1.8}.details{margin-top:28px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.details span{padding:16px;border:1px solid #183352;border-radius:10px;background:#050a16}.details small,.details b{display:block}.details small{color:#718096;font-size:9px;text-transform:uppercase}.details b{margin-top:5px}.principles h3{margin-top:0}.principles>span{padding:15px 0;display:grid;grid-template-columns:auto 1fr;column-gap:10px;border-top:1px solid #183352;color:#00e5ff}.principles>span b{color:#f5f8ff}.principles>span small{grid-column:2;color:#718096;line-height:1.5}.score{display:flex;align-items:center;gap:15px;padding-bottom:22px}.score>strong{font-size:50px}.score>span{display:grid;color:#ffc857;letter-spacing:.12em}.score small{color:#718096;letter-spacing:normal}.reviews article{padding:20px 0;border-top:1px solid #183352}.reviews header{display:grid;grid-template-columns:auto 1fr auto;gap:12px}.reviews header span{color:#ffc857}.reviews header small{color:#718096}.reviews p{color:#aab5c8;line-height:1.7}.review-empty{padding:48px 16px;display:grid;place-items:center;gap:7px;color:#718096;text-align:center}.review-empty b{color:#f5f8ff}.support{max-width:800px;margin:auto;text-align:center;color:#00e5ff}.support h2{color:#f5f8ff}.support p{color:#aab5c8;line-height:1.7}.support .button{display:inline-flex;width:auto}
  @media(max-width:1200px){.product-grid{grid-template-columns:repeat(3,1fr)}.headline-stats{display:none}}
  @media(max-width:900px){.store-hero{min-height:440px}.store-identity{grid-template-columns:auto 1fr}.store-actions{grid-column:1/-1}.store-nav{overflow-x:auto}.about-grid{grid-template-columns:1fr}.product-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:600px){.store-identity{grid-template-columns:1fr;justify-items:start}.avatar{width:88px;height:88px}.name-row{align-items:flex-start;flex-direction:column}.name-row h1{font-size:2.7rem}.store-actions{width:100%;display:grid;grid-template-columns:1fr}.store-actions .button{width:100%}.store-nav{width:100%;padding:0}.store-nav nav{overflow-x:auto}.store-nav nav button{padding:0 16px}.product-tools{grid-template-columns:1fr}.product-tools>span{display:none}.product-grid{grid-template-columns:1fr}.details{grid-template-columns:1fr}.reviews header{grid-template-columns:1fr}}
</style>
