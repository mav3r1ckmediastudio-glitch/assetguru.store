<script lang="ts">
  import BrandMark from './BrandMark.svelte';
</script>

<footer>
  <div class="content-wrap footer-grid">
    <div class="brand-copy">
      <BrandMark size={42}/>
      <p>Premium assets made for GameGuru MAX. Build worlds faster with trusted creators and clear compatibility.</p>
    </div>
    <div><h3>Marketplace</h3><a href="/marketplace">Browse assets</a><a href="/categories">Categories</a><a href="/deals">Deals & bundles</a><a href="/creators">Creators</a></div>
    <div><h3>Creators</h3><a href="/creators">Sell assets</a><a href="/support">Publishing guide</a><a href="/support">Asset standards</a><a href="/support">Fees</a></div>
    <div><h3>AssetGuru</h3><a href="/community">Community</a><a href="/support">Support</a><a href="/support">Licensing</a><a href="/support">Roadmap</a></div>
  </div>
  <div class="content-wrap legal"><span>© 2026 AssetGuru. All rights reserved.</span><span>Built for GameGuru MAX creators.</span></div>
</footer>

<style>
  footer { padding: 56px 0 24px; border-top: 1px solid #183352; background: #030711; }
  .footer-grid { display: grid; grid-template-columns: minmax(260px, 1.6fr) repeat(3, 1fr); gap: 44px; }
  .brand-copy p { max-width: 440px; color: #718096; line-height: 1.7; }
  h3 { margin: 5px 0 16px; color: #f5f8ff; font-size: 13px; text-transform: uppercase; letter-spacing: .12em; }
  .footer-grid > div:not(.brand-copy) { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
  .footer-grid a { color: #718096; font-size: 14px; }
  .footer-grid a:hover { color: #00e5ff; }
  .legal { margin-top: 44px; padding-top: 22px; border-top: 1px solid #122a43; display: flex; justify-content: space-between; color: #46556b; font-size: 12px; }
  @media (max-width: 900px) { .footer-grid { grid-template-columns: 1.5fr 1fr; } }
  @media (max-width: 560px) { .footer-grid { grid-template-columns: 1fr; gap: 30px; } .legal { flex-direction: column; gap: 8px; } }
</style>
