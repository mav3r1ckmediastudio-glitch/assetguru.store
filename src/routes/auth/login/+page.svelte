<script lang="ts">
  export let data;
  export let form;
  let destination=form?.destination??data.destination??'buyer';
</script>
<svelte:head><title>Sign in — AssetGuru</title></svelte:head>
<section class="auth section">
  <form class="auth-card glass" method="POST">
    <span class="eyebrow">Welcome back</span>
    <h1>Sign in to <span class="gradient-text">AssetGuru.</span></h1>
    <p>Choose where you want to go after signing in. Creator accounts can still use the buyer area.</p>
    {#if form?.message}<div class="auth-error">{form.message}</div>{/if}
    <input type="hidden" name="next" value={form?.next??data.next}/>
    <div class="destination-choice" aria-label="Choose account area">
      <label class:active={destination==='buyer'}>
        <input type="radio" name="destination" bind:group={destination} value="buyer"/>
        <span><b>Buyer account</b><small>Library, orders, favourites and support</small></span>
      </label>
      <label class:active={destination==='creator'}>
        <input type="radio" name="destination" bind:group={destination} value="creator"/>
        <span><b>Creator account</b><small>Storefront, products, sales and earnings</small></span>
      </label>
    </div>
    <label>Email address<input name="email" type="email" value={form?.email??''} required autocomplete="email"/></label>
    <label>Password<input name="password" type="password" required autocomplete="current-password"/></label>
    <button class="button button-primary" type="submit">{destination==='creator'?'Continue to creator hub':'Continue to buyer account'}</button>
    <div class="auth-links"><a href="/auth/forgot-password">Forgot password?</a><a href="/auth/signup">Create an account</a></div>
    <a class="owner-link" href="/auth/admin">Owner administration</a>
  </form>
</section>
<style>
  .auth{min-height:calc(100dvh - 160px);display:grid;place-items:center}.auth-card{width:min(570px,calc(100% - 28px));padding:34px;border-radius:18px}.auth-card h1{margin:12px 0;font-size:clamp(2.4rem,5vw,4rem);letter-spacing:-.055em}.auth-card>p{color:#aab5c8;line-height:1.6}.auth-card>label{margin-top:16px;display:grid;gap:7px;color:#aab5c8;font-size:11px;font-weight:750}.auth-card>label input{min-height:48px;padding:0 13px;border:1px solid #183352;border-radius:9px;color:#f5f8ff;background:#050a16;outline:0}.auth-card>label input:focus{border-color:#00e5ff}.destination-choice{margin:19px 0;display:grid;grid-template-columns:1fr 1fr;gap:9px}.destination-choice label{padding:14px;display:flex;gap:10px;border:1px solid #183352;border-radius:10px;background:#071225;cursor:pointer}.destination-choice label.active{border-color:#00e5ff;background:rgb(0 229 255/.06);box-shadow:0 0 22px rgb(0 229 255/.08)}.destination-choice input{margin-top:3px;accent-color:#00e5ff}.destination-choice span{display:grid}.destination-choice b{font-size:11px}.destination-choice small{margin-top:4px;color:#718096;font-size:9px;line-height:1.4}.auth-card .button{width:100%;margin-top:22px}.auth-links{margin-top:18px;display:flex;justify-content:space-between}.auth-links a,.owner-link{color:#00e5ff;font-size:11px}.owner-link{margin-top:17px;padding-top:15px;display:block;border-top:1px solid #183352;text-align:center;color:#8d9bb1}.owner-link:hover{color:#ff3fd8}.auth-error{padding:11px;border:1px solid rgb(255 82 109/.4);border-radius:9px;color:#ff8da0;background:rgb(255 82 109/.08);font-size:11px}@media(max-width:600px){.destination-choice{grid-template-columns:1fr}}
</style>
