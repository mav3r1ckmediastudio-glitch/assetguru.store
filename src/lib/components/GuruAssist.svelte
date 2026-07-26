<script lang="ts">
  import Icon from './Icon.svelte';
  let open = true;
</script>

<div class="guru-wrap" class:collapsed={!open}>
  <button class="guru" type="button" aria-label={open ? 'Minimise Guru Assist' : 'Open Guru Assist'} onclick={() => open = !open}>
    <span class="ear left"></span><span class="ear right"></span>
    <span class="face"><i></i><i></i></span>
  </button>
  {#if open}
    <div class="message glass">
      <button class="close" type="button" aria-label="Close Guru Assist" onclick={() => open = false}>×</button>
      <strong>Guru Assist</strong>
      <p>Looking for something specific? Try “dark fantasy forest” or explore a curated collection.</p>
      <a href="/marketplace"><Icon name="spark" size={15}/> Help me discover</a>
    </div>
  {/if}
</div>

<style>
  .guru-wrap { position: fixed; z-index: 30; left: 108px; bottom: 20px; display: flex; align-items: flex-end; gap: 10px; }
  .guru-wrap.collapsed .guru { transform: scale(.82); }
  .guru { position: relative; width: 78px; height: 78px; padding: 0; border: 1px solid #00e5ff; border-radius: 30px 30px 34px 34px; background: radial-gradient(circle at 50% 40%, #123967, #04101e 60%); box-shadow: 0 0 35px rgb(0 229 255 / .24); cursor: pointer; animation: float 4.6s ease-in-out infinite; }
  .ear { position: absolute; top: -16px; width: 28px; height: 32px; background: linear-gradient(145deg, #00e5ff, #8b5cf6); clip-path: polygon(0 100%, 35% 0, 100% 75%); }
  .ear.left { left: 7px; } .ear.right { right: 7px; transform: scaleX(-1); }
  .face { position: absolute; inset: 20px 11px 11px; border: 1px solid #27547a; border-radius: 21px; background: #02040d; display: flex; align-items: center; justify-content: center; gap: 17px; }
  .face i { width: 8px; height: 18px; border-radius: 50%; background: #00e5ff; box-shadow: 0 0 12px #00e5ff; animation: pulse 2.2s ease-in-out infinite; }
  .message { position: relative; width: 255px; padding: 16px; border-color: #00a7c1; border-radius: 12px 12px 12px 2px; }
  .message strong { color: #00e5ff; font-size: 12px; text-transform: uppercase; letter-spacing: .1em; }
  .message p { margin: 7px 0 12px; color: #aab5c8; font-size: 12px; line-height: 1.45; }
  .message a { display: inline-flex; align-items: center; gap: 6px; color: #f5f8ff; font-size: 12px; font-weight: 750; }
  .close { position: absolute; top: 7px; right: 8px; border: 0; background: transparent; color: #718096; cursor: pointer; font-size: 18px; }
  @media (max-width: 900px) { .guru-wrap { left: 14px; bottom: 14px; } .message { display: none; } .guru { width: 58px; height: 58px; border-radius: 23px; } .ear { width: 22px; height: 24px; top: -12px; } .face { inset: 16px 8px 8px; gap: 12px; } .face i { height: 13px; width: 6px; } }
</style>
