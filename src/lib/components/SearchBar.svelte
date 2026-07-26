<script lang="ts">
  import { goto } from '$app/navigation';
  import { categories } from '$lib/data/marketplace';
  import Icon from './Icon.svelte';
  export let compact = false;
  let query = '';
  let category = 'All assets';

  function submit() {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category !== 'All assets') params.set('category', category);
    goto(`/marketplace${params.size ? `?${params}` : ''}`);
  }
</script>

<form class:compact class="search" onsubmit={(event) => { event.preventDefault(); submit(); }}>
  <label class="query"><span class="sr-only">Search AssetGuru</span><Icon name="search" size={22}/><input bind:value={query} placeholder="Search assets, creators or tags…" autocomplete="off" /></label>
  <label class="select-wrap"><span class="sr-only">Asset category</span><select bind:value={category}><option>All assets</option>{#each $categories as item}<option>{item.name}</option>{/each}</select></label>
  <button class="button button-promo" type="submit"><Icon name="spark" size={17}/>Search</button>
</form>

<style>
  .search { position: relative; display: grid; grid-template-columns: minmax(220px, 1fr) 210px auto; gap: 8px; padding: 8px; border: 1px solid #1c4268; border-radius: 13px; background: rgb(4 11 24 / .92); box-shadow: 0 18px 70px rgb(0 0 0 / .25); }.query { min-height: 48px; display: flex; align-items: center; gap: 12px; padding: 0 14px; color: #00e5ff; }input { width: 100%; border: 0; outline: 0; background: transparent; color: #f5f8ff; }input::placeholder { color: #718096; }.select-wrap { border-left: 1px solid #183352; display: grid; align-items: center; }select { width: 100%; height: 100%; padding: 0 14px; border: 0; outline: 0; color: #aab5c8; background: #050a16; border-radius: 8px; cursor: pointer; }.search .button { min-width: 130px; }.compact { grid-template-columns: 1fr auto; }.compact .select-wrap { display: none; }
  @media (max-width: 700px) { .search { grid-template-columns: 1fr; }.select-wrap { display: none; }.query { min-height: 52px; } }
</style>
