<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { assetPrice, getAsset } from '$lib/data/marketplace';
  import { loadBuyerData } from '$lib/stores/buyer';
  import { cart, clearCart, showToast } from '$lib/stores/marketplace';
  import { platformSettings } from '$lib/stores/admin';
  import { apiRequest } from '$lib/api';

  let accepted = false;
  let submitting = false;
  let completed = false;
  $: lines = $cart.flatMap((line) => {
    const asset = getAsset(line.slug);
    return asset ? [{ ...line, asset }] : [];
  });
  $: subtotal = lines.reduce((sum, line) => sum + assetPrice(line.asset, line.licence), 0);

  onMount(async () => {
    if (page.url.searchParams.has('session_id') || page.url.searchParams.has('order')) {
      completed = true;
      clearCart();
      try { await loadBuyerData(true); } catch { /* Webhook may still be completing. */ }
    }
  });

  async function beginCheckout() {
    if ($platformSettings.maintenanceMode) { showToast('Purchasing is paused during maintenance', 'warning'); return; }
    if (!lines.length || !accepted || submitting) return;
    submitting = true;
    try {
      const response = await apiRequest<{url:string}>('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ lines: $cart.map(({ slug, licence }) => ({ slug, licence })) })
      });
      window.location.assign(response.url);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Checkout could not be started', 'warning');
      submitting = false;
    }
  }
</script>

