import {
  createAdminSession,
  hasAdminConfiguration,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from '../../src/server/adminSession.js';

export default function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  if (!hasAdminConfiguration()) {
    return response.status(503).json({ error: 'Admin login is not configured.' });
  }

  const { username, password } = request.body ?? {};
  if (!verifyAdminCredentials(username, password)) {
    return response.status(401).json({ error: 'Incorrect admin name or password.' });
  }

  setAdminSessionCookie(response, createAdminSession());
  return response.status(200).json({ authenticated: true });
}