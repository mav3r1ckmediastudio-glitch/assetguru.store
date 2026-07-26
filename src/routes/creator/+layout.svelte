<script lang="ts">
  import CreatorNav from '$lib/components/CreatorNav.svelte';
</script>
<div class="creator-shell content-wrap">
  <CreatorNav/>
  <main><slot/></main>
</div>
<style>
  .creator-shell{padding:26px 0 72px;display:grid;grid-template-columns:215px minmax(0,1fr);gap:18px;align-items:start}.creator-shell main{min-width:0}
  @media(max-width:1050px){.creator-shell{grid-template-columns:1fr;padding-top:16px}}
</style>
