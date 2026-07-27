<script lang="ts">
  export let name:
    | 'home' | 'browse' | 'bundle' | 'gift' | 'library' | 'heart' | 'cart' | 'bell'
    | 'search' | 'arrow' | 'shield' | 'lock' | 'max' | 'spark' | 'menu' | 'close'
    | 'star' | 'chevron' | 'user' | 'tag' | 'community' | 'support' | 'upload'
    | 'check' | 'alert' | 'trash' | 'grid' | 'list' | 'package' | 'clock' | 'download'
    | 'store' | 'sliders' | 'eye' | 'chart' | 'plus' | 'minus' | 'mail' | 'image' | 'settings' | 'refresh' = 'spark';
  export let size = 22;
  export let strokeWidth = 1.8;
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'home'}
    <path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>
  {:else if name === 'browse'}
    <path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>
  {:else if name === 'bundle'}
    <path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3"/><path d="M4 12h16"/>
  {:else if name === 'gift'}
    <path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7Z"/><path d="M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z"/>
  {:else if name === 'library'}
    <path d="M4 4h6v16H4z"/><path d="M10 4h5v16h-5z"/><path d="m15 5 4-1 2 15-4 1z"/>
  {:else if name === 'heart'}
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>
  {:else if name === 'cart'}
    <circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6"/>
  {:else if name === 'bell'}
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>
  {:else if name === 'search'}
    <circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>
  {:else if name === 'arrow'}
    <path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>
  {:else if name === 'shield'}
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>
  {:else if name === 'lock'}
    <rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>
  {:else if name === 'max'}
    <path d="m12 2 8 5v10l-8 5-8-5V7l8-5Z"/><path d="M8 15V9l4 3 4-3v6"/>
  {:else if name === 'spark'}
    <path d="m12 3-1.7 4.3L6 9l4.3 1.7L12 15l1.7-4.3L18 9l-4.3-1.7L12 3Z"/><path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8L5 15Z"/><path d="m19 14-.7 1.8-1.8.7 1.8.7L19 19l.7-1.8 1.8-.7-1.8-.7L19 14Z"/>
  {:else if name === 'menu'}
    <path d="M4 7h16M4 12h16M4 17h16"/>
  {:else if name === 'close'}
    <path d="m6 6 12 12M18 6 6 18"/>
  {:else if name === 'star'}
    <path d="m12 2.5 3 6.1 6.7 1-4.8 4.7 1.1 6.7-6-3.2-6 3.2 1.1-6.7-4.8-4.7 6.7-1 3-6.1Z"/>
  {:else if name === 'chevron'}
    <path d="m9 18 6-6-6-6"/>
  {:else if name === 'user'}
    <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
  {:else if name === 'tag'}
    <path d="M20 13 11 22l-9-9V2h11l7 7a3 3 0 0 1 0 4Z"/><circle cx="7" cy="7" r="1"/>
  {:else if name === 'community'}
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  {:else if name === 'support'}
    <circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4"/><path d="M12 18h.01"/>
  {:else if name === 'upload'}
    <path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M20 15v5H4v-5"/>
  {:else if name === 'check'}
    <path d="m5 12 4 4L19 6"/>
  {:else if name === 'alert'}
    <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>
  {:else if name === 'trash'}
    <path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>
  {:else if name === 'grid'}
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  {:else if name === 'list'}
    <path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>
  {:else if name === 'package'}
    <path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 7 9 5 9-5v10l-9 5-9-5V7Z"/><path d="M12 12v10"/>
  {:else if name === 'clock'}
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
  {:else if name === 'download'}
    <path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>
  {:else if name === 'store'}
    <path d="M3 10h18l-2-6H5l-2 6Z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>
  {:else if name === 'sliders'}
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>
  {:else if name === 'eye'}
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>
  {:else if name === 'chart'}
    <path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>
  {:else if name === 'plus'}
    <path d="M12 5v14M5 12h14"/>
  {:else if name === 'minus'}
    <path d="M5 12h14"/>
  {:else if name === 'mail'}
    <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
  {:else if name === 'image'}
    <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>
  {:else if name === 'refresh'}
    <path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 9A7 7 0 0 1 18.5 6.5L20 8"/><path d="M17.9 15A7 7 0 0 1 5.5 17.5L4 16"/>
  {:else if name === 'settings'}
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>
  {/if}
</svg>
