// Vice Sunset Cover Studio — a GTA-style multi-panel cover art maker.
// Vanilla JS, no libraries, no network: photos are read on the user's own
// machine and every pixel of the cover is drawn on a canvas here.

const stage = document.getElementById('stage');
const stageCtx = stage.getContext('2d');
const captionInput = document.getElementById('caption');
const taglineInput = document.getElementById('tagline');
const zoomInput = document.getElementById('zoom');
const zoomOut = document.getElementById('zoom-out');
const panelName = document.getElementById('panel-name');
const statusLine = document.getElementById('status');

const SAMPLES = { pier: './samples/pier.jpg', boulevard: './samples/boulevard.jpg' };
const PANEL_LETTERS = ['A', 'B', 'C'];
const CAPTION_FONT = '"Arial Black", "Archivo Black", Impact, "Helvetica Neue", sans-serif';

// Panel rectangles and the caption band, as fractions of the cover.
// Each layout is a poster composition: photos on top, words below.
const LAYOUTS = {
  split: {
    panels: [
      { x: 0, y: 0, w: 0.58, h: 0.64 },
      { x: 0.58, y: 0, w: 0.42, h: 0.64 },
    ],
    band: { x: 0, y: 0.64, w: 1, h: 0.36 },
  },
  grid: {
    panels: [
      { x: 0, y: 0, w: 0.6, h: 0.52 },
      { x: 0.6, y: 0, w: 0.4, h: 0.52 },
      { x: 0, y: 0.52, w: 1, h: 0.16 },
    ],
    band: { x: 0, y: 0.68, w: 1, h: 0.32 },
  },
  hero: {
    panels: [{ x: 0, y: 0, w: 1, h: 0.68 }],
    band: { x: 0, y: 0.68, w: 1, h: 0.32 },
  },
};

// The three colour grades: what the light feels like at golden hour.
const GRADES = {
  sunset: {
    bandTop: '#2b0f3d', bandBottom: '#ff7a3d',
    sunCore: '#ffe9a3', sunEdge: '#ff5e3a',
    tag: '#ffd166', photoTint: ['rgba(255,122,61,0.20)', 'rgba(255,46,136,0.18)'],
    filter: 'saturate(1.15) contrast(1.06)',
  },
  neon: {
    bandTop: '#12002b', bandBottom: '#c4006b',
    sunCore: '#ffe3f6', sunEdge: '#ff2e88',
    tag: '#22d3ee', photoTint: ['rgba(255,0,128,0.22)', 'rgba(0,229,255,0.20)'],
    filter: 'saturate(1.35) contrast(1.1)',
  },
  noir: {
    bandTop: '#000000', bandBottom: '#3a3a3a',
    sunCore: '#f2f2f2', sunEdge: '#8a8a8a',
    tag: '#d8d8d8', photoTint: ['rgba(0,0,0,0.10)', 'rgba(255,255,255,0.06)'],
    filter: 'grayscale(1) contrast(1.18) brightness(0.96)',
  },
};

const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

// One slot per panel: the image, its zoom (1 = just fills the panel) and
// its pan offsets as fractions of the panel (0 = centred).
const state = {
  layout: 'split',
  grade: 'sunset',
  size: '1080x1080',
  caption: 'Sunset Heist',
  tagline: 'NEON SUNSET · EST. 2026',
  selected: 0,
  photos: [
    { img: null, zoom: 1, dx: 0, dy: 0 },
    { img: null, zoom: 1, dx: 0, dy: 0 },
    { img: null, zoom: 1, dx: 0, dy: 0 },
  ],
};

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + url));
    img.src = url;
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      loadImageFromUrl(reader.result).then(resolve, reject);
    };
    reader.onerror = () => reject(new Error('could not read file'));
    reader.readAsDataURL(file);
  });
}

function clampPan(slot, rect) {
  if (!slot.img) return;
  const scale = Math.max(rect.w / slot.img.naturalWidth, rect.h / slot.img.naturalHeight) * slot.zoom;
  const overX = Math.max(0, (slot.img.naturalWidth * scale - rect.w) / 2 / rect.w);
  const overY = Math.max(0, (slot.img.naturalHeight * scale - rect.h) / 2 / rect.h);
  slot.dx = Math.max(-overX, Math.min(overX, slot.dx));
  slot.dy = Math.max(-overY, Math.min(overY, slot.dy));
}

// Draws one photo into its panel, cover-fit, zoomed and panned.
function fitPhotoIntoPanel(ctx, slot, rect) {
  const img = slot.img;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * slot.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + slot.dx * rect.w;
  const cy = rect.y + rect.h / 2 + slot.dy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = GRADES[state.grade].filter;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
  paintColourGrade(ctx, rect);
}

