import { randomUUID } from 'node:crypto';
import { getDatabaseClient } from './content.js';
import { hasAdminSession } from '../src/server/adminSession.js';

const IMAGE_DATA_URL = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_DATA_LENGTH = 4000000;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  if (!hasAdminSession(request)) {
    return response.status(401).json({ error: 'Admin login is required to upload images.' });
  }

  const match = typeof request.body?.image === 'string'
    && request.body.image.length <= MAX_IMAGE_DATA_LENGTH
    ? IMAGE_DATA_URL.exec(request.body.image)
    : null;

  if (!match) {
    return response.status(400).json({ error: 'The image is invalid or too large to upload.' });
  }

  const database = getDatabaseClient();
  if (!database) {
    return response.status(503).json({ error: 'Live image storage is not configured.' });
  }

  const contentType = match[1];
  const extension = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1];
  const path = `${randomUUID()}.${extension}`;
  const { error } = await database.storage
    .from('citymapper-clues')
    .upload(path, Buffer.from(match[2], 'base64'), {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    return response.status(500).json({ error: 'Could not store this clue image.' });
  }

  const { data } = database.storage.from('citymapper-clues').getPublicUrl(path);
  return response.status(200).json({ url: data.publicUrl });
}