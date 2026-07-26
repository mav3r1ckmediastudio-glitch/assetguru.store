<script lang="ts">
  import '../app.css';
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';
  import Header from '$lib/components/Header.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import GuruAssist from '$lib/components/GuruAssist.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import ToastStack from '$lib/components/ToastStack.svelte';
  import { loadCatalogue } from '$lib/stores/catalogue';
  import { loadBuyerData } from '$lib/stores/buyer';
  import { loadCreatorData } from '$lib/stores/creator';
  import { loadAdminData } from '$lib/stores/admin';
  import { hydrateSession } from '$lib/stores/session';
  import { showToast } from '$lib/stores/marketplace';
  import { getSupabaseBrowserClient } from '$lib/supabase/client';

  export let data;
  $: hydrateSession(data);

  onMount(() => {
    let disposed = false;
    async function hydrateLiveData() {
      try {
        await loadCatalogue();
        if (data.user) await loadBuyerData();
        if (data.profile?.role === 'vendor') await loadCreatorData();
        if (data.profile?.role === 'admin') await loadAdminData();
      } catch (error) {
        if (!disposed) showToast(error instanceof Error ? error.message : 'Live marketplace data could not be loaded', 'warning');
      }
    }
    void hydrateLiveData();

    let unsubscribe = () => {};
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: listener } = supabase.auth.onAuthStateChange(() => {
        void invalidate('supabase:auth');
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    } catch {
      // Build and first-run setup may not have environment variables yet.
    }

    return () => {
      disposed = true;
      unsubscribe();
    };
  });
</script>

<svelte:head><title>AssetGuru — Build Worlds. Inspire Players.</title></svelte:head>

<div class="app-shell">
  <Sidebar />
  <Header />
  <div class="page"><slot /></div>
  <GuruAssist />
  <ToastStack />
  <Footer />
</div>

<style>
  .page { min-height: 100dvh; padding-top: 82px; margin-left: 88px; }:global(footer) { margin-left: 88px; }
  @media (max-width: 900px) { .page { padding-top: 74px; margin-left: 0; }:global(footer) { margin-left: 0; } }
</style>
