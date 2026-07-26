<script lang="ts">
  export let values: number[] = [];
  export let secondary: number[] = [];
  export let height = 230;
  export let primaryLabel = 'Revenue';
  export let secondaryLabel = 'Sales';
  const width = 800;
  $: max = Math.max(...values, ...secondary, 1);
  $: min = Math.min(...values, ...secondary, 0);
  $: range = Math.max(max - min, 1);
  function points(data:number[]) { return data.map((value,index) => `${(index / Math.max(data.length - 1,1))*width},${height - ((value-min)/range)*(height-24)-12}`).join(' '); }
  $: primaryPoints = points(values);
  $: secondaryPoints = points(secondary);
</script>
<div class="chart-wrap">
  <div class="legend"><span class="primary">{primaryLabel}</span>{#if secondary.length}<span class="secondary">{secondaryLabel}</span>{/if}</div>
  <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label={`${primaryLabel} chart`}>
    <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3fd8" stop-opacity=".28"/><stop offset="1" stop-color="#ff3fd8" stop-opacity="0"/></linearGradient></defs>
    {#each [0.2,0.4,0.6,0.8] as line}<line x1="0" x2={width} y1={height*line} y2={height*line} stroke="#183352" stroke-width="1" stroke-dasharray="4 7"/>{/each}
    <polygon points={`0,${height} ${primaryPoints} ${width},${height}`} fill="url(#area)"/>
    <polyline points={primaryPoints} fill="none" stroke="#ff3fd8" stroke-width="4" vector-effect="non-scaling-stroke"/>
    {#if secondary.length}<polyline points={secondaryPoints} fill="none" stroke="#00e5ff" stroke-width="3" opacity=".9" vector-effect="non-scaling-stroke"/>{/if}
  </svg>
</div>
<style>
  .chart-wrap{min-width:0}.legend{margin-bottom:12px;display:flex;gap:18px;color:#aab5c8;font-size:9px}.legend span::before{content:'';display:inline-block;width:18px;height:2px;margin-right:7px;vertical-align:middle}.legend .primary::before{background:#ff3fd8}.legend .secondary::before{background:#00e5ff}svg{display:block;width:100%;height:auto;max-height:250px;overflow:visible}
</style>
