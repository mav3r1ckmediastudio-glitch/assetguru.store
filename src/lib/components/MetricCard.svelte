<script lang="ts">
  import Icon from './Icon.svelte';
  export let label = '';
  export let value = '';
  export let delta = '';
  export let icon: 'chart'|'cart'|'download'|'star'|'eye'|'tag'|'shield'|'store'|'package'|'alert'|'user'|'library' = 'chart';
  export let tone: 'cyan'|'violet'|'magenta'|'green'|'amber' = 'cyan';
  export let hint = 'vs previous 30 days';
</script>
<article class="metric glass" data-tone={tone}>
  <div class="metric-head"><span>{label}</span><i><Icon name={icon} size={18}/></i></div>
  <strong>{value}</strong>
  <div class:negative={delta.trim().startsWith('-')} class="delta"><b>{delta}</b><small>{hint}</small></div>
</article>
<style>
  .metric{position:relative;overflow:hidden;padding:18px;border-radius:14px}.metric::after{content:'';position:absolute;right:-36px;bottom:-60px;width:130px;height:130px;border-radius:50%;background:var(--glow);filter:blur(35px);opacity:.17}.metric[data-tone='cyan']{--glow:#00e5ff}.metric[data-tone='violet']{--glow:#8b5cf6}.metric[data-tone='magenta']{--glow:#ff3fd8}.metric[data-tone='green']{--glow:#24d89a}.metric[data-tone='amber']{--glow:#ffb547}.metric-head{display:flex;align-items:center;justify-content:space-between;color:#718096;font-size:9px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.metric-head i{width:34px;height:34px;display:grid;place-items:center;border:1px solid #183352;border-radius:9px;color:var(--glow);background:#071225;font-style:normal}.metric>strong{display:block;margin:10px 0 7px;font-size:clamp(1.45rem,2vw,2.1rem);letter-spacing:-.04em}.delta{display:flex;align-items:center;gap:7px}.delta b{color:#24d89a;font-size:10px}.delta.negative b{color:#ff526d}.delta small{color:#718096;font-size:8px}
</style>
