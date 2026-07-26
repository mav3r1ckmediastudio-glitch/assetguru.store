<script lang="ts">
  export let eyebrow = 'AssetGuru';
  export let title = '';
  export let highlight = '';
  export let description = '';
</script>

<section class="intro">
  <div class="content-wrap">
    <span class="eyebrow">{eyebrow}</span>
    <h1>{title} {#if highlight}<span class="gradient-text">{highlight}</span>{/if}</h1>
    <p>{description}</p>
  </div>
</section>

<style>
  .intro { padding: 58px 0 42px; border-bottom: 1px solid #122a43; background: radial-gradient(circle at 76% 10%, rgb(139 92 246 / .15), transparent 28rem); }
  h1 { margin: 12px 0 10px; font-size: clamp(2.7rem, 5.8vw, 5.6rem); line-height: .94; letter-spacing: -.065em; text-transform: uppercase; }
  p { max-width: 780px; margin: 0; color: #aab5c8; font-size: 17px; line-height: 1.65; }
</style>
