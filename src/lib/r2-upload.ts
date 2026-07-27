export type R2BrowserUpload = {
  storage: 'r2';
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
  role: string;
  name: string;
  type: string;
  size: number;
  expiresAt: string;
};

export function uploadFileToR2(spec: R2BrowserUpload, file: File, onProgress?: (loaded: number, total: number) => void) {
  if (file.size !== spec.size) return Promise.reject(new Error(`${spec.name} changed after it was selected. Choose the file again.`));
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(spec.method, spec.url, true);
    for (const [name, value] of Object.entries(spec.headers ?? {})) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total);
      else onProgress?.(event.loaded, file.size);
    };
    request.onerror = () => reject(new Error('Cloudflare R2 could not be reached from this page. Check that this exact staging site origin is allowed by the bucket CORS policy.'));
    request.onabort = () => reject(new Error('The R2 upload was cancelled.'));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(file.size, file.size);
        resolve();
      } else {
        reject(new Error(`Cloudflare R2 rejected the upload (HTTP ${request.status || 'unknown'}).`));
      }
    };
    request.send(file);
  });
}
