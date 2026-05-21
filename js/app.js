// ============================================
// SOVMESTIMOST — App Controller
// ============================================

// --- PWA: Service Worker & Install ---
var deferredInstallPrompt = null;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function(e) {
    console.warn('[SW] Registration failed:', e);
  });
}

window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredInstallPrompt = e;
  var btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'inline-flex';
});

window.addEventListener('appinstalled', function() {
  deferredInstallPrompt = null;
  var btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'none';
  console.log('[PWA] Installed!');
});

function installPWA() {
  if (!deferredInstallPrompt) {
    // iOS fallback
    alert('Нажмите «Поделиться» → «На экран Домой» для установки');
    return;
  }
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(function(result) {
    if (result.outcome === 'accepted') {
      console.log('[PWA] User accepted');
    }
    deferredInstallPrompt = null;
    var btn = document.getElementById('installBtn');
    if (btn) btn.style.display = 'none';
  });
}

// Check if already installed as PWA
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  // Already installed — hide install button
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('installBtn');
    if (btn) btn.style.display = 'none';
  });
}

const STORAGE_KEY = 'siynet_history';
const TG_AUTH_KEY = 'sovmest_tg_user';
const FREE_KEY = 'siynet_free_count';
const PAID_KEY = 'siynet_paid_count';
const MAX_FREE = 2;

let currentReport = null;
let currentDirection = 'forward';
let currentCategory = 'love';

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  populateDateDropdowns();
  updateFreeCounter();
  loadHistory();
  populateProfileSelector();
  checkTelegramAuth();
  // Always sync on page load (device-based)
  setTimeout(function() { syncFromServer(); }, 1500);
});

// --- Date dropdowns ---
function populateDateDropdowns() {
  // No longer needed — inputs are used instead of selects
}

function autoTabDate(el, nextId) {
  // Strip non-digits
  el.value = el.value.replace(/\D/g, '');
  if (el.value.length >= parseInt(el.maxLength)) {
    var next = document.getElementById(nextId);
    if (next) next.focus();
  }
}

function updateDateFromInputs(person) {
  var d = parseInt(document.getElementById('day'+person).value) || 0;
  var m = parseInt(document.getElementById('month'+person).value) || 0;
  var y = parseInt(document.getElementById('year'+person).value) || 0;
  var hidden = document.getElementById('date'+person);
  if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1920 && y <= 2026) {
    hidden.value = y+'-'+(m<10?'0'+m:m)+'-'+(d<10?'0'+d:d);
    updatePreview(person);
    checkReady();
  } else {
    hidden.value = '';
    checkReady();
  }
}

// Backward compat
function updateDateFromSelects(person) { updateDateFromInputs(person); }

// --- Gender toggle ---
function setGender(person, val, btn) {
  var container = document.getElementById('gender' + person);
  if (!container) return;
  container.querySelectorAll('.gender-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
}

function getGender(person) {
  var container = document.getElementById('gender' + person);
  if (!container) return 'm';
  var active = container.querySelector('.gender-btn.active');
  return active ? active.getAttribute('data-val') : 'm';
}

function populateProfileSelector() {
  const select = document.getElementById('profileSelectA');
  const currentVal = select.value;
  const history = JSON.parse(localStorage.getItem('siynet_history') || '[]');
  const db = getProfilesDB();
  
  const personAMap = {};
  
  // Fill only from history (Person A) to avoid showing Person B in the 'Это я' dropdown
  history.forEach(h => {
    const nameKey = (h.profileA.name || 'Без имени').toLowerCase().trim();
    const key = h.profileA.date + '_' + nameKey;
    
    if (!personAMap[key]) {
      let p = db[key];
      if (!p && db[h.profileA.date]) {
        p = db[h.profileA.date];
      }
      
      if (p) {
        personAMap[key] = Object.assign({}, p, { dbKey: key });
      } else {
        personAMap[key] = { name: h.profileA.name, date: h.profileA.date, code: h.profileA.code || '', dbKey: key };
      }
    }
  });

  const profiles = Object.values(personAMap).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  
  select.innerHTML = '<option value="">— Выбери профиль —</option>';
  profiles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.dbKey || p.date;
    let desc = p.code ? ` (${p.code})` : '';
    try {
      const full = getPersonProfile(p.date, p.name);
      if (full && full.code) {
        const arch = ARCHETYPES[full.cs];
        desc = ` — ${full.code} ${arch ? arch.name : ''} ${full.eastern ? full.eastern.emoji + ' ' + full.eastern.name : ''} ${full.western ? full.western.emoji + ' ' + full.western.name : ''} ${ELEMENTS_EMOJI[full.element]||''} ${ELEMENTS[full.element]||''}`;
      }
    } catch(e) {}
    opt.textContent = `${p.name || 'Без имени'}${desc}`;
    select.appendChild(opt);
  });
  
  if (currentVal && personAMap[currentVal]) {
    select.value = currentVal;
  }
}

