/* =========================================
   PRO ROOFERS KENYA — Admin Panel JS
   ========================================= */
'use strict';

const SESSION_KEY = 'pr_admin_session';
const TOKEN_KEY   = 'pr_admin_token';

function getToken()   { return sessionStorage.getItem(TOKEN_KEY) || ''; }
function setToken(t)  { sessionStorage.setItem(TOKEN_KEY, t); sessionStorage.setItem(SESSION_KEY, '1'); }
function clearToken() { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(SESSION_KEY); }
function isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === '1' && !!getToken(); }

/* ── API helpers ── */
async function apiPost(path, body) {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, adminToken: getToken() }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
async function apiGet(path) {
  try {
    const res = await fetch(path);
    return await res.json();
  } catch (e) {
    return { ok: false, projects: [], error: e.message };
  }
}

/* ── Compress image ── */
function compressImage(file, maxW = 1400, quality = 0.85) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ── DOM refs ── */
const loginScreen   = document.getElementById('loginScreen');
const dashboard     = document.getElementById('dashboard');
const loginForm     = document.getElementById('loginForm');
const loginError    = document.getElementById('loginError');
const adminPassEl   = document.getElementById('adminPass');
const togglePassBtn = document.getElementById('togglePass');
const logoutBtn     = document.getElementById('logoutBtn');

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

const projTitle    = document.getElementById('projTitle');
const projLocation = document.getElementById('projLocation');
const projCategory = document.getElementById('projCategory');

const adminGrid  = document.getElementById('adminGrid');
const emptyState = document.getElementById('emptyState');

const totalCount = document.getElementById('totalCount');
const instCount  = document.getElementById('instCount');
const repCount   = document.getElementById('repCount');
const wpCount    = document.getElementById('wpCount');
const trCount    = document.getElementById('trCount');
const gtCount    = document.getElementById('gtCount');

const clearAllBtn    = document.getElementById('clearAllBtn');
const changePassForm = document.getElementById('changePassForm');
const passMsg        = document.getElementById('passMsg');

let currentImageData = null;
let replaceId        = null; // if set, we're replacing an existing project's photo

/* ══════════════════════════════════════
   AUTH
══════════════════════════════════════ */
function showDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden   = false;
  loadAndRenderGrid();
}
function showLogin() {
  loginScreen.hidden = false;
  dashboard.hidden   = true;
}

// On page load — if session exists skip login
if (isLoggedIn()) {
  showDashboard();
} else {
  showLogin();
}

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  const pass = adminPassEl.value.trim();
  if (!pass) { loginError.textContent = 'Please enter your password.'; return; }

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
    // Auth passed (any response other than Unauthorized means token is correct)
    showDashboard();
  }
});

togglePassBtn.addEventListener('click', () => {
  const show = adminPassEl.type === 'password';
  adminPassEl.type = show ? 'text' : 'password';
  togglePassBtn.textContent = show ? '🙈' : '👁';
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  showLogin();
  adminPassEl.value = '';
});

