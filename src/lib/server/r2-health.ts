import { env } from '$env/dynamic/private';
import { DeleteObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createR2UploadTarget, makeR2ObjectKey } from '$lib/server/r2-storage';

const REQUIRED_ENV = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ACCOUNT_ID',
  'R2_BUCKET_NAME',
  'R2_ENDPOINT'
] as const;

type R2Failure = Error & {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
};

export type R2HealthResult = {
  ok: true;
  bucket: string;
  endpointHost: string;
  bytes: number;
  timingsMs: {
    put: number;
    head: number;
    delete: number;
    total: number;
  };
};

function fail(code: string, message: string, status = 503, details?: Record<string, unknown>): never {
  const error = new Error(message) as R2Failure;
  error.code = code;
  error.status = status;
  error.details = details;
  throw error;
}

function readConfig() {
  const values = {
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID?.trim(),
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY?.trim(),
    R2_ACCOUNT_ID: env.R2_ACCOUNT_ID?.trim(),
    R2_BUCKET_NAME: env.R2_BUCKET_NAME?.trim(),
    R2_ENDPOINT: env.R2_ENDPOINT?.trim()
  };
  const missing = REQUIRED_ENV.filter((name) => !values[name]);
  if (missing.length) {
    fail('R2_CONFIG_MISSING', `Missing Netlify environment variable${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`, 503, { missing });
  }

  let endpoint: URL;
  try {
    endpoint = new URL(values.R2_ENDPOINT!);
  } catch {
    fail('R2_ENDPOINT_INVALID', 'R2_ENDPOINT is not a valid URL.');
  }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    fail('R2_ENDPOINT_INVALID', 'R2_ENDPOINT must be a plain HTTPS endpoint with no credentials or query string.');
  }
  const accountId = values.R2_ACCOUNT_ID!;
  if (!endpoint.hostname.startsWith(`${accountId}.`)) {
    fail('R2_ENDPOINT_ACCOUNT_MISMATCH', 'R2_ENDPOINT does not match the configured R2_ACCOUNT_ID.');
  }
  if (!endpoint.hostname.endsWith('.r2.cloudflarestorage.com')) {
    fail('R2_ENDPOINT_INVALID', 'R2_ENDPOINT is not a Cloudflare R2 S3 endpoint.');
  }

  return {
    accessKeyId: values.R2_ACCESS_KEY_ID!,
    secretAccessKey: values.R2_SECRET_ACCESS_KEY!,
    accountId,
    bucket: values.R2_BUCKET_NAME!,
    endpoint: endpoint.origin,
    endpointHost: endpoint.host
  };
}

function elapsed(started: number) {
  return Math.max(0, Math.round(performance.now() - started));
}

function safeProviderMessage(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return undefined;
  return compact
    .replace(/https?:\/\/\S+/gi, '[endpoint hidden]')
    .replace(/(X-Amz-[A-Za-z-]+)=([^&\s]+)/gi, '$1=[hidden]')
    .slice(0, 280);
}

