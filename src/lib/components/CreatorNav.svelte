<script lang="ts">
  import { page } from '$app/state';
  import Icon from './Icon.svelte';
  import { creatorProfile } from '$lib/stores/creator';
  import { creatorProducts } from '$lib/stores/creator';

  const links = [
    { href:'/creator', label:'Dashboard', icon:'home' as const },
    { href:'/creator/products', label:'Products', icon:'package' as const },
    { href:'/creator/orders', label:'Orders', icon:'cart' as const },
    { href:'/creator/analytics', label:'Analytics', icon:'chart' as const },
    { href:'/creator/earnings', label:'Earnings', icon:'tag' as const },
    { href:'/creator/storefront', label:'Storefront', icon:'store' as const }
  ];
  const active = (href:string) => href === '/creator' ? page.url.pathname === '/creator' : page.url.pathname.startsWith(href);
</script>

<aside class="creator-nav glass">
  <div class="creator-card">
    <img src={$creatorProfile.avatar} alt=""/>
    <div><span>{$creatorProfile.tier}</span><strong>{$creatorProfile.name}</strong><small>Creator workspace</small></div>
  </div>
  <nav aria-label="Creator dashboard">
    {#each links as link}
      <a href={link.href} class:active={active(link.href)}><Icon name={link.icon} size={18}/><span>{link.label}</span>{#if link.href === '/creator/products'}<b>{$creatorProducts.length}</b>{/if}</a>
    {/each}
  </nav>
  <div class="completion"><div><span>Storefront profile</span><b>{Math.round($creatorProfile.completion)}%</b></div><progress max="100" value={$creatorProfile.completion}></progress><small>{$creatorProfile.completion >= 100 ? 'Storefront complete. Payments are configured separately.' : 'Complete your public storefront details to reach 100%.'}</small></div>
  <a class="view-store" href={$creatorProfile.slug ? `/creators/${$creatorProfile.slug}` : "/creators"}><Icon name="eye" size={17}/> View public store</a>
  <a class="logout" href="/auth/logout"><Icon name="arrow" size={17}/> Sign out</a>
</aside>

<style>
  .creator-nav{position:sticky;top:102px;padding:14px;border-radius:17px}.creator-card{padding:10px 8px 16px;display:flex;gap:10px;align-items:center;border-bottom:1px solid #183352}.creator-card img{width:48px;height:48px;border:1px solid #27547a;border-radius:13px;background:#07152a}.creator-card>div{min-width:0;display:grid}.creator-card span{width:max-content;padding:2px 6px;border-radius:5px;color:#06111b;background:linear-gradient(135deg,#00e5ff,#8b5cf6);font-size:7px;font-weight:950}.creator-card strong{margin-top:4px;font-size:13px}.creator-card small{color:#718096;font-size:9px}.creator-nav nav{padding:12px 0;display:grid;gap:4px}.creator-nav nav a{min-height:44px;padding:0 11px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid transparent;border-radius:9px;color:#8d9bb1;font-size:11px;font-weight:750}.creator-nav nav a:hover{color:#f5f8ff;background:#081224}.creator-nav nav a.active{color:#00e5ff;border-color:#1d4c6b;background:linear-gradient(90deg,rgb(0 229 255/.12),rgb(8 18 36/.3));box-shadow:inset 3px 0 0 #00e5ff}.creator-nav nav b{min-width:19px;height:19px;padding:0 5px;display:grid;place-items:center;border-radius:99px;color:#f5f8ff;background:#15243c;font-size:8px}.completion{padding:14px 10px;border-top:1px solid #183352}.completion>div{display:flex;justify-content:space-between;color:#aab5c8;font-size:9px}.completion progress{width:100%;height:5px;margin:8px 0;border:0;border-radius:99px;overflow:hidden;background:#12243d}.completion progress::-webkit-progress-bar{background:#12243d}.completion progress::-webkit-progress-value{background:linear-gradient(90deg,#00e5ff,#8b5cf6)}.completion small{display:block;color:#718096;font-size:8px;line-height:1.45}.view-store,.logout{min-height:41px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #27547a;border-radius:9px;color:#00e5ff;font-size:10px;font-weight:800}.view-store:hover{background:rgb(0 229 255/.07)}.logout{margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid rgb(255 82 109/.35);border-radius:9px;color:#ff7a9e;font-size:10px;font-weight:800}.logout:hover{background:rgb(255 82 109/.08)}
  @media(max-width:1050px){.creator-nav{position:static;padding:9px;overflow-x:auto;display:flex;align-items:center;gap:8px}.creator-card,.completion,.view-store,.logout{display:none}.creator-nav nav{padding:0;display:flex;gap:6px}.creator-nav nav a{min-width:max-content;grid-template-columns:auto auto auto;padding:0 12px}}
</style>
