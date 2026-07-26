<script lang="ts">
  import { toasts } from '$lib/stores/marketplace';
  import Icon from './Icon.svelte';
</script>

<div class="toast-stack" aria-live="polite" aria-atomic="false">
  {#each $toasts as toast (toast.id)}
    <div class="toast" data-tone={toast.tone}>
      <span class="toast-icon"><Icon name={toast.tone === 'warning' ? 'alert' : 'check'} size={17}/></span>
      <span>{toast.message}</span>
    </div>
  {/each}
</div>

<style>
  .toast-stack { position: fixed; z-index: 120; right: 22px; bottom: 22px; display: grid; gap: 10px; pointer-events: none; }
  .toast { min-width: 280px; max-width: 380px; padding: 13px 16px; display: flex; align-items: center; gap: 11px; border: 1px solid #27547a; border-radius: 12px; color: #f5f8ff; background: rgb(5 10 22 / .96); box-shadow: 0 20px 60px rgb(0 0 0 / .45); backdrop-filter: blur(18px); animation: toast-in 180ms ease-out; font-size: 13px; font-weight: 700; }
  .toast-icon { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; color: #031018; background: #00e5ff; }
  .toast[data-tone='success'] { border-color: rgb(36 216 154 / .6); }.toast[data-tone='success'] .toast-icon { background: #24d89a; }
  .toast[data-tone='warning'] { border-color: rgb(255 181 71 / .6); }.toast[data-tone='warning'] .toast-icon { background: #ffb547; }
  @keyframes toast-in { from { opacity: 0; transform: translateY(10px) scale(.98); } }
  @media(max-width:640px){.toast-stack{right:10px;bottom:10px;left:10px}.toast{min-width:0;max-width:none}}
</style>
