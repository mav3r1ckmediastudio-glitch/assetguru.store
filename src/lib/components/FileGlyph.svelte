<script lang="ts">
  export let kind:'folder'|'file'='folder';
  export let size=48;
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 64 64"
  fill="none"
  stroke="currentColor"
  stroke-width="2.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if kind==='folder'}
    <path d="M7 18h19l6 7h25v27H7z"/>
    <path d="M7 18v-6h18l6 6"/>
    <path d="M11 30h42" opacity=".55"/>
  {:else}
    <path d="M15 6h23l11 11v41H15z"/>
    <path d="M38 6v13h13"/>
    <path d="M23 32h18M23 41h18M23 50h12" opacity=".7"/>
  {/if}
</svg>
