<script lang="ts">
  import { onDestroy } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { showToast } from '$lib/stores/marketplace';

  export let files: File[] = [];
  export let existingImages: string[] = [];
  export let disabled = false;
  export let minimum = 3;
  export let maximum = 12;
  export let onFilesChange: (next: File[]) => void = () => {};

  let input: HTMLInputElement | undefined;
  let dragging = false;
  const objectUrls = new Map<File, string>();

  function previewUrl(file: File) {
    let url = objectUrls.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      objectUrls.set(file, url);
    }
    return url;
  }

  function apply(next: File[]) {
    for (const [file, url] of objectUrls) {
      if (!next.includes(file)) {
        URL.revokeObjectURL(url);
        objectUrls.delete(file);
      }
    }
    files = next;
    onFilesChange(next);
  }

  function validImages(incoming: File[]) {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    const accepted: File[] = [];
    for (const file of incoming) {
      if (!allowed.has(file.type)) {
        showToast(`${file.name} is not a supported preview image.`, 'warning');
        continue;
      }
      if (file.size > 15 * 1024 ** 2) {
        showToast(`${file.name} is larger than the 15 MB preview limit.`, 'warning');
        continue;
      }
      accepted.push(file);
    }
    return accepted;
  }

  function addFiles(incoming: File[]) {
    if (disabled) return;
    const accepted = validImages(incoming);
    const byIdentity = new Map(files.map((file) => [`${file.name}:${file.size}:${file.lastModified}`, file]));
    for (const file of accepted) byIdentity.set(`${file.name}:${file.size}:${file.lastModified}`, file);
    const next = [...byIdentity.values()].slice(0, maximum);
    if (accepted.length && next.length < files.length + accepted.length) {
      showToast(`A maximum of ${maximum} preview images can be uploaded.`, 'warning');
    }
    apply(next);
    if (input) input.value = '';
  }

  function choose(event: Event) {
    addFiles([...((event.currentTarget as HTMLInputElement).files ?? [])]);
  }

  function dragOver(event: DragEvent) {
    event.preventDefault();
    if (!disabled) dragging = true;
  }

  function dragLeave(event: DragEvent) {
    event.preventDefault();
    dragging = false;
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    addFiles([...(event.dataTransfer?.files ?? [])]);
  }

  function remove(index: number) {
    apply(files.filter((_, itemIndex) => itemIndex !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];
    apply(next);
  }

  function makeCover(index: number) {
    if (index <= 0) return;
    const next = [...files];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    apply(next);
  }

  onDestroy(() => {
    for (const url of objectUrls.values()) URL.revokeObjectURL(url);
    objectUrls.clear();
  });
</script>

<div class="image-uploader">
  {#if existingImages.length}
    <section class="current-gallery" aria-label="Currently uploaded preview images">
      <div class="gallery-heading">
        <div>
          <span>CURRENTLY UPLOADED</span>
          <h3>Verified preview gallery</h3>
        </div>
        <p>Select a new set below only when you are ready to replace this gallery.</p>
      </div>
      <div class="image-grid existing-grid">
        {#each existingImages as image, index}
          <article class:cover={index === 0}>
            <img src={image} alt={`Uploaded preview ${index + 1}`} />
            <div class="image-label">
              <strong>{index === 0 ? 'Cover image' : `Preview ${index + 1}`}</strong>
              <span>Stored and verified</span>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}

  <input
    class="visually-hidden"
    bind:this={input}
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif"
    multiple
    onchange={choose}
  />

  <button
    class:dragging
    class:selected={files.length > 0}
    class="image-dropzone"
    type="button"
    disabled={disabled}
    onclick={() => input?.click()}
    ondragover={dragOver}
    ondragleave={dragLeave}
    ondrop={drop}
  >
    <span class="drop-icon"><Icon name="image" size={48} /></span>
    <span class="drop-copy">
      <small>{files.length ? 'PREVIEW IMAGES SELECTED' : 'DRAG AND DROP PREVIEW IMAGES'}</small>
      <b>{files.length ? `${files.length} image${files.length === 1 ? '' : 's'} ready` : 'Drop images anywhere in this box'}</b>
      <em>{files.length ? `The first image will be the cover. Add up to ${maximum}.` : `or click to choose ${minimum}–${maximum} JPG, PNG, WebP or GIF files`}</em>
    </span>
    <span class="choose-images">{files.length ? 'Add more images' : 'Choose preview images'}</span>
  </button>

  {#if files.length}
    <div class="selection-heading">
      <div>
        <span>NEW GALLERY SELECTION</span>
        <h3>Review the upload order</h3>
      </div>
      <strong class:ready={files.length >= minimum}>{files.length}/{maximum} selected</strong>
    </div>
    <div class="image-grid selected-grid">
      {#each files as file, index}
        <article class:cover={index === 0}>
          <img src={previewUrl(file)} alt={file.name} />
          <div class="image-label">
            <strong>{index === 0 ? 'Cover image' : `Preview ${index + 1}`}</strong>
            <span title={file.name}>{file.name}</span>
          </div>
          <div class="image-actions">
            {#if index > 0}<button type="button" title="Make cover image" onclick={() => makeCover(index)}>Set cover</button>{/if}
            <button type="button" title="Move left" aria-label="Move image left" disabled={index === 0} onclick={() => move(index, -1)}>←</button>
            <button type="button" title="Move right" aria-label="Move image right" disabled={index === files.length - 1} onclick={() => move(index, 1)}>→</button>
            <button class="remove" type="button" title="Remove image" aria-label="Remove image" onclick={() => remove(index)}>×</button>
          </div>
        </article>
      {/each}
    </div>
    <p class:ready={files.length >= minimum} class="image-requirement">
      <Icon name={files.length >= minimum ? 'check' : 'alert'} size={17} />
      {files.length >= minimum
        ? 'Minimum preview requirement met. Uploading this set will replace the current gallery.'
        : `Add ${minimum - files.length} more image${minimum - files.length === 1 ? '' : 's'} before uploading.`}
    </p>
  {/if}
</div>

<style>
  .image-uploader{display:grid;gap:18px}.visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.current-gallery{display:grid;gap:14px}.gallery-heading,.selection-heading{display:flex;align-items:end;justify-content:space-between;gap:18px}.gallery-heading span,.selection-heading span{color:#00e5ff;font-size:11px;font-weight:950;letter-spacing:.14em}.gallery-heading h3,.selection-heading h3{margin:6px 0 0;color:#f5f8ff;font-size:21px}.gallery-heading p{max-width:420px;margin:0;color:#9fb0c6;font-size:12px;line-height:1.55;text-align:right}.image-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.image-grid article{position:relative;overflow:hidden;min-width:0;aspect-ratio:16/10;border:1px solid #23496d;border-radius:13px;background:#030a14}.image-grid article.cover{border-color:#00e5ff;box-shadow:0 0 0 1px rgba(0,229,255,.15)}.image-grid img{width:100%;height:100%;display:block;object-fit:cover}.image-label{position:absolute;right:7px;bottom:7px;left:7px;padding:8px 10px;display:grid;gap:3px;border:1px solid rgba(94,132,168,.35);border-radius:8px;background:rgba(2,7,16,.88);backdrop-filter:blur(10px)}.image-label strong{color:#f5f8ff;font-size:12px}.image-label span{overflow:hidden;color:#9fb0c6;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.image-actions{position:absolute;top:7px;right:7px;display:flex;gap:5px}.image-actions button{min-width:38px;height:36px;padding:0 10px;border:1px solid rgba(111,145,179,.6);border-radius:7px;color:#dce8f5;background:rgba(2,7,16,.9);cursor:pointer;font-size:12px;font-weight:850}.image-actions button:hover:not(:disabled){border-color:#00e5ff;color:#00e5ff}.image-actions button:disabled{opacity:.35;cursor:not-allowed}.image-actions button.remove{color:#ff7b87}.image-dropzone{width:100%;min-height:250px;padding:30px;display:grid;place-items:center;align-content:center;gap:12px;border:2px dashed #2d678e;border-radius:18px;color:#00e5ff;background:radial-gradient(circle at 50% 22%,rgba(0,229,255,.14),transparent 20rem),#030a14;cursor:pointer;text-align:center;transition:border-color .18s,background .18s,transform .18s}.image-dropzone:hover:not(:disabled),.image-dropzone.dragging{border-color:#00e5ff;background:radial-gradient(circle at 50% 22%,rgba(0,229,255,.22),transparent 20rem),#04101d}.image-dropzone.dragging{transform:scale(1.005)}.image-dropzone.selected{border-style:solid;border-color:rgba(36,216,154,.7);color:#24d89a;background:radial-gradient(circle at 50% 22%,rgba(36,216,154,.16),transparent 20rem),#04110f}.image-dropzone:disabled{opacity:.55;cursor:not-allowed}.drop-icon{width:86px;height:76px;display:grid;place-items:center;border:1px solid currentColor;border-radius:19px;background:rgba(0,229,255,.07)}.selected .drop-icon{background:rgba(36,216,154,.08)}.drop-copy{max-width:760px;display:grid;gap:7px}.drop-copy small{font-size:11px;font-weight:950;letter-spacing:.14em}.drop-copy b{color:#fff;font-size:25px;line-height:1.25}.drop-copy em{color:#aebbd0;font-size:14px;font-style:normal}.choose-images{padding:11px 17px;border:1px solid currentColor;border-radius:9px;color:#03121b;background:#00e5ff;font-size:14px;font-weight:950}.selected .choose-images{color:#04130e;background:#24d89a}.selection-heading strong{padding:8px 11px;border:1px solid rgba(255,181,71,.45);border-radius:9px;color:#ffb547;background:rgba(255,181,71,.07);font-size:12px}.selection-heading strong.ready{border-color:rgba(36,216,154,.45);color:#24d89a;background:rgba(36,216,154,.07)}.image-requirement{margin:0;padding:12px 14px;display:flex;align-items:center;gap:9px;border:1px solid rgba(255,181,71,.35);border-radius:10px;color:#ffb547;background:rgba(255,181,71,.06);font-size:13px}.image-requirement.ready{border-color:rgba(36,216,154,.35);color:#24d89a;background:rgba(36,216,154,.06)}@media(max-width:850px){.image-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gallery-heading,.selection-heading{align-items:flex-start;flex-direction:column}.gallery-heading p{text-align:left}}@media(max-width:560px){.image-grid{grid-template-columns:1fr}.image-dropzone{min-height:230px;padding:24px}.drop-copy b{font-size:21px}.image-actions button{height:34px}.gallery-heading h3,.selection-heading h3{font-size:19px}}
</style>