<svelte:head><title>Checkout — AssetGuru</title></svelte:head>
<section class="checkout section"><div class="content-wrap">
  {#if completed}
    <div class="success glass"><span><Icon name="check" size={42}/></span><h1>Payment received.</h1><p>Stripe is confirming the order and unlocking the purchased versions in your library. This normally completes immediately through the signed webhook.</p><div class="success-summary"><span><b>{lines.length || '—'}</b><small>assets</small></span><span><b>Secure</b><small>Stripe checkout</small></span><span><b>Automatic</b><small>library access</small></span></div><div class="success-actions"><a class="button button-primary" href="/library"><Icon name="library" size={18}/> Open your library</a><a class="button button-secondary" href="/account/orders"><Icon name="cart" size={18}/> View orders</a></div></div>
  {:else if lines.length}
    <div class="checkout-head"><a href="/basket">← Back to basket</a><span class="eyebrow">Secure marketplace checkout</span><h1>Complete your <span class="gradient-text">order.</span></h1><p>Review the selected licences, accept the terms and continue to Stripe’s hosted payment page.</p></div>
    <div class="steps"><span class="active"><b>1</b> Review</span><i></i><span class="active"><b>2</b> Stripe</span><i></i><span><b>3</b> Library access</span></div>
    {#if $platformSettings.maintenanceMode}<div class="maintenance-banner glass"><Icon name="alert" size={20}/><span><b>Purchasing is temporarily paused</b><small>Your basket is safe. Existing library downloads remain available.</small></span></div>{/if}
    <div class="checkout-grid">
      <form class="checkout-form" onsubmit={(event) => {event.preventDefault(); beginCheckout();}}>
        <section class="panel glass"><div class="panel-title"><span>01</span><div><h2>Payment</h2><p>Card details and supported wallets are handled by Stripe.</p></div></div><div class="hosted-payment"><Icon name="lock" size={19}/><div><b>Hosted Stripe Checkout</b><small>AssetGuru never stores raw card details. Billing address, tax and payment confirmation are collected securely by Stripe.</small></div></div></section>
        <section class="panel glass"><div class="panel-title"><span>02</span><div><h2>Licence agreement</h2><p>Each item is recorded against your account and purchased version.</p></div></div><label class="check"><input type="checkbox" bind:checked={accepted} required/><span>I agree to the AssetGuru buyer terms and the selected Standard or Extended licence for each asset.</span></label><div class="licence-note"><Icon name="shield" size={19}/><span><b>Version-aware entitlement</b><small>Approved updates remain available from your library while the purchase and licence stay auditable.</small></span></div></section>
        <button class="button button-primary place" type="submit" disabled={!accepted || submitting || $platformSettings.maintenanceMode}><Icon name="shield" size={18}/>{submitting ? 'Opening Stripe…' : `Continue to secure checkout · £${subtotal.toFixed(2)}`}</button>
      </form>
      <aside class="order glass"><h2>Order summary</h2>{#each lines as line}<div class="order-line"><img src={line.asset.image} alt=""/><span><b>{line.asset.title}</b><small>{line.asset.creator} · {line.licence === 'extended' ? 'Extended' : 'Standard'} licence · v{line.asset.version}</small></span><strong>{line.asset.price === 0 ? 'Free' : `£${assetPrice(line.asset, line.licence).toFixed(2)}`}</strong></div>{/each}<dl><div><dt>Subtotal</dt><dd>£{subtotal.toFixed(2)}</dd></div><div><dt>Tax</dt><dd>Calculated by Stripe</dd></div><div><dt>Delivery</dt><dd>Secure library</dd></div></dl><div class="total"><span>Before tax</span><strong>£{subtotal.toFixed(2)}</strong></div><div class="secure"><Icon name="lock" size={18}/><span><b>Marketplace-safe allocation</b><small>One buyer payment, item-level entitlements, commission records and vendor transfers.</small></span></div></aside>
    </div>
  {:else}
    <div class="success glass"><span><Icon name="cart" size={40}/></span><h1>There is nothing to check out.</h1><p>Add an asset to the basket first, or open your buyer library to see previous purchases.</p><div class="success-actions"><a class="button button-primary" href="/marketplace">Browse marketplace</a><a class="button button-secondary" href="/library">Open library</a></div></div>
  {/if}
</div></section>

<style>
  .checkout{padding-top:42px}.maintenance-banner{margin-bottom:16px;padding:14px;display:flex;gap:10px;align-items:center;border:1px solid rgb(255 181 71/.35);border-radius:12px;color:#ffb547;background:rgb(255 181 71/.07)}.maintenance-banner span{display:grid}.maintenance-banner b{color:#f5f8ff}.maintenance-banner small{margin-top:3px;color:#aab5c8}.checkout-head{margin-bottom:21px}.checkout-head>a{color:#718096;font-size:11px}.checkout-head>a:hover{color:#00e5ff}.checkout-head .eyebrow{display:flex;width:fit-content;margin-top:27px}.checkout-head h1{margin:12px 0 8px;font-size:clamp(3rem,5vw,5.3rem);letter-spacing:-.06em}.checkout-head p{color:#aab5c8}.steps{margin-bottom:20px;display:flex;align-items:center;justify-content:center;gap:10px}.steps span{display:flex;align-items:center;gap:7px;color:#718096;font-size:8px;font-weight:800;text-transform:uppercase}.steps span.active{color:#00e5ff}.steps b{width:25px;height:25px;display:grid;place-items:center;border:1px solid #183352;border-radius:50%}.steps span.active b{border-color:#00e5ff;background:rgb(0 229 255/.08)}.steps i{width:65px;height:1px;background:#183352}.checkout-grid{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:20px;align-items:start}.checkout-form{display:grid;gap:14px}.panel{padding:24px;border-radius:16px}.panel-title{margin-bottom:20px;display:flex;gap:12px;align-items:center}.panel-title>span{width:34px;height:34px;display:grid;place-items:center;border:1px solid #00e5ff;border-radius:9px;color:#00e5ff;background:rgb(0 229 255/.07);font-size:10px;font-weight:900}.panel-title h2{margin:0;font-size:20px}.panel-title p{margin:3px 0 0;color:#718096;font-size:10px}.panel>label,.two label{display:grid;gap:7px;color:#aab5c8;font-size:10px;font-weight:750}.panel input:not([type='radio']):not([type='checkbox']),.panel select{min-height:45px;padding:0 12px;border:1px solid #183352;border-radius:9px;outline:0;color:#f5f8ff;background:#050a16}.panel input:focus,.panel select:focus{border-color:#00e5ff}.two{margin:13px 0;display:grid;grid-template-columns:1fr 1fr;gap:12px}.account-note,.licence-note{margin-top:13px;padding:13px;display:flex;gap:10px;border:1px solid #183352;border-radius:9px;color:#8b5cf6;background:#050a16}.account-note span,.licence-note span{display:grid}.account-note b,.licence-note b{color:#f5f8ff;font-size:10px}.account-note small,.licence-note small{margin-top:3px;color:#718096;font-size:8px;line-height:1.45}.payment-choice{display:grid;gap:9px}.payment-choice label{padding:14px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;border:1px solid #183352;border-radius:10px;background:#050a16;cursor:pointer}.payment-choice label.active{border-color:#00e5ff;background:rgb(0 229 255/.06)}.payment-choice input{accent-color:#00e5ff}.payment-choice span{display:grid}.payment-choice b{font-size:12px}.payment-choice small{color:#718096}.payment-choice em{color:#00e5ff;font-size:9px;font-style:normal;font-weight:900;letter-spacing:.08em}.hosted-payment{margin-top:13px;padding:14px;display:flex;gap:10px;border:1px dashed #27547a;border-radius:10px;color:#8b5cf6}.hosted-payment>div{display:grid}.hosted-payment b{color:#f5f8ff;font-size:11px}.hosted-payment small{margin-top:4px;color:#718096;line-height:1.5}.check{grid-template-columns:auto 1fr!important;align-items:start!important;line-height:1.55}.check input{margin-top:3px;accent-color:#00e5ff}.place{width:100%;min-height:54px;font-size:14px}.place:disabled{opacity:.45;cursor:not-allowed;transform:none}.order{position:sticky;top:102px;padding:23px;border-radius:16px}.order h2{margin-top:0}.order-line{padding:13px 0;display:grid;grid-template-columns:68px 1fr auto;gap:10px;align-items:center;border-top:1px solid #122a43}.order-line img{width:68px;aspect-ratio:16/10;object-fit:cover;border-radius:7px}.order-line span{display:grid}.order-line b{font-size:10px}.order-line small{color:#718096;font-size:8px;line-height:1.4}.order-line strong{color:#00e5ff;font-size:11px}.order dl{margin:12px 0 0}.order dl div{padding:10px 0;display:flex;justify-content:space-between;border-top:1px solid #122a43;font-size:10px}.order dt{color:#718096}.order dd{margin:0}.total{padding:16px 0;display:flex;align-items:end;justify-content:space-between;border-top:1px solid #27547a}.total strong{color:#00e5ff;font-size:27px}.secure{padding:14px;display:flex;gap:10px;border:1px solid #183352;border-radius:10px;color:#24d89a;background:#050a16}.secure span{display:grid}.secure b{color:#f5f8ff;font-size:10px}.secure small{margin-top:3px;color:#718096;font-size:8px;line-height:1.45}.success{max-width:850px;margin:55px auto;padding:72px 34px;border-radius:19px;text-align:center}.success>span{width:82px;height:82px;margin:0 auto 18px;display:grid;place-items:center;border:1px solid #24d89a;border-radius:50%;color:#031018;background:#24d89a;box-shadow:0 0 40px rgb(36 216 154/.25)}.success>small{color:#00e5ff;text-transform:uppercase;letter-spacing:.1em}.success h1{font-size:clamp(2.5rem,5vw,4.6rem);letter-spacing:-.06em}.success p{max-width:650px;margin:0 auto 24px;color:#aab5c8;line-height:1.7}.success-summary{max-width:580px;margin:0 auto 25px;display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid #183352}.success-summary span{padding:14px;display:grid}.success-summary b{font-size:18px}.success-summary small{color:#718096;font-size:8px}.success-actions{display:flex;justify-content:center;gap:10px}.success .button{width:auto}
  @media(max-width:980px){.checkout-grid{grid-template-columns:1fr}.order{position:static;grid-row:1}.checkout-form{grid-row:2}}@media(max-width:600px){.two{grid-template-columns:1fr}.payment-choice label{grid-template-columns:auto 1fr}.payment-choice em{grid-column:2}.success-actions{display:grid}.success .button{width:100%}.steps i{width:18px}.steps span{font-size:0}.steps span b{font-size:8px}.success-summary{grid-template-columns:1fr}}
</style>
