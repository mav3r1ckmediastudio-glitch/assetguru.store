import { env } from '$env/dynamic/private';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { SupabaseClient } from '@supabase/supabase-js';

const R2_PREFIX = 'r2:';

let client: S3Client | undefined;

function config() {
  const endpoint = env.R2_ENDPOINT?.trim();
  const bucket = env.R2_BUCKET_NAME?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw Object.assign(new Error('R2 storage is not configured on the server.'), { status: 503 });
  }

  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

function getClient() {
  const current = config();
  client ??= new S3Client({
    region: 'auto',
    endpoint: current.endpoint,
    credentials: {
      accessKeyId: current.accessKeyId,
      secretAccessKey: current.secretAccessKey
    }
  });
  return { client, bucket: current.bucket };
}

export function r2StoredPath(key: string) {
  return `${R2_PREFIX}${key}`;
}

export function isR2StoredPath(path: string | null | undefined): path is string {
  return Boolean(path?.startsWith(R2_PREFIX));
}

export function r2Key(path: string) {
  return isR2StoredPath(path) ? path.slice(R2_PREFIX.length) : path;
}

export async function createR2UploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const { client: s3, bucket } = getClient();
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType || 'application/octet-stream'
    }),
    { expiresIn, signableHeaders: new Set(['content-type']) }
  );
}

export async function createR2DownloadUrl(path: string, downloadName: string, expiresIn = 300) {
  const { client: s3, bucket } = getClient();
  const safeName = downloadName.replace(/[\r\n"]/g, '_');
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: r2Key(path),
      ResponseContentDisposition: `attachment; filename="${safeName}"`
    }),
    { expiresIn }
  );
}

export async function r2ObjectExists(path: string) {
  const { client: s3, bucket } = getClient();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: r2Key(path) }));
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    const name = (error as { name?: string }).name;
    if (status === 404 || name === 'NotFound' || name === 'NoSuchKey') return false;
    throw error;
  }
}

export async function deleteR2Objects(paths: string[]) {
  const { client: s3, bucket } = getClient();
  for (const path of paths) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key(path) }));
  }
}

async function supabaseObjectExists(admin: SupabaseClient, bucket: string, path: string) {
  const parts = path.split('/');
  const name = parts.pop()!;
  const folder = parts.join('/');
  const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 20, search: name });
  if (error) throw error;
  return Boolean(data?.some((item) => item.name === name));
}

export async function packageObjectExists(admin: SupabaseClient, path: string) {
  return isR2StoredPath(path) ? r2ObjectExists(path) : supabaseObjectExists(admin, 'asset-packages', path);
}

export async function deletePackageObjects(admin: SupabaseClient, paths: string[]) {
  const r2Paths = paths.filter(isR2StoredPath);
  const legacyPaths = paths.filter((path) => !isR2StoredPath(path));
  if (r2Paths.length) await deleteR2Objects(r2Paths);
  if (legacyPaths.length) {
    const { error } = await admin.storage.from('asset-packages').remove(legacyPaths);
    if (error) throw error;
  }
}

export async function createPackageDownloadUrl(admin: SupabaseClient, path: string, downloadName: string) {
  if (isR2StoredPath(path)) return createR2DownloadUrl(path, downloadName);
  const { data, error } = await admin.storage
    .from('asset-packages')
    .createSignedUrl(path, 300, { download: downloadName });
  if (error || !data) throw error ?? new Error('SIGNED_URL_FAILED');
  return data.signedUrl;
}
