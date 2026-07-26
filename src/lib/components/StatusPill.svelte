<script lang="ts">
  export let status = '';
  $: tone = ['Published','Paid','Approved','Complete','Resolved'].includes(status) ? 'good'
    : ['Draft','Pending','Queued','Open'].includes(status) ? 'neutral'
    : ['In review','Investigating'].includes(status) ? 'review'
    : ['Changes required','Changes requested','Refund requested','More information'].includes(status) ? 'warn'
    : ['Rejected','Suspended','Declined'].includes(status) ? 'danger'
    : ['Refunded','Retired','Partially refunded'].includes(status) ? 'muted' : 'neutral';
</script>
<span class="pill" data-tone={tone}>{status}</span>
<style>
  .pill{width:max-content;padding:5px 8px;border:1px solid;border-radius:99px;font-size:8px;font-weight:850;letter-spacing:.04em;white-space:nowrap}.pill[data-tone='good']{color:#24d89a;border-color:rgb(36 216 154/.32);background:rgb(36 216 154/.08)}.pill[data-tone='neutral']{color:#aab5c8;border-color:#29405e;background:#0a1629}.pill[data-tone='review']{color:#00e5ff;border-color:rgb(0 229 255/.34);background:rgb(0 229 255/.07)}.pill[data-tone='warn']{color:#ffb547;border-color:rgb(255 181 71/.34);background:rgb(255 181 71/.08)}.pill[data-tone='danger']{color:#ff526d;border-color:rgb(255 82 109/.34);background:rgb(255 82 109/.08)}.pill[data-tone='muted']{color:#718096;border-color:#24364d;background:#08111f}
</style>