/* ══════════════════════════════════════
   TABS
══════════════════════════════════════ */
document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById('tab-' + btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

/* ══════════════════════════════════════
   UPLOAD MODAL
══════════════════════════════════════ */
function openModal(forReplaceId = null) {
  replaceId = forReplaceId;
  uploadTitle.textContent = forReplaceId ? 'Replace Project Photo' : 'Upload New Project Photo';
  uploadModal.removeAttribute('hidden');
  currentImageData = null;
  previewArea.hidden = true;
  previewImg.src = '';
  projTitle.value = '';
  projLocation.value = '';
  projCategory.value = 'Installation';
  uploadError.textContent = '';
  uploadProgress.hidden = true;
  dropzone.hidden = false;

  // If replacing, hide title/location/category — just need new photo
  const metaFields = document.getElementById('metaFields');
  if (metaFields) metaFields.style.display = forReplaceId ? 'none' : 'block';

  setTimeout(() => { if (!forReplaceId) projTitle.focus(); }, 100);
}

function closeModal() {
  uploadModal.setAttribute('hidden', '');
  currentImageData = null;
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
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
photoInput.addEventListener('change', () => {
  if (photoInput.files[0]) handleFile(photoInput.files[0]);
  photoInput.value = '';
});

async function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    uploadError.textContent = '⚠️ Please select an image file (JPG, PNG, WEBP).';
    return;
  }
  uploadError.textContent = '';
  previewArea.hidden = false;
  dropzone.hidden = true;
  previewImg.src = '';
  previewName.textContent = 'Compressing image...';

  currentImageData = await compressImage(file);
  previewImg.src = currentImageData;
  const kb = Math.round(currentImageData.length * 0.75 / 1024);
  previewName.textContent = `${file.name} — ${kb > 1024 ? (kb/1024).toFixed(1)+'MB' : kb+'KB'} (ready)`;
}

/* ── Save / Replace photo ── */
savePhotoBtn.addEventListener('click', async () => {
  uploadError.textContent = '';

  if (!currentImageData) {
    uploadError.textContent = '⚠️ Please select a photo first.';
    return;
  }

  // If replacing, we just need the image
  if (!replaceId) {
    if (!projTitle.value.trim()) {
      uploadError.textContent = '⚠️ Please enter a project title.';
      projTitle.focus(); return;
    }
    if (!projLocation.value.trim()) {
      uploadError.textContent = '⚠️ Please enter the location.';
      projLocation.focus(); return;
    }
  }

  savePhotoBtn.textContent = 'Uploading...';
  savePhotoBtn.disabled = true;
  uploadProgress.hidden = false;
  uploadProgress.textContent = '⏳ Saving to server — please wait...';

  let res;
  if (replaceId) {
    // Delete old then save new with same id
    await apiPost('/api/delete-project', { id: replaceId });
    res = await apiPost('/api/save-project', {
      id:       replaceId,   // keep same id so order stays consistent
      title:    document.querySelector(`.admin-card[data-id="${replaceId}"] h4`)?.textContent || 'Project',
      location: document.querySelector(`.admin-card[data-id="${replaceId}"] .admin-card-meta`)?.textContent?.replace(/[📍\s]/g,'').replace(/^[A-Za-z]+/,'').trim() || '',
      category: document.querySelector(`.admin-card[data-id="${replaceId}"] .cat-badge`)?.textContent || 'Installation',
      img:      currentImageData,
    });
  } else {
    res = await apiPost('/api/save-project', {
      title:    projTitle.value.trim(),
      location: projLocation.value.trim(),
      category: projCategory.value,
      img:      currentImageData,
    });
  }

  savePhotoBtn.textContent = 'Save & Publish →';
  savePhotoBtn.disabled = false;
  uploadProgress.hidden = true;

  if (!res.ok) {
    uploadError.textContent = '❌ Upload failed: ' + (res.error || 'Unknown error. Check your ADMIN_TOKEN in Netlify.');
    return;
  }

  closeModal();
  loadAndRenderGrid();
  showToast(replaceId ? '🔄 Photo replaced on the website!' : '✅ Project published on the website!');
});

