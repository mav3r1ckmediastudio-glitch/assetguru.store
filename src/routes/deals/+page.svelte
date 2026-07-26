<script lang="ts">
  import AssetCard from '$lib/components/AssetCard.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import PageIntro from '$lib/components/PageIntro.svelte';
  import { assets } from '$lib/data/marketplace';
  $: offers = $assets.filter((asset) => asset.oldPrice && asset.oldPrice > asset.price);
  $: lead = offers[0];
</script>

<svelte:head><title>Marketplace deals — AssetGuru</title></svelte:head>
<PageIntro eyebrow="Live pricing" title="Marketplace deals" description="Genuine creator offers and free releases. Every price shown here comes from the live catalogue."/>
<section class="section"><div class="content-wrap">
  {#if lead}
    <div class="deal-hero glass"><img src={lead.image} alt={lead.title}/><div><span>Current offer</span><h2>{lead.title}</h2><p>{lead.summary}</p><strong>£{lead.price.toFixed(2)} <s>£{lead.oldPrice?.toFixed(2)}</s></strong><a class="button button-promo" href={`/marketplace/${lead.slug}`}>View asset</a></div></div>
    {#if offers.length > 1}<h2 class="sub">More offers</h2><div class="grid">{#each offers.slice(1) as asset}<AssetCard {asset}/>{/each}</div>{/if}
  {:else}
    <div class="empty glass"><Icon name="tag" size={34}/><h2>No offers are live yet</h2><p>Creator discounts and free releases will appear automatically when they are published.</p><a class="button button-secondary" href="/marketplace">Browse marketplace</a></div>
  {/if}
</div></section>
<style>
  .deal-hero{min-height:360px;display:grid;grid-template-columns:1.1fr .9fr;overflow:hidden;border-radius:18px}.deal-hero img{width:100%;height:100%;object-fit:cover}.deal-hero>div{padding:45px;display:grid;align-content:center}.deal-hero span{color:#ff3fd8;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}.deal-hero h2{font-size:38px;text-transform:uppercase;line-height:1}.deal-hero p{color:#aab5c8;line-height:1.7}.deal-hero strong{margin:10px 0 22px;color:#00e5ff;font-size:28px}.deal-hero s{color:#718096;font-size:15px}.deal-hero .button{width:max-content}.sub{margin-top:38px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.empty{min-height:340px;padding:40px;display:grid;place-items:center;align-content:center;text-align:center;border-radius:18px;color:#00e5ff}.empty h2{margin:16px 0 8px;color:#f5f8ff}.empty p{max-width:520px;margin:0 0 22px;color:#aab5c8;line-height:1.6}.empty .button{width:max-content}@media(max-width:900px){.deal-hero{grid-template-columns:1fr}.deal-hero img{height:260px}.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.grid{grid-template-columns:1fr}.deal-hero>div{padding:25px}}
</style>
