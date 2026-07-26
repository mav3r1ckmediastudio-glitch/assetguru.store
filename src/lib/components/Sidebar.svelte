<script lang="ts">
  import { page } from '$app/state';
  import { cartCount } from '$lib/stores/marketplace';
  import { authUser, currentProfile, currentVendorProfile } from '$lib/stores/session';
  import BrandMark from './BrandMark.svelte';
  import Icon from './Icon.svelte';

  const items = [
    { href: '/', label: 'Home', icon: 'home' as const },
    { href: '/marketplace', label: 'Browse', icon: 'browse' as const },
    { href: '/deals', label: 'Bundles', icon: 'bundle' as const },
    { href: '/marketplace?price=free', label: 'Freebies', icon: 'gift' as const },
    { href: '/basket', label: 'Basket', icon: 'cart' as const },
    { href: '/favourites', label: 'Favourites', icon: 'heart' as const },
    { href: '/library', label: 'Library', icon: 'library' as const }
  ];

  function isActive(href: string) {
    const path = href.split('?')[0];
    return path === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(path);
  }
</script>

<aside class="sidebar" aria-label="Primary">
  <a class="logo-slot" href="/" aria-label="AssetGuru home"><BrandMark compact size={44}/></a>
  <nav>
    {#each items as item}
      <a href={item.href} class:active={isActive(item.href)} aria-current={isActive(item.href) ? 'page' : undefined}>
        <span class="icon"><Icon name={item.icon} size={23}/>{#if item.href === '/basket' && $cartCount > 0}<b>{$cartCount}</b>{/if}</span><span>{item.label}</span>
      </a>
    {/each}
    {#if $currentProfile?.role === 'vendor'}<a href="/creator" class:active={isActive('/creator')} aria-current={isActive('/creator') ? 'page' : undefined}><span class="icon"><Icon name="store" size={23}/></span><span>Creator</span></a>{/if}
    {#if $currentProfile?.role === 'admin'}<a href="/admin" class:active={isActive('/admin')} aria-current={isActive('/admin') ? 'page' : undefined}><span class="icon"><Icon name="shield" size={23}/></span><span>Admin</span></a>{/if}
  </nav>
  <a class="profile" href={$authUser ? ($currentProfile?.role === 'vendor' ? '/creator' : '/account') : '/auth/login'} title={$authUser ? 'Open account' : 'Sign in'}><span>{String($currentVendorProfile?.display_name ?? $currentProfile?.display_name ?? 'A').slice(0,1).toUpperCase()}</span><small>{$authUser ? String($currentVendorProfile?.display_name ?? $currentProfile?.display_name ?? 'Account').slice(0,10) : 'Sign in'}</small></a>
</aside>

<style>
  .sidebar { position: fixed; inset: 0 auto 0 0; z-index: 50; width: 88px; background: rgb(3 7 17 / .96); border-right: 1px solid #183352; display: flex; flex-direction: column; align-items: center; }.logo-slot { height: 82px; width: 100%; display: grid; place-items: center; border-bottom: 1px solid #183352; }nav { width: 100%; padding: 13px 9px; display: grid; gap: 5px; }nav a { min-height: 58px; display: grid; place-items: center; align-content: center; gap: 4px; border: 1px solid transparent; border-radius: 10px; color: #718096; font-size: 9px; font-weight: 650; transition: 170ms ease; }nav a:hover { color: #f5f8ff; background: #081224; border-color: #183352; }nav a.active { color: #00e5ff; background: linear-gradient(90deg, rgb(0 229 255 / .14), rgb(8 18 36 / .88)); border-color: #00b7d5; box-shadow: 0 0 22px rgb(0 229 255 / .12), inset 3px 0 0 #00e5ff; }.icon{position:relative;display:grid}.icon b{position:absolute;top:-8px;right:-10px;min-width:17px;height:17px;padding:0 4px;display:grid;place-items:center;border-radius:99px;color:#fff;background:#ff3fd8;border:2px solid #030711;font-size:8px}.profile { margin-top: auto; margin-bottom: 18px; display: grid; justify-items: center; gap: 5px; color: #718096; font-size: 10px; }.profile>span { width: 31px; height: 31px; display: grid; place-items: center; border: 1px solid #27547a; border-radius: 50%; color: #00e5ff; background: #081224; font-weight: 800; }
  @media (max-width: 900px) { .sidebar { display: none; } }
</style>
