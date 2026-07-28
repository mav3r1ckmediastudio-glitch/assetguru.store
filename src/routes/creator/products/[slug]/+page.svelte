<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import FileGlyph from '$lib/components/FileGlyph.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import CreatorImageUploader from '$lib/components/CreatorImageUploader.svelte';
  import { CATEGORY_COUNT, CATEGORY_TAXONOMY, SUBCATEGORY_COUNT } from '$lib/data/category-taxonomy';
  import { creatorProfile, creatorProducts, loadCreatorProduct, removeCreatorProduct, setProductStatus, storefront, updateCreatorProduct, updateStorefront } from '$lib/stores/creator';
  import { showToast } from '$lib/stores/marketplace';
  import { apiRequest } from '$lib/api';
  import { uploadFileToR2, type R2BrowserUpload } from '$lib/r2-upload';
  import { getSupabaseBrowserClient } from '$lib/supabase/client';
  import { parseShowcaseVideoUrl } from '$lib/showcase-video';

  type CategoryOption = { id:string; name:string; slug:string; subcategories:string[] };
  type PreviewUpload = { storage:'supabase'; bucket:string; path:string; token:string; role:string; name:string; type:string; size:number };
  type StoredPackage = { id:string; version:string; status:string; isCurrent:boolean; verified:boolean; size:string; created:string; releaseNotes:string; packageName:string; documentationName?:string };

  const tabs = ['Overview','Pricing & licence','Files & versions','Presentation','Support'] as const;
  const fallbackCategories: CategoryOption[] = CATEGORY_TAXONOMY.map((item) => ({ id:item.slug, name:item.name, slug:item.slug, subcategories:item.subcategories }));
  const requestedTab = page.url.searchParams.get('tab');
  let tab: typeof tabs[number] = requestedTab === 'files' ? 'Files & versions' : requestedTab === 'presentation' ? 'Presentation' : requestedTab === 'pricing' ? 'Pricing & licence' : requestedTab === 'support' ? 'Support' : 'Overview';
  $: product = $creatorProducts.find((item) => item.slug === page.params.slug);

  let seededSlug = '';
  let title = '';
  let category = '';
  let subcategory = '';
  let summary = '';
  let description = '';
  let price = 0;
  let extendedPrice = 0;
  let compatibility = 'GameGuru MAX';
  let maxVersion = 'Any MAX build';
  let sourceFiles = false;
  let dependencies = 'None';
  let performance:'Lightweight'|'Mid-range'|'High detail' = 'Mid-range';
  let licence = 'Standard commercial licence';
  let tagsText = '';
  let featuresText = '';
  let contentsText = '';
  let formatsText = '';
  let showcaseVideoUrl = '';
  let showcaseVideo: ReturnType<typeof parseShowcaseVideoUrl> = null;
  let showcaseVideoError = '';

  let supportEmail = '';
  let supportResponseTime = 'Within 2 business days';
  let supportPromise = '';
  let updateCommitment = '';
  let supportSaving = false;
  let supportSeedKey = '';

  let categoryOptions: CategoryOption[] = fallbackCategories;
  let categoriesLoading = false;
  let categoriesWarning = '';
  $: selectedCategory = categoryOptions.find((item) => item.name === category);
  $: subcategoryOptions = selectedCategory?.subcategories ?? [];
  $: if (subcategory && !subcategoryOptions.includes(subcategory)) subcategory = '';

  let productLoading = true;
  let productLoadError = '';
  let editorReady = false;
  let recoveredEditorDraft = false;
  let editorSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let saving = false;
  let reviewSubmitting = false;

  let versionNumber = '';
  let releaseNotes = '';
  let packageFile: File | undefined;
  let documentationFile: File | undefined;
  let packageInput: HTMLInputElement | undefined;
  let documentationInput: HTMLInputElement | undefined;
  let packageDragging = false;
  let versionBusy = false;
  let versionProgress = 0;
  let versionUploadState:'idle'|'uploading'|'verified'|'failed' = 'idle';
  let versionUploadMessage = '';

  let previewFiles: File[] = [];
  let previewBusy = false;
  let previewProgress = 0;
  let previewMessage = '';

  let storedPackages: StoredPackage[] = [];
  let storedPackagesLoading = false;
  let storedPackagesError = '';

  $: showcaseVideo = parseShowcaseVideoUrl(showcaseVideoUrl);
  $: showcaseVideoError = showcaseVideoUrl.trim() && !showcaseVideo ? 'Enter a valid YouTube or Vimeo video URL.' : '';
  $: {
    const nextSupportSeedKey = [$storefront.supportEmail, $storefront.responseTime, $storefront.supportPromise, $storefront.updateCommitment].join('\u0000');
    if (nextSupportSeedKey !== supportSeedKey && !supportSaving) {
      supportSeedKey = nextSupportSeedKey;
      supportEmail = $storefront.supportEmail;
      supportResponseTime = $storefront.responseTime || 'Within 2 business days';
      supportPromise = $storefront.supportPromise;
      updateCommitment = $storefront.updateCommitment;
    }
  }
  $: supportDirty = supportEmail.trim() !== $storefront.supportEmail || supportResponseTime !== $storefront.responseTime || supportPromise !== $storefront.supportPromise || updateCommitment !== $storefront.updateCommitment;
  $: commissionRate = Math.max(0, Math.min(100, Number($creatorProfile.commission || 0)));
  $: estimatedCommission = price * (commissionRate / 100);
  $: estimatedEarnings = price - estimatedCommission;
  $: editingLocked = product?.status === 'In review';

  $: submissionChecks = product ? [
    { label:'Product title', done:title.trim().length >= 5, tab:'Overview' as const },
    { label:'Category and subcategory', done:Boolean(category && subcategory && subcategoryOptions.includes(subcategory)), tab:'Overview' as const },
    { label:'Short summary', done:summary.trim().length >= 20, tab:'Overview' as const },
    { label:'Full description', done:description.trim().length >= 60, tab:'Overview' as const },
    { label:'Verified ZIP package', done:storedPackages.some((item) => item.verified), tab:'Files & versions' as const },
    { label:'At least three preview images', done:product.images.length >= 3, tab:'Presentation' as const },
    { label:'Valid showcase video', done:!showcaseVideoError, tab:'Presentation' as const },
    { label:'Valid pricing', done:price >= 0 && extendedPrice >= price, tab:'Pricing & licence' as const },
    { label:'Licence summary', done:licence.trim().length >= 10, tab:'Pricing & licence' as const }
  ] : [];
  $: missingSubmissionChecks = submissionChecks.filter((item) => !item.done);
  $: healthScore = submissionChecks.length ? Math.round(submissionChecks.filter((item) => item.done).length / submissionChecks.length * 100) : 0;
  $: canSubmitReview = Boolean(product && !editingLocked && missingSubmissionChecks.length === 0 && !storedPackagesLoading);

  const lines = (value:string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const commaList = (value:string) => value.split(',').map((item) => item.trim()).filter(Boolean);
  const selectedFile = (event:Event) => (event.currentTarget as HTMLInputElement).files?.[0];
  const formatFileSize = (size:number) => size >= 1024 ** 3 ? `${(size / 1024 ** 3).toFixed(2)} GB` : `${Math.max(1, Math.round(size / 1024 / 1024))} MB`;
  const versionDraftKey = (slug:string) => `assetguru:version-draft:${slug}`;
  const editorDraftKey = (slug:string) => `assetguru:product-editor-draft:v2:${slug}`;

  function seedFields(useLocal = true) {
    if (!product) return;
    editorReady = false;
    title = product.title;
    category = product.category === 'Uncategorised' ? '' : product.category;
    subcategory = product.subcategory ?? '';
    summary = product.summary;
    description = product.description;
    price = product.price;
    extendedPrice = product.extendedPrice ?? Number((product.price * 2.5).toFixed(2));
    compatibility = product.compatibility;
    maxVersion = product.maxVersion;
    sourceFiles = product.sourceFiles;
    dependencies = product.dependencies;
    performance = product.performance;
    licence = product.licence;
    tagsText = product.tags.join(', ');
    featuresText = product.features.join('\n');
    contentsText = product.contents.join('\n');
    formatsText = product.formats.join(', ');
    showcaseVideoUrl = product.showcaseVideoUrl ?? '';
    recoveredEditorDraft = false;

    if (useLocal && browser) {
      try {
        const saved = JSON.parse(localStorage.getItem(editorDraftKey(product.slug)) ?? 'null');
        if (saved && saved.baseUpdated === product.updated) {
          title = typeof saved.title === 'string' ? saved.title : title;
          category = typeof saved.category === 'string' ? saved.category : category;
          subcategory = typeof saved.subcategory === 'string' ? saved.subcategory : subcategory;
          summary = typeof saved.summary === 'string' ? saved.summary : summary;
          description = typeof saved.description === 'string' ? saved.description : description;
          price = Number.isFinite(saved.price) ? saved.price : price;
          extendedPrice = Number.isFinite(saved.extendedPrice) ? saved.extendedPrice : extendedPrice;
          compatibility = typeof saved.compatibility === 'string' ? saved.compatibility : compatibility;
          maxVersion = typeof saved.maxVersion === 'string' ? saved.maxVersion : maxVersion;
          sourceFiles = typeof saved.sourceFiles === 'boolean' ? saved.sourceFiles : sourceFiles;
          dependencies = typeof saved.dependencies === 'string' ? saved.dependencies : dependencies;
          performance = ['Lightweight','Mid-range','High detail'].includes(saved.performance) ? saved.performance : performance;
          licence = typeof saved.licence === 'string' ? saved.licence : licence;
          tagsText = typeof saved.tagsText === 'string' ? saved.tagsText : tagsText;
          featuresText = typeof saved.featuresText === 'string' ? saved.featuresText : featuresText;
          contentsText = typeof saved.contentsText === 'string' ? saved.contentsText : contentsText;
          formatsText = typeof saved.formatsText === 'string' ? saved.formatsText : formatsText;
          showcaseVideoUrl = typeof saved.showcaseVideoUrl === 'string' ? saved.showcaseVideoUrl : showcaseVideoUrl;
          recoveredEditorDraft = true;
        }
      } catch {
        localStorage.removeItem(editorDraftKey(product.slug));
      }
    }
    editorReady = true;
  }

  $: if (product && product.slug !== seededSlug) {
    seededSlug = product.slug;
    seedFields(true);
    const savedVersion = readVersionDraft(product.slug);
    versionNumber = savedVersion.versionNumber;
    releaseNotes = savedVersion.releaseNotes;
    packageFile = undefined;
    documentationFile = undefined;
    void loadStoredPackages(product.slug);
  }

  function editorSnapshot() {
    return { baseUpdated:product?.updated, title,category,subcategory,summary,description,price,extendedPrice,compatibility,maxVersion,sourceFiles,dependencies,performance,licence,tagsText,featuresText,contentsText,formatsText,showcaseVideoUrl,updatedAt:Date.now() };
  }
  function scheduleEditorSave() {
    if (!browser || !editorReady || !product || editingLocked) return;
    if (editorSaveTimer) clearTimeout(editorSaveTimer);
    editorSaveTimer = setTimeout(() => localStorage.setItem(editorDraftKey(product!.slug), JSON.stringify(editorSnapshot())), 250);
  }
  function clearEditorDraft() { if (browser && product) localStorage.removeItem(editorDraftKey(product.slug)); recoveredEditorDraft = false; }
  function discardRecoveredDraft() { clearEditorDraft(); seedFields(false); }

  function readVersionDraft(slug:string) {
    if (!browser) return { versionNumber:'', releaseNotes:'' };
    try {
      const value = JSON.parse(localStorage.getItem(versionDraftKey(slug)) ?? '{}');
      return { versionNumber:typeof value.versionNumber === 'string' ? value.versionNumber : '', releaseNotes:typeof value.releaseNotes === 'string' ? value.releaseNotes : '' };
    } catch { return { versionNumber:'', releaseNotes:'' }; }
  }
  function persistVersionDraft() { if (browser && product) localStorage.setItem(versionDraftKey(product.slug), JSON.stringify({ versionNumber, releaseNotes })); }
  function editVersionNumber(event:Event) { versionNumber = (event.currentTarget as HTMLInputElement).value; persistVersionDraft(); }
  function editReleaseNotes(event:Event) { releaseNotes = (event.currentTarget as HTMLTextAreaElement).value; persistVersionDraft(); }
  function clearVersionDraft() { if (browser && product) localStorage.removeItem(versionDraftKey(product.slug)); }

  function setPackageFile(file?:File) {
    if (file && !file.name.toLowerCase().endsWith('.zip')) { showToast('The asset package must be a ZIP file.', 'warning'); return; }
    packageFile = file;
    versionProgress = 0;
    versionUploadState = 'idle';
    versionUploadMessage = '';
  }
  function selectPackage(event:Event) { setPackageFile(selectedFile(event)); }
  function dragPackage(event:DragEvent) { event.preventDefault(); if (!versionBusy) packageDragging = true; }
  function leavePackage(event:DragEvent) { event.preventDefault(); packageDragging = false; }
  function dropPackage(event:DragEvent) { event.preventDefault(); packageDragging = false; if (!versionBusy) setPackageFile(event.dataTransfer?.files?.[0]); }
  function selectDocumentation(event:Event) { documentationFile = selectedFile(event); if (versionUploadState === 'failed') { versionUploadState = 'idle'; versionUploadMessage = ''; } }
  function setPreviewFiles(next:File[]) { previewFiles = next; previewProgress = 0; previewMessage = ''; }

  async function loadCategoryOptions() {
    categoriesLoading = true;
    categoriesWarning = '';
    categoryOptions = fallbackCategories;
    try {
      const data = await apiRequest<{categories:CategoryOption[]}>('/api/vendor/categories', { cache:'no-store' });
      if (!data.categories?.length) categoriesWarning = 'The database category list was empty. The complete built-in taxonomy remains active.';
    } catch (error) {
      categoriesWarning = `${error instanceof Error ? error.message : 'The database category list could not be refreshed.'} The complete built-in taxonomy remains active.`;
    } finally { categoriesLoading = false; }
  }

  onMount(() => {
    void loadCategoryOptions();
    void (async () => {
      productLoading = true;
      productLoadError = '';
      try {
        const slug = page.params.slug;
        if (!slug) throw new Error('The product address is missing.');
        await loadCreatorProduct(slug);
      }
      catch (error) { productLoadError = error instanceof Error ? error.message : 'The product could not be loaded.'; }
      finally { productLoading = false; }
    })();
    return () => { if (editorSaveTimer) clearTimeout(editorSaveTimer); };
  });

  async function save() {
    if (!product || editingLocked) return false;
    if (!title.trim()) { showToast('Enter a product title before saving.', 'warning'); tab = 'Overview'; return false; }
    if (category && (!subcategory || !subcategoryOptions.includes(subcategory))) { showToast('Choose a valid subcategory.', 'warning'); tab = 'Overview'; return false; }
    if (extendedPrice < price) { showToast('Extended licence price cannot be below the standard price.', 'warning'); tab = 'Pricing & licence'; return false; }
    if (showcaseVideoError) { showToast(showcaseVideoError, 'warning'); tab = 'Presentation'; return false; }
    saving = true;
    const patch:any = {
      title, summary, description, price, extendedPrice, compatibility, maxVersion,
      sourceFiles, dependencies, performance, licence, tags:commaList(tagsText), features:lines(featuresText),
      contents:lines(contentsText), formats:commaList(formatsText), showcaseVideoUrl:showcaseVideo?.canonicalUrl ?? ''
    };
    if (category) { patch.category = category; patch.subcategory = subcategory; }
    const saved = await updateCreatorProduct(product.slug, patch);
    saving = false;
    if (saved) { clearEditorDraft(); return true; }
    return false;
  }

  async function submitReview() {
    if (!product || reviewSubmitting || editingLocked) return;
    if (!canSubmitReview) {
      const first = missingSubmissionChecks[0];
      if (first) tab = first.tab;
      showToast(first ? `Complete: ${first.label}.` : 'Complete the listing before submitting.', 'warning');
      return;
    }
    reviewSubmitting = true;
    const saved = await save();
    if (saved) {
      const submitted = await setProductStatus(product.slug, 'In review');
      if (submitted) { clearEditorDraft(); await loadCreatorProduct(product.slug); }
    }
    reviewSubmitting = false;
  }

  async function saveSupportPolicies() {
    const email = supportEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Enter a valid support email address.', 'warning');
      return false;
    }
    if (!supportResponseTime.trim()) {
      showToast('Choose a support response target.', 'warning');
      return false;
    }
    supportSaving = true;
    const saved = await updateStorefront({
      ...$storefront,
      supportEmail: email,
      responseTime: supportResponseTime,
      supportPromise: supportPromise.trim(),
      updateCommitment: updateCommitment.trim()
    });
    supportSaving = false;
    return Boolean(saved);
  }

  async function retireListing() {
    if (!product || !confirm(`Remove “${product.title}” from sale? Existing buyers will keep access.`)) return;
    await setProductStatus(product.slug, 'Retired');
  }

  async function deleteListing() {
    if (!product) return;
    const publishedWarning = product.status === 'Published' ? ' It will immediately disappear from the marketplace.' : '';
    if (!confirm(`Permanently delete “${product.title}”?${publishedWarning} All preview images, packages and documentation will be deleted. This cannot be undone.`)) return;
    const removed = await removeCreatorProduct(product.slug);
    if (removed) await goto('/creator/products');
  }

  async function loadStoredPackages(slug:string) {
    storedPackagesLoading = true;
    storedPackagesError = '';
    try {
      const response = await apiRequest<{versions:StoredPackage[]}>(`/api/vendor/products/${slug}/versions`, { cache:'no-store' });
      storedPackages = response.versions ?? [];
    } catch (error) {
      storedPackages = [];
      storedPackagesError = error instanceof Error ? error.message : 'Stored package details could not be loaded.';
    } finally { storedPackagesLoading = false; }
  }

  async function uploadPreviews() {
    if (!product || previewFiles.length < 3) { showToast('Choose between 3 and 12 preview images.', 'warning'); return; }
    previewBusy = true;
    previewProgress = 0;
    previewMessage = 'Preparing secure preview uploads…';
    let preparedPaths:string[] = [];
    try {
      const selected = [...previewFiles];
      const response = await apiRequest<{uploads:PreviewUpload[]}>(`/api/vendor/products/${product.slug}/previews`, {
        method:'POST', body:JSON.stringify({ files:selected.map((file) => ({ name:file.name, size:file.size, type:file.type })) })
      });
      preparedPaths = response.uploads.map((upload) => upload.path);
      const supabase = getSupabaseBrowserClient();
      for (const [index, upload] of response.uploads.entries()) {
        const file = selected[index];
        if (!file) throw new Error(`Missing preview file ${index + 1}.`);
        previewMessage = `Uploading preview ${index + 1} of ${selected.length}…`;
        const { error } = await supabase.storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file, { contentType:file.type });
        if (error) throw error;
        previewProgress = Math.round(((index + 1) / selected.length) * 100);
      }
      previewMessage = 'Verifying previews…';
      await apiRequest(`/api/vendor/products/${product.slug}/previews`, { method:'PATCH', body:JSON.stringify({ paths:preparedPaths }) });
      await loadCreatorProduct(product.slug);
      previewFiles = [];
      previewProgress = 100;
      previewMessage = 'Preview gallery uploaded and verified.';
      showToast('Preview gallery uploaded and verified.', 'success');
    } catch (error) {
      if (preparedPaths.length) {
        try { await apiRequest(`/api/vendor/products/${product.slug}/previews`, { method:'DELETE', body:JSON.stringify({ paths:preparedPaths }) }); }
        catch (cleanupError) { console.error('Pending preview cleanup failed', cleanupError); }
      }
      previewMessage = error instanceof Error ? error.message : 'Preview upload failed.';
      showToast(`${previewMessage} Existing previews were not changed.`, 'warning');
    } finally { previewBusy = false; }
  }

  async function uploadVersion() {
    if (!product || !packageFile || !versionNumber.trim() || releaseNotes.trim().length < 10) {
      showToast('Choose a package and enter a version number with release notes.', 'warning');
      return;
    }
    versionBusy = true;
    versionProgress = 0;
    versionUploadState = 'uploading';
    versionUploadMessage = 'Uploading directly to private Cloudflare R2…';
    let preparedVersionId = '';
    try {
      const selectedPackage = packageFile;
      const selectedDocumentation = documentationFile;
      const response = await apiRequest<{versionId:string;uploads:R2BrowserUpload[]}>(`/api/vendor/products/${product.slug}/versions`, {
        method:'POST',
        body:JSON.stringify({
          version:versionNumber, releaseNotes,
          package:{ name:selectedPackage.name, size:selectedPackage.size, type:selectedPackage.type || 'application/octet-stream' },
          documentation:selectedDocumentation ? { name:selectedDocumentation.name, size:selectedDocumentation.size, type:selectedDocumentation.type || 'application/octet-stream' } : undefined
        })
      });
      preparedVersionId = response.versionId;
      const loaded = new Map<string,number>();
      const totalBytes = response.uploads.reduce((sum, upload) => sum + upload.size, 0);
      const updateProgress = (role:string, bytes:number) => {
        loaded.set(role, bytes);
        versionProgress = Math.round([...loaded.values()].reduce((sum, value) => sum + value, 0) / Math.max(1, totalBytes) * 100);
      };
      for (const upload of response.uploads) {
        const file = upload.role === 'package' ? selectedPackage : selectedDocumentation;
        if (!file) continue;
        await uploadFileToR2(upload, file, (bytes) => updateProgress(upload.role, bytes));
      }
      versionUploadMessage = 'Upload complete. Verifying the stored object size…';
      await apiRequest(`/api/vendor/products/${product.slug}/versions`, { method:'PATCH', body:JSON.stringify({ versionId:response.versionId, packageSize:selectedPackage.size, documentationSize:selectedDocumentation?.size }) });
      await loadCreatorProduct(product.slug);
      await loadStoredPackages(product.slug);
      clearVersionDraft();
      versionNumber = '';
      releaseNotes = '';
      packageFile = undefined;
      documentationFile = undefined;
      if (packageInput) packageInput.value = '';
      if (documentationInput) documentationInput.value = '';
      versionProgress = 100;
      versionUploadState = 'verified';
      versionUploadMessage = 'Package uploaded to R2 and verified.';
      showToast('Package uploaded to R2 and verified.', 'success');
    } catch (error) {
      if (preparedVersionId) {
        try { await apiRequest(`/api/vendor/products/${product.slug}/versions`, { method:'DELETE', body:JSON.stringify({ versionId:preparedVersionId }) }); }
        catch (cleanupError) { console.error('Pending R2 upload cleanup failed', cleanupError); }
      }
      versionUploadState = 'failed';
      versionUploadMessage = error instanceof Error ? error.message : 'Version upload failed.';
      showToast(`${versionUploadMessage} The draft itself was not changed.`, 'warning');
    } finally { versionBusy = false; }
  }
