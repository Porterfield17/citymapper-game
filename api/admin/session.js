import { hasAdminConfiguration, hasAdminSession } from '../../src/server/adminSession.js';

export default function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  if (!hasAdminConfiguration()) {
    return response.status(503).json({ error: 'Admin login is not configured.' });
  }

  return response.status(200).json({ authenticated: hasAdminSession(request) });
}