<script lang="ts">
  import type { Category } from '$lib/data/marketplace';
  export let category: Category;
</script>

<a class="category-card" data-accent={category.accent} href={`/marketplace?category=${encodeURIComponent(category.name)}`}>
  <span class="icon" aria-hidden="true">{category.icon}</span>
  <span class="copy"><strong>{category.name}</strong><small>{category.count}</small><em>{category.description}</em></span>
  <span class="go" aria-hidden="true">→</span>
</a>

<style>
  .category-card { --accent: #00e5ff; position: relative; min-height: 128px; padding: 19px; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 14px; overflow: hidden; border: 1px solid #183352; border-radius: 13px; background: linear-gradient(145deg, rgb(12 25 48 / .88), rgb(5 10 22 / .96)); transition: 190ms ease; }
  .category-card::after { content: ''; position: absolute; inset: auto -20% -70% 20%; height: 110px; background: radial-gradient(circle, color-mix(in srgb, var(--accent) 26%, transparent), transparent 70%); opacity: .4; transition: 190ms ease; }
  .category-card:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--accent) 72%, #27547a); box-shadow: 0 16px 40px rgb(0 0 0 / .26); }
  .category-card[data-accent='magenta'] { --accent: #ff3fd8; } .category-card[data-accent='violet'] { --accent: #8b5cf6; } .category-card[data-accent='amber'] { --accent: #ffb547; } .category-card[data-accent='green'] { --accent: #24d89a; } .category-card[data-accent='blue'] { --accent: #4d7cff; }
  .icon { width: 50px; height: 50px; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--accent) 55%, #183352); border-radius: 12px; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, #081224); box-shadow: 0 0 22px color-mix(in srgb, var(--accent) 16%, transparent); font-size: 23px; font-style: normal; }
  .copy { min-width: 0; display: grid; gap: 3px; }
  strong { font-size: 15px; }
  small { color: var(--accent); font-size: 11px; font-weight: 750; }
  em { margin-top: 4px; color: #718096; font-size: 11px; font-style: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .go { color: #718096; font-size: 20px; transition: 180ms ease; }
  .category-card:hover .go { color: var(--accent); transform: translateX(4px); }
</style>
