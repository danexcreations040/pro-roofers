/* =========================================
   PRO ROOFERS KENYA — Admin Panel JS
   Architecture:
   - Photos → Cloudinary (direct from browser, 1-3s)
   - Metadata → Netlify Blobs (tiny JSON, instant)
   - No base64, no slow serverless bottleneck
   ========================================= */
'use strict';

/* ─── CLOUDINARY CONFIG ───────────────────────
   1. Go to https://cloudinary.com and sign up free
   2. From your dashboard copy your Cloud Name
   3. Go to Settings → Upload → Add upload preset
      - Signing mode: Unsigned
      - Folder: pro-roofers
      - Copy the preset name
   4. Paste both values below, then redeploy
   ──────────────────────────────────────────── */
const CLOUDINARY_CLOUD = 'dpgnsmmls';
const CLOUDINARY_PRESET = 'ml_default';

const SESSION_KEY = 'pr_admin_session';
const TOKEN_KEY   = 'pr_admin_token';

function getToken()   { return sessionStorage.getItem(TOKEN_KEY) || ''; }
function setToken(t)  { sessionStorage.setItem(TOKEN_KEY, t); sessionStorage.setItem(SESSION_KEY, '1'); }
function clearToken() { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(SESSION_KEY); }
function isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === '1' && !!getToken(); }

/* ── API helpers (Netlify — metadata only, tiny payloads) ── */
async function apiPost(path, body) {
  try {
    const res = await fetch(path, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...body, adminToken: getToken() }),
    });
    return await res.json();
  } catch (e) { return { ok: false, error: e.message }; }
}
async function apiGet(path) {
  try {
    const res = await fetch(path);
    return await res.json();
  } catch (e) { return { ok: false, projects: [], error: e.message }; }
}

/* ── Upload image directly to Cloudinary (bypasses Netlify completely) ──
   This is why it's fast — image goes browser → Cloudinary CDN directly.
   Netlify only receives a short URL string, not the image data.          ── */
