// POST /api/clear-projects — delete all in parallel
import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers });

  try {
    const { adminToken } = await req.json();

    const validToken = process.env.ADMIN_TOKEN;
    if (!validToken || adminToken !== validToken) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers });
    }

    const store = getStore('projects');
    const { blobs } = await store.list();

    // Delete all in parallel — much faster than one by one
    await Promise.all(blobs.map(b => store.delete(b.key)));

    return new Response(JSON.stringify({ ok: true, deleted: blobs.length }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
  }
};

export const config = { path: '/api/clear-projects' };
