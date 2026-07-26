<script lang="ts">
  import BuyerNav from '$lib/components/BuyerNav.svelte';
</script>
<div class="buyer-shell content-wrap">
  <BuyerNav/>
  <main><slot/></main>
</div>
<style>
  .buyer-shell{padding:26px 0 72px;display:grid;grid-template-columns:215px minmax(0,1fr);gap:18px;align-items:start}.buyer-shell main{min-width:0}
  @media(max-width:1050px){.buyer-shell{grid-template-columns:1fr;padding-top:16px}}
</style>
