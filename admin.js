/* =========================================
   PRO ROOFERS KENYA — Admin Panel JS
   Uses Netlify server storage so photos
   show on the website from ANY device.
   ========================================= */

'use strict';

/* ─── Admin token is set as an environment variable
       ADMIN_TOKEN in your Netlify dashboard.
       The password you type here is sent to the server
       and checked against that secret token.
       Nobody else can upload or delete photos.       ─── */

const SESSION_KEY = 'pr_admin_session';
const TOKEN_KEY   = 'pr_admin_token';

/* ── Store token in sessionStorage (clears when browser closes) ── */
function getToken()       { return sessionStorage.getItem(TOKEN_KEY) || ''; }
function setToken(t)      { sessionStorage.setItem(TOKEN_KEY, t); sessionStorage.setItem(SESSION_KEY, '1'); }
function clearToken()     { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(SESSION_KEY); }
function isLoggedIn()     { return sessionStorage.getItem(SESSION_KEY) === '1' && !!getToken(); }

/* ── API helpers ── */
async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, adminToken: getToken() }),
  });
  return res.json();
}
async function apiGet(path) {
  const res = await fetch(path);
  return res.json();
}

/* ── Compress image before uploading (keeps storage small) ── */
function compressImage(file, maxW = 1200, quality = 0.82) {
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

/* ─────────── DOM refs ─────────── */
const loginScreen  = document.getElementById('loginScreen');
const dashboard    = document.getElementById('dashboard');
const loginForm    = document.getElementById('loginForm');
const loginError   = document.getElementById('loginError');
const adminPassEl  = document.getElementById('adminPass');
const togglePassBtn= document.getElementById('togglePass');
const logoutBtn    = document.getElementById('logoutBtn');

const openUploadBtn  = document.getElementById('openUploadBtn');
const uploadModal    = document.getElementById('uploadModal');
const closeUploadBtn = document.getElementById('closeUpload');
const cancelUpload   = document.getElementById('cancelUpload');
const savePhotoBtn   = document.getElementById('savePhoto');

const dropzone    = document.getElementById('dropzone');
const photoInput  = document.getElementById('photoInput');
const previewArea = document.getElementById('previewArea');
const previewImg  = document.getElementById('previewImg');
const previewName = document.getElementById('previewName');
const uploadError = document.getElementById('uploadError');
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

const navItems       = document.querySelectorAll('.nav-item[data-tab]');
const changePassForm = document.getElementById('changePassForm');
const passMsg        = document.getElementById('passMsg');
const clearAllBtn    = document.getElementById('clearAllBtn');

let currentImageData = null;

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

if (isLoggedIn()) showDashboard();

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  const pass = adminPassEl.value.trim();
  if (!pass) return;

  // Test the password against the server — if the API accepts it, we're in
  const btn = loginForm.querySelector('button[type=submit]');
  btn.textContent = 'Checking...';
  btn.disabled = true;

  // Temporarily set token to test it
  setToken(pass);
  try {
    const res = await apiPost('/api/save-project', { _test: true });
    // Server returns 401 if wrong, anything else means token works
    if (res.error === 'Unauthorized') {
      clearToken();
      loginError.textContent = '❌ Wrong password. Please try again.';
      adminPassEl.value = '';
      adminPassEl.focus();
    } else {
      // Missing fields error means auth passed — token is correct
      showDashboard();
    }
  } catch {
    // Network issue — still let in if offline (graceful degradation)
    showDashboard();
  }
  btn.textContent = 'Login →';
  btn.disabled = false;
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
navItems.forEach(btn => {
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
function openModal() {
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
  projTitle.focus();
}
function closeModal() {
  uploadModal.setAttribute('hidden', '');
  currentImageData = null;
}

openUploadBtn.addEventListener('click', openModal);
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
  previewName.textContent = 'Compressing...';
  previewArea.hidden = false;
  dropzone.hidden = true;
  previewImg.src = '';

  currentImageData = await compressImage(file);
  previewImg.src = currentImageData;
  previewName.textContent = file.name + ' (compressed & ready)';
}

/* ── Save photo to Netlify server ── */
savePhotoBtn.addEventListener('click', async () => {
  uploadError.textContent = '';

  if (!currentImageData) {
    uploadError.textContent = '⚠️ Please select a photo first.';
    return;
  }
  if (!projTitle.value.trim()) {
    uploadError.textContent = '⚠️ Please enter a project title.';
    projTitle.focus();
    return;
  }
  if (!projLocation.value.trim()) {
    uploadError.textContent = '⚠️ Please enter the project location.';
    projLocation.focus();
    return;
  }

  savePhotoBtn.textContent = 'Uploading...';
  savePhotoBtn.disabled = true;
  uploadProgress.hidden = false;
  uploadProgress.textContent = '⏳ Saving to server...';

  const res = await apiPost('/api/save-project', {
    title:    projTitle.value.trim(),
    location: projLocation.value.trim(),
    category: projCategory.value,
    img:      currentImageData,
  });

  savePhotoBtn.textContent = 'Save & Publish →';
  savePhotoBtn.disabled = false;
  uploadProgress.hidden = true;

  if (!res.ok) {
    uploadError.textContent = '❌ Upload failed: ' + (res.error || 'Unknown error');
    return;
  }

  closeModal();
  loadAndRenderGrid();
  showToast('✅ Project published! It now shows on your website.');
});

/* ══════════════════════════════════════
   LOAD & RENDER ADMIN GRID
══════════════════════════════════════ */
async function loadAndRenderGrid() {
  adminGrid.innerHTML = '<p class="loading-msg">Loading projects...</p>';

  const res = await apiGet('/api/get-projects');
  const projects = res.projects || [];

  // Update stats
  totalCount.textContent = projects.length;
  instCount.textContent  = projects.filter(p => p.category === 'Installation').length;
  repCount.textContent   = projects.filter(p => p.category === 'Repair').length;
  wpCount.textContent    = projects.filter(p => p.category === 'Waterproofing').length;
  trCount.textContent    = projects.filter(p => p.category === 'Trusses').length;
  gtCount.textContent    = projects.filter(p => p.category === 'Gutters').length;

  if (!projects.length) {
    adminGrid.innerHTML = '';
    adminGrid.appendChild(emptyState);
    emptyState.hidden = false;
    return;
  }

  adminGrid.innerHTML = projects.map(p => `
    <div class="admin-card" data-id="${p.id}">
      <img class="admin-card-img" src="${p.img}" alt="${p.title}" loading="lazy" />
      <div class="admin-card-body">
        <h4 title="${p.title}">${p.title}</h4>
        <div class="admin-card-meta">
          <span class="cat-badge">${p.category}</span>
          📍 ${p.location}
        </div>
        <p class="admin-card-date">${p.date || ''}</p>
        <div class="admin-card-actions">
          <button class="ac-btn ac-btn-del" data-id="${p.id}" aria-label="Delete ${p.title}">🗑 Delete</button>
        </div>
      </div>
    </div>
  `).join('');

  adminGrid.querySelectorAll('.ac-btn-del').forEach(btn => {
    btn.addEventListener('click', () => deleteProject(+btn.dataset.id, btn));
  });
}

async function deleteProject(id, btn) {
  if (!confirm('Delete this project? It will be removed from the website.')) return;
  btn.textContent = 'Deleting...';
  btn.disabled = true;
  const res = await apiPost('/api/delete-project', { id });
  if (res.ok) {
    loadAndRenderGrid();
    showToast('🗑 Project deleted.');
  } else {
    btn.textContent = '🗑 Delete';
    btn.disabled = false;
    alert('Delete failed: ' + (res.error || 'Unknown error'));
  }
}

/* ══════════════════════════════════════
   SETTINGS — Change password
   (Updates the ADMIN_TOKEN in Netlify env —
    you change it in Netlify dashboard)
══════════════════════════════════════ */
changePassForm.addEventListener('submit', async e => {
  e.preventDefault();
  passMsg.className = 'pass-msg';
  passMsg.textContent = '';

  const oldPass  = document.getElementById('oldPass').value;
  const newPass  = document.getElementById('newPass').value;
  const confirm  = document.getElementById('confirmPass').value;

  // Verify old password works against server
  const savedToken = getToken();
  setToken(oldPass);
  const testRes = await apiPost('/api/save-project', { _test: true });

  if (testRes.error === 'Unauthorized') {
    setToken(savedToken);
    passMsg.textContent = '❌ Current password is wrong.';
    passMsg.className = 'pass-msg error';
    return;
  }

  setToken(savedToken); // restore

  if (newPass.length < 6) {
    passMsg.textContent = '❌ New password must be at least 6 characters.';
    passMsg.className = 'pass-msg error';
    return;
  }
  if (newPass !== confirm) {
    passMsg.textContent = '❌ Passwords do not match.';
    passMsg.className = 'pass-msg error';
    return;
  }

  passMsg.textContent = '✅ To change password: go to Netlify Dashboard → Site Settings → Environment Variables → update ADMIN_TOKEN to your new password → Redeploy.';
  passMsg.className = 'pass-msg success';
  changePassForm.reset();
});

/* ══════════════════════════════════════
   SETTINGS — Clear all
══════════════════════════════════════ */
clearAllBtn.addEventListener('click', async () => {
  if (!confirm('Delete ALL project photos permanently from the website? This cannot be undone.')) return;
  clearAllBtn.textContent = 'Deleting all...';
  clearAllBtn.disabled = true;
  const res = await apiPost('/api/clear-projects', {});
  clearAllBtn.textContent = '🗑️ Delete All Projects';
  clearAllBtn.disabled = false;
  if (res.ok) {
    loadAndRenderGrid();
    showToast('All projects deleted.');
  } else {
    alert('Failed: ' + (res.error || 'Unknown error'));
  }
});

/* ══════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════ */
function showToast(msg) {
  let t = document.getElementById('adminToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'adminToast';
    t.style.cssText = `
      position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);
      background:#0f1a2b;color:#fff;padding:13px 24px;border-radius:50px;
      font-size:.9rem;font-weight:600;box-shadow:0 4px 24px rgba(0,0,0,.4);
      opacity:0;transition:all .3s ease;z-index:9999;white-space:nowrap;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3500);
}
