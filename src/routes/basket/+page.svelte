<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { assetPrice, getAsset, type LicenceKey } from '$lib/data/marketplace';
  import { cart, removeFromCart, updateCartLicence } from '$lib/stores/marketplace';

  $: lines = $cart.flatMap((line) => {
    const asset = getAsset(line.slug);
    return asset ? [{ ...line, asset }] : [];
  });
  $: subtotal = lines.reduce((sum, line) => sum + assetPrice(line.asset, line.licence), 0);
  $: vendors = new Set(lines.map((line) => line.asset.creatorSlug)).size;

  function changeLicence(slug: string, event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    updateCartLicence(slug, select.value as LicenceKey);
  }
</script>

<svelte:head><title>Your basket — AssetGuru</title></svelte:head>
<section class="basket-head"><div class="content-wrap"><span class="eyebrow">One checkout, multiple creators</span><h1>Your <span class="gradient-text">basket</span></h1><p>Review licences and compatibility before continuing. Digital assets have a quantity of one per licence.</p></div></section>
<section class="section basket-section"><div class="content-wrap">
  {#if lines.length}
    <div class="basket-grid">
      <div class="items">
        <div class="item-head"><strong>{lines.length} {lines.length === 1 ? 'asset' : 'assets'} from {vendors} {vendors === 1 ? 'creator' : 'creators'}</strong><a href="/marketplace">Continue shopping</a></div>
        {#each lines as line}
          <article class="basket-line glass">
            <a class="image" href={`/marketplace/${line.asset.slug}`}><img src={line.asset.image} alt=""/></a>
            <div class="copy"><a href={`/marketplace/${line.asset.slug}`}><h2>{line.asset.title}</h2></a><a class="creator" href={`/creators/${line.asset.creatorSlug}`}>by {line.asset.creator} ✓</a><div class="compat"><span>{line.asset.compatibility}</span><span>{line.asset.downloadSize}</span><span>{line.asset.dependencies === 'None' ? 'No dependencies' : line.asset.dependencies}</span></div><label>Licence<select value={line.licence} onchange={(event) => changeLicence(line.asset.slug, event)}><option value="standard">Standard commercial</option><option value="extended">Extended team</option></select></label></div>
            <div class="line-price"><strong>{line.asset.price === 0 ? 'Free' : `£${assetPrice(line.asset, line.licence).toFixed(2)}`}</strong><button type="button" onclick={() => removeFromCart(line.asset.slug)}><Icon name="trash" size={16}/> Remove</button></div>
          </article>
        {/each}
        <div class="buyer-note glass"><Icon name="shield" size={23}/><div><strong>AssetGuru buyer protection</strong><p>Listings show version, dependencies and package details before purchase. Refund and support requests remain tied to the exact asset version acquired.</p></div></div>
      </div>

      <aside class="summary glass">
        <span class="eyebrow">Order summary</span><h2>Ready to build?</h2><dl><div><dt>Digital assets</dt><dd>£{subtotal.toFixed(2)}</dd></div><div><dt>Delivery</dt><dd>Instant library access</dd></div><div><dt>Estimated VAT</dt><dd>Calculated at checkout</dd></div></dl><div class="total"><span>Total before VAT</span><strong>£{subtotal.toFixed(2)}</strong></div><a class="button button-primary" href="/checkout"><Icon name="lock" size={18}/> Secure checkout</a><small>Payment is completed securely through Stripe Checkout. Tax is calculated from the billing address.</small><div class="payment-marks"><span>STRIPE</span><span>CONNECT</span><span>SSL</span></div>
      </aside>
    </div>
  {:else}
    <div class="empty glass"><span><Icon name="cart" size={42}/></span><h2>Your basket is empty.</h2><p>The dangerous thing about a good asset marketplace is that this condition rarely lasts very long.</p><a class="button button-primary" href="/marketplace">Explore assets</a></div>
  {/if}
</div></section>

<style>
  .basket-head{padding:54px 0 32px;border-bottom:1px solid #183352;background:radial-gradient(circle at 75% 0,rgb(139 92 246/.16),transparent 28rem)}.basket-head h1{margin:12px 0 8px;font-size:clamp(3rem,5vw,5.4rem);letter-spacing:-.06em}.basket-head p{margin:0;color:#aab5c8}.basket-section{padding-top:30px}.basket-grid{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:20px;align-items:start}.item-head{min-height:50px;display:flex;align-items:center;justify-content:space-between}.item-head a{color:#00e5ff;font-size:11px}.basket-line{margin-bottom:12px;padding:13px;border-radius:15px;display:grid;grid-template-columns:220px minmax(0,1fr) auto;gap:18px}.image img{width:100%;height:100%;min-height:155px;object-fit:cover;border-radius:10px}.copy h2{margin:4px 0 5px;font-size:20px}.creator{color:#00e5ff;font-size:10px}.compat{margin:15px 0;display:flex;flex-wrap:wrap;gap:7px}.compat span{padding:5px 8px;border:1px solid #183352;border-radius:99px;color:#718096;background:#050a16;font-size:8px}.copy label{max-width:320px;display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;color:#718096;font-size:10px}.copy select{min-height:38px;padding:0 9px;border:1px solid #183352;border-radius:8px;color:#f5f8ff;background:#050a16}.line-price{padding:6px;display:grid;align-content:space-between;justify-items:end}.line-price strong{color:#00e5ff;font-size:19px}.line-price button{display:flex;align-items:center;gap:6px;border:0;color:#718096;background:transparent;cursor:pointer;font-size:10px}.line-price button:hover{color:#ff526d}.buyer-note{margin-top:18px;padding:18px;border-radius:13px;display:flex;gap:13px;color:#24d89a}.buyer-note strong{color:#f5f8ff}.buyer-note p{margin:5px 0 0;color:#718096;font-size:10px;line-height:1.55}.summary{position:sticky;top:102px;padding:25px;border-radius:16px}.summary h2{margin:10px 0 20px;font-size:28px}.summary dl{margin:0}.summary dl div{padding:11px 0;display:flex;justify-content:space-between;border-top:1px solid #122a43;font-size:11px}.summary dt{color:#718096}.summary dd{margin:0}.total{margin-top:12px;padding:17px 0;display:flex;align-items:end;justify-content:space-between;border-top:1px solid #27547a}.total span{color:#aab5c8}.total strong{color:#00e5ff;font-size:28px}.summary .button{width:100%}.summary>small{display:block;margin-top:11px;color:#718096;text-align:center;line-height:1.5}.payment-marks{margin-top:16px;display:flex;justify-content:center;gap:8px}.payment-marks span{padding:5px 8px;border:1px solid #183352;border-radius:6px;color:#718096;font-size:8px;font-weight:900;letter-spacing:.08em}.empty{max-width:760px;margin:0 auto;padding:75px 28px;border-radius:18px;text-align:center}.empty>span{width:74px;height:74px;margin:0 auto 18px;display:grid;place-items:center;border:1px solid #27547a;border-radius:50%;color:#00e5ff;background:rgb(0 229 255/.07)}.empty h2{font-size:32px}.empty p{color:#aab5c8}.empty .button{display:inline-flex;width:auto;margin-top:12px}
  @media(max-width:1050px){.basket-grid{grid-template-columns:1fr}.summary{position:static}.basket-line{grid-template-columns:180px 1fr auto}}
  @media(max-width:680px){.basket-line{grid-template-columns:110px 1fr}.image img{min-height:100px}.line-price{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between}.compat{display:none}.copy label{grid-template-columns:1fr}.basket-head{padding-top:36px}.empty .button{width:100%}}
</style>
