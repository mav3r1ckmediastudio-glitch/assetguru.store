<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import FileGlyph from '$lib/components/FileGlyph.svelte';
  import CreatorImageUploader from '$lib/components/CreatorImageUploader.svelte';
  import { CATEGORY_COUNT, CATEGORY_TAXONOMY, SUBCATEGORY_COUNT } from '$lib/data/category-taxonomy';
  import { creatorProducts, loadCreatorData } from '$lib/stores/creator';
  import { showToast } from '$lib/stores/marketplace';
  import { platformSettings } from '$lib/stores/admin';
  import { apiRequest } from '$lib/api';
  import { getSupabaseBrowserClient } from '$lib/supabase/client';
  import { uploadFileToR2, type R2BrowserUpload } from '$lib/r2-upload';
  import { parseShowcaseVideoUrl } from '$lib/showcase-video';

  type SupabaseUpload = { storage:'supabase'; bucket:string; path:string; token:string; role:string; name:string; type:string; size:number };
  type UploadSpec = R2BrowserUpload | SupabaseUpload;
  type CategoryOption = { id:string; name:string; slug:string; subcategories:string[] };

  const localDraftKey = 'assetguru:new-asset-local-draft:v2';
  const steps = [
    { n:1, label:'Overview', hint:'Title and discovery' },
    { n:2, label:'Files', hint:'Package and compatibility' },
    { n:3, label:'Presentation', hint:'Images and description' },
    { n:4, label:'Pricing', hint:'Licence and price' },
    { n:5, label:'Review', hint:'Submit to admin' }
  ];
  const fallbackCategories: CategoryOption[] = CATEGORY_TAXONOMY.map((item) => ({ id:item.slug, name:item.name, slug:item.slug, subcategories:item.subcategories }));

  let step = 1;
  let title = '';
  let category = '';
  let subcategory = '';
  let summary = '';
  let description = '';
  let dependencies = 'None';
  let version = '1.0.0';
  let price = 19.99;
  let extendedPrice = 49.99;
  let maxVersion:'2024+'|'2025+'|'2026+'|'Any MAX build' = '2026+';
  let performance:'Lightweight'|'Mid-range'|'High detail' = 'Mid-range';
  let sourceFiles = true;
  let agreed = false;
  let draftSaving = false;
  let submitting = false;
  let uploadProgress = 0;
  let packageFile: File | null = null;
  let documentationFile: File | null = null;
  let previewFiles: File[] = [];
  let packageDragging = false;
  let packageInput: HTMLInputElement;
  let docsInput: HTMLInputElement;
  let tags = 'game-ready, GameGuru MAX';
  let features = '';
  let contents = '';
  let formats = 'FBX, PNG';
  let showcaseVideoUrl = '';
  let showcaseVideo: ReturnType<typeof parseShowcaseVideoUrl> = null;
  let showcaseVideoError = '';
  let categoryOptions: CategoryOption[] = fallbackCategories;
  let categoriesLoading = true;
  let categoriesWarning = '';
  let localReady = false;
  let localRecovered = false;
  let localSaveTimer: ReturnType<typeof setTimeout> | undefined;

  $: selectedCategory = categoryOptions.find((item) => item.name === category);
  $: subcategoryOptions = selectedCategory?.subcategories ?? [];
  $: if (subcategory && !subcategoryOptions.includes(subcategory)) subcategory = '';
  $: showcaseVideo = parseShowcaseVideoUrl(showcaseVideoUrl);
  $: showcaseVideoError = showcaseVideoUrl.trim() && !showcaseVideo ? 'Enter a valid YouTube or Vimeo video URL.' : '';

  $: checks = [
    { label:'Product title', done:title.trim().length >= 5, tab:1 },
    { label:'Category and subcategory', done:Boolean(category && subcategory), tab:1 },
    { label:'Short summary', done:summary.trim().length >= 20, tab:1 },
    { label:'ZIP package selected', done:Boolean(packageFile), tab:2 },
    { label:'Release version', done:Boolean(version.trim()), tab:2 },
    { label:'At least three preview images', done:previewFiles.length >= 3, tab:3 },
    { label:'Full description', done:description.trim().length >= 60, tab:3 },
    { label:'Valid showcase video', done:!showcaseVideoError, tab:3 },
    { label:'Valid prices', done:price >= 0 && extendedPrice >= price, tab:4 },
    { label:'Creator declaration', done:agreed, tab:5 }
  ];
  $: completedChecks = checks.filter((item) => item.done).length;
  $: completionPercent = Math.round((completedChecks / checks.length) * 100);
  $: missingChecks = checks.filter((item) => !item.done);
  $: canContinue = step === 1
    ? title.trim().length >= 5 && summary.trim().length >= 20 && Boolean(category && subcategory)
    : step === 2
      ? Boolean(packageFile && version.trim())
      : step === 3
        ? previewFiles.length >= 3 && description.trim().length >= 60 && !showcaseVideoError
        : step === 4
          ? price >= 0 && extendedPrice >= price
          : agreed;
  $: canSubmit = missingChecks.length === 0 && Boolean(packageFile) && previewFiles.length >= 3;

  const list = (value:string) => value.split(',').map((item) => item.trim()).filter(Boolean);
  const descriptor = (file:File) => ({ name:file.name, size:file.size, type:file.type || 'application/octet-stream' });
  const fileSize = (bytes:number) => bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
    : bytes >= 1024 ** 2
      ? `${(bytes / 1024 ** 2).toFixed(1)} MB`
      : `${Math.ceil(bytes / 1024)} KB`;

  function localSnapshot() {
    return { step,title,category,subcategory,summary,description,dependencies,version,price,extendedPrice,maxVersion,performance,sourceFiles,tags,features,contents,formats,showcaseVideoUrl,updatedAt:Date.now() };
  }

  function scheduleLocalSave() {
    if (!browser || !localReady) return;
    if (localSaveTimer) clearTimeout(localSaveTimer);
    localSaveTimer = setTimeout(() => localStorage.setItem(localDraftKey, JSON.stringify(localSnapshot())), 250);
  }

  function clearLocalDraft() {
    if (browser) localStorage.removeItem(localDraftKey);
    localRecovered = false;
  }

  function restoreLocalDraft() {
    if (!browser) return;
    try {
      const saved = JSON.parse(localStorage.getItem(localDraftKey) ?? 'null');
      if (!saved || typeof saved !== 'object') return;
      step = Math.max(1, Math.min(5, Number(saved.step) || 1));
      title = typeof saved.title === 'string' ? saved.title : title;
      category = typeof saved.category === 'string' ? saved.category : category;
      subcategory = typeof saved.subcategory === 'string' ? saved.subcategory : subcategory;
      summary = typeof saved.summary === 'string' ? saved.summary : summary;
      description = typeof saved.description === 'string' ? saved.description : description;
      dependencies = typeof saved.dependencies === 'string' ? saved.dependencies : dependencies;
      version = typeof saved.version === 'string' ? saved.version : version;
      price = Number.isFinite(saved.price) ? saved.price : price;
      extendedPrice = Number.isFinite(saved.extendedPrice) ? saved.extendedPrice : extendedPrice;
      maxVersion = ['2024+','2025+','2026+','Any MAX build'].includes(saved.maxVersion) ? saved.maxVersion : maxVersion;
      performance = ['Lightweight','Mid-range','High detail'].includes(saved.performance) ? saved.performance : performance;
      sourceFiles = typeof saved.sourceFiles === 'boolean' ? saved.sourceFiles : sourceFiles;
      tags = typeof saved.tags === 'string' ? saved.tags : tags;
      features = typeof saved.features === 'string' ? saved.features : features;
      contents = typeof saved.contents === 'string' ? saved.contents : contents;
      formats = typeof saved.formats === 'string' ? saved.formats : formats;
      showcaseVideoUrl = typeof saved.showcaseVideoUrl === 'string' ? saved.showcaseVideoUrl : showcaseVideoUrl;
      localRecovered = true;
    } catch {
      localStorage.removeItem(localDraftKey);
    }
  }

  function next() {
    if (!canContinue) {
      showToast('Complete the required fields in this section before continuing.', 'warning');
      return;
    }
    step = Math.min(5, step + 1);
    scheduleLocalSave();
  }
  function back() { step = Math.max(1, step - 1); scheduleLocalSave(); }
  function jumpTo(target:number) { step = Math.max(1, Math.min(5, target)); scheduleLocalSave(); }

  function setPackage(file:File | null) {
    if (file && !file.name.toLowerCase().endsWith('.zip')) {
      showToast('The asset package must be a ZIP file.', 'warning');
      return;
    }
    packageFile = file;
  }
  function choosePackage(event:Event) { setPackage((event.currentTarget as HTMLInputElement).files?.[0] ?? null); }
  function dragPackage(event:DragEvent) { event.preventDefault(); if (!submitting) packageDragging = true; }
  function leavePackage(event:DragEvent) { event.preventDefault(); packageDragging = false; }
  function dropPackage(event:DragEvent) { event.preventDefault(); packageDragging = false; if (!submitting) setPackage(event.dataTransfer?.files?.[0] ?? null); }
  function chooseDocs(event:Event) { documentationFile = (event.currentTarget as HTMLInputElement).files?.[0] ?? null; }
  function setPreviewFiles(next:File[]) { previewFiles = next; }
  function setFree(event:Event) { if ((event.currentTarget as HTMLInputElement).checked) { price = 0; extendedPrice = 0; } }
  function fileForRole(role:string) {
    if (role === 'package') return packageFile;
    if (role === 'documentation') return documentationFile;
    if (role.startsWith('preview-')) return previewFiles[Number(role.split('-')[1])];
    return null;
  }

  async function loadCategoryOptions() {
    categoriesLoading = true;
    categoriesWarning = '';
    try {
      const data = await apiRequest<{categories:CategoryOption[]}>('/api/vendor/categories', { cache:'no-store' });
      if (data.categories?.length) categoryOptions = data.categories;
      if (category && !categoryOptions.some((item) => item.name === category)) { category = ''; subcategory = ''; }
    } catch (error) {
      categoryOptions = fallbackCategories;
      categoriesWarning = `${error instanceof Error ? error.message : 'The server category list could not be refreshed.'} The complete built-in taxonomy is still available.`;
    } finally {
      categoriesLoading = false;
    }
  }

  onMount(() => {
    restoreLocalDraft();
    localReady = true;
    void loadCategoryOptions();
    return () => { if (localSaveTimer) clearTimeout(localSaveTimer); };
  });

  async function saveDraft() {
    if ($platformSettings.maintenanceMode) { showToast('Vendor uploads are paused during maintenance.', 'warning'); return; }
    if (!title.trim()) { step = 1; showToast('Enter a product title before saving the draft.', 'warning'); return; }
    if (showcaseVideoError) { step = 3; showToast(showcaseVideoError, 'warning'); return; }
    draftSaving = true;
    try {
      const response = await apiRequest<{product:{slug:string}}>('/api/vendor/products', {
        method:'POST',
        body:JSON.stringify({
          mode:'draft', title, summary, description, category, subcategory, price, extendedPrice, version,
          compatibility:'GameGuru MAX', maxVersion, sourceFiles, dependencies, performance,
          features:list(features), contents:list(contents), tags:list(tags), formats:list(formats),
          licence:'AssetGuru commercial licence', showcaseVideoUrl:showcaseVideo?.canonicalUrl ?? ''
        })
      });
      await loadCreatorData(true);
      const confirmed = get(creatorProducts).some((product) => product.slug === response.product.slug && product.status === 'Draft');
      if (!confirmed) throw new Error('The draft was created but could not be confirmed in Creator Products.');
      if (browser) localStorage.setItem(`assetguru:version-draft:${response.product.slug}`, JSON.stringify({ versionNumber:version, releaseNotes:'' }));
      clearLocalDraft();
      showToast(`${title.trim()} saved as a private draft.`, 'success');
      await goto(`/creator/products/${response.product.slug}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'The draft could not be saved.', 'warning');
    } finally {
      draftSaving = false;
    }
  }

  async function submitReview() {
    if ($platformSettings.maintenanceMode) { showToast('Vendor uploads are paused during maintenance.', 'warning'); return; }
    if (!canSubmit || !packageFile) {
      const firstMissing = missingChecks[0];
      if (firstMissing) step = firstMissing.tab;
      showToast(firstMissing ? `Complete: ${firstMissing.label}.` : 'Complete the required listing fields.', 'warning');
      return;
    }
    submitting = true;
    uploadProgress = 0;
    let createdSlug = '';
    let createdVersionId = '';
    let createdPreviewPaths:string[] = [];
    try {
      const response = await apiRequest<{product:{slug:string;currentVersionId:string};uploads:UploadSpec[];mode:'review'}>('/api/vendor/products', {
        method:'POST',
        body:JSON.stringify({
          title, summary, description, category, subcategory, price, extendedPrice, version,
          compatibility:'GameGuru MAX', maxVersion, sourceFiles, dependencies, performance,
          features:list(features), contents:list(contents), tags:list(tags), formats:list(formats),
          licence:'AssetGuru commercial licence', showcaseVideoUrl:showcaseVideo?.canonicalUrl ?? '', mode:'review',
          files:{ package:descriptor(packageFile), documentation:documentationFile ? descriptor(documentationFile) : undefined, previews:previewFiles.map(descriptor) }
        })
      });
      createdSlug = response.product.slug;
      createdVersionId = response.product.currentVersionId;
      createdPreviewPaths = response.uploads.filter((upload):upload is SupabaseUpload => upload.storage === 'supabase').map((upload) => upload.path);
      const supabase = getSupabaseBrowserClient();
      const loaded = new Map<string,number>();
      const totalBytes = response.uploads.reduce((sum, upload) => sum + upload.size, 0);
      const updateProgress = (role:string, bytes:number) => {
        loaded.set(role, bytes);
        uploadProgress = Math.round([...loaded.values()].reduce((sum, value) => sum + value, 0) / Math.max(1, totalBytes) * 100);
      };
      for (const upload of response.uploads) {
        const file = fileForRole(upload.role);
        if (!file) throw new Error(`Missing file for ${upload.role}.`);
        if (upload.storage === 'r2') {
          await uploadFileToR2(upload, file, (bytes) => updateProgress(upload.role, bytes));
        } else {
          const { error } = await supabase.storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file, { contentType:file.type || upload.type });
          if (error) throw error;
          updateProgress(upload.role, upload.size);
        }
      }
      await apiRequest(`/api/vendor/products/${response.product.slug}/complete`, { method:'POST', body:JSON.stringify({ mode:'review', previewPaths:createdPreviewPaths }) });
      await loadCreatorData(true);
      clearLocalDraft();
      showToast(`${title} submitted for marketplace review.`, 'success');
      await goto('/creator/products');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The asset could not be uploaded.';
      if (createdSlug) {
        if (createdVersionId) {
          try { await apiRequest(`/api/vendor/products/${createdSlug}/versions`, { method:'DELETE', body:JSON.stringify({ versionId:createdVersionId }) }); }
          catch (cleanupError) { console.error('Pending R2 upload cleanup failed', cleanupError); }
        }
        if (createdPreviewPaths.length) {
          try { await apiRequest(`/api/vendor/products/${createdSlug}/previews`, { method:'DELETE', body:JSON.stringify({ paths:createdPreviewPaths }) }); }
          catch (cleanupError) { console.error('Pending preview cleanup failed', cleanupError); }
        }
        await loadCreatorData(true);
        showToast(`${message} Your private draft is safe; retry from the product editor.`, 'warning');
        await goto(`/creator/products/${createdSlug}?tab=files`);
      } else {
        showToast(message, 'warning');
      }
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>Upload New Asset — Creator Hub — AssetGuru</title></svelte:head>

<input class="visually-hidden" bind:this={packageInput} type="file" accept=".zip,application/zip,application/x-zip-compressed" onchange={choosePackage}/>
<input class="visually-hidden" bind:this={docsInput} type="file" accept=".pdf,.txt,.md,.doc,.docx" onchange={chooseDocs}/>

{#if $platformSettings.maintenanceMode}
  <div class="maintenance-note glass"><Icon name="alert" size={20}/><span><b>Uploads paused for maintenance</b><small>Existing products remain available, but submissions are temporarily disabled.</small></span></div>
{/if}
{#if localRecovered}
  <div class="recovery-note glass"><Icon name="refresh" size={20}/><span><b>Your unfinished new asset was restored</b><small>Text, selections and pricing were recovered from this browser. Local file selections cannot survive a refresh.</small></span><button type="button" onclick={clearLocalDraft}>Discard recovered copy</button></div>
{/if}

<header class="upload-head">
  <a href="/creator/products">← Exit new asset</a>
  <div><span class="eyebrow">Creator workflow rebuild</span><h1>Create a <span class="gradient-text">new asset.</span></h1><p>Build the listing section by section, save it privately at any time, then submit it to the administrator for review.</p></div>
  <button class="button button-secondary" type="button" disabled={draftSaving || submitting} onclick={saveDraft}><Icon name="list" size={17}/>{draftSaving ? 'Saving…' : 'Save private draft'}</button>
</header>

<div class="taxonomy-note glass"><Icon name="grid" size={20}/><span><b>{CATEGORY_COUNT} categories · {SUBCATEGORY_COUNT} subcategories restored</b><small>The agreed AssetGuru taxonomy is used for creator forms, moderation and marketplace discovery.</small></span></div>

<nav class="stepper glass" aria-label="New asset sections">
  {#each steps as item}
    <button class:active={step === item.n} class:complete={checks.filter((check) => check.tab === item.n).every((check) => check.done)} type="button" onclick={() => jumpTo(item.n)}>
      <i>{checks.filter((check) => check.tab === item.n).every((check) => check.done) ? '✓' : item.n}</i>
      <span><b>{item.label}</b><small>{item.hint}</small></span>
    </button>
  {/each}
</nav>

<div class="workflow-layout">
  <main oninput={scheduleLocalSave} onchange={scheduleLocalSave}>
    {#if step === 1}
      <section class="panel glass">
        <div class="panel-title"><span>01</span><div><h2>Overview and discovery</h2><p>Use clear buyer-facing language and place the asset in the correct category.</p></div></div>
        <label>Product title <em>Required</em><input bind:value={title} maxlength="120" placeholder="e.g. Modular Neon Backstreet Kit"/><small>{title.length}/120 characters · Minimum 5.</small></label>
        <div class="two">
          <label>Primary category <em>Required</em><select bind:value={category}><option value="" disabled>Select a category</option>{#each categoryOptions as item}<option value={item.name}>{item.name}</option>{/each}</select><small>Choose one of the 12 agreed marketplace sections.</small></label>
          <label>Subcategory <em>Required</em><select bind:value={subcategory} disabled={!category}><option value="" disabled>{category ? 'Select a subcategory' : 'Choose a primary category first'}</option>{#each subcategoryOptions as item}<option value={item}>{item}</option>{/each}</select><small>This controls precise browsing and filtering.</small></label>
        </div>
        {#if categoriesLoading}<div class="inline-status"><Icon name="refresh" size={17}/><span><b>Synchronising the full category suite…</b><small>The built-in taxonomy remains available while the database is checked.</small></span></div>{/if}
        {#if categoriesWarning}<div class="inline-status warning"><Icon name="alert" size={17}/><span><b>Database category refresh warning</b><small>{categoriesWarning}</small></span><button type="button" onclick={loadCategoryOptions}>Retry</button></div>{/if}
        <label>Short summary <em>Required</em><textarea bind:value={summary} rows="3" maxlength="300" placeholder="Explain the asset’s value in one useful sentence."></textarea><small>{summary.length}/300 characters · Minimum 20.</small></label>
        <label>Search tags <span>Optional</span><input bind:value={tags} placeholder="modular, PBR, sci-fi"/><small>Separate tags with commas.</small></label>
      </section>
    {:else if step === 2}
      <section class="panel glass">
        <div class="panel-title"><span>02</span><div><h2>Files and compatibility</h2><p>Select the private buyer package and describe how it should be used.</p></div></div>
        <button class:selected={Boolean(packageFile)} class:dragging={packageDragging} class="package-dropzone" type="button" onclick={() => packageInput.click()} ondragover={dragPackage} ondragleave={leavePackage} ondrop={dropPackage}>
          <span class="folder"><FileGlyph kind="folder" size={62}/></span>
          {#if packageFile}<small>ZIP PACKAGE SELECTED</small><b>{packageFile.name}</b><em>{fileSize(packageFile.size)} · Ready for secure upload</em><span class="choose">Choose a different ZIP</span>{:else}<small>REQUIRED BUYER PACKAGE</small><b>Drag your ZIP here</b><em>or click anywhere in this box to choose the file</em><span class="choose">Choose ZIP package</span>{/if}
        </button>
        <p class="file-note">Selecting a local file does not upload it. It is only marked as stored after the R2 verification step completes.</p>
        <div class="two"><label>Release version <em>Required</em><input bind:value={version} placeholder="For example: 1.0.0"/></label><label>Minimum GameGuru MAX version<select bind:value={maxVersion}><option>2026+</option><option>2025+</option><option>2024+</option><option>Any MAX build</option></select></label></div>
        <div class="two"><label>Dependencies<input bind:value={dependencies}/></label><label>Performance profile<select bind:value={performance}><option>Lightweight</option><option>Mid-range</option><option>High detail</option></select></label></div>
        <label class="checkbox"><input type="checkbox" bind:checked={sourceFiles}/><span><b>Source files included</b><small>Tell buyers whether editable source content is included.</small></span></label>
        <div class:complete={Boolean(documentationFile)} class="document-picker"><FileGlyph kind="file" size={28}/><span><b>{documentationFile?.name ?? 'Optional documentation'}</b><small>{documentationFile ? `${fileSize(documentationFile.size)} selected` : 'PDF, TXT, MD, DOC or DOCX'}</small></span><button type="button" onclick={() => docsInput.click()}>{documentationFile ? 'Replace' : 'Choose guide'}</button></div>
      </section>
    {:else if step === 3}
      <section class="panel glass">
        <div class="panel-title"><span>03</span><div><h2>Presentation and product copy</h2><p>Use genuine previews and enough technical detail for buyers to make an informed decision.</p></div><strong>{previewFiles.length}/12 images</strong></div>
        <CreatorImageUploader files={previewFiles} onFilesChange={setPreviewFiles}/>
        <div class="video-field"><label>Showcase video <span>Optional · YouTube or Vimeo</span><input type="url" bind:value={showcaseVideoUrl} placeholder="https://www.youtube.com/watch?v=…"/></label>{#if showcaseVideo}<iframe src={showcaseVideo.embedUrl} title={`${title || 'Product'} showcase video`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>{:else if showcaseVideoError}<div class="inline-status warning"><Icon name="alert" size={17}/><span><b>Video URL needs attention</b><small>{showcaseVideoError}</small></span></div>{/if}</div>
        <label>Full product description <em>Required</em><textarea bind:value={description} rows="10" placeholder="Describe included content, ideal use cases, technical quality and setup."></textarea><small>{description.length} characters · Minimum 60.</small></label>
        <div class="two"><label>Key features<textarea bind:value={features} rows="5" placeholder="Modular pieces, LODs, collisions"></textarea><small>Separate entries with commas.</small></label><label>Package contents<textarea bind:value={contents} rows="5" placeholder="42 meshes, 18 materials"></textarea><small>Separate entries with commas.</small></label></div>
        <label>File formats<input bind:value={formats} placeholder="FBX, PNG, WAV"/><small>Separate formats with commas.</small></label>
      </section>
    {:else if step === 4}
      <section class="panel glass">
        <div class="panel-title"><span>04</span><div><h2>Pricing and licence</h2><p>Set buyer-facing GBP prices. Extended pricing cannot be lower than the standard licence.</p></div></div>
        <div class="licence-grid"><label><span>Standard commercial licence</span><div class="money"><b>£</b><input type="number" min="0" step="0.01" bind:value={price}/></div><small>Commercial use by one buyer account.</small></label><label><span>Extended team licence</span><div class="money"><b>£</b><input type="number" min={price} step="0.01" bind:value={extendedPrice}/></div><small>Broader team or studio usage rights.</small></label></div>
        <label class="checkbox"><input type="checkbox" checked={price === 0} onchange={setFree}/><span><b>Publish as a free asset</b><small>Free products still require a valid package and moderation.</small></span></label>
        {#if extendedPrice < price}<div class="inline-status warning"><Icon name="alert" size={17}/><span><b>Extended price is too low</b><small>Set it to at least £{price.toFixed(2)}.</small></span></div>{/if}
      </section>
    {:else}
      <section class="panel glass">
        <div class="panel-title"><span>05</span><div><h2>Review and submit</h2><p>The product stays private until the administrator approves it.</p></div></div>
        <div class="review-card"><span>PRODUCT SUBMISSION</span><h2>{title || 'Untitled asset'}</h2><p>{summary || 'No summary has been entered.'}</p><div><b>{price === 0 ? 'Free' : `£${price.toFixed(2)}`}</b><small>{category || 'No category'}{subcategory ? ` → ${subcategory}` : ''} · v{version || '—'}</small></div></div>
        <div class="checklist">{#each checks as item}<button class:done={item.done} type="button" onclick={() => jumpTo(item.tab)}><Icon name={item.done ? 'check' : 'alert'} size={17}/><span>{item.label}</span><b>{item.done ? 'Ready' : 'Required'}</b></button>{/each}</div>
        <label class="agreement"><input type="checkbox" bind:checked={agreed}/><span>I confirm that I have the rights to distribute every included file and that the listing accurately describes the package.</span></label>
        {#if submitting}<div class="upload-state"><Icon name="upload" size={22}/><span><b>Uploading securely · {uploadProgress}%</b><small>Keep this page open until the ZIP and all previews are verified.</small></span><div><i style={`width:${uploadProgress}%`}></i></div></div>{/if}
      </section>
    {/if}

    <div class="footer-actions"><button class="button button-secondary" type="button" disabled={step === 1 || submitting} onclick={back}>← Previous</button>{#if step < 5}<button class="button button-primary" type="button" disabled={!canContinue || submitting} onclick={next}>Continue →</button>{:else}<button class="button button-primary" type="button" disabled={!canSubmit || submitting || draftSaving} onclick={submitReview}><Icon name="shield" size={18}/>{submitting ? `Uploading ${uploadProgress}%` : 'Submit for admin review'}</button>{/if}</div>
  </main>

  <aside>
    <section class="health-card glass"><span class="eyebrow">Submission readiness</span><div class="ring" style={`--score:${completionPercent * 3.6}deg`}><b>{completionPercent}</b><small>%</small></div><h3>{canSubmit ? 'Ready to submit' : `${missingChecks.length} item${missingChecks.length === 1 ? '' : 's'} remaining`}</h3><p>Your entered text is automatically retained in this browser until a server draft is created.</p><ul>{#each checks as item}<li class:done={item.done}><button type="button" onclick={() => jumpTo(item.tab)}><Icon name={item.done ? 'check' : 'plus'} size={15}/>{item.label}</button></li>{/each}</ul></section>
    <section class="action-card glass"><h3>Product actions</h3><button class="button button-secondary" type="button" disabled={draftSaving || submitting} onclick={saveDraft}>{draftSaving ? 'Saving private draft…' : 'Save private draft'}</button><button class="button button-primary" type="button" disabled={!canSubmit || submitting || draftSaving} onclick={submitReview}>{submitting ? `Uploading ${uploadProgress}%` : 'Submit for admin review'}</button>{#if missingChecks.length}<p>Next required item: <b>{missingChecks[0].label}</b></p>{/if}</section>
  </aside>
</div>

<style>
  .visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.maintenance-note,.recovery-note,.taxonomy-note{margin-bottom:16px;padding:15px 17px;display:flex;align-items:center;gap:13px;border:1px solid #23496d;border-radius:12px;color:#00e5ff}.maintenance-note{color:#ffb547;border-color:rgba(255,181,71,.4)}.recovery-note{color:#24d89a;border-color:rgba(36,216,154,.4)}.maintenance-note span,.recovery-note span,.taxonomy-note span{display:grid;gap:4px;flex:1}.maintenance-note b,.recovery-note b,.taxonomy-note b{color:#f5f8ff;font-size:14px}.maintenance-note small,.recovery-note small,.taxonomy-note small{color:#9fb0c6;font-size:12px}.recovery-note button{padding:9px 12px;border:1px solid currentColor;border-radius:8px;color:inherit;background:transparent;cursor:pointer;font-weight:800}.upload-head{margin-bottom:18px;display:grid;grid-template-columns:1fr minmax(0,4fr) auto;gap:22px;align-items:center}.upload-head>a{color:#a9b8cd;font-size:13px}.upload-head h1{margin:7px 0 8px;font-size:clamp(2.2rem,4vw,4.5rem);letter-spacing:-.06em}.upload-head p{max-width:760px;margin:0;color:#aebbd0;font-size:14px;line-height:1.6}.stepper{margin-bottom:18px;padding:8px;display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.stepper button{min-height:68px;padding:10px 12px;display:flex;align-items:center;gap:10px;border:1px solid transparent;border-radius:10px;color:#8fa3bd;background:transparent;cursor:pointer;text-align:left}.stepper button:hover,.stepper button.active{border-color:#2a5a80;color:#fff;background:rgba(0,229,255,.06)}.stepper button.complete{color:#24d89a}.stepper i{width:32px;height:32px;display:grid;place-items:center;border:1px solid currentColor;border-radius:50%;font-size:12px;font-style:normal;font-weight:900}.stepper span{display:grid;gap:3px}.stepper b{font-size:13px}.stepper small{font-size:11px}.workflow-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:start}.workflow-layout main{min-width:0}.panel{padding:26px}.panel-title{margin-bottom:24px;display:flex;align-items:flex-start;gap:15px}.panel-title>span{width:45px;height:45px;display:grid;place-items:center;flex:0 0 auto;border:1px solid #2d678e;border-radius:12px;color:#00e5ff;background:#071225;font-size:13px;font-weight:950}.panel-title>div{flex:1}.panel-title h2{margin:0;color:#f5f8ff;font-size:26px}.panel-title p{margin:7px 0 0;color:#aebbd0;font-size:14px;line-height:1.55}.panel-title>strong{padding:8px 11px;border:1px solid #2d678e;border-radius:9px;color:#00e5ff;font-size:12px}.panel label{margin-bottom:18px;display:grid;gap:9px;color:#d9e3f0;font-size:14px;font-weight:850}.panel label em{color:#ffc857;font-size:12px;font-style:normal}.panel label>span{color:#9fb0c6;font-size:12px;font-weight:600}.panel input,.panel select,.panel textarea{width:100%;padding:0 14px;border:1px solid #27547a;border-radius:10px;color:#fff;background:#030a14;font:inherit;font-size:16px}.panel input,.panel select{min-height:50px}.panel textarea{padding-block:13px;line-height:1.6;resize:vertical}.panel input::placeholder,.panel textarea::placeholder{color:#72849d}.panel label small{color:#9fb0c6;font-size:12px;font-weight:500}.two,.licence-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.inline-status{margin:0 0 18px;padding:13px 14px;display:flex;align-items:center;gap:11px;border:1px solid #28577c;border-radius:10px;color:#00e5ff;background:rgba(0,229,255,.045)}.inline-status.warning{color:#ffb547;border-color:rgba(255,181,71,.4);background:rgba(255,181,71,.05)}.inline-status span{display:grid;gap:4px;flex:1}.inline-status b{color:#f5f8ff;font-size:13px}.inline-status small{color:#aebbd0;font-size:12px}.inline-status button{padding:8px 11px;border:1px solid currentColor;border-radius:7px;color:inherit;background:transparent;cursor:pointer}.package-dropzone{width:100%;min-height:285px;padding:34px;display:grid;place-items:center;align-content:center;gap:10px;border:2px dashed #2d678e;border-radius:18px;color:#00e5ff;background:radial-gradient(circle at 50% 22%,rgba(0,229,255,.14),transparent 20rem),#030a14;cursor:pointer;text-align:center}.package-dropzone:hover,.package-dropzone.dragging{border-color:#00e5ff;background:radial-gradient(circle at 50% 22%,rgba(0,229,255,.22),transparent 20rem),#04101d}.package-dropzone.selected{border-style:solid;border-color:rgba(36,216,154,.7);color:#24d89a;background:radial-gradient(circle at 50% 22%,rgba(36,216,154,.16),transparent 20rem),#04110f}.package-dropzone .folder{width:96px;height:82px;display:grid;place-items:center;border:1px solid currentColor;border-radius:20px;background:rgba(0,229,255,.07)}.package-dropzone small{font-size:11px;font-weight:950;letter-spacing:.14em}.package-dropzone>b{max-width:760px;overflow-wrap:anywhere;color:#fff;font-size:26px}.package-dropzone em{color:#aebbd0;font-size:15px;font-style:normal}.package-dropzone .choose{padding:11px 17px;border:1px solid currentColor;border-radius:9px;color:#03121b;background:#00e5ff;font-size:14px;font-weight:950}.package-dropzone.selected .choose{color:#04130e;background:#24d89a}.file-note{margin:10px 0 20px;color:#9fb0c6;font-size:12px;line-height:1.6;text-align:center}.checkbox{padding:15px!important;grid-template-columns:auto 1fr!important;align-items:start;border:1px solid #23496d;border-radius:11px;background:#06101e}.checkbox input{width:18px!important;min-height:18px!important;margin-top:2px;padding:0!important;accent-color:#00e5ff}.checkbox span{display:grid;gap:4px!important}.checkbox b{color:#f5f8ff;font-size:14px}.document-picker{margin-bottom:18px;padding:16px;display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:center;border:1px dashed #2d678e;border-radius:12px;color:#8b5cf6;background:#06101e}.document-picker.complete{border-style:solid;border-color:rgba(36,216,154,.55);color:#24d89a}.document-picker span{display:grid;gap:4px}.document-picker b{overflow:hidden;color:#f5f8ff;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.document-picker small{color:#9fb0c6;font-size:12px}.document-picker button{min-height:42px;padding:0 14px;border:1px solid currentColor;border-radius:8px;color:inherit;background:transparent;cursor:pointer;font-size:13px;font-weight:850}.video-field{margin:22px 0;padding:18px;border:1px solid #23496d;border-radius:12px;background:#06101e}.video-field iframe{width:100%;margin-top:14px;aspect-ratio:16/9;border:0;border-radius:10px}.licence-grid label{padding:18px;border:1px solid #23496d;border-radius:12px;background:#06101e}.licence-grid label>span{color:#f5f8ff;font-size:15px;font-weight:900}.money{display:flex;align-items:center;border:1px solid #2d678e;border-radius:10px;background:#030a14}.money b{padding-left:14px;color:#00e5ff;font-size:20px}.money input{border:0;background:transparent;font-size:23px;font-weight:900}.review-card{margin-bottom:18px;padding:22px;border:1px solid #2d678e;border-radius:14px;background:linear-gradient(135deg,rgba(0,229,255,.07),transparent 45%),#050d18}.review-card>span{color:#00e5ff;font-size:11px;font-weight:950;letter-spacing:.14em}.review-card h2{margin:10px 0 7px;font-size:25px}.review-card p{margin:0;color:#aebbd0;font-size:14px;line-height:1.6}.review-card>div{margin-top:18px;display:flex;align-items:baseline;justify-content:space-between;gap:14px}.review-card>div b{font-size:25px}.review-card>div small{color:#9fb0c6;font-size:12px}.checklist{margin-bottom:18px;display:grid;border:1px solid #23496d;border-radius:12px;overflow:hidden}.checklist button{min-height:48px;padding:0 13px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:0;border-bottom:1px solid #183352;color:#ffb547;background:#06101e;cursor:pointer;text-align:left}.checklist button:last-child{border-bottom:0}.checklist button.done{color:#24d89a}.checklist span{color:#d8e3f0;font-size:13px}.checklist b{font-size:11px}.agreement{padding:16px!important;grid-template-columns:auto 1fr!important;align-items:start;border:1px solid #2d678e;border-radius:11px;line-height:1.6}.agreement input{width:18px!important;min-height:18px!important;margin-top:2px;padding:0!important;accent-color:#00e5ff}.upload-state{padding:15px;display:grid;grid-template-columns:auto 1fr;gap:11px;align-items:center;border:1px solid rgba(0,229,255,.4);border-radius:11px;color:#00e5ff;background:rgba(0,229,255,.05)}.upload-state span{display:grid;gap:4px}.upload-state b{color:#f5f8ff;font-size:14px}.upload-state small{color:#9fb0c6;font-size:12px}.upload-state>div{grid-column:1/-1;height:7px;overflow:hidden;border-radius:99px;background:#10253a}.upload-state i{height:100%;display:block;background:linear-gradient(90deg,#00e5ff,#8b5cf6)}.footer-actions{margin-top:14px;display:flex;justify-content:space-between;gap:12px}.workflow-layout aside{display:grid;gap:14px;position:sticky;top:18px}.health-card,.action-card{padding:18px}.ring{--score:0deg;width:105px;height:105px;margin:18px auto 12px;display:grid;place-items:center;align-content:center;border-radius:50%;background:conic-gradient(#00e5ff var(--score),#142b45 0);position:relative}.ring:after{content:'';position:absolute;inset:8px;border-radius:50%;background:#071225}.ring b,.ring small{position:relative;z-index:1}.ring b{font-size:27px}.ring small{color:#9fb0c6;font-size:11px}.health-card h3{text-align:center}.health-card>p{color:#9fb0c6;font-size:12px;line-height:1.6;text-align:center}.health-card ul{padding:0;list-style:none}.health-card li{border-top:1px solid #183352}.health-card li button{width:100%;min-height:42px;padding:0;display:flex;align-items:center;gap:8px;border:0;color:#9fb0c6;background:transparent;cursor:pointer;text-align:left;font-size:12px}.health-card li.done button{color:#24d89a}.action-card{display:grid;gap:10px}.action-card h3{margin:0 0 4px}.action-card p{margin:3px 0 0;color:#9fb0c6;font-size:12px;line-height:1.5}.action-card p b{color:#f5f8ff}.button:disabled{opacity:.45;cursor:not-allowed;transform:none}@media(max-width:1050px){.workflow-layout{grid-template-columns:1fr}.workflow-layout aside{position:static;grid-template-columns:1fr 1fr}.stepper{grid-template-columns:repeat(3,1fr)}.upload-head{grid-template-columns:1fr}.upload-head .button{width:max-content}}@media(max-width:700px){.two,.licence-grid,.workflow-layout aside{grid-template-columns:1fr}.stepper{grid-template-columns:1fr 1fr}.panel{padding:20px}.upload-head .button,.footer-actions .button{width:100%}.footer-actions{display:grid}.document-picker{grid-template-columns:auto 1fr}.document-picker button{grid-column:1/-1}.review-card>div{align-items:flex-start;flex-direction:column}.recovery-note{align-items:flex-start;flex-wrap:wrap}.recovery-note button{width:100%}}@media(max-width:480px){.stepper{grid-template-columns:1fr}.panel-title{flex-wrap:wrap}.package-dropzone{min-height:250px;padding:24px}.package-dropzone>b{font-size:22px}}
</style>
