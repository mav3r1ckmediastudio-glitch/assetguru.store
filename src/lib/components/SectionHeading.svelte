<script lang="ts">
  export let eyebrow = '';
  export let title = '';
  export let description = '';
  export let link = '';
  export let href = '/marketplace';
</script>

<div class="section-heading">
  <div>
    {#if eyebrow}<span class="eyebrow">{eyebrow}</span>{/if}
    <h2>{title}</h2>
    {#if description}<p>{description}</p>{/if}
  </div>
  {#if link}<a class="text-link" {href}>{link}<span aria-hidden="true">→</span></a>{/if}
</div>
