<script lang="ts">
  import type { Asset } from '$lib/data/marketplace';
  import { addToCart, favourites, toggleFavourite } from '$lib/stores/marketplace';
  import Icon from './Icon.svelte';

  export let asset: Asset;
  export let view: 'grid' | 'list' = 'grid';

  $: favourite = $favourites.includes(asset.slug);
</script>

<article class:list={view === 'list'} class="asset-card" data-accent={asset.accent}>
  <a class="image-wrap" href={`/marketplace/${asset.slug}`} aria-label={`View ${asset.title}`}>
    <img src={asset.image} alt="" />
    {#if asset.badge}<span class="badge">{asset.badge}</span>{/if}
    <span class="compat">{asset.compatibility}</span>
  </a>

  <button
    class:favourited={favourite}
    class="favourite"
    type="button"
    aria-label={favourite ? `Remove ${asset.title} from favourites` : `Add ${asset.title} to favourites`}
    onclick={() => toggleFavourite(asset.slug, asset.title)}
  >
    <Icon name="heart" size={18}/>
  </button>

  <div class="body">
    <div class="copy">
      <a href={`/marketplace/${asset.slug}`}><h3>{asset.title}</h3></a>
      <p>{asset.category} · {asset.subcategory}</p>
      {#if view === 'list'}<span class="summary">{asset.summary}</span>{/if}
      <a class="creator" href={`/creators/${asset.creatorSlug}`}>
        <img src={asset.creatorAvatar} alt=""/><span>{asset.creator}</span><b title="Verified creator">✓</b>
      </a>
    </div>
    <div class="meta">
      <span class="rating"><Icon name="star" size={14}/><strong>{asset.rating}</strong><small>({asset.reviews})</small></span>
      <div class="price-wrap">
        {#if asset.oldPrice}<s>£{asset.oldPrice.toFixed(2)}</s>{/if}
        <span class="price">{asset.price === 0 ? 'Free' : `£${asset.price.toFixed(2)}`}</span>
      </div>
    </div>
    <div class="actions">
      <a class="details" href={`/marketplace/${asset.slug}`}>View details</a>
      <button type="button" onclick={() => addToCart(asset.slug, 'standard', asset.title)}><Icon name="cart" size={16}/> Add</button>
    </div>
  </div>
</article>

<style>
  .asset-card { --accent: #00e5ff; position: relative; min-width: 0; overflow: hidden; border: 1px solid #183352; border-radius: 14px; background: #071022; box-shadow: 0 16px 48px rgb(0 0 0 / .18); transition: transform 190ms ease, border-color 190ms ease, box-shadow 190ms ease; }
  .asset-card[data-accent='magenta'] { --accent: #ff3fd8; }.asset-card[data-accent='violet'] { --accent: #8b5cf6; }.asset-card[data-accent='amber'] { --accent: #ffb547; }.asset-card[data-accent='green'] { --accent: #24d89a; }.asset-card[data-accent='blue'] { --accent: #4d7cff; }.asset-card[data-accent='red'] { --accent: #ff526d; }
  .asset-card:hover { transform: translateY(-5px); border-color: color-mix(in srgb, var(--accent) 78%, #27547a); box-shadow: 0 22px 58px rgb(0 0 0 / .32), 0 0 28px color-mix(in srgb, var(--accent) 10%, transparent); }
  .image-wrap { position: relative; aspect-ratio: 16/9; display: block; overflow: hidden; background: #02040d; }
  .image-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 240ms ease, filter 240ms ease; }
  .asset-card:hover .image-wrap img { transform: scale(1.035); filter: saturate(1.08); }
  .image-wrap::after { content: ''; position: absolute; inset: 45% 0 0; background: linear-gradient(transparent, #071022); }
  .badge, .compat { position: absolute; z-index: 2; top: 10px; padding: 5px 8px; border-radius: 6px; font-size: 9px; font-weight: 850; letter-spacing: .06em; text-transform: uppercase; }
  .badge { left: 10px; color: #031018; background: var(--accent); box-shadow: 0 0 15px color-mix(in srgb, var(--accent) 35%, transparent); }
  .compat { right: 10px; color: #f5f8ff; background: rgb(2 4 13 / .76); border: 1px solid #27547a; backdrop-filter: blur(8px); }
  .favourite { position: absolute; z-index: 3; top: 43px; right: 10px; width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid #27547a; border-radius: 9px; color: white; background: rgb(2 4 13 / .82); cursor: pointer; opacity: 0; transform: translateY(-4px); transition: 160ms ease; }
  .asset-card:hover .favourite, .favourite.favourited, .favourite:focus-visible { opacity: 1; transform: none; }
  .favourite.favourited { color: #ff3fd8; border-color: #ff3fd8; }
  .body { padding: 14px; display: grid; }
  h3 { margin: 0; font-size: 15px; line-height: 1.25; letter-spacing: -.02em; }
  .copy > p { margin: 5px 0 10px; color: #718096; font-size: 11px; }.summary { display: block; max-width: 760px; margin: 2px 0 12px; color: #aab5c8; font-size: 12px; line-height: 1.55; }
  .creator { width: fit-content; display: flex; align-items: center; gap: 7px; color: #aab5c8; font-size: 11px; }.creator:hover span { color: #00e5ff; }.creator img { width: 22px; height: 22px; border-radius: 50%; }.creator b { width: 15px; height: 15px; display: grid; place-items: center; border-radius: 50%; color: #031018; background: #00e5ff; font-size: 9px; }
  .meta { margin-top: 13px; padding-top: 12px; border-top: 1px solid #122a43; display: flex; align-items: center; justify-content: space-between; gap: 12px; }.rating { display: flex; align-items: center; gap: 4px; color: #ffc857; }.rating strong { color: #f5f8ff; font-size: 12px; }.rating small { color: #718096; }.price-wrap { display: flex; align-items: baseline; gap: 6px; }.price-wrap s { color: #718096; font-size: 10px; }.price { color: #00e5ff; font-size: 14px; font-weight: 850; }
  .actions { margin-top: 12px; display: grid; grid-template-columns: 1fr auto; gap: 8px; }.actions a,.actions button { min-height: 36px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; }.details { color: #aab5c8; border: 1px solid #183352; }.details:hover { color: #00e5ff; border-color: #00e5ff; }.actions button { border: 0; color: #031018; background: linear-gradient(135deg,#00e5ff,#4d7cff); }
  .asset-card.list { display: grid; grid-template-columns: minmax(220px, 310px) 1fr; }.asset-card.list .image-wrap { aspect-ratio: auto; height: 100%; min-height: 214px; }.asset-card.list .body { padding: 20px; grid-template-columns: 1fr auto; grid-template-rows: 1fr auto; column-gap: 24px; }.asset-card.list h3 { font-size: 20px; }.asset-card.list .meta { align-self: start; min-width: 160px; margin: 0; padding: 0; border: 0; display: grid; justify-items: end; }.asset-card.list .actions { grid-column: 1/-1; }.asset-card.list .favourite { right: auto; left: 10px; }
  @media(max-width:720px){.asset-card.list{grid-template-columns:1fr}.asset-card.list .image-wrap{aspect-ratio:16/9;min-height:0}.asset-card.list .body{display:grid;grid-template-columns:1fr}.asset-card.list .meta{margin-top:13px;padding-top:12px;border-top:1px solid #122a43;display:flex;justify-items:initial}.asset-card.list .favourite{right:10px;left:auto}}
</style>
