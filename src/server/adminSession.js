import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'citymapper_admin';
const SESSION_SECONDS = 60 * 60 * 12;

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sessionSignature(expiresAt) {
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET)
    .update(`citymapper-admin:${expiresAt}`)
    .digest('base64url');
}

export function hasAdminConfiguration() {
  return Boolean(
    process.env.ADMIN_USERNAME
    && process.env.ADMIN_PASSWORD
    && process.env.ADMIN_SESSION_SECRET
  );
}

export function verifyAdminCredentials(username, password) {
  return hasAdminConfiguration()
    && secureEqual(username, process.env.ADMIN_USERNAME)
    && secureEqual(password, process.env.ADMIN_PASSWORD);
}

export function createAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${expiresAt}.${sessionSignature(expiresAt)}`;
}

export function hasAdminSession(request) {
  if (!hasAdminConfiguration()) {
    return false;
  }

  const cookieHeader = request.headers.cookie;
  const cookie = (Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader)
    ?.split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);

  if (!cookie) {
    return false;
  }

  const [expiresAt, signature] = cookie.split('.');
  if (!expiresAt || !signature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  return secureEqual(signature, sessionSignature(expiresAt));
}

export function setAdminSessionCookie(response, value, maxAge = SESSION_SECONDS) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`,
  );
}

export function clearAdminSessionCookie(response) {
  setAdminSessionCookie(response, '', 0);
}