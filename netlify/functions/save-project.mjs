// POST /api/save-project
// Saves project METADATA only (title, location, category, cloudinary URL)
// The image itself is already on Cloudinary — NOT stored here
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers });
  if (req.method !== 'POST')    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers });

  try {
    const body = await req.json();
    const { title, location, category, img, cloudinaryId, adminToken, _test } = body;

    const validToken = process.env.ADMIN_TOKEN;
    if (!validToken || adminToken !== validToken) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers });
    }

    if (_test) return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

    if (!title || !location || !category || !img) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing fields' }), { status: 400, headers });
    }

    const id = Date.now();
    // Store only tiny metadata — no base64, no large payload
    const project = {
      id,
      title:       title.trim(),
      location:    location.trim(),
      category,
      img,           // Cloudinary URL (short string, not base64)
      cloudinaryId:  cloudinaryId || null,
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