// Washes the panel with the grade's sunset or neon light.
function paintColourGrade(ctx, rect) {
  const grade = GRADES[state.grade];
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  wash.addColorStop(0, grade.photoTint[0]);
  wash.addColorStop(1, grade.photoTint[1]);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  const shade = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(10,0,20,0.28)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// An empty panel says what it is waiting for.
function paintEmptyPanel(ctx, rect, letter) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#3d1a4d');
  g.addColorStop(1, '#7a2340');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  ctx.setLineDash([rect.w * 0.03, rect.w * 0.02]);
  ctx.strokeRect(rect.x + rect.w * 0.05, rect.y + rect.h * 0.08, rect.w * 0.9, rect.h * 0.84);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `900 ${Math.round(rect.h * 0.09)}px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${letter} — ADD A PHOTO`, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

// A retro striped sun: a glowing disc with the sky showing through its slats.
function drawRetroSun(ctx, cx, cy, radius, grade) {
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.7);
  glow.addColorStop(0, grade.sunEdge + '55');
  glow.addColorStop(1, grade.sunEdge + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - radius * 1.7, cy - radius * 1.7, radius * 3.4, radius * 3.4);
  const disc = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
  disc.addColorStop(0, grade.sunCore);
  disc.addColorStop(1, grade.sunEdge);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  // Slats cut across the lower half, widening toward the bottom.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grade.bandBottom;
  for (let i = 0; i < 4; i++) {
    const y = cy + radius * (0.08 + i * 0.22);
    ctx.fillRect(cx - radius, y, radius * 2, radius * (0.03 + i * 0.025));
  }
  ctx.restore();
}

// One palm tree, drawn from a leaning trunk and seven fronds that fan
// out from the crown, rise a little, then droop at their tips.
function drawPalmSilhouette(ctx, baseX, baseY, height, lean, colour) {
  const topX = baseX + lean * height;
  const topY = baseY - height;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, height * 0.05);
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + lean * height * 0.3, baseY - height * 0.6, topX, topY);
  ctx.stroke();
  // Fronds fan from straight up-left to straight up-right (canvas angles
  // -160° to -20°); each arcs up from the crown and droops at its tip.
  ctx.lineWidth = Math.max(2, height * 0.032);
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const t = i / (fronds - 1);
    const angle = -Math.PI * (0.89 - t * 0.78);
    const reach = height * (0.34 + 0.12 * Math.sin(t * Math.PI));
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const tipX = topX + dirX * reach;
    const tipY = topY + dirY * reach + reach * 0.34;
    const ctrlX = topX + dirX * reach * 0.55;
    const ctrlY = topY + dirY * reach * 0.55 - reach * 0.22;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();
  }
  // Two coconuts tucked under the crown.
  ctx.beginPath();
  ctx.arc(topX - height * 0.03, topY + height * 0.03, height * 0.028, 0, Math.PI * 2);
  ctx.arc(topX + height * 0.035, topY + height * 0.04, height * 0.025, 0, Math.PI * 2);
  ctx.fill();
}

// Shrinks the caption until it fits the band, then draws it big and bold
// with a heavy outline, tilted a touch like a poster title.
function fitCaptionText(ctx, text, maxWidth, maxSize) {
  let size = maxSize;
  ctx.font = `900 ${size}px ${CAPTION_FONT}`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size = Math.round(size * 0.92);
    ctx.font = `900 ${size}px ${CAPTION_FONT}`;
  }
  return size;
}

function paintCaptionBand(ctx, band, W) {
  const grade = GRADES[state.grade];
  const sky = ctx.createLinearGradient(band.x, band.y, band.x, band.y + band.h);
  sky.addColorStop(0, grade.bandTop);
  sky.addColorStop(0.55, grade.bandBottom);
  sky.addColorStop(1, grade.bandBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  // Sun sits right of centre; palms frame it from both edges.
  const sunR = band.h * 0.42;
  const sunX = band.x + band.w * 0.72;
  const sunY = band.y + band.h * 0.52;
  drawRetroSun(ctx, sunX, sunY, sunR, grade);
  drawPalmSilhouette(ctx, band.x + band.w * 0.055, band.y + band.h, band.h * 0.85, 0.12, '#160a1e');
  drawPalmSilhouette(ctx, band.x + band.w * 0.945, band.y + band.h, band.h * 0.7, -0.1, '#160a1e');

  // Tagline above, caption below, both centred on the left three fifths
  // so the sun keeps its own space on the right.
  const textW = band.w * 0.58;
  const textCx = band.x + band.w * 0.3;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const tagSize = Math.round(band.h * 0.085);
  ctx.font = `700 ${tagSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(tagSize * 0.28)}px`; } catch { /* older canvas */ }
  ctx.fillStyle = grade.tag;
  ctx.fillText(state.tagline.toUpperCase(), textCx, band.y + band.h * 0.24);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }

  const caption = (state.caption || 'UNTITLED').toUpperCase();
  const size = fitCaptionText(ctx, caption, textW, Math.round(band.h * 0.34));
  ctx.save();
  ctx.translate(textCx, band.y + band.h * 0.72);
  ctx.rotate(-0.022);
  ctx.font = `900 ${size}px ${CAPTION_FONT}`;
  try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas */ }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12061a';
  ctx.lineWidth = Math.max(4, size * 0.16);
  ctx.strokeText(caption, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(caption, 0, 0);
  ctx.restore();
}

