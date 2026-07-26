<script lang="ts">
  import AssetCard from '$lib/components/AssetCard.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import PageIntro from '$lib/components/PageIntro.svelte';
  import { assets } from '$lib/data/marketplace';
  import { favourites } from '$lib/stores/marketplace';

  $: saved = $assets.filter((asset) => $favourites.includes(asset.slug));
</script>

<svelte:head><title>Favourites — AssetGuru</title></svelte:head>
<PageIntro eyebrow="Your shortlist" title="Saved" highlight="favourites" description="Keep promising assets together while you plan a scene, compare creators or wait for the right production milestone."/>
<section class="section first"><div class="content-wrap">
  {#if saved.length}
    <div class="toolbar glass"><span><Icon name="heart" size={18}/><strong>{saved.length} saved {saved.length === 1 ? 'asset' : 'assets'}</strong></span><a class="text-link" href="/marketplace">Discover more →</a></div>
    <div class="grid">{#each saved as asset}<AssetCard {asset}/>{/each}</div>
  {:else}
    <div class="empty glass"><span class="heart"><Icon name="heart" size={38}/></span><h2>Your favourites are waiting for a first discovery.</h2><p>Tap the heart on any asset card or product page. Signed-in favourites are stored securely against your AssetGuru account.</p><a class="button button-primary" href="/marketplace"><Icon name="browse" size={18}/> Browse marketplace</a></div>
  {/if}
</div></section>
<style>.first{padding-top:18px}.toolbar{margin-bottom:16px;padding:13px 16px;border-radius:12px;display:flex;align-items:center;justify-content:space-between}.toolbar>span{display:flex;align-items:center;gap:8px;color:#ff3fd8}.toolbar strong{color:#f5f8ff;font-size:12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.empty{max-width:760px;margin:0 auto;padding:72px 28px;border-radius:18px;text-align:center}.heart{width:74px;height:74px;margin:0 auto 18px;display:grid;place-items:center;border:1px solid rgb(255 63 216/.45);border-radius:50%;color:#ff3fd8;background:rgb(255 63 216/.08)}.empty h2{font-size:30px}.empty p{max-width:590px;margin:0 auto 24px;color:#aab5c8;line-height:1.7}.empty .button{display:inline-flex;width:auto}@media(max-width:1200px){.grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:850px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.grid{grid-template-columns:1fr}.empty .button{width:100%}}</style>