function initEventListeners() {
  // Date inputs → profile preview
  document.getElementById('dateA').addEventListener('change', () => updatePreview('A'));
  document.getElementById('dateB').addEventListener('change', () => updatePreview('B'));
  
  // Name inputs → enable button check
  document.getElementById('nameA').addEventListener('input', checkReady);
  document.getElementById('nameB').addEventListener('input', checkReady);
  document.getElementById('dateA').addEventListener('change', checkReady);
  document.getElementById('dateB').addEventListener('change', checkReady);
  
  // Profile selector (Person A)
  document.getElementById('profileSelectA').addEventListener('change', function() {
    const val = this.value;
    if (!val) {
      // Reset
      document.getElementById('nameA').value = '';
      document.getElementById('dateA').value = '';
      document.getElementById('newProfileForm').style.display = 'none';
      updatePreview('A');
      checkReady();
      return;
    }
    // Load from DB
    const db = getProfilesDB();
    let p = db[val];
    
    // Fallback if it was from history and not in db
    if (!p) {
        const history = JSON.parse(localStorage.getItem('siynet_history') || '[]');
        for (let h of history) {
            const nameKey = (h.profileA.name || 'Без имени').toLowerCase().trim();
            if (h.profileA.date + '_' + nameKey === val || h.profileA.date === val) {
                p = h.profileA;
                break;
            }
        }
    }

    if (p) {
      document.getElementById('nameA').value = p.name;
      document.getElementById('dateA').value = p.date;
      // Fill date inputs
      if (p.date) {
        var parts = p.date.split('-');
        document.getElementById('yearA').value = parts[0] || '';
        document.getElementById('monthA').value = parseInt(parts[1]) || '';
        document.getElementById('dayA').value = parseInt(parts[2]) || '';
      }
      document.getElementById('newProfileForm').style.display = 'none';
      updatePreview('A');
      checkReady();
    }
  });
  
  // Add new profile button
  document.getElementById('addProfileBtn').addEventListener('click', () => {
    const form = document.getElementById('newProfileForm');
    const select = document.getElementById('profileSelectA');
    if (form.style.display === 'none') {
      form.style.display = 'block';
      select.value = '';
      document.getElementById('nameA').value = '';
      document.getElementById('dateA').value = '';
      document.getElementById('nameA').focus();
    } else {
      form.style.display = 'none';
    }
  });
  
  // Category select
  document.getElementById('categorySelect').addEventListener('change', function() {
    currentCategory = this.value;
    if (currentReport) recalculate();
  });
  
  // Calculate button
  document.getElementById('calcBtn').addEventListener('click', calculate);
  
  // (Direction switch removed — both directions shown)
  
  // Paywall
  document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('paywallModal').classList.remove('visible');
  });
  document.getElementById('payBtn').addEventListener('click', createPayment);

  // Edit Name Modal
  document.getElementById('saveNameBtn').addEventListener('click', saveEditedName);
  document.getElementById('closeEditNameModal').addEventListener('click', () => {
    document.getElementById('editNameModal').classList.remove('visible');
  });

  // Report Popup
  document.getElementById('closeReportPopup').addEventListener('click', closeReportPopupFn);
  document.getElementById('reportPopup').addEventListener('click', (e) => {
    if (e.target.id === 'reportPopup') closeReportPopupFn();
  });

  // Share
  document.getElementById('shareBtn').addEventListener('click', () => {
    if (currentReport) shareReport(currentReport);
  });
}

function updatePreview(person) {
  const dateInput = document.getElementById('date' + person);
  const previewId = 'preview' + person;
  if (!dateInput.value) {
    updateProfilePreview(previewId, null);
    return;
  }
  const profile = getPersonProfile(dateInput.value);
  updateProfilePreview(previewId, profile);
}

