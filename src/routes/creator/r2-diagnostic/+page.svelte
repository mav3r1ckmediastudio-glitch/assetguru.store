<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';

  type Success = {
    ok: true;
    bucket: string;
    endpointHost: string;
    bytes: number;
    timingsMs: { put: number; head: number; delete: number; total: number };
  };
  type Failure = { ok: false; code: string; message: string; details?: Record<string, unknown> };

  let running = false;
  let result: Success | Failure | null = null;

  async function runCheck() {
    if (running) return;
    running = true;
    result = null;
    try {
      const response = await fetch('/api/vendor/r2-health', {
        method: 'POST',
        headers: { accept: 'application/json' }
      });
      const payload = await response.json().catch(() => null);
      if (!payload || typeof payload !== 'object') {
        result = { ok: false, code: 'INVALID_RESPONSE', message: `The diagnostic returned HTTP ${response.status} without a readable result.` };
      } else {
        result = payload as Success | Failure;
      }
    } catch {
      result = { ok: false, code: 'NETWORK_ERROR', message: 'The browser could not reach the staging diagnostic endpoint.' };
    } finally {
      running = false;
    }
  }
</script>

<svelte:head><title>R2 server diagnostic — AssetGuru</title></svelte:head>

<header class="page-head">
  <div>
    <span class="eyebrow">Staging diagnostic</span>
    <h1>Cloudflare R2 <span class="gradient-text">server check.</span></h1>
    <p>This checks Netlify → R2 using the same browser-compatible signed PUT used by creator packages. It does not alter a product or draft.</p>
  </div>
  <a class="button button-secondary" href="/creator/products"><Icon name="chevron" size={16}/> Back to products</a>
</header>

<section class="diagnostic glass">
  <div class="icon"><Icon name="shield" size={30}/></div>
  <div class="copy">
    <span class="eyebrow">Safe health check</span>
    <h2>Write, verify and remove one tiny private object</h2>
    <p>The server creates a small signed-upload test file in <code>r2/__assetguru-health</code>, confirms its size with a HEAD request, then deletes it. Credentials and signed URLs are never displayed.</p>
  </div>
  <button class="button button-primary" type="button" onclick={runCheck} disabled={running}>
    <Icon name={running ? 'clock' : 'spark'} size={17}/>
    {running ? 'Running check…' : 'Run server check'}
  </button>
</section>

{#if result}
  <section class:success={result.ok} class:failure={!result.ok} class="result glass" aria-live="polite">
    <div class="result-head">
      <Icon name={result.ok ? 'check' : 'alert'} size={25}/>
      <div>
        <span class="eyebrow">{result.ok ? 'Passed' : 'Failed'}</span>
        <h2>{result.ok ? 'R2 signed upload, verification and deletion all passed.' : result.code}</h2>
      </div>
    </div>
    {#if result.ok}
      <div class="facts">
        <span><small>Endpoint</small><b>{result.endpointHost}</b></span>
        <span><small>Bucket</small><b>{result.bucket}</b></span>
        <span><small>Test object</small><b>{result.bytes} bytes, deleted</b></span>
        <span><small>Total time</small><b>{result.timingsMs.total} ms</b></span>
      </div>
      <div class="steps">
        <span><Icon name="check" size={14}/> PUT {result.timingsMs.put} ms</span>
        <span><Icon name="check" size={14}/> HEAD {result.timingsMs.head} ms</span>
        <span><Icon name="check" size={14}/> DELETE {result.timingsMs.delete} ms</span>
      </div>
    {:else}
      <p class="message">{result.message}</p>
      <div class="provider-details">
        <span><small>Provider code</small><b>{String(result.details?.providerCode ?? 'Not supplied')}</b></span>
        <span><small>HTTP status</small><b>{String(result.details?.httpStatus ?? 'Not supplied')}</b></span>
        <span class="provider-message"><small>Provider message</small><b>{String(result.details?.providerMessage ?? 'Not supplied')}</b></span>
      </div>
      <p class="note">These are Cloudflare's safe error details. No credentials, signed URLs or secret environment values are displayed.</p>
      <p class="note">No product data or draft metadata was changed.</p>
    {/if}
  </section>
{/if}

<style>
  .page-head{margin-bottom:22px;display:flex;align-items:end;justify-content:space-between;gap:22px}.page-head h1{margin:10px 0 7px;font-size:clamp(2.6rem,4vw,4.4rem);line-height:.96;letter-spacing:-.06em}.page-head p{max-width:760px;margin:0;color:#aab5c8;line-height:1.65}.page-head .button svg{transform:rotate(180deg)}
  .diagnostic{padding:24px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;border-radius:16px}.icon{width:64px;height:64px;display:grid;place-items:center;border:1px solid #00e5ff;border-radius:18px;color:#00e5ff;background:rgb(0 229 255/.08);box-shadow:0 0 28px rgb(0 229 255/.12)}.copy h2{margin:7px 0 6px;font-size:20px}.copy p{max-width:780px;margin:0;color:#8d9bb1;font-size:11px;line-height:1.65}.copy code{padding:2px 5px;border:1px solid #183352;border-radius:4px;color:#b9c9df;background:#07111f}.diagnostic button{min-width:185px}
  .result{margin-top:14px;padding:22px;border-radius:16px}.result.success{border-color:rgb(36 216 154/.45)}.result.failure{border-color:rgb(255 89 119/.48)}.result-head{display:flex;gap:12px;align-items:center}.success .result-head{color:#24d89a}.failure .result-head{color:#ff5977}.result-head h2{margin:5px 0 0;color:#f5f8ff;font-size:18px}.facts{margin-top:18px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.facts span{padding:13px;border:1px solid #183352;border-radius:10px;background:#07111f;display:grid;min-width:0}.facts small{color:#718096;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.facts b{margin-top:5px;overflow-wrap:anywhere;font-size:10px}.steps{margin-top:12px;display:flex;gap:9px;flex-wrap:wrap}.steps span{padding:7px 10px;display:flex;gap:6px;align-items:center;border:1px solid rgb(36 216 154/.25);border-radius:999px;color:#24d89a;background:rgb(36 216 154/.06);font-size:9px;font-weight:800}.message{margin:16px 0 0;color:#f5f8ff;font-size:13px;line-height:1.6}.provider-details{margin-top:14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.provider-details span{padding:13px;border:1px solid #183352;border-radius:10px;background:#07111f;display:grid;min-width:0}.provider-details small{color:#718096;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.provider-details b{margin-top:5px;overflow-wrap:anywhere;color:#f5f8ff;font-size:10px;line-height:1.5}.provider-message{grid-column:1/-1}.note{margin:6px 0 0;color:#718096;font-size:9px}
  @media(max-width:900px){.page-head{align-items:start;flex-direction:column}.diagnostic{grid-template-columns:auto 1fr}.diagnostic button{grid-column:1/-1;width:100%}.facts{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){.facts,.provider-details{grid-template-columns:1fr}.provider-message{grid-column:auto}.diagnostic{grid-template-columns:1fr}.icon{width:54px;height:54px}}
</style>