async function uploadToCloudinary(file, onProgress) {
  if (CLOUDINARY_CLOUD === 'YOUR_CLOUD_NAME') {
    throw new Error('SETUP_NEEDED');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('folder', 'pro-roofers');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        // Return optimised URL — auto quality, auto format, max 1200px wide
        const url = data.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_1200/');
        resolve({ url, publicId: data.public_id });
      } else {
        reject(new Error('Cloudinary upload failed: ' + xhr.status));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`);
    xhr.send(formData);
  });
}

/* ── DOM refs ── */
const loginScreen    = document.getElementById('loginScreen');
const dashboard      = document.getElementById('dashboard');
const loginForm      = document.getElementById('loginForm');
const loginError     = document.getElementById('loginError');
const adminPassEl    = document.getElementById('adminPass');
const togglePassBtn  = document.getElementById('togglePass');
const logoutBtn      = document.getElementById('logoutBtn');
const openUploadBtn  = document.getElementById('openUploadBtn');
const uploadModal    = document.getElementById('uploadModal');
const closeUploadBtn = document.getElementById('closeUpload');
const cancelUpload   = document.getElementById('cancelUpload');
const savePhotoBtn   = document.getElementById('savePhoto');
const uploadTitle    = document.getElementById('uploadTitle');
const dropzone       = document.getElementById('dropzone');
const photoInput     = document.getElementById('photoInput');
const previewArea    = document.getElementById('previewArea');
const previewImg     = document.getElementById('previewImg');
const previewName    = document.getElementById('previewName');
const uploadError    = document.getElementById('uploadError');
const uploadProgress = document.getElementById('uploadProgress');
const projTitle      = document.getElementById('projTitle');
const projLocation   = document.getElementById('projLocation');
const projCategory   = document.getElementById('projCategory');
const adminGrid      = document.getElementById('adminGrid');
const emptyState     = document.getElementById('emptyState');
const totalCount     = document.getElementById('totalCount');
const instCount      = document.getElementById('instCount');
const repCount       = document.getElementById('repCount');
const wpCount        = document.getElementById('wpCount');
const trCount        = document.getElementById('trCount');
const gtCount        = document.getElementById('gtCount');
const clearAllBtn    = document.getElementById('clearAllBtn');
const changePassForm = document.getElementById('changePassForm');
const passMsg        = document.getElementById('passMsg');

let selectedFile = null;
let replaceId    = null;

/* ══ AUTH ══ */
function showDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden   = false;

  // Show setup banner if Cloudinary not configured
  if (CLOUDINARY_CLOUD === 'YOUR_CLOUD_NAME') {
    showBanner(
      '⚠️ One-time setup needed: Configure Cloudinary for fast photo uploads. ' +
      '<a href="#" id="setupHelp" style="color:#e84c1e;font-weight:700">See instructions below ↓</a>'
    );
  }
  loadAndRenderGrid();
}
function showLogin() {
  loginScreen.hidden = false;
  dashboard.hidden   = true;
}

isLoggedIn() ? showDashboard() : showLogin();

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  const pass = adminPassEl.value.trim();
  if (!pass) return;

  const btn = loginForm.querySelector('button[type=submit]');
  btn.textContent = 'Checking...';
  btn.disabled = true;
  setToken(pass);

  const res = await apiPost('/api/save-project', { _test: true });
  btn.textContent = 'Login →';
  btn.disabled = false;

  if (res.error === 'Unauthorized') {
    clearToken();
    loginError.textContent = '❌ Wrong password. Please try again.';
    adminPassEl.value = '';
    adminPassEl.focus();
  } else {
    showDashboard();
  }
});

togglePassBtn.addEventListener('click', () => {
  const show = adminPassEl.type === 'password';
  adminPassEl.type = show ? 'text' : 'password';
  togglePassBtn.textContent = show ? '🙈' : '👁';
});

logoutBtn.addEventListener('click', () => { clearToken(); showLogin(); adminPassEl.value = ''; });

/* ══ TABS ══ */
document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const t = document.getElementById('tab-' + btn.dataset.tab);
    if (t) t.classList.add('active');
  });
});

/* ══ UPLOAD MODAL ══ */
function openModal(forReplaceId = null) {
  replaceId    = forReplaceId;
  selectedFile = null;
  uploadTitle.textContent = forReplaceId ? 'Replace Project Photo' : 'Upload New Project Photo';
  uploadModal.removeAttribute('hidden');
  previewArea.hidden = true;
  previewImg.src = '';
  projTitle.value = '';
  projLocation.value = '';
  projCategory.value = 'Installation';
  uploadError.textContent = '';
  uploadProgress.hidden = true;
  dropzone.hidden = false;
  uploadProgress.textContent = '';

  const metaFields = document.getElementById('metaFields');
  if (metaFields) metaFields.style.display = forReplaceId ? 'none' : 'block';
}
function closeModal() {
  uploadModal.setAttribute('hidden', '');
  selectedFile = null;
  replaceId = null;
}

openUploadBtn.addEventListener('click', () => openModal());
closeUploadBtn.addEventListener('click', closeModal);
cancelUpload.addEventListener('click', closeModal);
uploadModal.addEventListener('click', e => { if (e.target === uploadModal) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !uploadModal.hasAttribute('hidden')) closeModal();
});

/* ── Dropzone ── */
dropzone.addEventListener('click', () => photoInput.click());
dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') photoInput.click(); });
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
photoInput.addEventListener('change', () => {
  if (photoInput.files[0]) handleFile(photoInput.files[0]);
  photoInput.value = '';
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    uploadError.textContent = '⚠️ Please select an image file (JPG, PNG, WEBP).';
    return;
  }
  uploadError.textContent = '';
  selectedFile = file;

  // Show preview immediately — no heavy processing
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  const sizeKB = Math.round(file.size / 1024);
  previewName.textContent = `📷 ${file.name} — ${sizeKB > 1024 ? (sizeKB/1024).toFixed(1)+'MB' : sizeKB+'KB'} — ready to upload`;
  previewArea.hidden = false;
  dropzone.hidden = true;
}

/* ── Save photo ── */
savePhotoBtn.addEventListener('click', async () => {
  uploadError.textContent = '';

  if (!selectedFile) { uploadError.textContent = '⚠️ Please select a photo first.'; return; }
  if (!replaceId) {
    if (!projTitle.value.trim())    { uploadError.textContent = '⚠️ Enter a project title.';    projTitle.focus();    return; }
    if (!projLocation.value.trim()) { uploadError.textContent = '⚠️ Enter the project location.'; projLocation.focus(); return; }
  }

  savePhotoBtn.textContent = 'Uploading...';
  savePhotoBtn.disabled = true;
  uploadProgress.hidden = false;
  uploadProgress.textContent = '⬆️ Uploading photo to CDN... 0%';

  let imgUrl, cloudinaryId;

  try {
    const result = await uploadToCloudinary(selectedFile, pct => {
      uploadProgress.textContent = `⬆️ Uploading... ${pct}%`;
    });
    imgUrl = result.url;
    cloudinaryId = result.publicId;
    uploadProgress.textContent = '💾 Saving project info...';
  } catch (err) {
    savePhotoBtn.textContent = 'Save & Publish →';
    savePhotoBtn.disabled = false;
    uploadProgress.hidden = true;

    if (err.message === 'SETUP_NEEDED') {
      uploadError.innerHTML = '⚠️ Cloudinary not configured yet. <strong>Scroll down in Settings tab</strong> to see setup instructions.';
    } else {
      uploadError.textContent = '❌ Upload failed: ' + err.message;
    }
    return;
  }

  // Get existing project data if replacing
  let title = projTitle.value.trim();
  let location = projLocation.value.trim();
  let category = projCategory.value;

  if (replaceId) {
    const card = adminGrid.querySelector(`.admin-card[data-id="${replaceId}"]`);
    if (card) {
      title    = card.querySelector('h4')?.textContent || 'Project';
      location = card.dataset.location || '';
      category = card.dataset.category || 'Installation';
    }
    await apiPost('/api/delete-project', { id: replaceId });
  }

  const res = await apiPost('/api/save-project', { title, location, category, img: imgUrl, cloudinaryId });

  savePhotoBtn.textContent = 'Save & Publish →';
  savePhotoBtn.disabled = false;
  uploadProgress.hidden = true;

  if (!res.ok) {
    uploadError.textContent = '❌ Save failed: ' + (res.error || 'Unknown error');
    return;
  }

  closeModal();
  loadAndRenderGrid();
  showToast(replaceId ? '🔄 Photo replaced successfully!' : '✅ Project published on website!');
});

/* ══ RENDER GRID ══ */
async function loadAndRenderGrid() {
  adminGrid.innerHTML = '<p class="loading-msg">⏳ Loading...</p>';
  const res      = await apiGet('/api/get-projects');
  const projects = res.projects || [];

  totalCount.textContent = projects.length;
  instCount.textContent  = projects.filter(p => p.category === 'Installation').length;
  repCount.textContent   = projects.filter(p => p.category === 'Repair').length;
  wpCount.textContent    = projects.filter(p => p.category === 'Waterproofing').length;
  trCount.textContent    = projects.filter(p => p.category === 'Trusses').length;
  gtCount.textContent    = projects.filter(p => p.category === 'Gutters').length;

  if (!projects.length) {
    adminGrid.innerHTML = '';
    emptyState.hidden = false;
    adminGrid.appendChild(emptyState);
    return;
  }

  adminGrid.innerHTML = projects.map(p => `
    <div class="admin-card" data-id="${p.id}" data-location="${p.location || ''}" data-category="${p.category || 'Installation'}">
      <img class="admin-card-img" src="${p.img}" alt="${p.title}" loading="lazy" />
      <div class="admin-card-body">
        <h4 title="${p.title}">${p.title}</h4>
        <div class="admin-card-meta">
          <span class="cat-badge">${p.category}</span> 📍 ${p.location}
        </div>
        <p class="admin-card-date">${p.date || ''}</p>
        <div class="admin-card-actions">
          <button class="ac-btn ac-btn-replace" data-id="${p.id}">🔄 Replace</button>
          <button class="ac-btn ac-btn-del"     data-id="${p.id}">🗑 Delete</button>
        </div>
      </div>
    </div>
  `).join('');

  adminGrid.querySelectorAll('.ac-btn-replace').forEach(btn => {
    btn.addEventListener('click', () => openModal(+btn.dataset.id));
  });
  adminGrid.querySelectorAll('.ac-btn-del').forEach(btn => {
    btn.addEventListener('click', () => deleteProject(+btn.dataset.id, btn));
  });
  adminGrid.querySelectorAll('.admin-card-img').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => window.open(img.src, '_blank'));
  });
}

async function deleteProject(id, btn) {
  if (!confirm('Delete this project from the website?')) return;
  btn.textContent = '...';
  btn.disabled = true;
  const res = await apiPost('/api/delete-project', { id });
  if (res.ok) {
    loadAndRenderGrid();
    showToast('🗑 Project deleted.');
  } else {
    btn.textContent = '🗑 Delete';
    btn.disabled = false;
    showToast('❌ Delete failed: ' + (res.error || 'Unknown error'));
  }
}

/* ══ CLEAR ALL ══ */
clearAllBtn.addEventListener('click', async () => {
  if (!confirm('Delete ALL projects permanently?')) return;
  clearAllBtn.textContent = 'Deleting...';
  clearAllBtn.disabled = true;
  const res = await apiPost('/api/clear-projects', {});
  clearAllBtn.textContent = '🗑️ Delete All Projects';
  clearAllBtn.disabled = false;
  if (res.ok) { loadAndRenderGrid(); showToast('All projects deleted.'); }
  else showToast('❌ Failed: ' + (res.error || 'Unknown'));
});

/* ══ CHANGE PASSWORD ══ */
changePassForm.addEventListener('submit', async e => {
  e.preventDefault();
  passMsg.className = 'pass-msg';
  passMsg.textContent = '';
  const oldPass = document.getElementById('oldPass').value;
  const newPass = document.getElementById('newPass').value;
  const confirm = document.getElementById('confirmPass').value;

  const saved = getToken();
  setToken(oldPass);
  const test = await apiPost('/api/save-project', { _test: true });
  setToken(saved);

  if (test.error === 'Unauthorized') { passMsg.textContent = '❌ Current password is wrong.'; passMsg.className = 'pass-msg error'; return; }
  if (newPass.length < 6) { passMsg.textContent = '❌ New password must be at least 6 characters.'; passMsg.className = 'pass-msg error'; return; }
  if (newPass !== confirm) { passMsg.textContent = '❌ Passwords do not match.'; passMsg.className = 'pass-msg error'; return; }

  passMsg.innerHTML = `✅ Go to <a href="https://app.netlify.com" target="_blank"><strong>Netlify</strong></a> → Site config → Environment variables → update <strong>ADMIN_TOKEN</strong> to: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${newPass}</code> → Trigger deploy.`;
  passMsg.className = 'pass-msg success';
  changePassForm.reset();
});

/* ══ BANNER ══ */
function showBanner(html) {
  let b = document.getElementById('setupBanner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'setupBanner';
    b.style.cssText = 'background:#fff3cd;border:1.5px solid #ffc107;border-radius:10px;padding:14px 20px;margin-bottom:24px;font-size:.9rem;line-height:1.6;';
    document.querySelector('.main-content').prepend(b);
  }
  b.innerHTML = html;
}

/* ══ TOAST ══ */
function showToast(msg) {
  let t = document.getElementById('adminToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'adminToast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0f1a2b;color:#fff;padding:13px 28px;border-radius:50px;font-size:.9rem;font-weight:600;box-shadow:0 4px 24px rgba(0,0,0,.4);z-index:9999;white-space:nowrap;transition:opacity .3s;';
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.opacity = '0', 3500);
}
