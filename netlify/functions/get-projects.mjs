// Netlify Function — GET /api/get-projects
// Returns all uploaded projects stored in Netlify Blobs (free server storage)

import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };

  try {
    const store    = getStore('projects');
    const { blobs } = await store.list();

    const projects = [];
    for (const blob of blobs) {
      try {
        const data = await store.get(blob.key, { type: 'json' });
        if (data) projects.push(data);
      } catch { /* skip corrupted entries */ }
    }

    // Sort newest first (by id timestamp)
    projects.sort((a, b) => b.id - a.id);

    return new Response(JSON.stringify({ ok: true, projects }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, projects: [], error: err.message }), { status: 200, headers });
  }
};

export const config = { path: '/api/get-projects' };
