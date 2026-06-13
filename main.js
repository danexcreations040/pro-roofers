/* =========================================
   PRO ROOFERS KENYA — main.js
   Photos load from Netlify server — same
   photos show for EVERY visitor worldwide.
   ========================================= */

'use strict';

/* ── Fallback projects shown ONLY before you
      upload real photos via the admin panel ── */
const FALLBACK_PROJECTS = [
  { id: 1, title: "Iron Sheet Roof Installation", location: "Nairobi",  category: "Installation",  img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=700&q=80" },
  { id: 2, title: "Steel Truss Fabrication",      location: "Kiambu",   category: "Trusses",       img: "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=700&q=80" },
  { id: 3, title: "Waterproofing — Flat Roof",    location: "Mombasa",  category: "Waterproofing", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80" },
  { id: 4, title: "Timber Truss Installation",    location: "Nakuru",   category: "Trusses",       img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=700&q=80" },
  { id: 5, title: "Gutter & Downpipe System",     location: "Thika",    category: "Gutters",       img: "https://images.unsplash.com/photo-1534237886190-ced735ca4b73?w=700&q=80" },
  { id: 6, title: "Tile Roof — New Build",        location: "Kisumu",   category: "Installation",  img: "https://images.unsplash.com/photo-1599619351208-3e6c839d6828?w=700&q=80" },
  { id: 7, title: "Emergency Leak Repair",        location: "Eldoret",  category: "Repair",        img: "https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=700&q=80" },
  { id: 8, title: "Commercial Re-Roofing",        location: "Nairobi",  category: "Installation",  img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80" },
  { id: 9, title: "Roof Repair After Storm",      location: "Mombasa",  category: "Repair",        img: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=700&q=80" },
];

let allProjects      = [];
let filteredProjects = [];
let lbIndex          = 0;
let fadeObserver;

/* ── Fetch projects from Netlify server ── */
async function fetchProjects() {
  try {
    const res  = await fetch('/api/get-projects');
    const data = await res.json();
    if (data.ok && data.projects && data.projects.length) {
      return data.projects;
    }
    return []; // empty until you upload real photos
  } catch {
    return [];
  }
}

/* ── Render gallery ── */
async function renderWorks(filter) {
  const grid = document.getElementById('worksGrid');
  if (!grid) return;

  // Show loading state
  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:48px;color:rgba(255,255,255,.4)">
      Loading projects...
    </div>`;

  allProjects = await fetchProjects();

  filteredProjects = (filter === 'all' || !filter)
    ? allProjects
    : allProjects.filter(p => p.category === filter);

  if (!filteredProjects.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:rgba(255,255,255,.5)">
        <p style="font-size:2.5rem;margin-bottom:12px">📷</p>
        <p style="font-size:1rem;margin-bottom:16px">No projects uploaded yet.</p>
        <a href="admin.html" style="color:#e84c1e;font-weight:700;text-decoration:underline">
          Upload your first project photo →
        </a>
      </div>`;
    return;
  }

  grid.innerHTML = filteredProjects.map((p, i) => `
    <article
      class="work-card"
      tabindex="0"
      role="button"
      aria-label="View: ${p.title} in ${p.location}"
      data-index="${i}">
      <img
        src="${p.img}"
        alt="${p.title} by Pro Roofers Kenya in ${p.location}"
        loading="lazy"
        width="700"
        height="525"
      />
      <div class="work-overlay">
        <h4>${p.title}</h4>
        <span>${p.category} &mdash; ${p.location}</span>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.work-card').forEach(card => {
    card.addEventListener('click',   () => openLightbox(+card.dataset.index));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(+card.dataset.index);
      }
    });
  });

  requestAnimationFrame(() => {
    grid.querySelectorAll('.work-card').forEach(el => {
      el.classList.add('fade-in');
      if (fadeObserver) fadeObserver.observe(el);
    });
  });
}

/* ── Filter buttons ── */
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      renderWorks(btn.dataset.filter);
    });
  });
}

/* ── Lightbox ── */
function openLightbox(index) {
  lbIndex = index;
  const lb = document.getElementById('lightbox');
  lb.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  updateLightbox();
  document.getElementById('lbClose').focus();
}
function closeLightbox() {
  document.getElementById('lightbox').setAttribute('hidden', '');
  document.body.style.overflow = '';
}
function updateLightbox() {
  const p = filteredProjects[lbIndex];
  if (!p) return;
  const img = document.getElementById('lbImg');
  img.src = p.img;
  img.alt = `${p.title} — ${p.location}`;
  document.getElementById('lbCaption').textContent =
    `${p.title} · ${p.category} · ${p.location}`;
}
function initLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', () => {
    lbIndex = (lbIndex - 1 + filteredProjects.length) % filteredProjects.length;
    updateLightbox();
  });
  document.getElementById('lbNext').addEventListener('click', () => {
    lbIndex = (lbIndex + 1) % filteredProjects.length;
    updateLightbox();
  });
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (lb.hasAttribute('hidden')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  { lbIndex = (lbIndex - 1 + filteredProjects.length) % filteredProjects.length; updateLightbox(); }
    if (e.key === 'ArrowRight') { lbIndex = (lbIndex + 1) % filteredProjects.length; updateLightbox(); }
  });
}

/* ── Fade-in observer ── */
function initFadeIn() {
  fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        fadeObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.card, .why-item, .testimonial-card').forEach(el => {
    el.classList.add('fade-in');
    fadeObserver.observe(el);
  });
}

/* ── Header scroll ── */
function initHeader() {
  const h = document.getElementById('header');
  window.addEventListener('scroll', () => {
    h.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

/* ── Mobile nav ── */
function initNav() {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

/* ── Scroll to top ── */
function initScrollTop() {
  const btn = document.getElementById('scrollTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── Contact form → WhatsApp ── */
function initForm() {
  const form = document.getElementById('contactForm');
  const msg  = document.getElementById('formMsg');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    msg.className = 'form-note';
    msg.textContent = '';
    const name     = form.name.value.trim();
    const phone    = form.phone.value.trim();
    const location = form.location.value.trim();
    if (!name || !phone || !location) {
      msg.textContent = '⚠️ Please fill in your name, phone number, and location.';
      msg.className = 'form-note error';
      return;
    }
    const service = form.service.value || 'Not specified';
    const details = form.message.value.trim() || 'No extra details';
    const waText = [
      'Hello Pro Roofers Kenya! 👋', '',
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Location: ${location}`,
      `Service: ${service}`,
      `Details: ${details}`,
    ].join('\n');
    msg.textContent = '✅ Opening WhatsApp...';
    msg.className = 'form-note success';
    setTimeout(() => {
      window.open(`https://wa.me/254113824952?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer');
      form.reset();
    }, 700);
  });
}

/* ── Footer year ── */
function setYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initNav();
  initScrollTop();
  initForm();
  initFadeIn();
  initFilters();
  renderWorks('all');
  initLightbox();
  setYear();
});