function checkReady() {
  const dateA = document.getElementById('dateA').value;
  const dateB = document.getElementById('dateB').value;
  document.getElementById('calcBtn').disabled = !(dateA && dateB);
}

// --- Calculation ---
function calculate() {
  const freeUsed = getFreeCount();
  const paidBought = getPaidCount();
  const totalAvailable = MAX_FREE + paidBought;
  
  if (freeUsed >= totalAvailable) {
    document.getElementById('paywallModal').classList.add('visible');
    var tw = document.getElementById('tgWarning');
    if (tw) tw.style.display = getTelegramUser() ? 'none' : 'block';
    return;
  }
  
  const dateA = document.getElementById('dateA').value;
  const dateB = document.getElementById('dateB').value;
  if (!dateA || !dateB) return;
  
  const nameAVal = document.getElementById('nameA').value || 'Персона A';
  const nameBVal = document.getElementById('nameB').value || 'Персона B';
  const gA = getGender('A');
  const gB = getGender('B');
  const profileA = getPersonProfile(dateA, nameAVal, gA);
  const profileB = getPersonProfile(dateB, nameBVal, gB);
  profileA.name = nameAVal;
  profileB.name = nameBVal;
  
  // Save profiles to address book
  saveProfileToDB(profileA);
  saveProfileToDB(profileB);
  
  currentReport = calcFullReport(profileA, profileB, currentCategory);
  
  renderResults(currentReport);
  
  // Save to history
  saveToHistory(currentReport);
  incrementFreeCount();
  updateFreeCounter();
  loadHistory();
  syncToServer(); // Sync with server if logged in
  
  // Refresh selector & auto-select
  populateProfileSelector();
  document.getElementById('profileSelectA').value = dateA;
  document.getElementById('newProfileForm').style.display = 'none';
}

function recalculate() {
  if (!currentReport) return;
  
  const profileA = currentReport.profileA;
  const profileB = currentReport.profileB;
  
  currentReport = calcFullReport(profileA, profileB, currentCategory);
  renderResults(currentReport);
}

// loadReportFromHistory removed — popup handled in ui.js via openReportPopup()

// --- Edit Name ---
let editingOldName = '';
function openEditName(date, currentName) {
  editingOldName = currentName;
  console.log('openEditName called:', date, currentName);
  document.getElementById('editProfileDate').value = date;
  document.getElementById('editNameInput').value = currentName;
  document.getElementById('editNameModal').classList.add('visible');
  setTimeout(() => document.getElementById('editNameInput').focus(), 100);
}

function saveEditedName() {
  const date = document.getElementById('editProfileDate').value;
  const newName = document.getElementById('editNameInput').value.trim();
  if (!newName || !date) return;

  renameProfileInDB(date, editingOldName, newName);
  document.getElementById('editNameModal').classList.remove('visible');

  // Refresh ranking
  loadHistory();

  // If current report has this profile, update it
  if (currentReport) {
    if (currentReport.profileA.date === date && currentReport.profileA.name === editingOldName) currentReport.profileA.name = newName;
    if (currentReport.profileB.date === date && currentReport.profileB.name === editingOldName) currentReport.profileB.name = newName;
    renderResults(currentReport, currentDirection);
  }
}

