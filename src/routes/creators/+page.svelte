<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import PageIntro from '$lib/components/PageIntro.svelte';
  import { assets, creators } from '$lib/data/marketplace';
  import { catalogueLoaded, catalogueLoading, loadCatalogue } from '$lib/stores/catalogue';
  import { showToast } from '$lib/stores/marketplace';

  onMount(() => {
    void loadCatalogue(true).catch((error) => showToast(error instanceof Error ? error.message : 'Creators could not be refreshed', 'warning'));
  });
</script>

<svelte:head><title>GameGuru MAX creators — AssetGuru</title></svelte:head>
<PageIntro eyebrow="Creator-first marketplace" title="Meet the people" highlight="building worlds" description="Professional storefronts, transparent compatibility and a direct route to the creators behind your favourite GameGuru MAX assets."/>

<section class="section first">
  <div class="content-wrap">
    {#if $catalogueLoading && !$catalogueLoaded}
      <div class="creator-loading glass"><Icon name="clock" size={22}/><span><b>Loading approved creators…</b><small>Fetching the latest storefront approvals.</small></span></div>
    {:else}
    <div class="creator-grid">
      {#each $creators as creator, index}
        <a class="creator-card glass" href={`/creators/${creator.slug}`}>
          <div class="banner"><img src={creator.banner} alt=""/><span>#{index + 1}</span></div>
          <div class="profile"><img src={creator.avatar} alt=""/><div><h2>{creator.name}</h2><span><Icon name="check" size={12}/> Verified creator</span></div></div>
          <p>{creator.tagline}</p>
          <div class="specialties">{#each creator.specialties as item}<em>{item}</em>{/each}</div>
          <div class="stats"><span><b>{creator.rating}</b><small>rating</small></span><span><b>{creator.productCount ?? $assets.filter((asset) => asset.creatorSlug === creator.slug).length}</b><small>products</small></span><span><b>{creator.sales.toLocaleString('en-GB')}</b><small>sales</small></span></div>
          <strong class="visit">Visit storefront <Icon name="arrow" size={16}/></strong>
        </a>
      {/each}
    </div>
    {/if}
  </div>
</section>

<section class="section seller-cta"><div class="content-wrap"><div class="cta glass"><div><span class="eyebrow">Your work deserves better than a file list</span><h2>Open an AssetGuru storefront.</h2><p>Guided uploads, compatibility fields, product versioning, creator analytics and presentation built around GameGuru MAX.</p></div><a class="button button-promo" href="/support"><Icon name="upload" size={18}/> Apply to sell</a></div></div></section>

<style>
  .first{padding-top:20px}.creator-loading{min-height:130px;padding:24px;display:flex;align-items:center;justify-content:center;gap:12px;color:#00e5ff}.creator-loading span{display:grid}.creator-loading b{color:#f5f8ff}.creator-loading small{margin-top:4px;color:#718096}.creator-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.creator-card{overflow:hidden;border-radius:17px;transition:190ms ease}.creator-card:hover{transform:translateY(-5px);border-color:#00e5ff}.banner{position:relative;height:145px;overflow:hidden}.banner>img{width:100%;height:100%;object-fit:cover}.banner>span{position:absolute;top:12px;right:12px;width:31px;height:31px;display:grid;place-items:center;border:1px solid #27547a;border-radius:8px;color:#00e5ff;background:rgb(2 4 13/.75);font-size:10px;font-weight:900}.profile{margin-top:-34px;padding:0 20px;position:relative;display:flex;gap:12px;align-items:end}.profile>img{width:76px;height:76px;border:3px solid #071022;border-radius:50%;background:#071022}.profile h2{margin:0 0 4px;font-size:20px}.profile span{display:flex;align-items:center;gap:5px;color:#00e5ff;font-size:9px;text-transform:uppercase;letter-spacing:.07em}.creator-card>p{min-height:48px;margin:17px 20px 13px;color:#aab5c8;font-size:11px;line-height:1.55}.specialties{padding:0 20px;display:flex;flex-wrap:wrap;gap:6px}.specialties em{padding:5px 7px;border:1px solid #183352;border-radius:99px;color:#718096;font-size:8px;font-style:normal}.stats{margin:17px 20px 0;padding:13px 0;display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid #122a43}.stats span{display:grid;text-align:center}.stats b{color:#f5f8ff}.stats small{color:#718096;font-size:8px;text-transform:uppercase}.visit{min-height:50px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;color:#00e5ff;font-size:11px}.seller-cta{padding-top:8px}.cta{padding:34px;border-radius:18px;display:flex;align-items:center;justify-content:space-between;gap:30px;background:radial-gradient(circle at 78% 50%,rgb(255 63 216/.16),transparent 23rem),linear-gradient(180deg,rgb(8 18 36/.94),rgb(5 10 22/.96))}.cta h2{margin:10px 0 7px;font-size:34px}.cta p{max-width:760px;margin:0;color:#aab5c8;line-height:1.6}.cta .button{flex:0 0 auto}
  @media(max-width:1100px){.creator-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.creator-grid{grid-template-columns:1fr}.cta{align-items:flex-start;flex-direction:column}.cta .button{width:100%}}
</style>
