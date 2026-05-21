// ============================================
// СОВМЕСТИМОСТЬ — UI Components (Charts, Gauge, etc.)
// ============================================

function drawGauge(canvasId, percent, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w/2, cy = h/2, r = w/2 - 20;
  
  ctx.clearRect(0, 0, w, h);
  
  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 14;
  ctx.stroke();
  
  // Progress ring
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * percent / 100);
  
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, shiftColor(color, 40));
  
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();
  
  // Glow effect
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = color + '40';
  ctx.lineWidth = 28;
  ctx.stroke();
}

function animateGauge(canvasId, targetPercent, color, duration = 1200) {
  const suffix = canvasId.replace('gaugeCanvas', '');
  const el = document.getElementById('gaugePercent' + suffix);
  let start = null;
  
  function step(timestamp) {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = Math.round(targetPercent * eased);
    
    drawGauge(canvasId, current, color);
    if (el) el.innerHTML = current + '<small>%</small>';
    
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function drawRadar(canvasId, scores, labels) {
  // Legacy single call — wrap for comparison
  drawComparisonRadar(canvasId, scores, null, labels, '', '');
}

function drawComparisonRadar(canvasId, scoresA, scoresB, labels, nameA, nameB) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2 - 20;
  const r = Math.min(w, h) / 2 - 80;
  const n = labels.length;

  ctx.clearRect(0, 0, w, h);

  // Background grid rings
  for (let ring = 1; ring <= 5; ring++) {
    const rr = r * ring / 5;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      const x = cx + rr * Math.cos(angle);
      const y = cy + rr * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = ring === 5 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = ring === 5 ? 1.5 : 0.8;
    ctx.stroke();

    // Ring value label
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ring * 2, cx + 4, cy - rr + 13);
  }

  // Axes
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Helper: draw polygon with glow
  function drawPoly(scores, fillColor, strokeColor, glowColor, lw) {
    // Glow pass
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = (Math.PI * 2 * idx / n) - Math.PI / 2;
      const val = scores[idx] / 10;
      const x = cx + r * val * Math.cos(angle);
      const y = cy + r * val * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = lw + 6;
    ctx.stroke();

    // Fill + stroke
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = (Math.PI * 2 * idx / n) - Math.PI / 2;
      const val = scores[idx] / 10;
      const x = cx + r * val * Math.cos(angle);
      const y = cy + r * val * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  // Draw A polygon (purple/magenta) — behind
  drawPoly(scoresA, 'rgba(192, 38, 211, 0.22)', '#d946ef', 'rgba(217,70,239,0.12)', 2.5);

  // Draw B polygon (cyan/green) — on top
  if (scoresB) {
    drawPoly(scoresB, 'rgba(34, 211, 238, 0.18)', '#22d3ee', 'rgba(34,211,238,0.10)', 2.5);
  }

  // Draw data points with larger markers
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;

    // A point — diamond shape
    const valA = scoresA[i] / 10;
    const pxA = cx + r * valA * Math.cos(angle);
    const pyA = cy + r * valA * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(pxA, pyA, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#e879f9';
    ctx.fill();
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // B point
    if (scoresB) {
      const valB = scoresB[i] / 10;
      const pxB = cx + r * valB * Math.cos(angle);
      const pyB = cy + r * valB * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(pxB, pyB, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#67e8f9';
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Labels — positioned further out
    const labelR = r + 60;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Category name — large, bold, white
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(labels[i], lx, ly - 8);

    // Score values — stacked in 2 rows with color coding
    if (scoresB) {
      ctx.font = 'bold 17px Outfit, sans-serif';
      ctx.fillStyle = '#e879f9';
      ctx.fillText(scoresA[i], lx - 10, ly + 14);
      ctx.fillStyle = '#67e8f9';
      ctx.fillText(scoresB[i], lx + 10, ly + 14);
    } else {
      ctx.font = 'bold 17px Outfit, sans-serif';
      ctx.fillStyle = '#e879f9';
      ctx.fillText(scoresA[i] + '/10', lx, ly + 14);
    }
  }

  // Legend — larger, clearer
  if (scoresB && nameA && nameB) {
    const ly2 = h - 20;
    ctx.font = 'bold 14px Inter, sans-serif';

    // A legend
    ctx.fillStyle = '#d946ef';
    ctx.beginPath();
    ctx.roundRect(cx - 140, ly2 - 8, 14, 14, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'left';
    ctx.fillText(nameA + ' \u2192', cx - 122, ly2 + 1);

    // B legend
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.roundRect(cx + 20, ly2 - 8, 14, 14, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('\u2190 ' + nameB, cx + 38, ly2 + 1);
  }
}

function getScoreColor(score) {
  if (score >= 9) return '#00e676';
  if (score >= 7) return '#69f0ae';
  if (score >= 5) return '#ffd740';
  if (score >= 3) return '#ff9100';
  return '#ff5252';
}

function getPercentColor(pct) {
  if (pct >= 90) return '#00e676';
  if (pct >= 75) return '#69f0ae';
  if (pct >= 55) return '#ffd740';
  return '#ff5252';
}

function shiftColor(hex, amount) {
  hex = hex.replace('#', '');
  const r = Math.min(255, parseInt(hex.substr(0,2), 16) + amount);
  const g = Math.min(255, parseInt(hex.substr(2,2), 16) + amount);
  const b = Math.min(255, parseInt(hex.substr(4,2), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function updateProfilePreview(previewId, profile) {
  const el = document.getElementById(previewId);
  if (!el || !profile) { el.innerHTML = '<span>Введи дату чтобы увидеть профиль</span>'; el.classList.remove('active'); return; }
  el.classList.add('active');
  el.innerHTML = `
    <span class="code">${profile.code}</span>
    <span>${ARCHETYPES[profile.cs].name}</span>
    <span>${profile.eastern.emoji} ${profile.eastern.name}</span>
    <span>${profile.western.emoji} ${profile.western.name}</span>
    <span>${ELEMENTS_EMOJI[profile.element]} ${ELEMENTS[profile.element]}</span>
  `;
}

// --- Layer detail names by category context ---
const LAYER_LABELS = [
  { key: 'l1', name: 'Психология', sub: 'Понимание', icon: '🧠' },
  { key: 'l2', name: 'Инстинкты', sub: 'Страсть',    icon: '🔥' },
  { key: 'l3', name: 'Миссия',    sub: 'Бизнес',     icon: '🎯' },
  { key: 'l4', name: 'Стихия',    sub: 'Дружба',      icon: '🌊' },
];

function renderResults(report) {
  const nameA = report.profileA.name || 'Персона A';
  const nameB = report.profileB.name || 'Персона B';
  
  // Render both directions
  renderDirection(report.forward, nameA, nameB, 'Fwd', report.category);
  renderDirection(report.reverse, nameB, nameA, 'Rev', report.category);
  
  // Comparison Radar
  const fwd = report.forward;
  const rev = report.reverse;
  drawComparisonRadar('radarCanvasCompare',
    [fwd.l1, fwd.l2, fwd.l3, fwd.l4],
    [rev.l1, rev.l2, rev.l3, rev.l4],
    ['Психология', 'Инстинкты', 'Миссия', 'Стихия'],
    nameA + '→' + nameB, nameB + '→' + nameA
  );
  
  // Pros & Cons
  const prosList = document.getElementById('prosList');
  const consList = document.getElementById('consList');
  prosList.innerHTML = report.pros.map(p => `<li>${p}</li>`).join('');
  consList.innerHTML = report.cons.map(c => `<li>${c}</li>`).join('');
  
  // Show action buttons
  document.getElementById('resultActions').style.display = 'flex';
  
  // Show results
  document.getElementById('resultsSection').classList.add('visible');
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderDirection(data, fromName, toName, suffix, category) {
  const color = getPercentColor(data.percent);
  
  // Header
  const header = document.getElementById('dirHeader' + suffix);
  header.innerHTML = `<span class="dir-block-from">${fromName}</span> <span class="dir-block-arrow">→</span> <span class="dir-block-to">${toName}</span> <span class="dir-block-pct" style="color:${color}">${data.percent}%</span> <span class="dir-block-tier">${data.tier.emoji} ${data.tier.label}</span>`;
  
  // Gauge
  animateGauge('gaugeCanvas' + suffix, data.percent, color);
  document.getElementById('gaugeLabel' + suffix).textContent = `${data.tier.emoji} ${data.tier.label}`;
  document.getElementById('gaugeLabel' + suffix).style.color = color;
  document.getElementById('gaugeDesc' + suffix).textContent = data.tier.desc;
  
  // Overall desc
  const overallDesc = document.getElementById('gaugeOverallDesc' + suffix);
  if (overallDesc) {
    overallDesc.innerHTML = '<strong>' + fromName + ' → ' + toName + '</strong> (' + CATEGORY_NAMES[category] + '): итоговый индекс <strong style="color:' + color + '">' + data.percent + '%</strong>. ' + data.tier.desc;
  }
  
  // Layer cards
  const layersContainer = document.getElementById('layersGrid' + suffix);
  const layers = [
    { key: 'l1', score: data.l1, type: data.l1type, desc: data.layerDescs ? data.layerDescs.l1 : '' },
    { key: 'l2', score: data.l2, type: data.l2type, desc: data.layerDescs ? data.layerDescs.l2 : '' },
    { key: 'l3', score: data.l3, type: data.l3type, desc: data.layerDescs ? data.layerDescs.l3 : '' },
    { key: 'l4', score: data.l4, type: data.l4type, desc: data.layerDescs ? data.layerDescs.l4 : '' },
  ];

  layersContainer.innerHTML = layers.map((l, i) => {
    const lb = LAYER_LABELS[i];
    const scoreColor = getScoreColor(l.score);
    return `
      <div class="glass-card layer-card-full">
        <div class="layer-card-header">
          <span class="layer-card-icon">${lb.icon}</span>
          <div class="layer-card-info">
            <div class="layer-name">${lb.name} <span class="layer-sub">(${lb.sub})</span></div>
            <div class="layer-type" style="color:${scoreColor}">${l.type}</div>
          </div>
          <div class="layer-score" style="color:${scoreColor}">${l.score}/10</div>
        </div>
        <div class="layer-card-desc">${(l.desc||'').replace(/\n/g, '<br>')}</div>
      </div>`;
  }).join('');
  
  // Multiplier badges
  const badges = document.getElementById('multBadges' + suffix);
  badges.innerHTML = '';
  if (data.multiplier.golden) badges.innerHTML += '<span class="multiplier-badge golden">✨ Венера усиливает связь</span>';
  if (data.multiplier.redFlag) badges.innerHTML += '<span class="multiplier-badge red">⚠️ Зона напряжения</span>';
}

// --- PDF Generator ---
function generatePdfReport(report) {
  const nameA = report.profileA.name || 'Партнёр A';
  const nameB = report.profileB.name || 'Партнёр B';
  const catLabel = CATEGORY_NAMES[report.category] || report.category;
  const fwd = report.forward;
  const rev = report.reverse;

  function scoreColor(s) {
    if (s >= 8) return '#16a34a';
    if (s >= 5) return '#ca8a04';
    return '#dc2626';
  }

  function cleanHtml(str) {
    return (str || '').replace(/<[^>]*>?/gm, ''); // Remove basic html tags if any
  }

  function createLayerBlock(label, score, type, desc) {
    return {
      table: {
        widths: ['*'],
        body: [
          [
            {
              border: [false, false, false, false],
              fillColor: '#f9fafb',
              stack: [
                {
                  columns: [
                    { text: label, bold: true, fontSize: 13, color: '#111' },
                    { text: `${score}/10 · ${type}`, bold: true, fontSize: 13, color: scoreColor(score), alignment: 'right' }
                  ],
                  margin: [0, 0, 0, 5]
                },
                { text: cleanHtml(desc), fontSize: 11, color: '#4b5563', lineHeight: 1.3 }
              ],
              margin: [10, 10, 10, 10]
            }
          ]
        ]
      },
      layout: {
        hLineWidth: function () { return 1; },
        vLineWidth: function () { return 1; },
        hLineColor: function () { return '#e5e7eb'; },
        vLineColor: function () { return '#e5e7eb'; },
      },
      margin: [0, 0, 0, 10],
      unbreakable: true
    };
  }

  function createBonusBlock(text, type) {
    let color, bgColor, borderColor;
    if (type === 'golden') { color = '#d97706'; bgColor = '#fffbeb'; borderColor = '#fde68a'; }
    else if (type === 'red') { color = '#dc2626'; bgColor = '#fef2f2'; borderColor = '#fecaca'; }
    else if (type === 'astro') { color = '#9333ea'; bgColor = '#faf5ff'; borderColor = '#e9d5ff'; }

    return {
      table: {
        widths: ['*'],
        body: [[{
          text: text,
          fontSize: 11,
          color: color,
          fillColor: bgColor,
          margin: [8, 8, 8, 8],
          border: [false, false, false, false]
        }]]
      },
      layout: {
        hLineWidth: () => 1, vLineWidth: () => 1,
        hLineColor: () => borderColor, vLineColor: () => borderColor
      },
      margin: [0, 0, 0, 10]
    };
  }

  function createPersonBlock(directionStr, percent, tier, bonuses, l1, l2, l3, l4) {
    const blocks = [
      {
        columns: [
          { text: directionStr, bold: true, fontSize: 15, color: '#111' },
          { text: `${percent}%`, bold: true, fontSize: 16, color: scoreColor(percent >= 75 ? 8 : percent >= 55 ? 5 : 2), alignment: 'right' }
        ],
        margin: [0, 0, 0, 5]
      },
      { text: `${tier.label} — ${tier.desc}`, fontSize: 11, color: '#4b5563', margin: [0, 0, 0, 10] }
    ];

    if (bonuses.golden) blocks.push(createBonusBlock(`[Золотой бонус +10%]: Партнёр-Гармонизатор (6) повышает общий комфорт связи.`, 'golden'));
    if (bonuses.redFlag) blocks.push(createBonusBlock(`[Напряжение -20%]: Кармический конфликт мировоззрений. Требуется осознанность.`, 'red'));
    if (bonuses.astroBonus) blocks.push(createBonusBlock(`[Астро-бонус ${bonuses.astroBonus > 0 ? '+' : ''}${bonuses.astroBonus}%]: Влияние зодиакального аспекта.`, 'astro'));

    blocks.push(createLayerBlock('Психология', l1.score, l1.type, l1.desc));
    blocks.push(createLayerBlock('Инстинкты', l2.score, l2.type, l2.desc));
    blocks.push(createLayerBlock('Миссия', l3.score, l3.type, l3.desc));
    blocks.push(createLayerBlock('Стихия', l4.score, l4.type, l4.desc));

    return {
      table: {
        widths: ['*'],
        body: [[{ stack: blocks, margin: [15, 15, 15, 15], border: [false, false, false, false] }]]
      },
      layout: { hLineWidth: () => 2, vLineWidth: () => 2, hLineColor: () => '#e5e7eb', vLineColor: () => '#e5e7eb' },
      margin: [0, 0, 0, 15]
    };
  }

  const docDefinition = {
    info: {
      title: `СОВМЕСТИМОСТЬ_${nameA}_${nameB}`,
    },
    content: [
      { text: 'SOVMESTIMOST — Матрица Совместимости', fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 5] },
      { text: `Категория: ${catLabel} · ${new Date().toLocaleDateString('ru-RU')}`, fontSize: 11, color: '#6b7280', alignment: 'center', margin: [0, 0, 0, 20] },

      createPersonBlock(
        `${nameA} -> ${nameB}`, fwd.percent, fwd.tier,
        { golden: fwd.multiplier.golden, redFlag: fwd.multiplier.redFlag, astroBonus: fwd.astroBonus },
        { score: fwd.l1, type: fwd.l1type, desc: fwd.layerDescs?.l1 },
        { score: fwd.l2, type: fwd.l2type, desc: fwd.layerDescs?.l2 },
        { score: fwd.l3, type: fwd.l3type, desc: fwd.layerDescs?.l3 },
        { score: fwd.l4, type: fwd.l4type, desc: fwd.layerDescs?.l4 }
      ),

      createPersonBlock(
        `${nameB} -> ${nameA}`, rev.percent, rev.tier,
        { golden: rev.multiplier.golden, redFlag: rev.multiplier.redFlag, astroBonus: rev.astroBonus },
        { score: rev.l1, type: rev.l1type, desc: rev.layerDescs?.l1 },
        { score: rev.l2, type: rev.l2type, desc: rev.layerDescs?.l2 },
        { score: rev.l3, type: rev.l3type, desc: rev.layerDescs?.l3 },
        { score: rev.l4, type: rev.l4type, desc: rev.layerDescs?.l4 }
      ),

      {
        columns: [
          {
            width: '*',
            stack: [
              { text: '[Сильные стороны]', color: '#16a34a', bold: true, fontSize: 11, margin: [0, 0, 0, 5] },
              { ul: report.pros, fontSize: 10, color: '#374151', lineHeight: 1.2 }
            ],
            margin: [0, 0, 10, 0]
          },
          {
            width: '*',
            stack: [
              { text: '[Риски]', color: '#dc2626', bold: true, fontSize: 11, margin: [0, 0, 0, 5] },
              { ul: report.cons, fontSize: 10, color: '#374151', lineHeight: 1.2 }
            ]
          }
        ]
      },

      { text: `© ${new Date().getFullYear()} СОВМЕСТИМОСТЬ — Матрица Синергии 2.0 · sovmest.aist.pw`, alignment: 'center', fontSize: 9, color: '#9ca3af', margin: [0, 20, 0, 0] }
    ],
    defaultStyle: {
      font: 'Roboto'
    }
  };

  const btn = document.querySelector('.action-pdf');
  if (btn) {
    const origText = btn.innerHTML;
    btn.innerHTML = 'Создание...';
    btn.disabled = true;
    setTimeout(() => {
      pdfMake.createPdf(docDefinition).download(`СОВМЕСТИМОСТЬ_${nameA}_${nameB}.pdf`);
      btn.innerHTML = origText;
      btn.disabled = false;
    }, 100);
  } else {
    pdfMake.createPdf(docDefinition).download(`СОВМЕСТИМОСТЬ_${nameA}_${nameB}.pdf`);
  }
}

// --- Share ---
function shareReport(report) {
  const nameA = report.profileA.name || 'Персона A';
  const nameB = report.profileB.name || 'Персона B';
  const fwd = report.forward;
  const rev = report.reverse;
  const text = `🔮 СОВМЕСТИМОСТЬ — Совместимость\n\n${nameA} → ${nameB}: ${fwd.percent}% ${fwd.tier.emoji}\n${nameB} → ${nameA}: ${rev.percent}% ${rev.tier.emoji}\n\nПроверь свою: sovmest.aist.pw`;

  if (navigator.share) {
    navigator.share({ title: 'СОВМЕСТИМОСТЬ', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('shareBtn');
      const orig = btn.textContent;
      btn.textContent = '✅ Скопировано!';
      setTimeout(() => btn.textContent = orig, 2000);
    });
  }
}

// --- Profile Address Book (local DB) ---
const PROFILES_KEY = 'siynet_profiles';

function getProfilesDB() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}'); } catch { return {}; }
}

function saveProfileToDB(profile) {
  const db = getProfilesDB();
  // Use date_name as key to allow different people with same birthday
  const nameKey = (profile.name || 'Без имени').toLowerCase().trim();
  const key = profile.date + '_' + nameKey;
  // Also keep legacy date-only key for backward compat read
  db[key] = {
    name: profile.name || 'Без имени',
    date: profile.date,
    code: profile.code,
    cs: profile.cs,
    mission: profile.mission,
    eastern: profile.eastern,
    western: profile.western,
    element: profile.element,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(PROFILES_KEY, JSON.stringify(db));
}

function renameProfileInDB(date, oldName, newName) {
  const db = getProfilesDB();
  const oldNameKey = (oldName || 'Без имени').toLowerCase().trim();
  const exactKey = date + '_' + oldNameKey;
  const newNameKey = (newName || 'Без имени').toLowerCase().trim();
  const newKey = date + '_' + newNameKey;

  if (db[exactKey]) {
    db[newKey] = db[exactKey];
    db[newKey].name = newName;
    delete db[exactKey];
  } else if (db[date]) {
    db[newKey] = db[date];
    db[newKey].name = newName;
    delete db[date];
  }
  localStorage.setItem(PROFILES_KEY, JSON.stringify(db));

  // Also update history entries
  const history = JSON.parse(localStorage.getItem('siynet_history') || '[]');
  let updated = false;
  history.forEach(h => {
    if (h.profileA.date === date && h.profileA.name === oldName) { h.profileA.name = newName; updated = true; }
    if (h.profileB.date === date && h.profileB.name === oldName) { h.profileB.name = newName; updated = true; }
  });
  if (updated) {
    localStorage.setItem('siynet_history', JSON.stringify(history));
  }
}

function getAllProfiles() {
  const db = getProfilesDB();
  return Object.values(db);
}

// --- Ranking (only for Person A entries) ---
function renderDualRanking(history) {
  const section = document.getElementById('rankingSection');
  if (!history || history.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  // Collect unique Person A profiles
  const personAMap = {};
  history.forEach(h => {
    const key = h.profileA.date;
    if (!personAMap[key]) personAMap[key] = h.profileA;
  });
  const personAs = Object.values(personAMap);

  const container = document.getElementById('rankingContainer');
  container.innerHTML = '';

  personAs.forEach((personA, idx) => {
    const entries = [];
    history.forEach(h => {
      if (h.profileA.date === personA.date) {
        entries.push({
          other: h.profileB,
          fwd: h.forward.percent,
          rev: h.reverse.percent,
          category: h.category,
          uid: h.uid,
        });
      }
    });
    if (entries.length === 0) return;

    const seen = new Set();
    const unique = [];
    entries.forEach(e => {
      const key = e.other.date + '_' + e.category;
      if (!seen.has(key)) { seen.add(key); unique.push(e); }
    });
    
    // Group by person, sort groups by best score
    const groups = {};
    unique.forEach(e => {
      const pKey = e.other.date;
      if (!groups[pKey]) groups[pKey] = [];
      groups[pKey].push(e);
    });
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const bestA = Math.max(...a.map(x => Math.round((x.fwd + x.rev) / 2)));
      const bestB = Math.max(...b.map(x => Math.round((x.fwd + x.rev) / 2)));
      return bestB - bestA;
    });

    const name = personA.name || 'Персона A';
    const safeNameA = name.replace(/'/g, "\\'");
    const dateFormatted = personA.date ? personA.date.split('-').reverse().join('.') : '';
    const archA = ARCHETYPES[personA.cs];
    const profileLine = `<span style="color:#fff;font-weight:600">${personA.code}</span> · ${archA ? archA.name : ''} · ${personA.eastern ? personA.eastern.emoji + ' ' + personA.eastern.name : ''} · ${personA.western ? personA.western.emoji + ' ' + personA.western.name : ''} · ${ELEMENTS_EMOJI[personA.element] || ''} ${ELEMENTS[personA.element] || ''}`;
    const tableHTML = `
      <h2 class="ranking-title" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">🏆 Рейтинг для ${name} <button class="edit-name-btn" onclick="openEditName('${personA.date}','${safeNameA}')" title="Изменить имя" style="margin-top:-2px;">✏️</button> <span style="font-size:0.7em;color:var(--text-muted);font-weight:400;margin-left:auto;">(${dateFormatted})</span></h2>
      <div style="font-size:0.85rem;color:var(--text-muted);margin:-4px 0 12px;text-align:left">${profileLine}</div>
      <div class="rank-filter-bar" data-table-idx="${idx}">
        <button class="rank-filter-btn active" data-cat="all" onclick="filterRanking(${idx},'all',this)">Все</button>
        <button class="rank-filter-btn" data-cat="love" onclick="filterRanking(${idx},'love',this)">💕</button>
        <button class="rank-filter-btn" data-cat="business" onclick="filterRanking(${idx},'business',this)">💼</button>
        <button class="rank-filter-btn" data-cat="friends" onclick="filterRanking(${idx},'friends',this)">🤝</button>
        <button class="rank-filter-btn" data-cat="children" onclick="filterRanking(${idx},'children',this)">👶</button>
      </div>
      <div class="glass-card" style="overflow-x:auto;padding:16px;margin-bottom:24px;">
        <table class="ranking-table">
          <thead><tr>
            <th>#</th><th>Профиль</th>
            <th style="text-align:center">${name}<br><span style="font-weight:400;font-size:0.65rem">к ним</span></th><th style="text-align:center">Они<br><span style="font-weight:400;font-size:0.65rem">к ${name}</span></th>
            <th>Кат.</th><th></th>
          </tr></thead>
          <tbody id="rankTbody_${idx}"></tbody>
        </table>
      </div>`;
    if (idx === 0) container.insertAdjacentHTML('beforeend', '<div style="height:32px"></div>');
    container.insertAdjacentHTML('beforeend', tableHTML);

    const tbody = document.getElementById('rankTbody_' + idx);
    let rank = 0;
    const rows = [];
    sortedGroups.forEach(group => {
      rank++;
      group.sort((a, b) => b.fwd - a.fwd);
      group.forEach((item, gi) => {
        const fwdColor = getPercentColor(item.fwd);
        const revColor = getPercentColor(item.rev);
        const p = item.other;
        const arch = ARCHETYPES[p.cs];
        const tip = `${arch ? arch.name : ''}, ${p.eastern ? p.eastern.name : ''}, ${p.western ? p.western.name : ''}`;
        const profileNums = p.code || '';
        const profileIcons = (p.eastern ? p.eastern.emoji : '') + (p.western ? p.western.emoji : '');
        const safeName = (p.name||'').replace(/'/g, "\\'");
        const otherDate = p.date ? p.date.split('-').reverse().join('.') : '';
        const compact = `<div style="line-height:1.4;text-align:left">
          <div style="font-weight:600;font-size:0.85rem">${profileNums} <span style="font-size:0.9rem">${profileIcons}</span></div>
          <div style="display:flex;align-items:center;gap:6px;margin:2px 0;"><strong>${p.name||'Без имени'}</strong><button class="edit-name-btn" onclick="event.stopPropagation();openEditName('${p.date}','${safeName}')" title="Изменить имя">✏️</button></div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${otherDate}</div>
        </div>`;
        const fwdTier = RESULT_TIERS.find(t => item.fwd >= t.min) || RESULT_TIERS[RESULT_TIERS.length-1];
        const revTier = RESULT_TIERS.find(t => item.rev >= t.min) || RESULT_TIERS[RESULT_TIERS.length-1];
        const isFirst = gi === 0;
        const isLast = gi === group.length - 1;
        const isMulti = group.length > 1;
        let groupClass = isMulti ? (isFirst ? 'rank-group-first' : 'rank-group-cont') : '';
        if (isLast) groupClass += ' rank-group-last';
        rows.push(`<tr class="rank-row-clickable ${groupClass}" data-uid="${item.uid}" data-category="${item.category}" data-person="${p.date}">
          <td style="color:var(--text-muted)" class="rank-cell">${rank}</td>
          <td class="profile-compact${isFirst ? '' : ' name-hidden'}" title="${tip}">${compact}</td>
          <td style="text-align:center" title="${fwdTier.desc}"><span class="calc-fwd" style="color:${fwdColor};font-weight:700;font-family:Outfit;font-size:0.9rem">${item.fwd}%</span><div class="rank-tier-label" style="color:${fwdTier.color}">${fwdTier.emoji} ${fwdTier.label.replace(' ','<br>')}</div></td>
          <td style="text-align:center" title="${revTier.desc}"><span class="calc-rev" style="color:${revColor};font-weight:700;font-family:Outfit;font-size:0.9rem">${item.rev}%</span><div class="rank-tier-label" style="color:${revTier.color}">${revTier.emoji} ${revTier.label.replace(' ','<br>')}</div></td>
          <td style="font-size:0.75rem;position:relative"><span>${CATEGORY_LABELS[item.category]||item.category}</span>${(isFirst && group.length < 4) ? ` <button class="rank-cat-plus" onclick="event.stopPropagation();toggleCatMenu(this,'${p.date}','${personA.date}','${(p.name||'').replace(/'/g,"\\'")}','${(personA.name||'').replace(/'/g,"\\'")}')" title="Другая категория">+</button>` : ''}</td>
          <td><button class="history-delete" onclick="event.stopPropagation();deleteHistory('${item.uid}')">×</button></td>
        </tr>`);
      });
    });
    tbody.innerHTML = rows.join('');

    tbody.querySelectorAll('.rank-row-clickable').forEach(row => {
      row.addEventListener('click', () => openReportPopup(row.dataset.uid));
    });
  });
}

// --- Ranking filter ---
function filterRanking(tableIdx, cat, btn) {
  // Update active button
  const bar = btn.parentElement;
  bar.querySelectorAll('.rank-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  const tbody = document.getElementById('rankTbody_' + tableIdx);
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  // Filter rows
  rows.forEach(row => {
    if (cat === 'all') {
      row.style.display = '';
    } else {
      row.style.display = row.dataset.category === cat ? '' : 'none';
    }
  });
  
  // Re-sort visible rows by mutual average score
  const visible = rows.filter(r => r.style.display !== 'none');
  visible.sort((a, b) => {
    const aFwd = parseInt(a.querySelector('.calc-fwd')?.textContent) || 0;
    const aRev = parseInt(a.querySelector('.calc-rev')?.textContent) || 0;
    const bFwd = parseInt(b.querySelector('.calc-fwd')?.textContent) || 0;
    const bRev = parseInt(b.querySelector('.calc-rev')?.textContent) || 0;
    return ((bFwd + bRev) / 2) - ((aFwd + aRev) / 2);
  });
  
  // Re-append in sorted order, hidden rows stay at end
  const hidden = rows.filter(r => r.style.display === 'none');
  visible.forEach(r => tbody.appendChild(r));
  hidden.forEach(r => tbody.appendChild(r));
  
  // Update rank numbers and name visibility
  const seenPersons = new Set();
  let rank = 0;
  visible.forEach(row => {
    const person = row.dataset.person;
    const nameCell = row.querySelector('.name-cell');
    const profileCell = row.querySelector('.profile-compact');
    const rankCell = row.querySelector('.rank-cell');
    if (person && !seenPersons.has(person)) {
      seenPersons.add(person);
      rank++;
      if (nameCell) nameCell.classList.remove('name-hidden');
      if (profileCell) profileCell.classList.remove('name-hidden');
      if (rankCell) { rankCell.style.visibility = 'visible'; rankCell.textContent = rank; }
    } else {
      if (nameCell) nameCell.classList.add('name-hidden');
      if (profileCell) profileCell.classList.add('name-hidden');
      if (rankCell) rankCell.style.visibility = 'hidden';
    }
  });
}

// --- Category menu from + button ---
function toggleCatMenu(btn, dateB, dateA, nameB, nameA) {
  document.querySelectorAll('.rank-cat-dropdown').forEach(d => d.remove());
  
  // Find which categories already exist for this pair
  const history = JSON.parse(localStorage.getItem('siynet_history') || '[]');
  const existingCats = new Set();
  history.forEach(h => {
    if (h.profileA.date === dateA && h.profileB.date === dateB) existingCats.add(h.category);
  });
  
  const allCats = [
    { key: 'love', label: '💕 Любовь' },
    { key: 'business', label: '💼 Бизнес' },
    { key: 'friends', label: '🤝 Дружба' },
    { key: 'children', label: '👶 Дети' },
  ].filter(c => !existingCats.has(c.key))
    .filter(c => {
      // Love and Children are mutually exclusive
      if (c.key === 'love' && existingCats.has('children')) return false;
      if (c.key === 'children' && existingCats.has('love')) return false;
      return true;
    });
  
  if (allCats.length === 0) return; // All categories already calculated
  
  const menu = document.createElement('div');
  menu.className = 'rank-cat-dropdown';
  menu.innerHTML = allCats.map(c => `<button class="rank-cat-option" data-cat="${c.key}">${c.label}</button>`).join('');
  
  // Position fixed near button to avoid table scrollbar
  const rect = btn.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.left = (rect.left - 60) + 'px';
  document.body.appendChild(menu);
  
  menu.querySelectorAll('.rank-cat-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.remove();
      calcWithAnimation(dateA, dateB, nameA, nameB, opt.dataset.cat);
    });
  });
  
  setTimeout(() => {
    document.addEventListener('click', function handler() {
      menu.remove();
      document.removeEventListener('click', handler);
    }, { once: true });
  }, 10);
}

// --- Calculation Animation ---
function calcWithAnimation(dateA, dateB, nameA, nameB, category) {
  // Check free+paid limit
  const freeUsed = getFreeCount();
  const paidBought = getPaidCount();
  const totalAvailable = MAX_FREE + paidBought;
  if (freeUsed >= totalAvailable) {
    document.getElementById('paywallModal').classList.add('visible');
    return;
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'calc-overlay';
  overlay.innerHTML = `
    <div class="calc-spinner"></div>
    <div class="calc-text">Рассчитываем...</div>
    <div class="calc-detail">${nameA} ↔ ${nameB} · ${CATEGORY_NAMES[category] || category}</div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  
  setTimeout(() => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
    
    // Calculate, save, count
    const profileA = getPersonProfile(dateA);
    profileA.name = nameA;
    const profileB = getPersonProfile(dateB);
    profileB.name = nameB;
    const report = calcFullReport(profileA, profileB, category);
    
    saveToHistory(report);
    incrementFreeCount();
    updateFreeCounter();
    loadHistory();
    
    openReportPopupDirect(dateA, dateB, nameA, nameB, category);
  }, 1200);
}

// --- Report Popup ---
function openReportPopup(uid) {
  console.log('openReportPopup called with uid:', uid);
  const history = JSON.parse(localStorage.getItem('siynet_history') || '[]');
  const item = history.find(h => h.uid == uid);
  if (!item) { console.error('Item not found for uid:', uid); return; }
  console.log('Item found:', item);
  openReportPopupDirect(item.profileA.date, item.profileB.date, item.profileA.name, item.profileB.name, item.category);
}

function openReportPopupDirect(dateA, dateB, nameA, nameB, category) {
  const profileA = getPersonProfile(dateA);
  profileA.name = nameA;
  const profileB = getPersonProfile(dateB);
  profileB.name = nameB;

  const report = calcFullReport(profileA, profileB, category);
  window._popupReport = report;
  const fwd = report.forward;
  const rev = report.reverse;
  const fwdColor = getPercentColor(fwd.percent);
  const revColor = getPercentColor(rev.percent);
  const catLabel = CATEGORY_NAMES[category] || category;

  function layerRow(label, score, type, desc) {
    const c = getScoreColor(score);
    return `<div class="popup-layer">
      <div class="popup-layer-head"><span>${label}</span><span style="color:${c};font-weight:700">${score}/10 · ${type}</span></div>
      <div class="popup-layer-desc">${(desc||'').replace(/\n/g, '<br>')}</div>
    </div>`;
  }

  const body = document.getElementById('reportPopupBody');
  body.innerHTML = `
    <h2 style="margin-bottom:4px">${nameA} ↔ ${nameB}</h2>
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:20px">Категория: ${catLabel}</div>
    <div class="popup-direction">
      <div class="popup-dir-header">
        <span class="popup-dir-label">${nameA} → ${nameB}</span>
        <span class="popup-dir-pct" style="color:${fwdColor}">${fwd.percent}%</span>
        <span class="popup-dir-tier">${fwd.tier.emoji} ${fwd.tier.label}</span>
      </div>
      ${fwd.multiplier.golden ? '<div style="margin-bottom:12px;padding:8px 12px;background:rgba(251,191,36,0.1);border-radius:6px;border:1px solid rgba(251,191,36,0.3);color:#fbbf24;font-size:0.85rem;line-height:1.4">✨ <b>Золотой бонус (+10%):</b> Партнёр-Гармонизатор (6) сглаживает острые углы и повышает общий комфорт связи.</div>' : ''}
      ${fwd.multiplier.redFlag ? '<div style="margin-bottom:12px;padding:8px 12px;background:rgba(239,68,68,0.1);border-radius:6px;border:1px solid rgba(239,68,68,0.3);color:#ef4444;font-size:0.85rem;line-height:1.4">⚠️ <b>Напряжение (-20%):</b> Кармический конфликт мировоззрений (1-7) или Векторный удар. Требуется осознанность.</div>' : ''}
      ${fwd.astroBonus ? `<div style="margin-bottom:12px;padding:8px 12px;background:rgba(168,85,247,0.1);border-radius:6px;border:1px solid rgba(168,85,247,0.3);color:#c084fc;font-size:0.85rem;line-height:1.4">✨ <b>Астро-бонус (${fwd.astroBonus > 0 ? '+' : ''}${fwd.astroBonus}%):</b> Влияние зодиакального аспекта.</div>` : ''}
      ${layerRow('🧠 Психология', fwd.l1, fwd.l1type, fwd.layerDescs ? fwd.layerDescs.l1 : '')}
      ${layerRow('🔥 Инстинкты', fwd.l2, fwd.l2type, fwd.layerDescs ? fwd.layerDescs.l2 : '')}
      ${layerRow('🎯 Миссия', fwd.l3, fwd.l3type, fwd.layerDescs ? fwd.layerDescs.l3 : '')}
      ${layerRow('🌊 Стихия', fwd.l4, fwd.l4type, fwd.layerDescs ? fwd.layerDescs.l4 : '')}
    </div>
    <div class="popup-direction" style="margin-top:20px">
      <div class="popup-dir-header">
        <span class="popup-dir-label">${nameB} → ${nameA}</span>
        <span class="popup-dir-pct" style="color:${revColor}">${rev.percent}%</span>
        <span class="popup-dir-tier">${rev.tier.emoji} ${rev.tier.label}</span>
      </div>
      ${rev.multiplier.golden ? '<div style="margin-bottom:12px;padding:8px 12px;background:rgba(251,191,36,0.1);border-radius:6px;border:1px solid rgba(251,191,36,0.3);color:#fbbf24;font-size:0.85rem;line-height:1.4">✨ <b>Золотой бонус (+10%):</b> Партнёр-Гармонизатор (6) сглаживает острые углы и повышает общий комфорт связи.</div>' : ''}
      ${rev.multiplier.redFlag ? '<div style="margin-bottom:12px;padding:8px 12px;background:rgba(239,68,68,0.1);border-radius:6px;border:1px solid rgba(239,68,68,0.3);color:#ef4444;font-size:0.85rem;line-height:1.4">⚠️ <b>Напряжение (-20%):</b> Кармический конфликт мировоззрений (1-7) или Векторный удар. Требуется осознанность.</div>' : ''}
      ${rev.astroBonus ? `<div style="margin-bottom:12px;padding:8px 12px;background:rgba(168,85,247,0.1);border-radius:6px;border:1px solid rgba(168,85,247,0.3);color:#c084fc;font-size:0.85rem;line-height:1.4">✨ <b>Астро-бонус (${rev.astroBonus > 0 ? '+' : ''}${rev.astroBonus}%):</b> Влияние зодиакального аспекта.</div>` : ''}
      ${layerRow('🧠 Психология', rev.l1, rev.l1type, rev.layerDescs ? rev.layerDescs.l1 : '')}
      ${layerRow('🔥 Инстинкты', rev.l2, rev.l2type, rev.layerDescs ? rev.layerDescs.l2 : '')}
      ${layerRow('🎯 Миссия', rev.l3, rev.l3type, rev.layerDescs ? rev.layerDescs.l3 : '')}
      ${layerRow('🌊 Стихия', rev.l4, rev.l4type, rev.layerDescs ? rev.layerDescs.l4 : '')}
    </div>

    <!-- Astro Synergy Block -->
    ${typeof calcZodiacConflict === 'function' ? (() => {
      const astro = calcZodiacConflict(profileA.western, profileB.western);
      return `
      <div class="astro-block" style="margin-top:24px;">
        <div class="astro-header">
          <div class="astro-emoji">✨</div>
          <div>
            <div class="astro-title">Астро-синергия (Решение конфликтов)</div>
            <div class="astro-aspect">${profileA.western.emoji} ${profileA.western.name} и ${profileB.western.emoji} ${profileB.western.name} — ${astro.name}</div>
          </div>
        </div>
        <div class="astro-desc">${astro.desc}</div>
      </div>`;
    })() : ''}

    <!-- Timeline Chart Block -->
    ${typeof calcTimeline === 'function' ? `
    <div class="timeline-block" style="margin-top:24px;background:rgba(255,255,255,0.02);padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
      <h3 style="font-size:1rem;margin-bottom:8px;font-family:'Outfit',sans-serif;">📈 Динамика отношений во времени</h3>
      <div style="font-size:0.8rem;color:var(--text-muted);line-height:1.4;">В 33 года включается Миссия. График показывает изменение синергии с учетом взросления партнёров.</div>
      <div class="timeline-container">
        <canvas id="timelineChart"></canvas>
      </div>
      <div class="timeline-legend">
        <span class="legend-cs">Общая совместимость</span>
        
        <span class="legend-current">Сейчас</span>
      </div>
      <div id="timelineReasons" style="margin-top:16px;font-size:0.85rem;color:var(--text-secondary);line-height:1.5;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);"></div>
    </div>` : ''}

    <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;flex-wrap:wrap">
      <button class="action-btn action-pdf" onclick="generatePdfReport(_popupReport)">📄 Скачать PDF</button>
      <button class="modal-close" onclick="closeReportPopupFn()">Закрыть</button>
    </div>`;

  document.getElementById('reportPopup').classList.add('visible');
  
  if (typeof calcTimeline === 'function') {
    // Small delay to ensure canvas is in DOM with correct dimensions
    setTimeout(() => {
      const timelineRes = calcTimeline(profileA, profileB, category);
      // Fallback for old version
      const timelineData = timelineRes.data || timelineRes; 
      drawTimelineChart('timelineChart', timelineData);
      
      const reasonsDiv = document.getElementById('timelineReasons');
      if (reasonsDiv && timelineRes.reasons) {
        // Parse markdown-like bold text
        const htmlReasons = timelineRes.reasons.map(r => 
          '<div style="margin-bottom:8px;">' + r.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') + '</div>'
        ).join('');
        reasonsDiv.innerHTML = htmlReasons;
      }
    }, 50);
  }
}

function closeReportPopupFn() {
  document.getElementById('reportPopup').classList.remove('visible');
}

// Legacy compat
function renderRanking(history) {
  renderDualRanking(history);
}


// --- Timeline Chart ---
function drawTimelineChart(canvasId, timelineData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // High DPI support
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);
  
  if (!timelineData || timelineData.length === 0) return;
  
  const padL = 30, padR = 20, padT = 80, padB = 30;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  
  const minScore = Math.min(40, ...timelineData.map(d => d.score)) - 10;
  const maxScore = Math.max(100, ...timelineData.map(d => d.score));
  const scoreRange = maxScore - minScore;
  
  const currentYear = new Date().getFullYear();
  
  // Draw Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH * i) / 4;
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    
    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(maxScore - (scoreRange * i) / 4), padL - 5, y);
  }
  ctx.stroke();
  
  // Draw X axis and current year marker
  const stepX = chartW / (timelineData.length - 1);
  let currentYearX = -1;
  let transAStart = null, transAEnd = null, nameA = '';
  let transBStart = null, transBEnd = null, nameB = '';
  
  for (let i = 0; i < timelineData.length; i++) {
    const x = padL + i * stepX;
    const isCurrent = timelineData[i].year === currentYear;
    
    if (timelineData[i].transitionAStart) { transAStart = { x, score: timelineData[i].score }; nameA = timelineData[i].transitionAStart; }
    if (timelineData[i].transitionAEnd) { transAEnd = { x, score: timelineData[i].score }; nameA = timelineData[i].transitionAEnd; }
    if (timelineData[i].transitionBStart) { transBStart = { x, score: timelineData[i].score }; nameB = timelineData[i].transitionBStart; }
    if (timelineData[i].transitionBEnd) { transBEnd = { x, score: timelineData[i].score }; nameB = timelineData[i].transitionBEnd; }
    
    if (isCurrent) {
      currentYearX = x;
      // Current year line
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + chartH);
      ctx.strokeStyle = 'rgba(251,191,36,0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // X labels (every 2 years)
    if (i % 2 === 0 || isCurrent) {
      ctx.fillStyle = isCurrent ? '#fbbf24' : 'rgba(255,255,255,0.4)';
      ctx.font = isCurrent ? 'bold 10px Inter' : '10px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(timelineData[i].year, x, padT + chartH + 8);
    }
  }
  
  // Draw transition brackets after the grid
  if (transAStart !== null && transAEnd !== null) {
    const yLine = padT - 25;
    ctx.beginPath();
    ctx.moveTo(transAStart.x, yLine + 10);
    ctx.lineTo(transAStart.x, yLine);
    ctx.lineTo(transAEnd.x, yLine);
    ctx.lineTo(transAEnd.x, yLine + 10);
    ctx.strokeStyle = 'rgba(236,72,153,0.5)'; // pink
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(236,72,153,0.8)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(nameA, transAStart.x + (transAEnd.x - transAStart.x)/2, yLine - 3);
    
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${transAStart.score}%`, transAStart.x, yLine + 12);
    ctx.fillText(`${transAEnd.score}%`, transAEnd.x, yLine + 12);
  }
  
  if (transBStart !== null && transBEnd !== null) {
    const yLine = padT - 60;
    ctx.beginPath();
    ctx.moveTo(transBStart.x, yLine + 10);
    ctx.lineTo(transBStart.x, yLine);
    ctx.lineTo(transBEnd.x, yLine);
    ctx.lineTo(transBEnd.x, yLine + 10);
    ctx.strokeStyle = 'rgba(56,189,248,0.5)'; // cyan
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(56,189,248,0.8)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(nameB, transBStart.x + (transBEnd.x - transBStart.x)/2, yLine - 3);
    
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${transBStart.score}%`, transBStart.x, yLine + 12);
    ctx.fillText(`${transBEnd.score}%`, transBEnd.x, yLine + 12);
  }
  
  // Draw Line
  ctx.beginPath();
  for (let i = 0; i < timelineData.length; i++) {
    const x = padL + i * stepX;
    const y = padT + chartH - ((timelineData[i].score - minScore) / scoreRange) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else {
      // Smooth curve
      const prevX = padL + (i - 1) * stepX;
      const prevY = padT + chartH - ((timelineData[i-1].score - minScore) / scoreRange) * chartH;
      const cp1x = prevX + (x - prevX) / 2;
      ctx.bezierCurveTo(cp1x, prevY, cp1x, y, x, y);
    }
  }
  
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 3;
  
  // Shadow
  ctx.shadowColor = 'rgba(168,85,247,0.5)';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  
  // Draw Gradient Fill
  ctx.beginPath();
  const startY = padT + chartH - ((timelineData[0].score - minScore) / scoreRange) * chartH;
  ctx.moveTo(padL, padT + chartH);
  ctx.lineTo(padL, startY);
  for (let i = 1; i < timelineData.length; i++) {
    const x = padL + i * stepX;
    const y = padT + chartH - ((timelineData[i].score - minScore) / scoreRange) * chartH;
    const prevX = padL + (i - 1) * stepX;
    const prevY = padT + chartH - ((timelineData[i-1].score - minScore) / scoreRange) * chartH;
    const cp1x = prevX + (x - prevX) / 2;
    ctx.bezierCurveTo(cp1x, prevY, cp1x, y, x, y);
  }
  ctx.lineTo(padL + chartW, padT + chartH);
  ctx.closePath();
  
  const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  grad.addColorStop(0, 'rgba(168,85,247,0.3)');
  grad.addColorStop(1, 'rgba(168,85,247,0.0)');
  ctx.fillStyle = grad;
  ctx.fill();
  
  // Draw Points
  for (let i = 0; i < timelineData.length; i++) {
    const x = padL + i * stepX;
    const y = padT + chartH - ((timelineData[i].score - minScore) / scoreRange) * chartH;
    const isCurrent = timelineData[i].year === currentYear;
    
    ctx.beginPath();
    ctx.arc(x, y, isCurrent ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isCurrent ? '#fbbf24' : '#fff';
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