// --- History / Storage ---
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveToHistory(report) {
  const history = getHistory();
  // Remove duplicate if same pair+category+name
  const existing = history.findIndex(h => 
    h.profileA.date === report.profileA.date && 
    h.profileB.date === report.profileB.date && 
    h.profileB.name === report.profileB.name &&
    h.category === report.category
  );
  if (existing >= 0) history.splice(existing, 1);
  
  // Save minimal data
  history.unshift({
    uid: report.uid,
    timestamp: report.timestamp,
    category: report.category,
    profileA: { name: report.profileA.name, date: report.profileA.date, code: report.profileA.code, cs: report.profileA.cs, mission: report.profileA.mission, eastern: report.profileA.eastern, western: report.profileA.western, element: report.profileA.element },
    profileB: { name: report.profileB.name, date: report.profileB.date, code: report.profileB.code, cs: report.profileB.cs, mission: report.profileB.mission, eastern: report.profileB.eastern, western: report.profileB.western, element: report.profileB.element },
    forward: { percent: report.forward.percent, l1: report.forward.l1, l2: report.forward.l2, l3: report.forward.l3, l4: report.forward.l4, tier: report.forward.tier, multiplier: report.forward.multiplier, l1type: report.forward.l1type, l2type: report.forward.l2type, l3type: report.forward.l3type, l4type: report.forward.l4type },
    reverse: { percent: report.reverse.percent, l1: report.reverse.l1, l2: report.reverse.l2, l3: report.reverse.l3, l4: report.reverse.l4, tier: report.reverse.tier, multiplier: report.reverse.multiplier, l1type: report.reverse.l1type, l2type: report.reverse.l2type, l3type: report.reverse.l3type, l4type: report.reverse.l4type },
    pros: report.pros,
    cons: report.cons,
  });
  
  // Keep last 50
  if (history.length > 50) history.length = 50;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function deleteHistory(uid) {
  if (!confirm('Скрыть этот расчёт из рейтинга?')) return;
  let history = getHistory();
  var item = history.find(h => h.uid === uid);
  if (item) item.hidden = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  loadHistory();
  // Sync hidden flag to server with delay
  setTimeout(function() { syncToServer(); }, 500);
}

function loadHistory() {
  let history = getHistory();
  // Recalculate all scores with current engine
  history = history.map(function(h) {
    try {
      var pA = getPersonProfile(h.profileA.date, h.profileA.name);
      var pB = getPersonProfile(h.profileB.date, h.profileB.name);
      pA.name = h.profileA.name;
      pB.name = h.profileB.name;
      var report = calcFullReport(pA, pB, h.category);
      h.forward = { percent: report.forward.percent, l1: report.forward.l1, l2: report.forward.l2, l3: report.forward.l3, l4: report.forward.l4, tier: report.forward.tier, multiplier: report.forward.multiplier, l1type: report.forward.l1type, l2type: report.forward.l2type, l3type: report.forward.l3type, l4type: report.forward.l4type, layerDescs: report.forward.layerDescs };
      h.reverse = { percent: report.reverse.percent, l1: report.reverse.l1, l2: report.reverse.l2, l3: report.reverse.l3, l4: report.reverse.l4, tier: report.reverse.tier, multiplier: report.reverse.multiplier, l1type: report.reverse.l1type, l2type: report.reverse.l2type, l3type: report.reverse.l3type, l4type: report.reverse.l4type, layerDescs: report.reverse.layerDescs };
      h.pros = report.pros;
      h.cons = report.cons;
    } catch(e) {}
    return h;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  // Filter out hidden items for display only
  var visible = history.filter(function(h) { return !h.hidden; });
  renderDualRanking(visible);
}

// --- Freemium ---
function getFreeCount() {
  return parseInt(localStorage.getItem(FREE_KEY) || '0');
}

function getPaidCount() {
  return parseInt(localStorage.getItem(PAID_KEY) || '0');
}

function incrementFreeCount() {
  const count = getFreeCount() + 1;
  localStorage.setItem(FREE_KEY, count.toString());
}

function updateFreeCounter() {
  const used = getFreeCount();
  const paidBought = getPaidCount();
  const totalAvailable = MAX_FREE + paidBought;
  const left = Math.max(0, totalAvailable - used);
  const counter = document.getElementById('freeCounter');
  if (!counter) return;
  
  if (left === 0) {
    counter.style.borderColor = 'rgba(239,68,68,0.4)';
    counter.innerHTML = '\u26D4 \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C: <b style=\"color:#ef4444\">0</b> \u043E\u0431\u0437\u043E\u0440\u043E\u0432';
  } else if (left <= 5) {
    counter.style.borderColor = 'rgba(251,191,36,0.4)';
    counter.innerHTML = '\u26A1 \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C: <b style=\"color:#fbbf24\">' + left + '</b> \u043E\u0431\u0437\u043E\u0440\u043E\u0432';
  } else {
    counter.style.borderColor = 'rgba(124,58,237,0.4)';
    counter.innerHTML = '\uD83D\uDC8E \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C: <b>' + left + '</b> \u043E\u0431\u0437\u043E\u0440\u043E\u0432';
  }
}

// --- Device ID ---
function getDeviceId() {
  var id = localStorage.getItem('sovmest_device_id');
  if (!id) {
    id = 'dev-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sovmest_device_id', id);
  }
  return id;
}

// --- Server Sync (always works, device-based) ---
function syncToServer(callback) {
  var deviceId = getDeviceId();
  var history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  var tgUser = getTelegramUser();
  
  var payload = {
    device_id: deviceId,
    history: history,
  };
  // Attach TG if logged in
  if (tgUser && tgUser.id) {
    payload.tg_id = tgUser.id;
    payload.username = tgUser.username || '';
    payload.first_name = tgUser.first_name || '';
    payload.last_name = tgUser.last_name || '';
    payload.photo_url = tgUser.photo_url || '';
  }
  
  fetch('/api.php?action=save_history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.ok && data.history) {
      // Preserve local hidden flags
      var local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      var hiddenUids = {};
      local.forEach(function(h) { if (h.hidden) hiddenUids[h.uid] = true; });
      data.history.forEach(function(h) { if (hiddenUids[h.uid]) h.hidden = true; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.history));
      loadHistory();
      populateProfileSelector();
      console.log('[Sync] Synced. Total: ' + data.total + ', new: ' + data.new_synced);
    }
    if (typeof callback === 'function') callback();
  })
  .catch(function(e) {
    console.warn('[Sync] Error:', e);
    if (typeof callback === 'function') callback();
  });
}

