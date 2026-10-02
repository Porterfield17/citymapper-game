import { clearAdminSessionCookie } from '../../src/server/adminSession.js';

export default function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  clearAdminSessionCookie(response);
  return response.status(200).json({ authenticated: false });
}