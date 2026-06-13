// GET /api/get-projects — fast, cached response
import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    // Cache for 10 seconds — reduces cold starts on repeat loads
    'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
  };

  try {
    const store = getStore('projects');
    const { blobs } = await store.list();

    // Fetch all in parallel — much faster than sequential
    const results = await Promise.allSettled(
      blobs.map(b => store.get(b.key, { type: 'json' }))
    );

    const projects = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value)
      .sort((a, b) => b.id - a.id); // newest first

    return new Response(JSON.stringify({ ok: true, projects }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, projects: [] }), { status: 200, headers });
  }
};

export const config = { path: '/api/get-projects' };