// The whole cover, at any pixel size: white poster gutters, photo panels,
// then the caption band with its sun and palms.
function drawCover(ctx, W, H) {
  const layout = LAYOUTS[state.layout];
  const gutter = Math.max(4, Math.round(W * 0.008));
  ctx.fillStyle = '#fdf8f2';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < layout.panels.length; i++) {
    const f = layout.panels[i];
    const rect = {
      x: f.x * W + (f.x === 0 ? gutter : gutter / 2),
      y: f.y * H + (f.y === 0 ? gutter : gutter / 2),
      w: f.w * W - gutter,
      h: f.h * H - gutter,
    };
    const slot = state.photos[i];
    clampPan(slot, rect);
    if (slot.img) fitPhotoIntoPanel(ctx, slot, rect);
    else paintEmptyPanel(ctx, rect, PANEL_LETTERS[i]);
  }
  const b = layout.band;
  paintCaptionBand(ctx, {
    x: gutter,
    y: b.y * H + gutter / 2,
    w: W - gutter * 2,
    h: b.h * H - gutter,
  }, W);
  ctx.strokeStyle = '#12061a';
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.strokeRect(gutter / 2, gutter / 2, W - gutter, H - gutter);
}

// --- Preview ---------------------------------------------------------------

function renderPreview() {
  const [w, h] = EXPORT_SIZES[state.size];
  const scale = 900 / w;
  stage.width = Math.round(w * scale);
  stage.height = Math.round(h * scale);
  drawCover(stageCtx, stage.width, stage.height);
  panelName.textContent = PANEL_LETTERS[state.selected];
  zoomInput.value = String(Math.round(state.photos[state.selected].zoom * 100));
  zoomOut.textContent = `${Math.round(state.photos[state.selected].zoom * 100)}%`;
}

function setStatus(text) {
  statusLine.textContent = text;
}

// --- Photo loading ---------------------------------------------------------

async function setPhoto(slotIndex, file) {
  try {
    const img = await loadImageFromFile(file);
    state.photos[slotIndex] = { img, zoom: 1, dx: 0, dy: 0 };
    state.selected = slotIndex;
    renderPreview();
    setStatus(`Photo ${PANEL_LETTERS[slotIndex]} loaded — drag it inside its panel to position it.`);
  } catch {
    setStatus('That file could not be read as an image.');
  }
}

async function loadSampleInto(slotIndex, name) {
  try {
    const img = await loadImageFromUrl(SAMPLES[name]);
    state.photos[slotIndex] = { img, zoom: 1, dx: 0, dy: 0 };
  } catch {
    setStatus(`Sample photo “${name}” could not be loaded.`);
  }
}

document.getElementById('file-a').addEventListener('change', (e) => {
  if (e.target.files[0]) setPhoto(0, e.target.files[0]);
});
document.getElementById('file-b').addEventListener('change', (e) => {
  if (e.target.files[0]) setPhoto(1, e.target.files[0]);
});
document.getElementById('file-c').addEventListener('change', (e) => {
  if (e.target.files[0]) setPhoto(2, e.target.files[0]);
});

document.getElementById('fill-all').addEventListener('click', () => {
  const first = state.photos[0];
  if (!first.img) { setStatus('Load photo A first, then fill the other panels with it.'); return; }
  for (let i = 1; i < 3; i++) state.photos[i] = { img: first.img, zoom: 1, dx: 0, dy: 0 };
  renderPreview();
  setStatus('All panels now use photo A — each panel can still be zoomed and moved on its own.');
});

document.getElementById('use-sample').addEventListener('click', async () => {
  await loadSampleInto(0, 'boulevard');
  state.selected = 0;
  renderPreview();
  setStatus('Sample photo loaded into panel A. Load your own photos to replace it.');
});

// --- Panel selection, pan and zoom -----------------------------------------

function panelAtPoint(px, py) {
  const layout = LAYOUTS[state.layout];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const f = layout.panels[i];
    const rect = { x: f.x * stage.width, y: f.y * stage.height, w: f.w * stage.width, h: f.h * stage.height };
    if (px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h) return i;
  }
  return -1;
}

