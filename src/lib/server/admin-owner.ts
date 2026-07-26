import { env } from '$env/dynamic/private';

function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}

function sameSecret(left: string, right: string) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

export function adminOwnerConfigured() {
  return Boolean(env.ADMIN_EMAIL?.trim() && env.ADMIN_ACCESS_CODE?.trim());
}

export function verifyAdminOwner(email: string, accessCode: string) {
  const adminEmail = env.ADMIN_EMAIL?.trim();
  const adminAccessCode = env.ADMIN_ACCESS_CODE?.trim();

  if (!adminEmail || !adminAccessCode) return false;

  return normaliseEmail(email) === normaliseEmail(adminEmail) && sameSecret(accessCode, adminAccessCode);
}
