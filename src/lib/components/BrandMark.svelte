<script lang="ts">
  export let compact = false;
  export let size = 46;
</script>

<a class:compact class="brand" href="/" aria-label="AssetGuru home">
  <svg class="symbol" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="ag-logo" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#00e5ff"/><stop offset=".52" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ff3fd8"/></linearGradient></defs>
    <path d="M32 5 57 55H43.5l-4.4-10H24.7l-4.5 10H7L32 5Zm0 19.5L28.5 34h7L32 24.5Z" fill="url(#ag-logo)"/>
    <path d="M14 54 33 11l8 16-5 7-4-9-13 29h-5Z" fill="#f5f8ff" opacity=".32"/>
  </svg>
  {#if !compact}
    <span class="wordmark"><b>Asset</b><strong>Guru</strong></span>
  {/if}
</a>

<style>
  .brand { display: inline-flex; align-items: center; gap: 13px; min-width: 0; }
  .symbol { filter: drop-shadow(0 0 13px rgb(0 229 255 / .22)); flex: 0 0 auto; }
  .wordmark { font-size: 1.35rem; letter-spacing: -.055em; white-space: nowrap; }
  .wordmark b { color: #f5f8ff; font-weight: 820; }
  .wordmark strong { color: #00e5ff; font-weight: 820; }
  .compact { justify-content: center; }
</style>