function syncFromServer() {
  var deviceId = getDeviceId();
  
  fetch('/api.php?action=load_history&device_id=' + encodeURIComponent(deviceId))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok && data.history && data.history.length > 0) {
        var local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        var hiddenUids = {};
        local.forEach(function(h) { if (h.hidden) hiddenUids[h.uid] = true; });
        var merged = data.history.slice();
        merged.forEach(function(h) { if (hiddenUids[h.uid]) h.hidden = true; });
        var uids = {};
        merged.forEach(function(h) { uids[h.uid] = true; });
        local.forEach(function(h) {
          if (!uids[h.uid]) { merged.push(h); uids[h.uid] = true; }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        localStorage.setItem(FREE_KEY, merged.length.toString());
        if (data.paid_calcs !== undefined) {
          localStorage.setItem(PAID_KEY, data.paid_calcs.toString());
        }
        
        loadHistory();
        updateFreeCounter();
        populateProfileSelector();
        console.log('[Sync] Loaded from server. Total: ' + merged.length);
        
        syncToServer();
      }
    })
    .catch(function(e) { console.warn('[Sync] Load error:', e); });
}

// --- Telegram Auth ---
const TG_BOT_NAME = 'SovmestiBot';

function openTelegramAuth() {
  const w = 550, h = 450;
  const left = (screen.width - w) / 2;
  const top = (screen.height - h) / 2;
  const origin = encodeURIComponent(window.location.origin);
  const url = 'https://oauth.telegram.org/auth?bot_id=8978686854&origin=' + origin + '&request_access=write&return_to=' + encodeURIComponent(window.location.href);
  
  // Use Telegram Login Widget popup approach
  const authWin = window.open(url, 'TelegramAuth', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top);
  
  // Poll for auth result
  const pollTimer = setInterval(() => {
    try {
      if (authWin.closed) {
        clearInterval(pollTimer);
        checkTelegramAuth();
      }
    } catch(e) {}
  }, 500);
}

function onTelegramAuth(user) {
  // Verify with backend
  const params = new URLSearchParams(user).toString();
  fetch('/auth.php?' + params)
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        localStorage.setItem(TG_AUTH_KEY, JSON.stringify(data.user));
        renderAuthUI(data.user);
      }
    })
    .catch(() => {
      // Fallback: trust client-side data for now
      localStorage.setItem(TG_AUTH_KEY, JSON.stringify(user));
      renderAuthUI(user);
    });
}

function checkTelegramAuth() {
  // Check URL hash for Telegram callback
  const hash = window.location.hash;
  if (hash.includes('tgAuthResult=')) {
    try {
      const encoded = hash.split('tgAuthResult=')[1];
      const userData = JSON.parse(atob(decodeURIComponent(encoded)));
      onTelegramAuth(userData);
      history.replaceState(null, '', window.location.pathname);
      return;
    } catch(e) {}
  }
  
  // Check stored auth
  const stored = localStorage.getItem(TG_AUTH_KEY);
  if (stored) {
    try {
      renderAuthUI(JSON.parse(stored));
    } catch(e) {
      localStorage.removeItem(TG_AUTH_KEY);
    }
  }
}

