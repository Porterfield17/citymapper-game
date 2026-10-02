import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://zsborwifgvukydppitwb.supabase.co';
const supabaseAnonKey = 'sb_publishable_l4CFSZahBoYhsl8eET2iiA_wXw9iHYb';

const realtimeClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

async function readResponse(response) {
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'The live content service is unavailable.');
  }
  return result;
}

export async function getAdminSession() {
  const response = await fetch('/api/admin/session', { credentials: 'same-origin' });
  return readResponse(response);
}

export async function loginAdmin(username, password) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return readResponse(response);
}

export async function logoutAdmin() {
  const response = await fetch('/api/admin/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
  return readResponse(response);
}

export async function getPublishedContent() {
  const response = await fetch('/api/content', { cache: 'no-store' });
  const result = await readResponse(response);
  return result.content;
}

export async function publishContent(content) {
  const response = await fetch('/api/content', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
  return readResponse(response);
}

export async function uploadClueImage(image) {
  const response = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
  });
  const result = await readResponse(response);
  return result.url;
}

export function subscribeToPublishedContent(onContent) {
  if (!realtimeClient) {
    return () => {};
  }

  const channel = realtimeClient
    .channel('citymapper-live-content')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_content', filter: 'id=eq.published' },
      (change) => {
        const row = change.new;
        if (row?.id === 'published') {
          onContent({
            cities: row.cities ?? [],
            dailyGames: row.daily_games ?? [],
          });
        }
      },
    )
    .subscribe();

  return () => {
    void realtimeClient.removeChannel(channel);
  };
}