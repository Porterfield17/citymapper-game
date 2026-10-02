import { createClient } from '@supabase/supabase-js';
import { hasAdminSession } from '../src/server/adminSession.js';

function getDatabase() {
  const url = process.env.SUPABASE_URL ?? 'https://zsborwifgvukydppitwb.supabase.co';
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  return url && secretKey
    ? createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    : null;
}

export function getDatabaseClient() {
  return getDatabase();
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  const database = getDatabase();
  if (!database) {
    return response.status(503).json({ error: 'Live content storage is not configured.' });
  }

  if (request.method === 'GET') {
    const { data, error } = await database
      .from('game_content')
      .select('cities, daily_games')
      .eq('id', 'published')
      .maybeSingle();

    if (error) {
      console.error('Could not load published game content:', error.code, error.message);
      return response.status(500).json({ error: 'Could not load published game content.' });
    }

    return response.status(200).json({
      content: data ? { cities: data.cities, dailyGames: data.daily_games } : null,
    });
  }

  if (request.method !== 'PUT') {
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  if (!hasAdminSession(request)) {
    return response.status(401).json({ error: 'Admin login is required to publish content.' });
  }

  const { cities, dailyGames } = request.body ?? {};
  if (!Array.isArray(cities) || !Array.isArray(dailyGames)) {
    return response.status(400).json({ error: 'Cities and daily games must be arrays.' });
  }

  const { data, error } = await database
    .from('game_content')
    .upsert({
      id: 'published',
      cities,
      daily_games: dailyGames,
      updated_at: new Date().toISOString(),
    })
    .select('cities, daily_games')
    .single();

  if (error) {
    return response.status(500).json({ error: 'Could not publish game content.' });
  }

  return response.status(200).json({
    content: { cities: data.cities, dailyGames: data.daily_games },
  });
}