function classify(error: unknown): R2Failure {
  const current = error as {
    name?: string;
    message?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
    cause?: { code?: string };
  };
  const name = current?.name ?? '';
  const httpStatus = current?.$metadata?.httpStatusCode;
  const networkCode = current?.cause?.code ?? current?.code;
  const providerDetails = {
    httpStatus,
    providerCode: name || undefined,
    providerMessage: safeProviderMessage(current?.message)
  };

  if (name === 'InvalidAccessKeyId') {
    const result = new Error('Cloudflare rejected the configured R2 access key ID.') as R2Failure;
    result.code = 'R2_INVALID_ACCESS_KEY';
    result.status = 503;
    result.details = providerDetails;
    return result;
  }
  if (name === 'SignatureDoesNotMatch') {
    const result = new Error('Cloudflare rejected the request signature. The secret key, endpoint or request signing settings do not match.') as R2Failure;
    result.code = 'R2_SIGNATURE_MISMATCH';
    result.status = 503;
    result.details = providerDetails;
    return result;
  }
  if (name === 'NotEntitled') {
    const result = new Error('Cloudflare reports that this account or credential is not entitled to use the requested R2 operation.') as R2Failure;
    result.code = 'R2_NOT_ENTITLED';
    result.status = 503;
    result.details = providerDetails;
    return result;
  }
  if (name === 'AccessDenied') {
    const result = new Error('Cloudflare denied access to the configured R2 bucket.') as R2Failure;
    result.code = 'R2_ACCESS_DENIED';
    result.status = 503;
    result.details = providerDetails;
    return result;
  }
  if (httpStatus === 403) {
    const result = new Error('Cloudflare returned HTTP 403. The provider details below identify the exact reason.') as R2Failure;
    result.code = 'R2_FORBIDDEN';
    result.status = 503;
    result.details = providerDetails;
    return result;
  }
  if (name === 'NoSuchBucket' || (httpStatus === 404 && name !== 'NotFound')) {
    const result = new Error('The configured R2 bucket could not be found. Check R2_BUCKET_NAME and the endpoint jurisdiction.') as R2Failure;
    result.code = 'R2_BUCKET_NOT_FOUND';
    result.status = 503;
    result.details = providerDetails;
    return result;
  }
  if (['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(String(networkCode))) {
    const result = new Error('The Netlify function could not reach the configured R2 endpoint.') as R2Failure;
    result.code = 'R2_ENDPOINT_UNREACHABLE';
    result.status = 503;
    result.details = { networkCode };
    return result;
  }
  if (error instanceof Error && (error as R2Failure).code?.startsWith('R2_')) return error as R2Failure;

  const result = new Error('Cloudflare R2 rejected the server health check.') as R2Failure;
  result.code = 'R2_SERVER_CHECK_FAILED';
  result.status = 503;
  result.details = providerDetails;
  return result;
}

export function publicR2Failure(error: unknown) {
  const classified = classify(error);
  return {
    code: classified.code ?? 'R2_SERVER_CHECK_FAILED',
    message: classified.message,
    details: classified.details ?? {}
  };
}

export async function runR2ServerHealthCheck(userId: string): Promise<R2HealthResult> {
  const config = readConfig();
  const client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
  const body = `AssetGuru R2 signed upload health check ${new Date().toISOString()}`;
  const bodyBytes = new TextEncoder().encode(body).byteLength;
  const key = makeR2ObjectKey(['__assetguru-health', 'signed-upload', userId, `${crypto.randomUUID()}.txt`]);
  const totalStarted = performance.now();
  let created = false;
  let deleted = false;
  let putMs = 0;
  let headMs = 0;
  let deleteMs = 0;

  try {
    let started = performance.now();
    const target = createR2UploadTarget({
      key,
      role: 'health-check',
      name: 'r2-signed-upload-check.txt',
      type: 'text/plain; charset=utf-8',
      size: bodyBytes
    });
    const putResponse = await fetch(target.url, {
      method: target.method,
      headers: target.headers,
      body,
      signal: AbortSignal.timeout(20_000)
    });
    if (!putResponse.ok) {
      fail('R2_PRESIGNED_PUT_FAILED', `Cloudflare rejected the browser-compatible signed PUT with HTTP ${putResponse.status}.`, 503, {
        httpStatus: putResponse.status,
        providerCode: 'PresignedPutRejected'
      });
    }
    putMs = elapsed(started);
    created = true;

    started = performance.now();
    const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(20_000) });
    headMs = elapsed(started);
    if (Number(head.ContentLength ?? -1) !== bodyBytes) {
      fail('R2_HEAD_MISMATCH', 'R2 stored the test object, but the returned object size did not match.', 503, {
        expectedBytes: bodyBytes,
        actualBytes: Number(head.ContentLength ?? -1)
      });
    }

    started = performance.now();
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(20_000) });
    deleteMs = elapsed(started);
    deleted = true;

    return {
      ok: true,
      bucket: config.bucket,
      endpointHost: config.endpointHost,
      bytes: bodyBytes,
      timingsMs: { put: putMs, head: headMs, delete: deleteMs, total: elapsed(totalStarted) }
    };
  } catch (error) {
    throw classify(error);
  } finally {
    if (created && !deleted) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(10_000) });
      } catch (cleanupError) {
        const safe = publicR2Failure(cleanupError);
        console.error('R2 health-check cleanup failed', { code: safe.code, details: safe.details });
      }
    }
    client.destroy();
  }
}