let dragging = null;

stage.addEventListener('pointerdown', (e) => {
  const box = stage.getBoundingClientRect();
  const px = (e.clientX - box.left) * (stage.width / box.width);
  const py = (e.clientY - box.top) * (stage.height / box.height);
  const hit = panelAtPoint(px, py);
  if (hit === -1) return;
  state.selected = hit;
  renderPreview();
  dragging = { slot: hit, lastX: px, lastY: py };
  stage.setPointerCapture(e.pointerId);
});

stage.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const box = stage.getBoundingClientRect();
  const px = (e.clientX - box.left) * (stage.width / box.width);
  const py = (e.clientY - box.top) * (stage.height / box.height);
  const layout = LAYOUTS[state.layout];
  const f = layout.panels[dragging.slot];
  const slot = state.photos[dragging.slot];
  slot.dx += (px - dragging.lastX) / (f.w * stage.width);
  slot.dy += (py - dragging.lastY) / (f.h * stage.height);
  dragging.lastX = px;
  dragging.lastY = py;
  renderPreview();
});

stage.addEventListener('pointerup', () => { dragging = null; });
stage.addEventListener('pointercancel', () => { dragging = null; });

zoomInput.addEventListener('input', () => {
  const slot = state.photos[state.selected];
  slot.zoom = Number(zoomInput.value) / 100;
  zoomOut.textContent = `${zoomInput.value}%`;
  renderPreview();
});

document.getElementById('reset-panel').addEventListener('click', () => {
  state.photos[state.selected] = { img: state.photos[state.selected].img, zoom: 1, dx: 0, dy: 0 };
  renderPreview();
  setStatus(`Panel ${PANEL_LETTERS[state.selected]} reset to fill its frame.`);
});

document.getElementById('reset-all').addEventListener('click', () => {
  for (const slot of state.photos) { slot.zoom = 1; slot.dx = 0; slot.dy = 0; }
  renderPreview();
  setStatus('All panels reset.');
});

// --- Layout, grade, words, size --------------------------------------------

function wireChoiceGroup(id, key) {
  document.getElementById(id).addEventListener('click', (e) => {
    const button = e.target.closest('button[data-' + key + ']');
    if (!button) return;
    for (const b of document.querySelectorAll(`#${id} button`)) b.classList.toggle('on', b === button);
    state[key] = button.dataset[key];
    renderPreview();
  });
}
wireChoiceGroup('layouts', 'layout');
wireChoiceGroup('grades', 'grade');
wireChoiceGroup('sizes', 'size');

captionInput.addEventListener('input', () => { state.caption = captionInput.value; renderPreview(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; renderPreview(); });

// --- Export -----------------------------------------------------------------

function exportCoverPng() {
  const [w, h] = EXPORT_SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — the browser could not make the PNG.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved cover-${state.size}.png (${w} × ${h}).`);
  }, 'image/png');
}

document.getElementById('export').addEventListener('click', exportCoverPng);

// --- Screenshot scenes ------------------------------------------------------
// ?shot=cover draws one exported cover full-window; ?shot=editor opens the
// editor with a sample photo already loaded. Both read their scene from the
// query string so the screenshots are reproducible.

async function runShotScene() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  if (params.get('layout') && LAYOUTS[params.get('layout')]) state.layout = params.get('layout');
  if (params.get('grade') && GRADES[params.get('grade')]) state.grade = params.get('grade');
  if (params.get('size') && EXPORT_SIZES[params.get('size')]) state.size = params.get('size');
  if (params.get('caption') !== null) { state.caption = params.get('caption'); captionInput.value = state.caption; }
  if (params.get('tagline') !== null) { state.tagline = params.get('tagline'); taglineInput.value = state.tagline; }
  const photoA = params.get('photo') || 'boulevard';
  const photoB = params.get('photo2') || photoA;
  const photoC = params.get('photo3') || photoA;
  await loadSampleInto(0, photoA);
  await loadSampleInto(1, photoB);
  await loadSampleInto(2, photoC);
  if (params.get('zoom')) state.photos[0].zoom = Number(params.get('zoom'));
  for (let i = 0; i < 3; i++) {
    const pan = params.get('dy' + i) ?? (i === 0 ? params.get('dy') : null);
    if (pan !== null) state.photos[i].dy = Number(pan);
  }
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const [w, h] = EXPORT_SIZES[state.size];
    stage.width = w;
    stage.height = h;
    drawCover(stageCtx, w, h);
  } else {
    renderPreview();
  }
  window.__shotReady = true;
  return true;
}

const shotDone = await runShotScene();
if (!shotDone) renderPreview();
