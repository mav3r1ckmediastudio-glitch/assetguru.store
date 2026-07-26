<script lang="ts">
  import { page } from '$app/state';
  import Icon from './Icon.svelte';
  import { buyerProfile, availableUpdates, pendingReviewAssets, supportTickets, buyerNotifications } from '$lib/stores/buyer';

  const links = [
    { href:'/account', label:'Overview', icon:'home' as const },
    { href:'/library', label:'Library', icon:'library' as const },
    { href:'/account/orders', label:'Orders', icon:'cart' as const },
    { href:'/account/updates', label:'Updates', icon:'download' as const },
    { href:'/account/reviews', label:'Reviews', icon:'star' as const },
    { href:'/account/support', label:'Support', icon:'support' as const },
    { href:'/account/notifications', label:'Notifications', icon:'bell' as const },
    { href:'/account/settings', label:'Settings', icon:'sliders' as const }
  ];
  const active = (href:string) => href === '/account' ? page.url.pathname === '/account' : page.url.pathname.startsWith(href);
  $: openTickets = $supportTickets.filter((ticket) => ticket.status !== 'Resolved').length;
</script>

<aside class="buyer-nav glass">
  <div class="buyer-card">
    <i class={`avatar ${$buyerProfile.avatarTone}`}>{$buyerProfile.initials}</i>
    <div><span>Buyer account</span><strong>{$buyerProfile.name}</strong><small>{$buyerProfile.studio}</small></div>
  </div>
  <nav aria-label="Buyer account">
    {#each links as link}
      <a href={link.href} class:active={active(link.href)}>
        <Icon name={link.icon} size={18}/><span>{link.label}</span>
        {#if link.href === '/account/updates' && $availableUpdates.length}<b>{$availableUpdates.length}</b>{/if}
        {#if link.href === '/account/reviews' && $pendingReviewAssets.length}<b>{$pendingReviewAssets.length}</b>{/if}
        {#if link.href === '/account/support' && openTickets}<b>{openTickets}</b>{/if}
        {#if link.href === '/account/notifications' && $buyerNotifications.filter((item)=>!item.read_at).length}<b>{$buyerNotifications.filter((item)=>!item.read_at).length}</b>{/if}
      </a>
    {/each}
  </nav>
  <div class="protection"><Icon name="shield" size={20}/><span><b>Buyer protection</b><small>Orders, licences and support are tied to your account.</small></span></div>
  <a class="market" href="/marketplace"><Icon name="browse" size={17}/> Explore marketplace</a>
</aside>

<style>
  .buyer-nav{position:sticky;top:102px;padding:14px;border-radius:17px}.buyer-card{padding:10px 8px 16px;display:flex;gap:11px;align-items:center;border-bottom:1px solid #183352}.avatar{width:48px;height:48px;display:grid;place-items:center;border:1px solid #27547a;border-radius:14px;color:#031018;font-style:normal;font-size:13px;font-weight:950}.avatar.cyan{background:linear-gradient(135deg,#00e5ff,#24d89a)}.avatar.violet{background:linear-gradient(135deg,#8b5cf6,#00e5ff)}.avatar.magenta{background:linear-gradient(135deg,#ff3fd8,#8b5cf6)}.buyer-card>div{min-width:0;display:grid}.buyer-card span{color:#00e5ff;font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.1em}.buyer-card strong{margin-top:4px;font-size:13px}.buyer-card small{color:#718096;font-size:8px}.buyer-nav nav{padding:12px 0;display:grid;gap:4px}.buyer-nav nav a{min-height:44px;padding:0 11px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid transparent;border-radius:9px;color:#8d9bb1;font-size:11px;font-weight:750}.buyer-nav nav a:hover{color:#f5f8ff;background:#081224}.buyer-nav nav a.active{color:#00e5ff;border-color:#1d4c6b;background:linear-gradient(90deg,rgb(0 229 255/.12),rgb(8 18 36/.3));box-shadow:inset 3px 0 0 #00e5ff}.buyer-nav nav b{min-width:19px;height:19px;padding:0 5px;display:grid;place-items:center;border-radius:99px;color:#f5f8ff;background:#7c3aed;font-size:8px}.protection{padding:14px 10px;display:flex;gap:9px;border-top:1px solid #183352;color:#24d89a}.protection span{display:grid}.protection b{color:#f5f8ff;font-size:9px}.protection small{margin-top:3px;color:#718096;font-size:8px;line-height:1.4}.market{min-height:41px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #27547a;border-radius:9px;color:#00e5ff;font-size:10px;font-weight:800}.market:hover{background:rgb(0 229 255/.07)}
  @media(max-width:1050px){.buyer-nav{position:static;padding:9px;overflow-x:auto;display:flex;align-items:center;gap:8px}.buyer-card,.protection,.market{display:none}.buyer-nav nav{padding:0;display:flex;gap:6px}.buyer-nav nav a{min-width:max-content;grid-template-columns:auto auto auto;padding:0 12px}}
</style>