/* ══════════════════════════════════════
   LOAD & RENDER ADMIN GRID
══════════════════════════════════════ */
async function loadAndRenderGrid() {
  adminGrid.innerHTML = '<p class="loading-msg">⏳ Loading projects...</p>';

  const res      = await apiGet('/api/get-projects');
  const projects = res.projects || [];

  // Stats
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
    <div class="admin-card" data-id="${p.id}">
      <img class="admin-card-img" src="${p.img}"
           alt="${p.title}" loading="lazy"
           title="Click to view full size" />
      <div class="admin-card-body">
        <h4 title="${p.title}">${p.title}</h4>
        <div class="admin-card-meta">
          <span class="cat-badge">${p.category}</span>
          📍 ${p.location}
        </div>
        <p class="admin-card-date">${p.date || ''}</p>
        <div class="admin-card-actions">
          <button class="ac-btn ac-btn-replace" data-id="${p.id}" aria-label="Replace photo for ${p.title}">
            🔄 Replace
          </button>
          <button class="ac-btn ac-btn-del" data-id="${p.id}" aria-label="Delete ${p.title}">
            🗑 Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Replace buttons
  adminGrid.querySelectorAll('.ac-btn-replace').forEach(btn => {
    btn.addEventListener('click', () => openModal(+btn.dataset.id));
  });

  // Delete buttons
  adminGrid.querySelectorAll('.ac-btn-del').forEach(btn => {
    btn.addEventListener('click', () => deleteProject(+btn.dataset.id, btn));
  });

  // Click image to view full size
  adminGrid.querySelectorAll('.admin-card-img').forEach(img => {
    img.addEventListener('click', () => { window.open(img.src, '_blank'); });
  });
}

async function deleteProject(id, btn) {
  if (!confirm('Delete this project? It will be removed from the website immediately.')) return;
  btn.textContent = '...';
  btn.disabled = true;
  const res = await apiPost('/api/delete-project', { id });
  if (res.ok) {
    loadAndRenderGrid();
    showToast('🗑 Project deleted from website.');
  } else {
    btn.textContent = '🗑 Delete';
    btn.disabled = false;
    showToast('❌ Delete failed: ' + (res.error || 'Unknown error'));
  }
}

/* ══════════════════════════════════════
   SETTINGS — Clear all
══════════════════════════════════════ */
clearAllBtn.addEventListener('click', async () => {
  if (!confirm('⚠️ Delete ALL project photos permanently?\n\nThis removes everything from the website. Cannot be undone.')) return;
  clearAllBtn.textContent = 'Deleting...';
  clearAllBtn.disabled = true;
  const res = await apiPost('/api/clear-projects', {});
  clearAllBtn.textContent = '🗑️ Delete All Projects';
  clearAllBtn.disabled = false;
  if (res.ok) {
    loadAndRenderGrid();
    showToast('All projects deleted from website.');
  } else {
    showToast('❌ Failed: ' + (res.error || 'Unknown error'));
  }
});

/* ══════════════════════════════════════
   SETTINGS — Change password form
══════════════════════════════════════ */
changePassForm.addEventListener('submit', async e => {
  e.preventDefault();
  passMsg.className = 'pass-msg';
  passMsg.textContent = '';

  const oldPass  = document.getElementById('oldPass').value;
  const newPass  = document.getElementById('newPass').value;
  const confirm  = document.getElementById('confirmPass').value;

  const savedToken = getToken();
  setToken(oldPass);
  const testRes = await apiPost('/api/save-project', { _test: true });
  setToken(savedToken);

  if (testRes.error === 'Unauthorized') {
    passMsg.textContent = '❌ Current password is wrong.';
    passMsg.className = 'pass-msg error'; return;
  }
  if (newPass.length < 6) {
    passMsg.textContent = '❌ New password must be at least 6 characters.';
    passMsg.className = 'pass-msg error'; return;
  }
  if (newPass !== confirm) {
    passMsg.textContent = '❌ Passwords do not match.';
    passMsg.className = 'pass-msg error'; return;
  }

  passMsg.innerHTML = `✅ To apply your new password:<br>
    1. Go to <a href="https://app.netlify.com" target="_blank"><strong>app.netlify.com</strong></a><br>
    2. Site configuration → Environment variables<br>
    3. Edit <strong>ADMIN_TOKEN</strong> → set to: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${newPass}</code><br>
    4. Deploys → Trigger deploy → Deploy site`;
  passMsg.className = 'pass-msg success';
  changePassForm.reset();
});

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
function showToast(msg) {
  let t = document.getElementById('adminToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'adminToast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3500);
}