function renderAuthUI(user) {
  // Trigger sync: push first (to trigger TG migration on server), then pull
  setTimeout(function() {
    syncToServer(function() {
      syncFromServer();
    });
  }, 500);
  var area = document.getElementById('authArea');
  if (!area) return;
  
  var name = user.first_name || user.username || 'User';
  var username = user.username ? '@' + user.username : '';
  var photo = user.photo_url || '';
  var photoHtml = photo ? '<img src="' + photo + '" alt="">' : '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#6366f1);display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:#fff;font-weight:700">' + name[0].toUpperCase() + '</div>';
  var nameBlock = '<div style="line-height:1.2"><div class="tg-profile-name">' + name + '</div>' + (username ? '<div style="font-size:0.65rem;color:var(--text-muted);opacity:0.7">' + username + '</div>' : '') + '</div>';
  
  area.innerHTML = '<div class="tg-profile">' + photoHtml + nameBlock + '<button class="tg-logout" onclick="event.preventDefault();event.stopPropagation();logoutTelegram()" title="Выйти" style="font-size:1rem;padding:4px 8px;cursor:pointer">✕</button></div>';
}

function logoutTelegram() {
  localStorage.removeItem(TG_AUTH_KEY);
  var area = document.getElementById('authArea');
  if (area) {
    area.innerHTML = '<button class="tg-login-btn" id="tgLoginBtn" onclick="openTelegramAuth()"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>Войти</button>';
  }
}

function getTelegramUser() {
  try {
    return JSON.parse(localStorage.getItem(TG_AUTH_KEY));
  } catch(e) {
    return null;
  }
}

// Listen for Telegram Login Widget callback
window.addEventListener('message', function(e) {
  if (e.origin === 'https://oauth.telegram.org') {
    try {
      const data = JSON.parse(e.data);
      if (data.event === 'auth_result') {
        onTelegramAuth(data.result);
      }
    } catch(err) {}
  }
});

// --- Finik Payment ---
function createPayment() {
  var tgUser = getTelegramUser();
  if (!tgUser) {
    if (confirm("Войдите через Telegram, чтобы не потерять оплаченные обзоры при смене устройства.\n\nНажмите OK чтобы войти через Telegram.")) {
      document.getElementById('paywallModal').classList.remove('visible');
      openTelegramAuth();
      return;
    }
  }
  var tgId = tgUser ? tgUser.id : '';
  var devId = getDeviceId();
  var btn = document.getElementById('payBtn');
  if (btn) {
    var origText = btn.innerHTML;
    btn.innerHTML = '��������...';
    btn.disabled = true;
  }

  fetch('/api.php?action=create_payment&device_id=' + encodeURIComponent(devId) + '&tg_id=' + encodeURIComponent(tgId))
    .then(r => r.json())
    .then(data => {
      if (data.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert('������ ��� �������� �������. ���������� �����.');
        if (btn) { btn.innerHTML = origText; btn.disabled = false; }
      }
    })
    .catch(e => {
      alert('������ ��� �������� �������: ' + e.message);
      if (btn) { btn.innerHTML = origText; btn.disabled = false; }
    });
}

// --- Paywall Price Calculator ---
function updatePaywallPrice() {
  var qty = parseInt(document.getElementById('qtySelect').value) || 1;
  var price = qty * 100;
  var discount = 0;
  if (qty >= 20) { price = qty * 85; discount = qty * 15; }
  else if (qty >= 10) { price = qty * 90; discount = qty * 10; }
  else if (qty >= 5) { price = qty * 95; discount = qty * 5; }
  
  document.getElementById('modalPrice').textContent = price + ' \u0441\u043E\u043C';
  var badge = document.getElementById('discountBadge');
  if (discount > 0) {
    badge.textContent = '\u0412\u044B \u044D\u043A\u043E\u043D\u043E\u043C\u0438\u0442\u0435 ' + discount + ' \u0441\u043E\u043C!';
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

// --- Handle payment=success redirect ---
(function() {
  var params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    // Clean URL
    history.replaceState(null, '', window.location.pathname);
    // Force re-sync to get updated paid_calcs
    setTimeout(function() {
      syncToServer(function() {
        syncFromServer();
        alert('\u041E\u043F\u043B\u0430\u0442\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u0430! \u0412\u0430\u0448 \u0431\u0430\u043B\u0430\u043D\u0441 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D.');
      });
    }, 1000);
  }
})();