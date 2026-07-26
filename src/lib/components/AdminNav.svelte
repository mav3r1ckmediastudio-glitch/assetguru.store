<script lang="ts">
  import { page } from '$app/state';
  import Icon from './Icon.svelte';
  import { adminCounts } from '$lib/stores/admin';

  const links = [
    { href:'/admin', label:'Control centre', icon:'home' as const },
    { href:'/admin/moderation', label:'Moderation', icon:'shield' as const, count:'moderation' as const },
    { href:'/admin/vendors', label:'Vendors', icon:'store' as const, count:'vendors' as const },
    { href:'/admin/catalogue', label:'Catalogue', icon:'package' as const },
    { href:'/admin/cases', label:'Cases & disputes', icon:'alert' as const, count:'cases' as const },
    { href:'/admin/reports', label:'Reports', icon:'chart' as const },
    { href:'/admin/audit', label:'Audit log', icon:'list' as const },
    { href:'/admin/settings', label:'Settings', icon:'sliders' as const }
  ];
  const active = (href:string) => href === '/admin' ? page.url.pathname === '/admin' : page.url.pathname.startsWith(href);
  const badgeCount = (key?: 'moderation'|'vendors'|'cases') => key ? $adminCounts[key] : 0;
</script>

<aside class="admin-nav glass">
  <div class="identity">
    <i><Icon name="shield" size={23}/></i>
    <div><span>AssetGuru operations</span><strong>Admin control</strong><small>Full platform access</small></div>
  </div>
  <nav aria-label="Administration">
    {#each links as link}
      <a href={link.href} class:active={active(link.href)}>
        <Icon name={link.icon} size={18}/><span>{link.label}</span>
        {#if badgeCount(link.count) > 0}<b class:urgent={link.count === 'cases' && $adminCounts.urgent > 0}>{badgeCount(link.count)}</b>{/if}
      </a>
    {/each}
  </nav>
  <div class="system"><span class="pulse"></span><div><b>Service monitoring</b><small>Review Supabase, Stripe and Netlify status dashboards</small></div></div>
  <a class="exit" href="/"><Icon name="arrow" size={16}/> Return to marketplace</a>
  <a class="logout" href="/auth/logout"><Icon name="lock" size={16}/> Sign out of admin</a>
</aside>

<style>
  .admin-nav{position:sticky;top:102px;padding:14px;border-radius:17px}.identity{padding:10px 8px 16px;display:flex;gap:11px;align-items:center;border-bottom:1px solid #183352}.identity>i{width:48px;height:48px;display:grid;place-items:center;border:1px solid rgb(255 63 216/.45);border-radius:14px;color:#ff3fd8;background:linear-gradient(135deg,rgb(139 92 246/.2),rgb(255 63 216/.1));box-shadow:0 0 24px rgb(255 63 216/.12);font-style:normal}.identity>div{min-width:0;display:grid}.identity span{color:#ff3fd8;font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.1em}.identity strong{margin-top:4px;font-size:13px}.identity small{color:#718096;font-size:8px}.admin-nav nav{padding:12px 0;display:grid;gap:4px}.admin-nav nav a{min-height:44px;padding:0 11px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid transparent;border-radius:9px;color:#8d9bb1;font-size:11px;font-weight:750}.admin-nav nav a:hover{color:#f5f8ff;background:#081224}.admin-nav nav a.active{color:#ff3fd8;border-color:rgb(255 63 216/.3);background:linear-gradient(90deg,rgb(255 63 216/.11),rgb(8 18 36/.3));box-shadow:inset 3px 0 0 #ff3fd8}.admin-nav nav b{min-width:20px;height:20px;padding:0 5px;display:grid;place-items:center;border-radius:99px;color:#f5f8ff;background:#7c3aed;font-size:8px}.admin-nav nav b.urgent{background:#ff526d}.system{padding:14px 9px;display:flex;gap:9px;align-items:flex-start;border-top:1px solid #183352}.pulse{width:8px;height:8px;margin-top:3px;border-radius:50%;background:#24d89a;box-shadow:0 0 12px #24d89a;animation:pulse 2s infinite}.system div{display:grid}.system b{font-size:9px}.system small{margin-top:4px;color:#718096;font-size:7px;line-height:1.4}.exit,.logout{min-height:41px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid #27547a;border-radius:9px;color:#00e5ff;font-size:10px;font-weight:800}.exit :global(svg){transform:rotate(180deg)}.exit:hover{background:rgb(0 229 255/.07)}.logout{margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid rgb(255 82 109/.35);border-radius:9px;color:#ff7a9e;font-size:10px;font-weight:800}.logout:hover{background:rgb(255 82 109/.08)}
  @media(max-width:1050px){.admin-nav{position:static;padding:9px;overflow-x:auto;display:flex;align-items:center;gap:8px}.identity,.system,.exit,.logout{display:none}.admin-nav nav{padding:0;display:flex;gap:6px}.admin-nav nav a{min-width:max-content;grid-template-columns:auto auto auto;padding:0 12px}}
</style>