</script>

<svelte:head><title>{product?.title ?? 'Product unavailable'} — Creator Hub</title></svelte:head>

{#if product}
  <header class="product-head">
    <a href="/creator/products">← All products</a>
    <div class="head-main">
      <img src={product.image} alt=""/>
      <div><div class="head-status"><StatusPill status={product.status}/><span>{product.category}{product.subcategory ? ` → ${product.subcategory}` : ''}</span><span>v{product.version}</span></div><h1>{product.title}</h1><p>Last updated {product.updated} · {product.views.toLocaleString('en-GB')} listing views</p></div>
      <div class="head-actions">{#if product.status === 'Published'}<a class="button button-secondary" href={`/marketplace/${product.slug}`}><Icon name="eye" size={17}/>View listing</a>{/if}<button class="button button-secondary" type="button" disabled={saving || editingLocked} onclick={save}><Icon name="check" size={17}/>{saving ? 'Saving…' : 'Save changes'}</button>{#if product.status !== 'Published' && product.status !== 'In review'}<button class="button button-primary" type="button" disabled={!canSubmitReview || reviewSubmitting || saving} onclick={submitReview}><Icon name="shield" size={17}/>{reviewSubmitting ? 'Submitting…' : product.status === 'Changes required' ? 'Resubmit for review' : 'Submit for admin review'}</button>{/if}</div>
    </div>
  </header>

  {#if recoveredEditorDraft}<div class="notice recovered"><Icon name="refresh" size={20}/><div><b>Unsaved changes were restored</b><p>This browser retained text you entered after the last server save.</p></div><button type="button" onclick={discardRecoveredDraft}>Discard restored changes</button></div>{/if}
  {#if product.status === 'Changes required'}<div class="notice warning"><Icon name="alert" size={20}/><div><b>Marketplace review requested changes</b><p>{product.moderationNote || 'Review the listing and package, then resubmit when the requested changes are complete.'}</p></div><button type="button" disabled={!canSubmitReview} onclick={submitReview}>Resubmit for review</button></div>{/if}
  {#if product.status === 'In review'}<div class="notice review"><Icon name="clock" size={20}/><div><b>This release is being reviewed</b><p>Editing is locked until an administrator approves it or requests changes.</p></div><span>Moderation pending</span></div>{/if}
  {#if categoriesWarning}<div class="notice warning"><Icon name="alert" size={20}/><div><b>Category synchronisation warning</b><p>{categoriesWarning}</p></div><button type="button" onclick={loadCategoryOptions}>Retry</button></div>{/if}

  <div class="taxonomy-strip glass"><Icon name="grid" size={19}/><span><b>{CATEGORY_COUNT} categories · {SUBCATEGORY_COUNT} subcategories</b><small>The full agreed AssetGuru taxonomy is active in this editor.</small></span>{#if categoriesLoading}<em>Synchronising…</em>{/if}</div>

  <nav class="tabs glass">{#each tabs as item}<button class:active={tab === item} type="button" onclick={() => tab = item}>{item}{#if item === 'Files & versions' && storedPackages.some((entry) => entry.verified)}<i>✓</i>{/if}{#if item === 'Presentation' && product.images.length >= 3}<i>✓</i>{/if}</button>{/each}</nav>

  <div class="editor-layout">
    <main oninput={scheduleEditorSave} onchange={scheduleEditorSave}>
      {#if tab === 'Overview'}
        <section class="panel glass">
          <div class="panel-title"><div><span class="eyebrow">Listing essentials</span><h2>Overview and discovery</h2><p>Saved values reappear when the creator returns to this product.</p></div><span class="score">Completion <b>{healthScore}%</b></span></div>
          <label>Product title <em>Required</em><input bind:value={title} maxlength="120" disabled={editingLocked}/><small>{title.length}/120 characters · Minimum 5.</small></label>
          <div class="two"><label>Primary category <em>Required</em><select bind:value={category} disabled={editingLocked}><option value="" disabled>Select a category</option>{#each categoryOptions as item}<option value={item.name}>{item.name}</option>{/each}</select><small>One of the 12 agreed marketplace sections.</small></label><label>Subcategory <em>Required</em><select bind:value={subcategory} disabled={editingLocked || !category}><option value="" disabled>{category ? 'Select a subcategory' : 'Choose a category first'}</option>{#each subcategoryOptions as item}<option value={item}>{item}</option>{/each}</select><small>Used for precise search and filtering.</small></label></div>
          <label>Short summary <em>Required</em><textarea rows="3" bind:value={summary} maxlength="300" disabled={editingLocked}></textarea><small>{summary.length}/300 characters · Minimum 20.</small></label>
          <label>Full description <em>Required</em><textarea rows="10" bind:value={description} disabled={editingLocked}></textarea><small>{description.length} characters · Minimum 60.</small></label>
          <div class="two"><label>Compatibility<input bind:value={compatibility} disabled={editingLocked}/></label><label>Minimum MAX version<select bind:value={maxVersion} disabled={editingLocked}><option>2024+</option><option>2025+</option><option>2026+</option><option>Any MAX build</option></select></label></div>
          <div class="two"><label>Dependencies<input bind:value={dependencies} disabled={editingLocked}/></label><label>Performance profile<select bind:value={performance} disabled={editingLocked}><option>Lightweight</option><option>Mid-range</option><option>High detail</option></select></label></div>
          <label class="checkbox"><input type="checkbox" bind:checked={sourceFiles} disabled={editingLocked}/><span><b>Source files included</b><small>Tell buyers whether editable source content is part of the package.</small></span></label>
          <label>Search tags<input bind:value={tagsText} placeholder="environment, medieval, modular" disabled={editingLocked}/><small>Comma-separated.</small></label>
          <div class="two"><label>Key features<textarea rows="6" bind:value={featuresText} placeholder="One feature per line" disabled={editingLocked}></textarea></label><label>Package contents<textarea rows="6" bind:value={contentsText} placeholder="One item per line" disabled={editingLocked}></textarea></label></div>
          <label>File formats<input bind:value={formatsText} placeholder="FBX, PNG, WAV" disabled={editingLocked}/><small>Comma-separated.</small></label>
        </section>
      {:else if tab === 'Pricing & licence'}
        <section class="panel glass">
          <div class="panel-title"><div><span class="eyebrow">Commercial setup</span><h2>Pricing and licence</h2><p>Make the cost and buyer rights clear before review.</p></div></div>
          <div class="price-grid"><label>Standard commercial licence<div class="money"><b>£</b><input type="number" min="0" step="0.01" bind:value={price} disabled={editingLocked}/></div><small>Commercial use by one buyer account.</small></label><label>Extended team licence<div class="money"><b>£</b><input type="number" min="0" step="0.01" bind:value={extendedPrice} disabled={editingLocked}/></div><small>Must be at least the standard price.</small></label></div>
          <div class="fee-preview"><span><small>Buyer pays</small><b>£{price.toFixed(2)}</b></span><span><small>Estimated commission ({commissionRate.toFixed(2).replace(/\.00$/,'')}%)</small><b>−£{estimatedCommission.toFixed(2)}</b></span><span><small>Estimated earnings</small><strong>£{estimatedEarnings.toFixed(2)}</strong></span></div>
          {#if extendedPrice < price}<div class="inline-warning"><Icon name="alert" size={17}/><span><b>Extended price is too low</b><small>Set it to at least £{price.toFixed(2)}.</small></span></div>{/if}
          <label>Licence summary <em>Required</em><textarea rows="8" bind:value={licence} disabled={editingLocked}></textarea><small>Explain what buyers may use, modify and redistribute.</small></label>
          <p class="help-copy">Final commission is calculated server-side from the vendor agreement, category override and marketplace setting active at checkout.</p>
        </section>
      {:else if tab === 'Files & versions'}
        <section class="panel glass files-panel">
          <div class="panel-title files-title"><div><span class="eyebrow">Controlled delivery</span><h2>Files and versions</h2><p>Uploaded ZIP packages remain visible here after private R2 verification.</p></div><span class="storage-badge"><Icon name="shield" size={18}/>Private R2 storage</span></div>
          {#if storedPackagesLoading}<div class="empty-package"><Icon name="refresh" size={35}/><span><b>Checking stored packages…</b><small>Verifying the files attached to this product.</small></span></div>{:else if storedPackages.length}<div class="stored-list"><div class="section-heading"><div><span>PREVIOUSLY UPLOADED</span><h3>Your stored packages</h3></div><p>The newest verified upload appears first.</p></div>{#each storedPackages as item,index}<article class:latest={index === 0} class:unverified={!item.verified} class="stored-package"><div class="stored-folder"><FileGlyph kind="folder" size={52}/></div><div class="stored-main"><div class="stored-status"><span>{index === 0 ? 'Latest uploaded package' : 'Earlier package'}</span><strong class:warning={!item.verified}><Icon name={item.verified ? 'check' : 'alert'} size={16}/>{item.verified ? 'Stored privately and verified' : 'Upload incomplete'}</strong></div><h3>{item.packageName}</h3><div class="package-facts"><span><small>Version</small><b>{item.version}</b></span><span><small>File size</small><b>{item.size}</b></span><span><small>Uploaded</small><b>{item.created}</b></span><span><small>Moderation</small><b>{item.status === 'pending' ? 'Pending review' : item.status.replaceAll('_',' ')}</b></span></div><div class="stored-notes"><small>Release notes</small><p>{item.releaseNotes || 'No release notes supplied.'}</p></div>{#if item.documentationName}<div class="stored-document"><FileGlyph kind="file" size={21}/><span><small>Documentation</small><b>{item.documentationName}</b></span></div>{/if}</div></article>{/each}</div>{:else}<div class="empty-package"><FileGlyph kind="folder" size={48}/><span><b>No ZIP package has been uploaded</b><small>{storedPackagesError || 'Use the large upload area below to attach the buyer package.'}</small></span></div>{/if}

          {#if !editingLocked}<section class="version-form"><div class="section-heading"><div><span>NEW VERSION</span><h3>{storedPackages.length ? 'Upload another version' : 'Upload the first package'}</h3></div><p>Version and release-note text is retained on this device until upload succeeds.</p></div><div class="two"><label>Version number <em>Required</em><input value={versionNumber} oninput={editVersionNumber} placeholder="For example: 1.1.0"/></label><label>Release notes <em>Required · at least 10 characters</em><textarea rows="5" value={releaseNotes} oninput={editReleaseNotes} placeholder="Describe compatibility changes, fixes and new content."></textarea></label></div>
            <input class="visually-hidden" bind:this={packageInput} type="file" accept=".zip,application/zip,application/x-zip-compressed" onchange={selectPackage}/>
            <button class:dragging={packageDragging} class:selected={Boolean(packageFile)} class="package-dropzone" type="button" aria-disabled={versionBusy} onclick={() => { if (!versionBusy) packageInput?.click(); }} ondragover={dragPackage} ondragleave={leavePackage} ondrop={dropPackage}><span class="folder"><FileGlyph kind="folder" size={62}/></span>{#if packageFile}<small>ZIP PACKAGE SELECTED</small><b>{packageFile.name}</b><em>{formatFileSize(packageFile.size)} · Ready to upload</em><span class="choose">Choose a different ZIP</span>{:else}<small>REQUIRED ASSET PACKAGE</small><b>Drag your ZIP here</b><em>or click anywhere in this box to choose the file</em><span class="choose">Choose ZIP package</span>{/if}</button>
            <p class="file-note">The package is only marked as stored after the server verifies the R2 object and its expected size.</p>
            <div class:complete={Boolean(documentationFile)} class="document-picker"><FileGlyph kind="file" size={28}/><span><b>{documentationFile ? documentationFile.name : 'Optional documentation'}</b><small>{documentationFile ? `${formatFileSize(documentationFile.size)} selected` : 'PDF, TXT, MD, DOC or DOCX'}</small></span><input class="visually-hidden" bind:this={documentationInput} type="file" accept=".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain" onchange={selectDocumentation}/><button type="button" onclick={() => documentationInput?.click()}>{documentationFile ? 'Change file' : 'Choose documentation'}</button></div>
            <div class="upload-checks"><span class:done={Boolean(versionNumber.trim())}><Icon name={versionNumber.trim() ? 'check' : 'plus'} size={16}/>Version number</span><span class:done={releaseNotes.trim().length >= 10}><Icon name={releaseNotes.trim().length >= 10 ? 'check' : 'plus'} size={16}/>Release notes</span><span class:done={Boolean(packageFile)}><Icon name={packageFile ? 'check' : 'plus'} size={16}/>ZIP selected</span></div>
            {#if packageFile || versionUploadState !== 'idle'}<div class:failed={versionUploadState === 'failed'} class:verified={versionUploadState === 'verified'} class="upload-state"><span><b>{versionUploadState === 'verified' ? 'Upload verified' : versionUploadState === 'failed' ? 'Upload failed' : versionBusy ? 'Uploading securely' : 'Ready to upload'}</b><small>{versionUploadMessage || (packageFile ? `${packageFile.name} · ${formatFileSize(packageFile.size)}` : '')}</small></span>{#if versionBusy}<strong>{versionProgress}%</strong>{/if}<div><i style={`width:${versionProgress}%`}></i></div></div>{/if}
            <div class="upload-action"><button class="button button-primary" type="button" disabled={versionBusy || !packageFile || !versionNumber.trim() || releaseNotes.trim().length < 10} onclick={uploadVersion}><Icon name="upload" size={19}/>{versionBusy ? `Uploading ${versionProgress}%` : !packageFile ? 'Select a ZIP package to continue' : 'Upload and verify package'}</button><p>The existing draft and previously uploaded versions remain safe if this upload fails.</p></div>
          </section>{/if}
        </section>
      {:else if tab === 'Presentation'}
        <section class="panel glass">
          <div class="panel-title"><div><span class="eyebrow">Buyer confidence</span><h2>Presentation gallery</h2><p>Drag, select, reorder and verify genuine preview images.</p></div><span class="score">{product.images.length}/12 stored</span></div>
          <CreatorImageUploader files={previewFiles} existingImages={product.images} disabled={previewBusy || editingLocked} onFilesChange={setPreviewFiles}/>
          {#if !editingLocked}<div class="preview-upload-row"><button class="button button-primary" type="button" disabled={previewBusy || previewFiles.length < 3} onclick={uploadPreviews}><Icon name="upload" size={18}/>{previewBusy ? `Uploading ${previewProgress}%` : previewFiles.length < 3 ? 'Select at least 3 images' : 'Upload and verify gallery'}</button><p>Uploading a selected set replaces the existing gallery only after every image is verified.</p></div>{/if}
          {#if previewFiles.length || previewMessage}<div class="upload-state"><span><b>{previewBusy ? 'Uploading previews' : previewProgress === 100 ? 'Gallery verified' : 'Preview selection ready'}</b><small>{previewMessage || `${previewFiles.length} images selected`}</small></span>{#if previewBusy}<strong>{previewProgress}%</strong>{/if}<div><i style={`width:${previewProgress}%`}></i></div></div>{/if}
          <div class="video-field"><label>Showcase video <span>Optional · YouTube or Vimeo</span><input type="url" bind:value={showcaseVideoUrl} placeholder="https://www.youtube.com/watch?v=…" disabled={editingLocked}/></label>{#if showcaseVideo}<iframe src={showcaseVideo.embedUrl} title={`${product.title} showcase video`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>{:else if showcaseVideoError}<div class="inline-warning"><Icon name="alert" size={17}/><span><b>Video URL needs attention</b><small>{showcaseVideoError}</small></span></div>{/if}</div>
          <p class="help-copy">Preview media is public after approval. Asset ZIP packages remain private and are delivered only through entitlement-checked signed URLs.</p>
        </section>
      {:else}
        <section class="panel glass"><div class="panel-title"><div><span class="eyebrow">After-sale experience</span><h2>Support and buyer guidance</h2><p>Edit the support information shown to buyers. These are shared storefront policies and apply consistently across all your listings.</p></div></div><div class="two"><label>Support email<input type="email" bind:value={supportEmail} maxlength="320" placeholder="support@example.com"/></label><label>Store response target<select bind:value={supportResponseTime}><option>Within 4 hours</option><option>Within 8 hours</option><option>Within 1 business day</option><option>Within 2 business days</option></select></label></div><label>Store support promise<textarea rows="6" bind:value={supportPromise} maxlength="3000" placeholder="Explain how buyers should request support and what help you provide."></textarea></label><label>Update commitment<textarea rows="6" bind:value={updateCommitment} maxlength="3000" placeholder="Explain how you maintain compatibility and product updates."></textarea></label><div class="support-actions"><button class="button button-primary" type="button" disabled={supportSaving || !supportDirty} onclick={saveSupportPolicies}><Icon name="check" size={17}/>{supportSaving ? 'Saving support…' : supportDirty ? 'Save support policies' : 'Support policies saved'}</button><a class="button button-secondary" href="/creator/storefront"><Icon name="settings" size={17}/>Open full storefront settings</a></div></section>
      {/if}
    </main>

    <aside>
      <section class="health glass"><span class="eyebrow">Review readiness</span><div class="ring" style={`--score:${healthScore * 3.6}deg`}><b>{healthScore}</b><small>%</small></div><h3>{canSubmitReview ? 'Ready for review' : `${missingSubmissionChecks.length} item${missingSubmissionChecks.length === 1 ? '' : 's'} remaining`}</h3><p>Every requirement below is checked again by the server during submission.</p><ul>{#each submissionChecks as item}<li class:done={item.done}><button type="button" onclick={() => tab = item.tab}><Icon name={item.done ? 'check' : 'plus'} size={15}/>{item.label}</button></li>{/each}</ul></section>
      <section class="submit-card glass"><h3>Product actions</h3>{#if product.status !== 'Published' && product.status !== 'In review'}<button class="button button-primary" type="button" disabled={!canSubmitReview || reviewSubmitting || saving} onclick={submitReview}>{reviewSubmitting ? 'Submitting…' : product.status === 'Changes required' ? 'Resubmit for admin review' : 'Submit for admin review'}</button>{#if missingSubmissionChecks.length}<p>Next required item: <button type="button" onclick={() => tab = missingSubmissionChecks[0].tab}>{missingSubmissionChecks[0].label}</button></p>{/if}{/if}<button class="button button-secondary" type="button" disabled={saving || editingLocked} onclick={save}>{saving ? 'Saving…' : 'Save changes'}</button>{#if product.status === 'Published'}<button class="secondary-action" type="button" onclick={retireListing}><Icon name="minus" size={16}/>Remove from marketplace</button>{/if}{#if product.sales === 0}<button class="secondary-action destructive" type="button" disabled={saving || reviewSubmitting} onclick={deleteListing}><Icon name="trash" size={16}/>Delete listing and files</button>{:else}<p>This listing has buyer purchases. It can be removed from sale, but not permanently deleted, so buyers retain access.</p>{/if}</section>
      <section class="stats glass"><h3>Product performance</h3><div><span><small>Revenue</small><b>£{product.revenue.toLocaleString('en-GB',{minimumFractionDigits:2})}</b></span><span><small>Sales</small><b>{product.sales.toLocaleString('en-GB')}</b></span><span><small>Conversion</small><b>{product.conversion ? `${product.conversion}%` : '—'}</b></span><span><small>Rating</small><b>{product.rating ? `${product.rating} ★` : '—'}</b></span></div><a href="/creator/analytics">Open analytics →</a></section>
    </aside>
  </div>
{:else if productLoading}
  <section class="empty-page glass"><span class="eyebrow">Creator products</span><h1>Loading product…</h1><p>Retrieving this listing and its current saved version.</p></section>
{:else}
  <section class="empty-page glass"><span class="eyebrow">Creator products</span><h1>Product unavailable.</h1><p>{productLoadError || 'This product does not exist or does not belong to your creator account.'}</p><a class="button button-primary" href="/creator/products">Return to products</a></section>
{/if}

<style>
  .visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.product-head>a{color:#a9b8cd;font-size:13px}.head-main{margin-top:13px;display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:17px;align-items:center}.head-main>img{width:96px;height:70px;object-fit:cover;border:1px solid #27547a;border-radius:11px}.head-status{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.head-status>span:not(.pill){color:#9fb0c6;font-size:12px}.head-main h1{margin:8px 0 5px;font-size:clamp(2rem,3vw,3.3rem);letter-spacing:-.05em}.head-main p{margin:0;color:#9fb0c6;font-size:12px}.head-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.notice{margin:16px 0;padding:14px 16px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;border:1px solid;border-radius:12px}.notice.warning{color:#ffb547;border-color:rgba(255,181,71,.38);background:rgba(255,181,71,.06)}.notice.review{color:#00e5ff;border-color:rgba(0,229,255,.35);background:rgba(0,229,255,.05)}.notice.recovered{color:#24d89a;border-color:rgba(36,216,154,.4);background:rgba(36,216,154,.05)}.notice div{display:grid;gap:4px}.notice b{color:#f5f8ff;font-size:14px}.notice p{margin:0;color:#aebbd0;font-size:12px;line-height:1.5}.notice button,.notice>span{padding:9px 11px;border:1px solid currentColor;border-radius:8px;color:inherit;background:transparent;font-size:12px;font-weight:850}.taxonomy-strip{margin:16px 0;padding:13px 15px;display:flex;align-items:center;gap:11px;color:#00e5ff}.taxonomy-strip span{display:grid;gap:3px;flex:1}.taxonomy-strip b{color:#f5f8ff;font-size:13px}.taxonomy-strip small{color:#9fb0c6;font-size:11px}.taxonomy-strip em{color:#9fb0c6;font-size:11px;font-style:normal}.tabs{margin:16px 0;padding:7px;display:flex;gap:6px;overflow:auto}.tabs button{min-height:46px;padding:0 17px;display:flex;align-items:center;gap:7px;border:1px solid transparent;border-radius:9px;color:#aebbd0;background:transparent;cursor:pointer;font-size:14px;font-weight:800;white-space:nowrap}.tabs button:hover,.tabs button.active{border-color:#2a5a80;color:#fff;background:rgba(0,229,255,.06)}.tabs i{width:18px;height:18px;display:grid;place-items:center;border-radius:50%;color:#04130e;background:#24d89a;font-size:10px;font-style:normal}.editor-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:start}.panel{padding:26px}.panel-title{margin-bottom:23px;display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.panel-title h2{margin:6px 0 0;font-size:26px}.panel-title p{margin:7px 0 0;color:#aebbd0;font-size:14px;line-height:1.55}.score,.storage-badge{padding:9px 11px;border:1px solid #2d678e;border-radius:9px;color:#00e5ff;font-size:12px;white-space:nowrap}.storage-badge{display:flex;align-items:center;gap:7px}.panel label{margin-bottom:18px;display:grid;gap:9px;color:#d9e3f0;font-size:14px;font-weight:850}.panel label em{color:#ffc857;font-size:12px;font-style:normal}.panel label>span{color:#9fb0c6;font-size:12px;font-weight:600}.panel input,.panel select,.panel textarea{width:100%;padding:0 14px;border:1px solid #27547a;border-radius:10px;color:#fff;background:#030a14;font:inherit;font-size:16px}.panel input,.panel select{min-height:50px}.panel textarea{padding-block:13px;line-height:1.6;resize:vertical}.panel input:disabled,.panel select:disabled,.panel textarea:disabled{opacity:.65;cursor:not-allowed}.panel input::placeholder,.panel textarea::placeholder{color:#72849d}.panel label small{color:#9fb0c6;font-size:12px;font-weight:500}.two,.price-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.checkbox{padding:15px!important;grid-template-columns:auto 1fr!important;align-items:start;border:1px solid #23496d;border-radius:11px;background:#06101e}.checkbox input{width:18px!important;min-height:18px!important;margin-top:2px;padding:0!important;accent-color:#00e5ff}.checkbox span{display:grid;gap:4px!important}.checkbox b{color:#f5f8ff;font-size:14px}.price-grid label{padding:18px;border:1px solid #23496d;border-radius:12px;background:#06101e}.money{display:flex;align-items:center;border:1px solid #2d678e;border-radius:10px;background:#030a14}.money b{padding-left:14px;color:#00e5ff;font-size:20px}.money input{border:0;background:transparent;font-size:23px;font-weight:900}.fee-preview{margin-bottom:18px;display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #23496d;border-radius:12px;overflow:hidden}.fee-preview span{padding:15px;display:grid;gap:5px;background:#06101e}.fee-preview span+span{border-left:1px solid #23496d}.fee-preview small{color:#9fb0c6;font-size:11px}.fee-preview b,.fee-preview strong{font-size:18px}.fee-preview strong{color:#24d89a}.inline-warning{margin-bottom:18px;padding:13px 14px;display:flex;align-items:center;gap:10px;border:1px solid rgba(255,181,71,.4);border-radius:10px;color:#ffb547;background:rgba(255,181,71,.05)}.inline-warning span{display:grid;gap:4px}.inline-warning b{color:#f5f8ff;font-size:13px}.inline-warning small{color:#aebbd0;font-size:12px}.help-copy{color:#9fb0c6;font-size:12px;line-height:1.65}.empty-package{margin-bottom:20px;padding:25px;display:flex;align-items:center;justify-content:center;gap:16px;border:1px dashed #35658d;border-radius:14px;color:#00e5ff;background:rgba(0,229,255,.035)}.empty-package span{display:grid;gap:5px}.empty-package b{color:#fff;font-size:18px}.empty-package small{color:#aebbd0;font-size:13px}.stored-list{display:grid;gap:14px}.section-heading{margin:2px 0 4px;display:flex;align-items:end;justify-content:space-between;gap:18px}.section-heading span{color:#00e5ff;font-size:11px;font-weight:950;letter-spacing:.14em}.section-heading h3{margin:6px 0 0;font-size:22px}.section-heading p{max-width:420px;margin:0;color:#9fb0c6;font-size:12px;text-align:right}.stored-package{padding:21px;display:grid;grid-template-columns:86px minmax(0,1fr);gap:19px;border:1px solid #23496d;border-radius:16px;background:linear-gradient(135deg,rgba(0,229,255,.08),transparent 42%),#06101e}.stored-package.latest{border-color:rgba(36,216,154,.62)}.stored-package.unverified{border-color:rgba(255,181,71,.55)}.stored-folder{width:86px;height:86px;display:grid;place-items:center;border:1px solid rgba(0,229,255,.45);border-radius:19px;color:#00e5ff;background:rgba(0,229,255,.08)}.stored-main{min-width:0}.stored-status{display:flex;align-items:center;justify-content:space-between;gap:12px}.stored-status>span{color:#8fa3bd;font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.stored-status strong{padding:8px 10px;display:flex;align-items:center;gap:7px;border:1px solid rgba(36,216,154,.42);border-radius:8px;color:#24d89a;background:rgba(36,216,154,.07);font-size:12px}.stored-status strong.warning{border-color:rgba(255,181,71,.45);color:#ffb547;background:rgba(255,181,71,.07)}.stored-main>h3{margin:12px 0 14px;overflow-wrap:anywhere;font-size:23px}.package-facts{display:grid;grid-template-columns:repeat(4,minmax(105px,1fr));gap:9px}.package-facts span,.stored-notes{padding:10px 11px;display:grid;border:1px solid #193653;border-radius:9px;background:#040b16}.package-facts small,.stored-notes small,.stored-document small{color:#8fa3bd;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.package-facts b{margin-top:5px;font-size:13px;text-transform:capitalize}.stored-notes{margin-top:11px}.stored-notes p{margin:7px 0 0;color:#d6e0ed;font-size:13px;line-height:1.55}.stored-document{margin-top:9px;padding:11px 13px;display:flex;align-items:center;gap:9px;border:1px solid #193653;border-radius:9px;color:#8b5cf6;background:#040b16}.stored-document span{min-width:0;display:grid;gap:4px}.stored-document b{overflow:hidden;color:#f5f8ff;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.version-form{margin-top:25px;padding-top:24px;border-top:1px solid #183352}.package-dropzone{width:100%;min-height:275px;padding:32px;display:grid;place-items:center;align-content:center;gap:10px;border:2px dashed #2d678e;border-radius:18px;color:#00e5ff;background:radial-gradient(circle at 50% 22%,rgba(0,229,255,.14),transparent 20rem),#030a14;cursor:pointer;text-align:center}.package-dropzone:hover,.package-dropzone.dragging{border-color:#00e5ff;background:radial-gradient(circle at 50% 22%,rgba(0,229,255,.22),transparent 20rem),#04101d}.package-dropzone.selected{border-style:solid;border-color:rgba(36,216,154,.7);color:#24d89a;background:radial-gradient(circle at 50% 22%,rgba(36,216,154,.16),transparent 20rem),#04110f}.package-dropzone .folder{width:96px;height:82px;display:grid;place-items:center;border:1px solid currentColor;border-radius:20px;background:rgba(0,229,255,.07)}.package-dropzone small{font-size:11px;font-weight:950;letter-spacing:.14em}.package-dropzone>b{max-width:760px;overflow-wrap:anywhere;color:#fff;font-size:25px}.package-dropzone em{color:#aebbd0;font-size:14px;font-style:normal}.package-dropzone .choose{padding:11px 17px;border:1px solid currentColor;border-radius:9px;color:#03121b;background:#00e5ff;font-size:14px;font-weight:950}.package-dropzone.selected .choose{color:#04130e;background:#24d89a}.file-note{margin:10px 0 17px;color:#9fb0c6;font-size:12px;line-height:1.6;text-align:center}.document-picker{margin:15px 0;padding:16px;display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:center;border:1px dashed #2d678e;border-radius:12px;color:#8b5cf6;background:#06101e}.document-picker.complete{border-style:solid;border-color:rgba(36,216,154,.5);color:#24d89a}.document-picker span{display:grid;gap:4px;min-width:0}.document-picker b{overflow:hidden;color:#f5f8ff;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.document-picker small{color:#9fb0c6;font-size:12px}.document-picker button{min-height:42px;padding:0 14px;border:1px solid currentColor;border-radius:8px;color:inherit;background:transparent;cursor:pointer;font-size:12px;font-weight:850}.upload-checks{display:flex;flex-wrap:wrap;gap:8px}.upload-checks span{padding:8px 11px;display:flex;align-items:center;gap:7px;border:1px solid rgba(255,181,71,.35);border-radius:99px;color:#ffb547;background:rgba(255,181,71,.05);font-size:12px}.upload-checks span.done{border-color:rgba(36,216,154,.35);color:#24d89a;background:rgba(36,216,154,.05)}.upload-state{margin-top:15px;padding:14px;display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center;border:1px solid rgba(0,229,255,.38);border-radius:11px;color:#00e5ff;background:rgba(0,229,255,.05)}.upload-state.failed{border-color:rgba(255,107,122,.4);color:#ff6b7a;background:rgba(255,107,122,.05)}.upload-state.verified{border-color:rgba(36,216,154,.4);color:#24d89a;background:rgba(36,216,154,.05)}.upload-state span{display:grid;gap:4px}.upload-state b{color:#f5f8ff;font-size:14px}.upload-state small{color:#9fb0c6;font-size:12px}.upload-state>strong{font-size:14px}.upload-state>div{grid-column:1/-1;height:7px;overflow:hidden;border-radius:99px;background:#10253a}.upload-state i{height:100%;display:block;background:linear-gradient(90deg,#00e5ff,#8b5cf6)}.upload-action,.preview-upload-row{margin-top:16px;display:flex;align-items:center;gap:14px}.upload-action p,.preview-upload-row p{margin:0;color:#9fb0c6;font-size:12px;line-height:1.5}.preview-upload-row{padding-top:18px;border-top:1px solid #183352}.video-field{margin-top:22px;padding:18px;border:1px solid #23496d;border-radius:12px;background:#06101e}.video-field iframe{width:100%;margin-top:14px;aspect-ratio:16/9;border:0;border-radius:10px}.support-actions{margin-top:18px;display:flex;flex-wrap:wrap;gap:10px}.support-actions .button{width:auto}.editor-layout aside{display:grid;gap:14px;position:sticky;top:18px}.health,.submit-card,.stats{padding:18px}.ring{--score:0deg;width:105px;height:105px;margin:18px auto 12px;display:grid;place-items:center;align-content:center;border-radius:50%;background:conic-gradient(#00e5ff var(--score),#142b45 0);position:relative}.ring:after{content:'';position:absolute;inset:8px;border-radius:50%;background:#071225}.ring b,.ring small{position:relative;z-index:1}.ring b{font-size:27px}.ring small{color:#9fb0c6;font-size:11px}.health h3{text-align:center}.health>p{color:#9fb0c6;font-size:12px;line-height:1.6;text-align:center}.health ul{padding:0;list-style:none}.health li{border-top:1px solid #183352}.health li button{width:100%;min-height:42px;padding:0;display:flex;align-items:center;gap:8px;border:0;color:#9fb0c6;background:transparent;cursor:pointer;text-align:left;font-size:12px}.health li.done button{color:#24d89a}.submit-card{display:grid;gap:10px}.submit-card h3,.stats h3{margin:0 0 5px}.submit-card>p{margin:2px 0;color:#9fb0c6;font-size:12px;line-height:1.5}.submit-card>p button{padding:0;border:0;color:#00e5ff;background:transparent;cursor:pointer;font:inherit;font-weight:800}.secondary-action{min-height:43px;padding:0 12px;display:flex;align-items:center;gap:8px;border:1px solid #23496d;border-radius:9px;color:#aebbd0;background:#06101e;cursor:pointer;font-size:12px;font-weight:800}.secondary-action.destructive{color:#ff6b7a}.stats>div{display:grid;grid-template-columns:1fr 1fr}.stats span{padding:11px 0;display:grid;border-top:1px solid #183352}.stats span:nth-child(even){padding-left:12px;border-left:1px solid #183352}.stats small{color:#9fb0c6;font-size:11px}.stats b{margin-top:4px;font-size:14px}.stats>a{margin-top:12px;display:block;color:#00e5ff;font-size:12px;font-weight:800}.empty-page{max-width:720px;margin:70px auto;padding:28px;text-align:center}.empty-page .button{display:inline-flex;width:auto}.button:disabled{opacity:.45;cursor:not-allowed;transform:none}@media(max-width:1120px){.editor-layout{grid-template-columns:1fr}.editor-layout aside{position:static;grid-template-columns:repeat(3,1fr)}.head-main{grid-template-columns:90px 1fr}.head-actions{grid-column:1/-1;justify-content:flex-start}.package-facts{grid-template-columns:1fr 1fr}}@media(max-width:760px){.two,.price-grid,.fee-preview,.editor-layout aside{grid-template-columns:1fr}.fee-preview span+span{border-left:0;border-top:1px solid #23496d}.head-main{grid-template-columns:1fr}.head-main>img{width:100%;height:150px}.head-actions .button,.support-actions .button{width:100%}.panel{padding:20px}.panel-title,.files-title,.section-heading{align-items:flex-start;flex-direction:column}.section-heading p{text-align:left}.stored-package{grid-template-columns:1fr}.stored-folder{width:72px;height:72px}.stored-status{align-items:flex-start;flex-direction:column}.package-facts{grid-template-columns:1fr}.document-picker{grid-template-columns:auto 1fr}.document-picker button{grid-column:1/-1}.upload-action,.preview-upload-row{align-items:stretch;flex-direction:column}.upload-action .button,.preview-upload-row .button{width:100%}.notice{grid-template-columns:auto 1fr}.notice button,.notice>span{grid-column:1/-1;width:100%}.taxonomy-strip{align-items:flex-start;flex-wrap:wrap}}
</style>
