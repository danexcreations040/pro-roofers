// Netlify Function — POST /api/save-project
// Saves a new project to Netlify Blobs (server storage — shows everywhere)

import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { title, location, category, img, adminToken } = body;

    // Verify admin token (set in Netlify env vars as ADMIN_TOKEN)
    const validToken = process.env.ADMIN_TOKEN;
    if (!validToken || adminToken !== validToken) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers });
    }

    if (!title || !location || !category || !img) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing fields' }), { status: 400, headers });
    }

    const project = {
      id:       Date.now(),
      title:    title.trim(),
      location: location.trim(),
      category,
      img,       // base64 data URL or external URL
      date:     new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }),
    };

    const store = getStore('projects');
    await store.setJSON(String(project.id), project);

    return new Response(JSON.stringify({ ok: true, project }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
  }
};

export const config = { path: '/api/save-project' };
