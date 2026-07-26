<script lang="ts">
  import AdminNav from '$lib/components/AdminNav.svelte';
</script>
<div class="admin-shell content-wrap">
  <AdminNav/>
  <main><slot/></main>
</div>
<style>
  .admin-shell{padding:26px 0 72px;display:grid;grid-template-columns:225px minmax(0,1fr);gap:18px;align-items:start}.admin-shell main{min-width:0}
  @media(max-width:1050px){.admin-shell{grid-template-columns:1fr;padding-top:16px}}
</style>
