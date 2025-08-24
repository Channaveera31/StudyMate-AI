// Global App JS
let APP_CONFIG = null;
let imagekit = null;

// Load config.json
async function loadConfig() {
  if (APP_CONFIG) return APP_CONFIG;
  const res = await fetch('/config.json');
  APP_CONFIG = await res.json();
  return APP_CONFIG;
}

// Router helpers
function goTo(url) { window.location.href = url; }
function setBackButton(target) {
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      goTo(target);
    });
  });
}

// Profile dropdown
function initProfileDropdown() {
  const trigger = document.querySelector('#profile-trigger');
  const menu = document.querySelector('#profile-menu');
  if (!trigger || !menu) return;

  trigger.addEventListener('click', () => {
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
  });
  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target) && !menu.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

  const myProfile = document.querySelector('#menu-myprofile');
  const myActivities = document.querySelector('#menu-activities');
  const changePassword = document.querySelector('#menu-changepassword');
  if (myProfile) myProfile.addEventListener('click', () => goTo('profile.html'));
  if (myActivities) myActivities.addEventListener('click', () => goTo('activities.html'));
  if (changePassword) changePassword.addEventListener('click', () => goTo('change-password.html'));
}

// Load or init user profile (from registration) from localStorage and keep in ImageKit JSON blob if configured
async function getUserProfile() {
  const raw = localStorage.getItem('sm_user_profile');
  if (raw) return JSON.parse(raw);
  return null;
}

function saveUserProfile(profile) {
  localStorage.setItem('sm_user_profile', JSON.stringify(profile));
  // Optionally, push to ImageKit as a JSON activity entry
  addActivity({ type: 'profile_update', timestamp: Date.now(), profile });
}

// Activities (persisted locally + to ImageKit if available)
function getActivities() {
  const raw = localStorage.getItem('sm_activities') || '[]';
  return JSON.parse(raw);
}

function saveActivities(list) {
  localStorage.setItem('sm_activities', JSON.stringify(list));
}

function addActivity(activity) {
  const acts = getActivities();
  acts.unshift(activity);
  saveActivities(acts);
  // We could also upload a rolling JSON to ImageKit via our backend endpoint
  fetch('/api/activities', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ activities: acts })}).catch(()=>{});
}

// Progress bar (global)
function setProgress(value) {
  const bar = document.querySelector('.progress-bar');
  if (bar) {
    const v = Math.max(0, Math.min(100, value));
    bar.style.width = v + '%';
    bar.setAttribute('aria-valuenow', v);
    localStorage.setItem('sm_progress', String(v));
  }
}

function initProgressBar() {
  const stored = Number(localStorage.getItem('sm_progress') || '0');
  setProgress(stored);
}

// ImageKit init (client-side uses public key + auth endpoint)
async function initImageKit() {
  const cfg = await loadConfig();
  if (window.ImageKit) {
    imagekit = new ImageKit({
      publicKey: cfg.imagekit.publicKey,
      urlEndpoint: cfg.imagekit.urlEndpoint,
      authenticationEndpoint: cfg.imagekit.authenticationEndpoint
    });
  }
  return imagekit;
}

// Upload helper (files/images/docs)
async function uploadToImageKit(file, folder='/studymate/uploads') {
  await initImageKit();
  if (!imagekit) throw new Error('ImageKit SDK not loaded');
  return new Promise((resolve, reject) => {
    imagekit.upload({
      file,
      fileName: file.name || ('upload_' + Date.now() + '.bin'),
      folder
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Scanner summarizer (Groq)
async function summarizeText(text) {
  const cfg = await loadConfig();
  const apiKey = cfg.groq.apiKey;
  const model = cfg.groq.model;
  const payload = {
    model,
    messages: [
      { role: "system", content: "You are a concise study assistant. Summarize text into key bullet points and a brief abstract." },
      { role: "user", content: "Summarize the following content:\n\n" + text }
    ],
    temperature: 0.2,
    max_tokens: 600
  };
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "No summary generated.";
  addActivity({ type: 'summary_generated', timestamp: Date.now(), length: text.length });
  return content;
}

// Bind scanner UI
function initScanner() {
  const fileInput = document.querySelector('#scan-file');
  const textArea = document.querySelector('#scan-text');
  const btnSummarize = document.querySelector('#btn-summarize');
  const output = document.querySelector('#summary-output');
  const btnUpload = document.querySelector('#btn-upload');

  if (!fileInput && !textArea) return;

  if (btnUpload && fileInput) {
    btnUpload.addEventListener('click', async () => {
      const f = fileInput.files?.[0];
      if (!f) { alert('Select a file to upload'); return; }
      try {
        const res = await uploadToImageKit(f, '/studymate/scans');
        addActivity({ type: 'file_uploaded', timestamp: Date.now(), url: res.url, name: res.name });
        alert('Uploaded to ImageKit: ' + res.url);
      } catch (e) {
        console.error(e);
        alert('Upload failed: ' + e.message);
      }
    });
  }

  if (btnSummarize) {
    btnSummarize.addEventListener('click', async () => {
      output.textContent = 'Generating summary...';
      let content = textArea?.value?.trim() || '';
      // If no text entered but a file is selected and is text-like, read it
      const f = fileInput?.files?.[0];
      if (!content && f) {
        const text = await f.text().catch(()=>'');
        content = text;
      }
      if (!content) { output.textContent = 'Please type or upload a text-based file.'; return; }
      try {
        const summary = await summarizeText(content);
        output.textContent = summary;
      } catch (e) {
        console.error(e);
        output.textContent = 'Summarization failed: ' + e.message;
      }
    });
  }
}

// Utility to ensure all intra-app links exist
function fixLinks() {
  const links = document.querySelectorAll('a[href]');
  links.forEach(a => {
    const href = a.getAttribute('href');
    if (href === '#' || href === '') {
      // try to prevent invalid selectors from being used elsewhere
      a.setAttribute('href', 'javascript:void(0)');
    }
  });
}

// Boot
window.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  initProfileDropdown();
  initProgressBar();
  fixLinks();
  initScanner();
});

// Expose for console
window.SM = { setProgress, addActivity, getActivities, getUserProfile, saveUserProfile };
