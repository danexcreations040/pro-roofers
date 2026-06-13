// Netlify Function — POST /api/delete-project
// Deletes a project from Netlify Blobs

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
    const { id, adminToken } = await req.json();

    const validToken = process.env.ADMIN_TOKEN;
    if (!validToken || adminToken !== validToken) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers });
    }

    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing project id' }), { status: 400, headers });
    }

    const store = getStore('projects');
    await store.delete(String(id));

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
  }
};

export const config = { path: '/api/delete-project' };
