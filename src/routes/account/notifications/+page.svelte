<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { apiRequest } from '$lib/api';
  import { buyerNotifications, loadBuyerData } from '$lib/stores/buyer';
  import { showToast } from '$lib/stores/marketplace';

  $: unread = $buyerNotifications.filter((item) => !item.read_at).length;
  const formatted = (value:string) => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  async function markRead(id?:string, all=false) {
    try {
      await apiRequest('/api/notifications',{method:'PATCH',body:JSON.stringify(all?{all:true}:{id})});
      await loadBuyerData(true);
    } catch(error) { showToast(error instanceof Error?error.message:'Notification could not be updated','warning'); }
  }
</script>

<svelte:head><title>Notifications — AssetGuru</title></svelte:head>
<header class="page-head"><div><span class="eyebrow">Account activity</span><h1>Your <span class="gradient-text">notifications.</span></h1><p>Purchases, support, moderation and account events from the live marketplace.</p></div>{#if unread}<button class="button button-secondary" type="button" onclick={() => markRead(undefined,true)}><Icon name="check" size={16}/> Mark all read</button>{/if}</header>
<section class="notice-list glass">
  {#if $buyerNotifications.length}
    {#each $buyerNotifications as item}
      <article class:unread={!item.read_at}>
        <i><Icon name={item.type==='purchase'?'package':item.type==='refund'?'alert':item.type==='success'?'check':'bell'} size={19}/></i>
        <div><b>{item.title}</b><p>{item.body}</p><small>{formatted(item.created_at)}</small></div>
        <div class="actions">{#if item.href}<a href={item.href}>Open</a>{/if}{#if !item.read_at}<button type="button" onclick={() => markRead(item.id)}>Mark read</button>{/if}</div>
      </article>
    {/each}
  {:else}
    <div class="empty"><Icon name="bell" size={31}/><b>No notifications yet</b><p>New purchase, support and account events will appear here.</p></div>
  {/if}
</section>
<style>
  .page-head{margin-bottom:18px;display:flex;justify-content:space-between;gap:20px;align-items:end}.page-head h1{margin:6px 0;font-size:clamp(30px,4vw,48px)}.page-head p{max-width:680px;color:#8d9bb1}.notice-list{padding:10px;border-radius:17px}.notice-list article{padding:17px;display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:start;border-bottom:1px solid #183352;opacity:.72}.notice-list article:last-child{border:0}.notice-list article.unread{opacity:1;background:linear-gradient(90deg,rgb(0 229 255/.07),transparent);border-radius:11px}.notice-list i{width:38px;height:38px;display:grid;place-items:center;border:1px solid #27547a;border-radius:10px;color:#00e5ff;background:#07152a}.notice-list div{min-width:0}.notice-list b{font-size:13px}.notice-list p{margin:5px 0;color:#aab5c8;font-size:11px;line-height:1.5}.notice-list small{color:#64748b;font-size:9px}.actions{display:flex;gap:7px;align-items:center}.actions a,.actions button{padding:8px 10px;border:1px solid #27547a;border-radius:8px;color:#00e5ff;background:transparent;font-size:9px;font-weight:800}.empty{padding:70px 20px;text-align:center;color:#718096}.empty :global(svg){margin:auto;color:#00e5ff}.empty b{display:block;margin-top:12px;color:#f5f8ff}.empty p{margin:6px auto;max-width:420px}@media(max-width:700px){.page-head{align-items:start;flex-direction:column}.notice-list article{grid-template-columns:auto 1fr}.actions{grid-column:2;justify-content:flex-start}}
</style>
