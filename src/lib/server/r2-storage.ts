import { createHash, createHmac } from 'node:crypto';
import { DeleteObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env as privateEnv } from '$env/dynamic/private';

type R2Config = {
  endpoint: string;
  endpointUrl: URL;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type R2UploadTarget = {
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

type PresignOptions = {
  method: 'PUT' | 'GET';
  endpointUrl: URL;
  path: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  now: Date;
  expiresIn: number;
  extraQuery?: Array<[string, string]>;
  includeUnsignedPayloadQuery?: boolean;
};

const R2_PREFIX = 'r2/';
const MAX_PRESIGN_SECONDS = 6 * 60 * 60;
let cachedConfig: R2Config | undefined;
let cachedClient: S3Client | undefined;

function required(name: string) {
  const value = privateEnv[name]?.trim();
  if (!value) throw Object.assign(new Error(`${name} is not configured.`), { status: 503 });
  return value;
}

function readConfig(): R2Config {
  if (cachedConfig) return cachedConfig;
  const endpoint = required('R2_ENDPOINT').replace(/\/+$/, '');
  const endpointUrl = new URL(endpoint);
  if (endpointUrl.protocol !== 'https:') {
    throw Object.assign(new Error('R2_ENDPOINT must use HTTPS.'), { status: 503 });
  }
  cachedConfig = {
    endpoint,
    endpointUrl,
    bucket: required('R2_BUCKET_NAME'),
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY')
  };
  return cachedConfig;
}

function getClient() {
  if (cachedClient) return cachedClient;
  const config = readConfig();
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
  return cachedClient;
}

function encode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalPath(endpointUrl: URL, bucket: string, key: string) {
  const base = endpointUrl.pathname.replace(/\/+$/, '');
  const objectPath = [bucket, ...key.split('/')].map(encode).join('/');
  return `${base}/${objectPath}`.replace(/\/+/g, '/');
}

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: string | Uint8Array, value: string) {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function amzTimestamp(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function canonicalQuery(entries: Array<[string, string]>) {
  return entries
    .map(([key, value]) => [encode(key), encode(value)] as const)
    .sort(([aKey, aValue], [bKey, bValue]) => (aKey < bKey ? -1 : aKey > bKey ? 1 : aValue < bValue ? -1 : aValue > bValue ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

/** Pure SigV4 query signer. Kept exported only so the installer can verify it against AWS's published test vector. */
export function createSigV4PresignedUrl(options: PresignOptions) {
  const timestamp = amzTimestamp(options.now);
  const date = timestamp.slice(0, 8);
  const expiresIn = Math.max(1, Math.min(604800, Math.floor(options.expiresIn)));
  const scope = `${date}/${options.region}/s3/aws4_request`;
  const entries: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${options.accessKeyId}/${scope}`],
    ['X-Amz-Date', timestamp],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', 'host'],
    ...(options.includeUnsignedPayloadQuery ? [['X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD'] as [string, string]] : []),
    ...(options.extraQuery ?? [])
  ];
  const query = canonicalQuery(entries);
  const canonicalRequest = [
    options.method,
    options.path,
    query,
    `host:${options.endpointUrl.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, sha256(canonicalRequest)].join('\n');
  const dateKey = hmac(`AWS4${options.secretAccessKey}`, date);
  const regionKey = hmac(dateKey, options.region);
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
  const url = new URL(options.endpointUrl.toString());
  url.pathname = options.path;
  url.search = `${query}&X-Amz-Signature=${signature}`;
  return { url: url.toString(), signature, expiresIn };
}

function presign(method: 'PUT' | 'GET', key: string, extraQuery: Array<[string, string]> = [], expiresIn = MAX_PRESIGN_SECONDS) {
  const config = readConfig();
  const now = new Date();
  const clampedExpiry = Math.max(60, Math.min(MAX_PRESIGN_SECONDS, expiresIn));
  const signed = createSigV4PresignedUrl({
    method,
    endpointUrl: config.endpointUrl,
    path: canonicalPath(config.endpointUrl, config.bucket, key),
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: 'auto',
    now,
    expiresIn: clampedExpiry,
    extraQuery,
    includeUnsignedPayloadQuery: true
  });
  return { url: signed.url, expiresAt: new Date(now.getTime() + clampedExpiry * 1000).toISOString() };
}

export function isR2ObjectKey(path: string | null | undefined): path is string {
  return Boolean(path?.startsWith(R2_PREFIX));
}

export function makeR2ObjectKey(parts: string[]) {
  return `${R2_PREFIX}${parts.map((part) => part.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')}`;
}

export function createR2UploadTarget(input: { key: string; role: string; name: string; type: string; size: number }): R2UploadTarget {
  if (!isR2ObjectKey(input.key)) throw Object.assign(new Error('Invalid R2 object key.'), { status: 500 });
  const signed = presign('PUT', input.key);
  return {
    storage: 'r2',
    method: 'PUT',
    url: signed.url,
    headers: { 'Content-Type': input.type || 'application/octet-stream' },
    role: input.role,
    name: input.name,
    type: input.type || 'application/octet-stream',
    size: input.size,
    expiresAt: signed.expiresAt
  };
}

export function createR2DownloadUrl(key: string, filename: string, expiresIn = 300) {
  if (!isR2ObjectKey(key)) throw Object.assign(new Error('Invalid R2 object key.'), { status: 500 });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset-download';
  return presign('GET', key, [['response-content-disposition', `attachment; filename="${safeName}"`]], expiresIn).url;
}

export async function headR2Object(key: string) {
  if (!isR2ObjectKey(key)) return null;
  const config = readConfig();
  try {
    return await getClient().send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(20_000) });
  } catch (error) {
    const status = typeof error === 'object' && error !== null && '$metadata' in error
      ? Number((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode ?? 0)
      : 0;
    if (status === 404) return null;
    throw error;
  }
}

export async function verifyR2Object(key: string, expectedBytes?: number) {
  const head = await headR2Object(key);
  if (!head) return { ok: false as const, reason: 'missing' as const };
  const actualBytes = Number(head.ContentLength ?? -1);
  if (expectedBytes !== undefined && actualBytes !== expectedBytes) {
    return { ok: false as const, reason: 'size' as const, actualBytes, expectedBytes };
  }
  return { ok: true as const, bytes: actualBytes, etag: head.ETag ?? null, contentType: head.ContentType ?? null };
}

export async function deleteR2Objects(keys: Array<string | null | undefined>) {
  const config = readConfig();
  const unique = [...new Set(keys.filter(isR2ObjectKey))];
  for (const key of unique) {
    await getClient().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(20_000) });
  }
}
