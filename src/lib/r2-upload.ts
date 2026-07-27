import { apiRequest } from '$lib/api';

export type R2UploadSpec = {
  provider: 'r2';
  url: string;
  path: string;
  role: string;
  name: string;
  type: string;
  size: number;
};

function responseDetail(xhr: XMLHttpRequest) {
  const text = String(xhr.responseText || '').replace(/\s+/g, ' ').trim();
  return text ? ` ${text.slice(0, 220)}` : '';
}

export function uploadToR2(
  url: string,
  file: Blob,
  contentType: string,
  onProgress: (loaded: number) => void = () => {}
) {
  return new Promise<void>((resolve, reject) => {
    const host = new URL(url).host;
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.timeout = 4 * 60 * 60 * 1000;
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    xhr.onabort = () => reject(new Error(`The upload to ${host} was cancelled.`));
    xhr.ontimeout = () => reject(new Error(`The upload to ${host} timed out.`));
    xhr.onerror = () => {
      const origin = typeof window === 'undefined' ? 'the AssetGuru site' : window.location.origin;
      reject(
        new Error(
          `The browser could not read Cloudflare R2's response from ${host}. The server connection passed, so this normally means the bucket CORS policy does not allow ${origin}, or the R2 endpoint cannot be reached from the browser.`
        )
      );
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(file.size);
        resolve();
        return;
      }
      reject(new Error(`Cloudflare R2 rejected the upload with HTTP ${xhr.status}.${responseDetail(xhr)}`));
    };
    xhr.send(file);
  });
}

export async function verifyR2ForThisBrowser() {
  const prepared = await apiRequest<{
    url: string;
    path: string;
    contentType: string;
    endpointHost: string;
    bucket: string;
  }>('/api/vendor/r2-test', {
    method: 'POST',
    body: JSON.stringify({ action: 'prepare' })
  });

  const testBody = new Blob(['AssetGuru browser R2 check'], { type: prepared.contentType });
  try {
    await uploadToR2(prepared.url, testBody, prepared.contentType);
    await apiRequest('/api/vendor/r2-test', {
      method: 'POST',
      body: JSON.stringify({ action: 'verify', path: prepared.path })
    });
  } catch (error) {
    try {
      await apiRequest('/api/vendor/r2-test', {
        method: 'POST',
        body: JSON.stringify({ action: 'cleanup', path: prepared.path })
      });
    } catch {
      // Cleanup is best effort; the health prefix is private and can be cleared later.
    }
    throw error;
  }

  return prepared;
}
