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
  import { loadBuyerData, resetBuyerData } from '$lib/stores/buyer';
  import { loadCreatorData, resetCreatorData } from '$lib/stores/creator';
  import { resetAdminData } from '$lib/stores/admin';
  import { hydrateSession } from '$lib/stores/session';
  import { showToast } from '$lib/stores/marketplace';
  import { getSupabaseBrowserClient } from '$lib/supabase/client';

  export let data;

  let mounted = false;
  let disposed = false;
  let lastAuthKey = '';
  let syncGeneration = 0;

  $: hydrateSession(data);
  $: authKey = `${data.user?.id ?? ''}:${data.profile?.role ?? ''}`;
  $: if (mounted && authKey !== lastAuthKey) {
    lastAuthKey = authKey;
    void synchroniseAccountData();
  }

  async function synchroniseAccountData() {
    const generation = ++syncGeneration;

    // Never carry one signed-in account's cached dashboard data into another account.
    resetBuyerData();
    resetCreatorData();
    resetAdminData();

    if (!data.user) return;

    try {
      await loadBuyerData(true);
      if (disposed || generation !== syncGeneration) return;

      if (data.profile?.role === 'vendor') await loadCreatorData(true);
      if (disposed || generation !== syncGeneration) return;

    } catch (error) {
      if (!disposed && generation === syncGeneration) {
        showToast(error instanceof Error ? error.message : 'Account data could not be loaded', 'warning');
      }
    }
  }

  onMount(() => {
    mounted = true;
    lastAuthKey = authKey;

    void loadCatalogue().catch((error) => {
      if (!disposed) showToast(error instanceof Error ? error.message : 'Marketplace data could not be loaded', 'warning');
    });
    void synchroniseAccountData();

    let unsubscribe = () => {};
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: listener } = supabase.auth.onAuthStateChange(() => {
        // The server layout will return the new user and role. The reactive authKey
        // above then clears stale stores and fetches the correct account data.
        void invalidate('supabase:auth');
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    } catch {
      // Build and first-run setup may not have environment variables yet.
    }

    return () => {
      disposed = true;
      syncGeneration += 1;
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
