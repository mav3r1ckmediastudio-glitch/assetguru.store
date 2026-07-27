import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, requireRole } from '$lib/server/supabase';
import {
  createR2UploadUrl,
  deleteR2Objects,
  r2EndpointDetails,
  r2ObjectExists,
  r2StoredPath,
  testR2ServerConnection
} from '$lib/server/r2';

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('prepare') }),
  z.object({ action: z.literal('verify'), path: z.string().min(1).max(1000) }),
  z.object({ action: z.literal('cleanup'), path: z.string().min(1).max(1000) })
]);

function allowedHealthPath(path: string, userId: string) {
  return path.startsWith(`r2:__assetguru-health/browser/${userId}/`);
}

function publicError(error: unknown) {
  const current = error as {
    name?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number; requestId?: string };
  };
  const status = current.$metadata?.httpStatusCode;
  const name = current.name && current.name !== 'Error' ? current.name : '';
  const message = String(current.message || 'Cloudflare R2 connection failed.')
    .replace(/https?:\/\/[^\s]+/g, '[R2 endpoint]')
    .slice(0, 500);
  return [status ? `HTTP ${status}` : '', name, message].filter(Boolean).join(' — ');
}

export async function POST({ locals, request }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = bodySchema.parse(await request.json());

    if (body.action === 'prepare') {
      await testR2ServerConnection(user.id);
      const key = `__assetguru-health/browser/${user.id}/${crypto.randomUUID()}.txt`;
      const contentType = 'text/plain';
      const url = await createR2UploadUrl(key, contentType, 300);
      const details = r2EndpointDetails();
      return json({
        url,
        path: r2StoredPath(key),
        contentType,
        endpointHost: new URL(url).host,
        bucket: details.bucket
      });
    }

    if (!allowedHealthPath(body.path, user.id)) {
      return json({ message: 'Invalid R2 browser-test path.' }, { status: 403 });
    }

    if (body.action === 'cleanup') {
      try {
        await deleteR2Objects([body.path]);
      } catch {
        // Best-effort cleanup only.
      }
      return json({ ok: true });
    }

    const exists = await r2ObjectExists(body.path);
    if (!exists) {
      return json(
        { message: 'The browser request reached Cloudflare, but the test object was not stored.' },
        { status: 409 }
      );
    }
    await deleteR2Objects([body.path]);
    return json({ ok: true });
  } catch (error) {
    console.error('R2 diagnostic failed', error);
    const e = apiError(error);
    return json(
      {
        message:
          error instanceof z.ZodError
            ? 'Invalid R2 diagnostic request.'
            : `Cloudflare R2 configuration check failed: ${publicError(error)}`
      },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}
