<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import AdminNav from '$lib/components/AdminNav.svelte';
  import { loadAdminData, loadModerationQueue, loadVendorApplications } from '$lib/stores/admin';

  let mounted=false;
  let lastPath='';

  async function loadForRoute(path:string) {
    try {
      if(path.startsWith('/admin/moderation')) {
        await loadModerationQueue();
        return;
      }
      if(path.startsWith('/admin/vendors')) {
        await loadVendorApplications();
        return;
      }
      await loadAdminData();
    } catch {
      // The shared toast/error stores already expose the failure to the admin UI.
    }
  }

  $: path=page.url.pathname;
  $: if(mounted && path!==lastPath) {
    lastPath=path;
    void loadForRoute(path);
  }

  onMount(()=>{
    mounted=true;
    lastPath=path;
    void loadForRoute(path);
  });
</script>
<div class="admin-shell content-wrap">
  <AdminNav/>
  <main><slot/></main>
</div>
<style>
  .admin-shell{padding:26px 0 72px;display:grid;grid-template-columns:225px minmax(0,1fr);gap:18px;align-items:start}.admin-shell main{min-width:0}
  @media(max-width:1050px){.admin-shell{grid-template-columns:1fr;padding-top:16px}}
</style>
