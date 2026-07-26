<script lang="ts">
  import { page } from '$app/state';
  import { cartCount } from '$lib/stores/marketplace';
  import { authUser, currentProfile } from '$lib/stores/session';
  import BrandMark from './BrandMark.svelte';
  import Icon from './Icon.svelte';

  let open = false;
  const links = [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/categories', label: 'Categories' },
    { href: '/creators', label: 'Top creators' },
    { href: '/deals', label: 'Deals' },
    { href: '/community', label: 'Community' },
    { href: '/support', label: 'Support' }
  ];

  const active = (href: string) => page.url.pathname.startsWith(href);
</script>

<header class="topbar">
  <a class="mobile-brand" href="/" aria-label="AssetGuru home"><BrandMark size={40}/></a>
  <nav class="desktop-nav" aria-label="Main navigation">
    {#each links as link}
      <a href={link.href} class:active={active(link.href)}>{link.label}</a>
    {/each}
  </nav>
  <div class="actions">
    <a class="icon-button desktop-action" class:active={active('/favourites')} href="/favourites" aria-label="Favourites"><Icon name="heart" size={19}/></a>
    <a class="icon-button desktop-action badge-wrap" class:active={active('/basket')} href="/basket" aria-label={`Basket, ${$cartCount} items`}><Icon name="cart" size={19}/>{#if $cartCount > 0}<span>{$cartCount}</span>{/if}</a>
    {#if $authUser}<a class="icon-button desktop-action" class:active={active('/account/notifications')} href="/account/notifications" aria-label="Notifications"><Icon name="bell" size={19}/></a>{/if}
    <a class="icon-button desktop-action" class:active={active('/account') || active('/library')} href={$authUser ? '/account' : '/auth/login'} aria-label="Buyer account"><Icon name="user" size={19}/></a>
    {#if $currentProfile?.role === 'admin'}<a class="icon-button desktop-action admin-access" class:active={active('/admin')} href="/admin" aria-label="Admin control centre"><Icon name="shield" size={19}/></a>{/if}
    <a class="button button-secondary sign-in" href={$authUser ? '/account' : '/auth/login'}>{$authUser ? 'My account' : 'Sign in'}</a>
    <a class="button button-promo sell" href={$currentProfile?.role === 'vendor' ? '/creator' : '/auth/signup?role=vendor'}>{$currentProfile?.role === 'vendor' ? 'Creator hub' : 'Sell assets'}</a>
    <button class="icon-button menu" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onclick={() => open = !open}>
      <Icon name={open ? 'close' : 'menu'} size={22}/>
    </button>
  </div>
</header>

{#if open}
  <div class="mobile-menu glass">
    {#each links as link}
      <a href={link.href} class:active={active(link.href)} onclick={() => open = false}>{link.label}</a>
    {/each}
    <a href="/favourites" onclick={() => open = false}>Favourites</a>
    <a href="/basket" onclick={() => open = false}>Basket {#if $cartCount}({$cartCount}){/if}</a>
    {#if $authUser}<a href="/account" onclick={() => open = false}>Buyer dashboard</a><a href="/account/notifications" onclick={() => open = false}>Notifications</a><a href="/library" onclick={() => open = false}>My library</a>{:else}<a href="/auth/login" onclick={() => open = false}>Sign in</a><a href="/auth/signup" onclick={() => open = false}>Create account</a>{/if}
    {#if $currentProfile?.role === 'admin'}<a href="/admin" onclick={() => open = false}>Admin control centre</a>{/if}
    <a class="button button-promo" href={$currentProfile?.role === 'vendor' ? '/creator' : '/auth/signup?role=vendor'} onclick={() => open = false}>{$currentProfile?.role === 'vendor' ? 'Open creator hub' : 'Become a creator'}</a>
    {#if $authUser}<a href="/auth/logout" onclick={() => open = false}>Sign out</a>{/if}
  </div>
{/if}

<style>
  .topbar { position: fixed; z-index: 45; top: 0; right: 0; left: 88px; height: 82px; padding: 0 26px; display: flex; align-items: center; justify-content: space-between; gap: 24px; background: rgb(2 4 13 / .88); backdrop-filter: blur(18px); border-bottom: 1px solid #183352; }
  .mobile-brand { display: none; }.desktop-nav { display: flex; align-self: stretch; align-items: center; gap: clamp(16px, 2.3vw, 38px); }.desktop-nav a { position: relative; display: grid; place-items: center; height: 100%; color: #aab5c8; font-size: 14px; font-weight: 650; white-space: nowrap; }.desktop-nav a::after { content: ''; position: absolute; right: 25%; bottom: 0; left: 25%; height: 2px; background: #00e5ff; box-shadow: 0 0 14px #00e5ff; transform: scaleX(0); transition: 180ms ease; }.desktop-nav a:hover, .desktop-nav a.active { color: #00e5ff; }.desktop-nav a.active::after { transform: scaleX(1); }
  .actions { display: flex; align-items: center; gap: 9px; }.actions .icon-button.active{color:#00e5ff;border-color:#00e5ff}.actions .admin-access.active{color:#ff3fd8;border-color:#ff3fd8}.badge-wrap { position: relative; }.badge-wrap span { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px; display: grid; place-items: center; border-radius: 99px; color: white; background: #ff3fd8; border: 2px solid #02040d; font-size: 9px; font-weight: 800; }.sign-in, .sell { min-height: 44px; padding-inline: 17px; font-size: 13px; }.menu { display: none; }
  .mobile-menu { position: fixed; z-index: 44; top: 74px; right: 12px; left: 12px; padding: 14px; border-radius: 15px; display: grid; gap: 4px; }.mobile-menu > a:not(.button) { padding: 13px 14px; border-radius: 9px; color: #aab5c8; font-weight: 700; }.mobile-menu > a.active, .mobile-menu > a:hover { color: #00e5ff; background: #0c1930; }
  @media (max-width: 1180px) { .desktop-nav { gap: 18px; }.desktop-nav a { font-size: 13px; }.sell { display: none; } }
  @media (max-width: 900px) { .topbar { left: 0; height: 74px; padding: 0 14px; }.mobile-brand { display: block; }.desktop-nav, .desktop-action, .sign-in { display: none; }.menu { display: inline-grid; } }
</style>
