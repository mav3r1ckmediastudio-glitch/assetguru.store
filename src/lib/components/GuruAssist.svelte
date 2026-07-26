<script lang="ts">
  import Icon from './Icon.svelte';
  import { assets, categories } from '$lib/data/marketplace';

  type AssistantLink = { label: string; href: string };
  type AssistantMessage = {
    id: number;
    author: 'guru' | 'user';
    text: string;
    links?: AssistantLink[];
  };

  let open = false;
  let showHint = true;
  let query = '';
  let nextId = 2;
  let messages: AssistantMessage[] = [
    {
      id: 1,
      author: 'guru',
      text: 'Tell me what you need and I’ll help you find the right part of AssetGuru.'
    }
  ];

  const starterPrompts = ['Find an environment', 'I want to sell assets', 'Help with my account', 'Contact support'];

  function addMessage(message: Omit<AssistantMessage, 'id'>) {
    messages = [...messages, { id: nextId++, ...message }];
  }

  function openAssistant() {
    open = true;
    showHint = false;
  }

  function productMatches(value: string) {
    const words = value.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
    return $assets
      .map((asset) => {
        const haystack = [asset.title, asset.category, asset.subcategory, asset.creator, asset.summary, ...asset.tags]
          .join(' ')
          .toLowerCase();
        const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
        return { asset, score };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || b.asset.rating - a.asset.rating)
      .slice(0, 3);
  }

  function respond(value: string) {
    const normalised = value.trim().toLowerCase();

    if (/sell|selling|vendor|creator|upload|publish|storefront/.test(normalised)) {
      addMessage({
        author: 'guru',
        text: 'Create a creator account to apply for a storefront, upload products and manage releases.',
        links: [
          { label: 'Create a creator account', href: '/auth/signup?role=vendor' },
          { label: 'Creator information', href: '/sell' }
        ]
      });
      return;
    }

    if (/support|help|problem|issue|refund|contact|download/.test(normalised)) {
      addMessage({
        author: 'guru',
        text: 'The support centre covers account, purchase, download and creator enquiries.',
        links: [{ label: 'Open support centre', href: '/support' }]
      });
      return;
    }

    if (/sign in|login|account|register|sign up|password/.test(normalised)) {
      addMessage({
        author: 'guru',
        text: 'You can sign in, create an account or recover access from the account area.',
        links: [
          { label: 'Sign in', href: '/auth/login' },
          { label: 'Create an account', href: '/auth/signup' }
        ]
      });
      return;
    }

    const matches = productMatches(normalised);
    if (matches.length) {
      addMessage({
        author: 'guru',
        text: `I found ${matches.length} ${matches.length === 1 ? 'listing' : 'listings'} that may fit.`,
        links: matches.map(({ asset }) => ({ label: asset.title, href: `/marketplace/${asset.slug}` }))
      });
      return;
    }

    const category = $categories.find((item) => normalised.includes(item.name.toLowerCase()));
    if (category) {
      addMessage({
        author: 'guru',
        text: `I can open the ${category.name} category for you.`,
        links: [{ label: `Browse ${category.name}`, href: `/marketplace?category=${encodeURIComponent(category.name)}` }]
      });
      return;
    }

    if ($assets.length === 0) {
      addMessage({
        author: 'guru',
        text: 'There are no matching listings available right now. I can still help with creator accounts, buyer accounts or support.',
        links: [
          { label: 'Browse marketplace', href: '/marketplace' },
          { label: 'Sell on AssetGuru', href: '/auth/signup?role=vendor' }
        ]
      });
      return;
    }

    addMessage({
      author: 'guru',
      text: 'I could not find an exact match, but I can open the marketplace with your search applied.',
      links: [{ label: `Search for “${value.trim()}”`, href: `/marketplace?q=${encodeURIComponent(value.trim())}` }]
    });
  }

  function submit() {
    const value = query.trim();
    if (!value) return;
    addMessage({ author: 'user', text: value });
    query = '';
    respond(value);
  }

  function usePrompt(value: string) {
    query = value;
    submit();
  }
</script>

<div class="guru-wrap" class:open>
  {#if open}
    <section class="assistant glass" aria-label="Guru Assist marketplace helper">
      <header>
        <span><Icon name="spark" size={17}/><strong>Guru Assist</strong></span>
        <button type="button" aria-label="Close Guru Assist" onclick={() => open = false}><Icon name="close" size={17}/></button>
      </header>

      <div class="messages" aria-live="polite">
        {#each messages as message (message.id)}
          <article class:from-user={message.author === 'user'}>
            <p>{message.text}</p>
            {#if message.links?.length}
              <div class="answer-links">
                {#each message.links as link}<a href={link.href}>{link.label}<Icon name="arrow" size={13}/></a>{/each}
              </div>
            {/if}
          </article>
        {/each}
      </div>

      {#if messages.length === 1}
        <div class="prompts">
          {#each starterPrompts as prompt}<button type="button" onclick={() => usePrompt(prompt)}>{prompt}</button>{/each}
        </div>
      {/if}

      <form onsubmit={(event) => { event.preventDefault(); submit(); }}>
        <input bind:value={query} aria-label="Ask Guru Assist" placeholder="Ask Guru Assist…" autocomplete="off"/>
        <button type="submit" aria-label="Send message"><Icon name="arrow" size={17}/></button>
      </form>
    </section>
  {:else if showHint}
    <div class="message glass">
      <button class="close" type="button" aria-label="Dismiss Guru Assist message" onclick={() => showHint = false}>×</button>
      <strong>Guru Assist</strong>
      <p>Need help finding an asset, opening a creator account or contacting support?</p>
      <button class="discover" type="button" onclick={openAssistant}><Icon name="spark" size={15}/> Ask Guru Assist</button>
    </div>
  {/if}

  <button class="guru" type="button" aria-label={open ? 'Close Guru Assist' : 'Open Guru Assist'} onclick={() => open ? open = false : openAssistant()}>
    <span class="ear left"></span><span class="ear right"></span>
    <span class="face"><i></i><i></i></span>
    {#if !open}<span class="status-dot"></span>{/if}
  </button>
</div>

<style>
  .guru-wrap{position:fixed;z-index:70;left:108px;bottom:20px;display:flex;align-items:flex-end;gap:10px}.guru{position:relative;flex:0 0 auto;width:70px;height:70px;padding:0;border:1px solid #00e5ff;border-radius:27px 27px 31px 31px;background:radial-gradient(circle at 50% 40%,#123967,#04101e 60%);box-shadow:0 0 35px rgb(0 229 255/.24);cursor:pointer;animation:float 4.6s ease-in-out infinite}.ear{position:absolute;top:-14px;width:25px;height:29px;background:linear-gradient(145deg,#00e5ff,#8b5cf6);clip-path:polygon(0 100%,35% 0,100% 75%)}.ear.left{left:7px}.ear.right{right:7px;transform:scaleX(-1)}.face{position:absolute;inset:18px 10px 10px;border:1px solid #27547a;border-radius:19px;background:#02040d;display:flex;align-items:center;justify-content:center;gap:15px}.face i{width:7px;height:16px;border-radius:50%;background:#00e5ff;box-shadow:0 0 12px #00e5ff;animation:pulse 2.2s ease-in-out infinite}.status-dot{position:absolute;right:-2px;bottom:2px;width:15px;height:15px;border:3px solid #02040d;border-radius:50%;background:#24d89a;box-shadow:0 0 12px #24d89a}.message{position:relative;width:270px;padding:16px;border-color:#00a7c1;border-radius:12px 12px 2px 12px}.message strong{color:#00e5ff;font-size:12px;text-transform:uppercase;letter-spacing:.1em}.message p{margin:7px 0 12px;color:#aab5c8;font-size:12px;line-height:1.45}.message .close{position:absolute;top:7px;right:8px;border:0;background:transparent;color:#718096;cursor:pointer;font-size:18px}.discover{padding:0;display:inline-flex;align-items:center;gap:6px;border:0;color:#f5f8ff;background:transparent;cursor:pointer;font-size:12px;font-weight:750}.discover:hover{color:#00e5ff}.assistant{width:min(380px,calc(100vw - 130px));height:min(590px,calc(100vh - 120px));display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;overflow:hidden;border-color:#00a7c1;border-radius:17px 17px 4px 17px;background:rgb(3 8 20/.96);box-shadow:0 25px 90px rgb(0 0 0/.55)}.assistant header{min-height:54px;padding:0 14px 0 17px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #183352}.assistant header span{display:flex;align-items:center;gap:8px;color:#00e5ff}.assistant header strong{font-size:12px;text-transform:uppercase;letter-spacing:.1em}.assistant header button{width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:8px;color:#718096;background:transparent;cursor:pointer}.messages{padding:15px;overflow:auto;display:flex;flex-direction:column;gap:10px}.messages article{max-width:88%;padding:11px 12px;border:1px solid #183352;border-radius:4px 13px 13px 13px;background:#07111f}.messages article.from-user{align-self:flex-end;border-color:rgb(139 92 246/.45);border-radius:13px 4px 13px 13px;background:rgb(139 92 246/.12)}.messages p{margin:0;color:#c3ccda;font-size:12px;line-height:1.55}.answer-links{margin-top:9px;display:grid;gap:6px}.answer-links a{min-height:32px;padding:7px 9px;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgb(0 229 255/.24);border-radius:7px;color:#00e5ff;background:rgb(0 229 255/.05);font-size:11px;font-weight:800}.prompts{padding:0 15px 10px;display:flex;flex-wrap:wrap;gap:6px}.prompts button{padding:6px 8px;border:1px solid #183352;border-radius:99px;color:#aab5c8;background:#081224;cursor:pointer;font-size:10px}.prompts button:hover{color:#00e5ff;border-color:#00e5ff}.assistant form{margin:0 12px 11px;padding:5px 5px 5px 11px;display:grid;grid-template-columns:1fr auto;gap:6px;border:1px solid #27547a;border-radius:10px;background:#02040d}.assistant input{min-width:0;height:36px;border:0;outline:0;color:#f5f8ff;background:transparent;font-size:12px}.assistant form button{width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:8px;color:#031018;background:#00e5ff;cursor:pointer}@media(max-width:900px){.guru-wrap{left:14px;bottom:14px}.message{display:none}.assistant{position:fixed;left:10px;right:10px;bottom:92px;width:auto;height:min(560px,calc(100vh - 115px))}.guru{width:58px;height:58px;border-radius:23px}.ear{width:22px;height:24px;top:-12px}.face{inset:16px 8px 8px;gap:12px}.face i{height:13px;width:6px}}
</style>
