// POST /api/save-project — optimised for speed
import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers });

  try {
    const body = await req.json();
    const { title, location, category, img, adminToken, _test } = body;

    // Auth check first — fast fail
    const validToken = process.env.ADMIN_TOKEN;
    if (!validToken || adminToken !== validToken) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers });
    }

    // Test call from login — just confirm auth
    if (_test) {
      return new Response(JSON.stringify({ ok: true, auth: true }), { status: 200, headers });
    }

    if (!title || !location || !category || !img) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing fields' }), { status: 400, headers });
    }

    // Validate image size — reject anything over 3MB base64 (~2.2MB image)
    if (img.length > 3 * 1024 * 1024) {
      return new Response(JSON.stringify({ ok: false, error: 'Image too large. Please use a smaller photo.' }), { status: 400, headers });
    }

    const id = Date.now();
    const project = {
      id,
      title:    title.trim(),
      location: location.trim(),
      category,
      img,
      date: new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }),
    };

    const store = getStore('projects');
    await store.setJSON(String(id), project);

    return new Response(JSON.stringify({ ok: true, project }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
  }
};

export const config = { path: '/api/save-project' };
