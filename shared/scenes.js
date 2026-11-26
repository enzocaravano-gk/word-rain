// =====================================================================
//  AMBIENTAZIONI — un posto diverso per ogni livello (condiviso dai tre giochi a caduta)
//  1 Mare · 2 Città · 3 Montagna · 4 Spazio · 5 Giappone · 6 New York · 7 Parigi · 8 Salerno
//  I 4 sottolivelli restano giorno / tramonto / sera / notte: cielo, sole, luna e stelle arrivano
//  dal tema del gioco (bg); qui si disegna il paesaggio, che si scurisce e accende le luci di notte.
//  Tutto è disegnato con il codice: nessuna immagine o risorsa esterna.
// =====================================================================

const SCENES = [
  { name: 'MARE',     ground: ['#e8c98a', '#2a2a3a'], draw: scSea },
  { name: 'CITTÀ',    ground: ['#4a4f5a', '#121218'], draw: scCity },
  { name: 'MONTAGNA', ground: ['#5b8f3a', '#14231a'], draw: scMountain },
  { name: 'SPAZIO',   ground: ['#8a8a92', '#2c2c34'], draw: scSpace, space: true },
  { name: 'GIAPPONE', ground: ['#6f9e4f', '#17251a'], draw: scJapan },
  { name: 'NEW YORK', ground: ['#55585f', '#141418'], draw: scNewYork },
  { name: 'PARIGI',   ground: ['#8b8579', '#1e1d22'], draw: scParis },
  { name: 'SALERNO',  ground: ['#d9c7a3', '#2b2830'], draw: scSalerno },
];
// quale ambientazione: nel gioco dipende dal livello, nel menu scorrono tutte
function sceneIdx() {
  if (state === 'title' || state === 'board') return Math.floor(performance.now() / 8000) % SCENES.length;
  return (level - 1) % SCENES.length;
}
const sceneName = () => SCENES[sceneIdx()].name;
const sceneNameFor = lv => SCENES[(lv - 1) % SCENES.length].name;

// ---------- colori: giorno → notte, con un velo caldo al tramonto ----------
const scHx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const scNight = () => Math.min(1, bg.stars * 1.1);
const scWarm = () => Math.max(0, 1 - Math.abs(bg.sunY - 0.55) / 0.25) * (1 - scNight());
function scTint(dayHex, nightHex, a = 1) {
  const n = scNight(), w = scWarm(), d = scHx(dayHex), k = scHx(nightHex);
  let c = d.map((v, i) => v + (k[i] - v) * n);
  c = [c[0] + (255 - c[0]) * 0.12 * w, c[1] * (1 - 0.04 * w), c[2] * (1 - 0.18 * w)];
  return `rgba(${c.map(v => v | 0).join(',')},${a})`;
}
function scRand(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// palazzi generati una volta (coordinate relative): w, h in frazioni di larghezza/altezza schermo
function scGenBuildings(seed, wmin, wmax, hmin, hmax, gap = 0.006) {
  const r = scRand(seed), list = [];
  let x = -0.02;
  while (x < 1.02) {
    const w = wmin + r() * (wmax - wmin), h = hmin + r() * (hmax - hmin);
    const cols = Math.max(2, Math.round(w * 45)), rows = Math.max(2, Math.round(h * 28));
    list.push({ x, w, h, cols, rows, wins: Array.from({ length: cols * rows }, () => r() < 0.55), top: r() });
    x += w + gap;
  }
  return list;
}
const SC_CITY_FAR = scGenBuildings(11, 0.05, 0.1, 0.16, 0.34), SC_CITY_NEAR = scGenBuildings(12, 0.07, 0.13, 0.07, 0.2);
const SC_NY_FAR = scGenBuildings(21, 0.03, 0.07, 0.18, 0.42, 0.004), SC_NY_NEAR = scGenBuildings(22, 0.05, 0.1, 0.08, 0.22);
const SC_PARIS = scGenBuildings(31, 0.08, 0.14, 0.09, 0.14, 0.002);
const SC_STARS2 = Array.from({ length: 220 }, (_, i) => { const r = scRand(500 + i); return { x: r(), y: r() * 0.85, s: r() * 1.8 + 0.4, p: r() * 6.28 }; });
const SC_PETALS = Array.from({ length: 26 }, (_, i) => { const r = scRand(900 + i); return { x: r(), y: r(), s: 0.5 + r(), p: r() * 6.28 }; });

function scBuildings(list, base, body, opts = {}) {
  const n = scNight();
  ctx.fillStyle = body;
  for (const b of list) {
    const bx = b.x * W, bw = b.w * W, bh = b.h * H, by = base - bh;
    ctx.fillRect(bx, by, bw, bh + 2);
    if (opts.mansard) { ctx.fillStyle = opts.mansard; ctx.beginPath(); ctx.moveTo(bx - 2, by); ctx.lineTo(bx + bw * 0.12, by - bh * 0.22); ctx.lineTo(bx + bw * 0.88, by - bh * 0.22); ctx.lineTo(bx + bw + 2, by); ctx.fill(); ctx.fillStyle = body; }
    else if (b.top > 0.7) ctx.fillRect(bx + bw * 0.45, by - bh * 0.15, 2, bh * 0.15);           // antenna
  }
  // finestre: di giorno vetri chiari, di notte molte si accendono
  for (const b of list) {
    const bx = b.x * W, bw = b.w * W, bh = b.h * H, by = base - bh;
    const cw = bw / (b.cols * 2 + 1), ch = bh / (b.rows * 2 + 1);
    if (cw < 2 || ch < 2) continue;
    for (let rr = 0; rr < b.rows; rr++) for (let c = 0; c < b.cols; c++) {
      const x = bx + cw * (c * 2 + 1), y = by + ch * (rr * 2 + 1);
      if (n > 0.25 && b.wins[rr * b.cols + c]) { ctx.fillStyle = `rgba(255,214,107,${(n * (opts.dim || 1)).toFixed(2)})`; ctx.fillRect(x, y, cw, ch); }
      else if (n < 0.8) { ctx.fillStyle = `rgba(255,255,255,${(0.16 * (1 - n)).toFixed(2)})`; ctx.fillRect(x, y, cw, ch); }
    }
  }
}
function scWaveBand(base, amp, freq, phase, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, base - Math.sin(x * freq + phase) * amp - Math.sin(x * freq * 2.7 - phase * 1.3) * amp * 0.5);
  ctx.lineTo(W, H); ctx.fill();
}
function scRidge(seed, base, hMin, hMax, step, color) {
  const r = scRand(seed);
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, base - hMin * H);
  for (let x = 0; x <= W + step; x += step) ctx.lineTo(x, base - (hMin + r() * (hMax - hMin)) * H);
  ctx.lineTo(W, H); ctx.fill();
}
function scSunMoonReflection(horizon, gy, t) {
  const refl = (x, a, c) => {
    if (a < 0.02) return;
    for (let i = 0; i < 9; i++) {
      const yy = horizon + 6 + i * (gy - horizon) / 10, ww = (16 + i * 10) * (0.7 + 0.3 * Math.sin(t * 3 + i));
      ctx.fillStyle = `rgba(${c},${(a * (0.5 - i * 0.04)).toFixed(2)})`; ctx.fillRect(x - ww / 2, yy, ww, 3);
    }
  };
  if (bg.sunY < 0.95) refl(W * 0.78, bg.sunA, bg.sunC.map(v => v | 0).join(','));
  refl(W * 0.18, bg.moon, '235,240,255');
}

// ---------- 1 · MARE ----------
function scSea(gy, t) {
  const horizon = gy - H * 0.22;
  ctx.fillStyle = scTint('#1e90c8', '#0d2247'); ctx.fillRect(0, horizon, W, gy - horizon);
  scSunMoonReflection(horizon, gy, t);
  const bx = ((t * 18) % (W + 120)) - 60, by = horizon + 4;                     // barchetta a vela
  ctx.fillStyle = scTint('#1572a8', '#081530');
  ctx.beginPath(); ctx.moveTo(bx - 18, by); ctx.lineTo(bx + 18, by); ctx.lineTo(bx + 12, by + 6); ctx.lineTo(bx - 12, by + 6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(bx, by - 2); ctx.lineTo(bx, by - 30); ctx.lineTo(bx + 16, by - 4); ctx.fill();
  scWaveBand(horizon + (gy - horizon) * 0.45, 5, 0.012, t * 0.8, scTint('#2aa4dc', '#10285a'));
  scWaveBand(horizon + (gy - horizon) * 0.72, 7, 0.009, -t * 1.1, scTint('#1572a8', '#081530'));
}

// ---------- 2 · CITTÀ ----------
function scCity(gy) {
  scBuildings(SC_CITY_FAR, gy, scTint('#9fb7d0', '#141a33'), { dim: 0.6 });
  scBuildings(SC_CITY_NEAR, gy, scTint('#5f7690', '#0b0f22'));
}

// ---------- 3 · MONTAGNA ----------
function scMountain(gy) {
  // catena lontana con le cime innevate
  const r = scRand(77), peaks = [];
  for (let x = -0.1; x < 1.1; x += 0.16 + r() * 0.08) peaks.push([x, 0.22 + r() * 0.2]);
  ctx.fillStyle = scTint('#8fa9c9', '#1b2340'); ctx.beginPath(); ctx.moveTo(-10, gy);
  peaks.forEach(([x, h], i) => { const next = peaks[i + 1]; ctx.lineTo(x * W, gy - h * H); if (next) ctx.lineTo((x + next[0]) / 2 * W, gy - Math.min(h, next[1]) * 0.55 * H); });
  ctx.lineTo(W + 10, gy); ctx.fill();
  ctx.fillStyle = scTint('#ffffff', '#9aa6c8');
  for (const [x, h] of peaks) {
    const px = x * W, py = gy - h * H, d = h * H * 0.28;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + d * 0.75, py + d); ctx.lineTo(px + d * 0.3, py + d * 0.8); ctx.lineTo(px, py + d * 1.05);
    ctx.lineTo(px - d * 0.35, py + d * 0.8); ctx.lineTo(px - d * 0.75, py + d); ctx.fill();
  }
  scRidge(78, gy, 0.06, 0.12, 40, scTint('#5f8a6a', '#122019'));
  // abeti
  const rt = scRand(79);
  ctx.fillStyle = scTint('#2f6b3a', '#0a1a10');
  for (let x = 0; x < W; x += 16 + rt() * 22) {
    const h = (0.05 + rt() * 0.05) * H, y = gy - rt() * 6;
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + h * 0.32, y); ctx.lineTo(x - h * 0.32, y); ctx.fill();
  }
}

// ---------- 4 · SPAZIO ----------
function scSpaceSky(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#04030f'); g.addColorStop(1, '#1a0f3d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // nebulose
  [[0.25, 0.3, '120,60,200'], [0.7, 0.18, '40,160,200'], [0.5, 0.55, '200,60,140']].forEach(([x, y, c], i) => {
    const rr = Math.min(W, H) * (0.35 + 0.05 * Math.sin(t * 0.2 + i));
    const ng = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, rr);
    ng.addColorStop(0, `rgba(${c},0.28)`); ng.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
  });
  for (const s of SC_STARS2) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + s.p); ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H, s.s, s.s); }
  ctx.globalAlpha = 1;
}
function scSpace(gy, t) {
  // pianeta con anelli
  const px = W * 0.76, py = H * 0.24, pr = Math.min(W, H) * 0.1;
  const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
  pg.addColorStop(0, '#ffd9a0'); pg.addColorStop(1, '#c0642c');
  ctx.strokeStyle = 'rgba(255,220,170,0.7)'; ctx.lineWidth = pr * 0.12;
  ctx.beginPath(); ctx.ellipse(px, py, pr * 1.9, pr * 0.45, -0.35, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.28); ctx.fill();
  ctx.beginPath(); ctx.ellipse(px, py, pr * 1.9, pr * 0.45, -0.35, 0, Math.PI); ctx.stroke();
  // la Terra, piccola e lontana
  const ex = W * 0.2, ey = H * 0.16, er = Math.min(W, H) * 0.035;
  ctx.fillStyle = '#2f7fe0'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#3fbf6a'; ctx.beginPath(); ctx.arc(ex - er * 0.3, ey - er * 0.1, er * 0.45, 0, 6.28); ctx.fill();
  // suolo lunare con crateri
  scRidge(41, gy, 0.02, 0.06, 60, '#6c6c78');
  const r = scRand(42);
  ctx.fillStyle = 'rgba(40,40,50,0.45)';
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(r() * W, gy - r() * H * 0.03, 10 + r() * 26, 3 + r() * 5, 0, 0, 6.28); ctx.fill(); }
}

// ---------- 5 · GIAPPONE ----------
function scJapan(gy, t) {
  // monte Fuji
  const fx = W * 0.68, top = gy - Math.min(H * 0.42, W * 0.5), half = Math.min(W * 0.42, H * 0.6);
  ctx.fillStyle = scTint('#7d8fb3', '#1a2140');
  ctx.beginPath(); ctx.moveTo(fx - half, gy); ctx.lineTo(fx - half * 0.12, top); ctx.lineTo(fx + half * 0.12, top); ctx.lineTo(fx + half, gy); ctx.fill();
  ctx.fillStyle = scTint('#ffffff', '#a8b0d0');
  const sn = (gy - top) * 0.3, wAt = y => half * 0.12 + (y - top) * (half * 0.88) / (gy - top), ws = wAt(top + sn);
  ctx.beginPath(); ctx.moveTo(fx - half * 0.12, top); ctx.lineTo(fx + half * 0.12, top); ctx.lineTo(fx + ws, top + sn);
  for (let i = 1; i < 6; i++) ctx.lineTo(fx + ws - (i / 6) * 2 * ws, top + sn * (i % 2 ? 0.7 : 1));   // bordo frastagliato della neve
  ctx.lineTo(fx - ws, top + sn); ctx.fill();
  scWaveBand(gy - H * 0.04, 6, 0.008, 1, scTint('#6f9e4f', '#15241a'));
  // pagoda
  const pgx = W * 0.17, base = gy - 4, tier = Math.min(H * 0.06, 34), pw = tier * 2.2;
  for (let i = 0; i < 4; i++) {
    const w = pw * (1 - i * 0.16), y = base - tier * (i + 1);
    ctx.fillStyle = scTint('#7a2e2a', '#2a1010'); ctx.fillRect(pgx - w * 0.35, y, w * 0.7, tier);
    ctx.fillStyle = scTint('#3b3b46', '#101018');
    ctx.beginPath(); ctx.moveTo(pgx - w * 0.62, y + tier * 0.15); ctx.lineTo(pgx - w * 0.4, y - tier * 0.12); ctx.lineTo(pgx + w * 0.4, y - tier * 0.12); ctx.lineTo(pgx + w * 0.62, y + tier * 0.15); ctx.fill();
  }
  ctx.fillRect(pgx - 1.5, base - tier * 4.9, 3, tier * 0.9);
  // torii rosso
  const tx = W * 0.42, th = Math.min(H * 0.1, 60), tw = th * 1.2;
  ctx.fillStyle = scTint('#d0342c', '#4a1010');
  ctx.fillRect(tx - tw * 0.38, gy - th, th * 0.1, th); ctx.fillRect(tx + tw * 0.28, gy - th, th * 0.1, th);
  ctx.fillRect(tx - tw * 0.55, gy - th * 1.02, tw * 1.1, th * 0.1); ctx.fillRect(tx - tw * 0.45, gy - th * 0.8, tw * 0.9, th * 0.07);
  // ciliegi in fiore
  const r = scRand(55);
  for (let i = 0; i < 4; i++) {
    const cx = (0.05 + i * 0.27 + r() * 0.05) * W, ch = (0.05 + r() * 0.03) * H;
    ctx.fillStyle = scTint('#5a3a2a', '#1a1010'); ctx.fillRect(cx - 2, gy - ch, 4, ch);
    ctx.fillStyle = scTint('#f7b6d2', '#5a3a55');
    for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.arc(cx + (r() - 0.5) * ch * 0.9, gy - ch - r() * ch * 0.4, ch * (0.22 + r() * 0.15), 0, 6.28); ctx.fill(); }
  }
  // petali che volano
  ctx.fillStyle = scTint('#ffc7de', '#8a5a7a', 0.85);
  for (const p of SC_PETALS) {
    const x = ((p.x * W + t * 25 * p.s) % (W + 20)) - 10, y = ((p.y * gy + t * 30 * p.s) % gy);
    ctx.beginPath(); ctx.ellipse(x, y, 3, 1.6, t * p.s + p.p, 0, 6.28); ctx.fill();
  }
}

// ---------- 6 · NEW YORK ----------
function scNewYork(gy) {
  scBuildings(SC_NY_FAR, gy, scTint('#8ea3bd', '#121933'), { dim: 0.6 });
  const body = scTint('#6a7f99', '#0c1124'), n = scNight();
  // grattacielo a gradoni con la guglia
  const ex = W * 0.56, ew = Math.max(30, W * 0.07), eh = Math.min(H * 0.5, gy * 0.7);
  ctx.fillStyle = body;
  ctx.fillRect(ex - ew / 2, gy - eh * 0.62, ew, eh * 0.62);
  ctx.fillRect(ex - ew * 0.36, gy - eh * 0.78, ew * 0.72, eh * 0.18);
  ctx.fillRect(ex - ew * 0.22, gy - eh * 0.9, ew * 0.44, eh * 0.14);
  ctx.fillRect(ex - ew * 0.08, gy - eh * 0.98, ew * 0.16, eh * 0.1);
  ctx.fillRect(ex - 1.5, gy - eh * 1.12, 3, eh * 0.16);
  // torre affusolata
  const tx = W * 0.82, tw = Math.max(26, W * 0.06), th = Math.min(H * 0.58, gy * 0.8);
  ctx.beginPath(); ctx.moveTo(tx - tw / 2, gy); ctx.lineTo(tx - tw * 0.18, gy - th); ctx.lineTo(tx + tw * 0.18, gy - th); ctx.lineTo(tx + tw / 2, gy); ctx.fill();
  ctx.fillRect(tx - 1, gy - th * 1.12, 2, th * 0.12);
  if (n > 0.3) { ctx.fillStyle = `rgba(255,80,80,${n.toFixed(2)})`; ctx.fillRect(tx - 2, gy - th * 1.13, 4, 4); ctx.fillRect(ex - 2, gy - eh * 1.13, 4, 4); }
  // ponte sospeso sul fiume
  const deck = gy - H * 0.05, b1 = W * 0.06, b2 = W * 0.3, ph = H * 0.16;
  ctx.fillStyle = scTint('#6a6f80', '#151826'); ctx.fillRect(0, deck, W * 0.38, 4);
  [b1, b2].forEach(x => { ctx.fillRect(x - 6, deck - ph, 12, ph + 4); });
  ctx.strokeStyle = scTint('#6a6f80', '#151826'); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-W * 0.1, deck - ph * 0.3); ctx.quadraticCurveTo((-W * 0.1 + b1) / 2, deck - ph * 0.1, b1, deck - ph);
  ctx.quadraticCurveTo((b1 + b2) / 2, deck + ph * 0.1, b2, deck - ph); ctx.quadraticCurveTo(b2 + W * 0.06, deck - ph * 0.2, W * 0.38, deck); ctx.stroke();
  for (let x = b1 + 8; x < b2; x += 10) { const tt = (x - b1) / (b2 - b1); ctx.beginPath(); ctx.moveTo(x, deck); ctx.lineTo(x, deck - ph + ph * 1.1 * 4 * tt * (1 - tt)); ctx.stroke(); }
  scBuildings(SC_NY_NEAR.filter(b => b.x > 0.38), gy, scTint('#56687f', '#0a0e1c'));
}

// ---------- 7 · PARIGI ----------
function scParis(gy, t) {
  const n = scNight();
  scBuildings(SC_PARIS, gy, scTint('#e6d8bd', '#2a2736'), { mansard: scTint('#7d8aa0', '#1a1d2a'), dim: 0.8 });
  // la torre di ferro
  const cx = W * 0.6, h = Math.min(H * 0.62, gy * 0.85), bw = h * 0.42, top = gy - h;
  const col = scTint('#6b4f3a', '#1a1418');
  ctx.fillStyle = col;
  const leg = side => {
    ctx.beginPath();
    ctx.moveTo(cx + side * bw / 2, gy); ctx.quadraticCurveTo(cx + side * bw * 0.22, gy - h * 0.25, cx + side * bw * 0.12, gy - h * 0.42);
    ctx.lineTo(cx + side * bw * 0.04, gy - h * 0.42); ctx.quadraticCurveTo(cx + side * bw * 0.12, gy - h * 0.2, cx + side * bw * 0.3, gy); ctx.fill();
  };
  leg(-1); leg(1);
  ctx.beginPath(); ctx.moveTo(cx - bw * 0.3, gy - h * 0.16); ctx.quadraticCurveTo(cx, gy - h * 0.3, cx + bw * 0.3, gy - h * 0.16);
  ctx.lineTo(cx + bw * 0.27, gy - h * 0.2); ctx.quadraticCurveTo(cx, gy - h * 0.34, cx - bw * 0.27, gy - h * 0.2); ctx.fill();   // arco
  ctx.fillRect(cx - bw * 0.3, gy - h * 0.25, bw * 0.6, h * 0.03);                                                                       // 1° piano
  ctx.beginPath(); ctx.moveTo(cx - bw * 0.14, gy - h * 0.42); ctx.lineTo(cx - bw * 0.04, top + h * 0.08); ctx.lineTo(cx + bw * 0.04, top + h * 0.08); ctx.lineTo(cx + bw * 0.14, gy - h * 0.42); ctx.fill();
  ctx.fillRect(cx - bw * 0.17, gy - h * 0.44, bw * 0.34, h * 0.025);                                                                    // 2° piano
  ctx.fillRect(cx - bw * 0.06, top + h * 0.06, bw * 0.12, h * 0.025);
  ctx.fillRect(cx - 1.5, top, 3, h * 0.08);
  // traliccio
  ctx.strokeStyle = scTint('#8a6a50', '#2a2026', 0.6); ctx.lineWidth = 1;
  for (let y = gy - h * 0.42; y > top + h * 0.1; y -= 8) { const k = (gy - h * 0.42 - y) / (h * 0.32); const w = bw * (0.14 - 0.1 * Math.min(1, k)); ctx.beginPath(); ctx.moveTo(cx - w, y); ctx.lineTo(cx + w, y - 8); ctx.moveTo(cx + w, y); ctx.lineTo(cx - w, y - 8); ctx.stroke(); }
  // di notte la torre brilla
  if (n > 0.3) {
    for (let i = 0; i < 40; i++) {
      const tt = i / 40, side = i % 2 ? 1 : -1, y = gy - tt * h * 0.95, w = bw * (0.5 - 0.46 * Math.sqrt(tt));
      if (Math.sin(t * 8 + i * 1.7) > 0.3) { ctx.fillStyle = `rgba(255,236,150,${n.toFixed(2)})`; ctx.fillRect(cx + side * w * 0.5 - 1, y, 2.5, 2.5); }
    }
  }
  // lampioni
  for (let x = W * 0.08; x < W; x += W * 0.22) {
    ctx.fillStyle = scTint('#2a2a30', '#0a0a10'); ctx.fillRect(x - 1, gy - 34, 2, 34);
    ctx.fillStyle = n > 0.25 ? `rgba(255,220,130,${(0.5 + n * 0.5).toFixed(2)})` : scTint('#2a2a30', '#0a0a10');
    ctx.beginPath(); ctx.arc(x, gy - 36, 4, 0, 6.28); ctx.fill();
  }
}

// ---------- 8 · SALERNO ----------
function scSalerno(gy, t) {
  const n = scNight(), horizon = gy - H * 0.16;
  ctx.fillStyle = scTint('#1e90c8', '#0d2247'); ctx.fillRect(0, horizon, W, gy - horizon);
  scSunMoonReflection(horizon, gy, t);
  // la collina con il castello
  const hx0 = W * 0.38, peakX = W * 0.86, peakY = gy - Math.min(H * 0.4, gy * 0.55);
  ctx.fillStyle = scTint('#6a8f4a', '#15211a');
  ctx.beginPath(); ctx.moveTo(hx0, gy); ctx.quadraticCurveTo(W * 0.6, gy - H * 0.06, W * 0.72, peakY + H * 0.08);
  ctx.quadraticCurveTo(peakX, peakY - H * 0.02, W + 10, peakY + H * 0.04); ctx.lineTo(W + 10, gy); ctx.fill();
  const cw = Math.min(W * 0.16, 110), ch = cw * 0.4, cxx = peakX - cw / 2, cyy = peakY - ch * 0.6;
  ctx.fillStyle = scTint('#c9b38f', '#3a3340');
  ctx.fillRect(cxx, cyy, cw, ch); ctx.fillRect(cxx + cw * 0.62, cyy - ch * 0.6, cw * 0.24, ch * 0.6);
  for (let x = cxx; x < cxx + cw; x += 8) ctx.fillRect(x, cyy - 5, 5, 5);
  for (let x = cxx + cw * 0.62; x < cxx + cw * 0.86; x += 7) ctx.fillRect(x, cyy - ch * 0.6 - 5, 4, 5);
  // case colorate sul pendio
  const r = scRand(88), colors = ['#f4a6a0', '#f7d77a', '#f2b36b', '#f5f0e6', '#e8c3a0', '#c9e0f0'];
  for (let row = 0; row < 5; row++) for (let i = 0; i < 6; i++) {
    const tt = (i + r() * 0.5) / 6, x = hx0 + (W * 0.78 - hx0) * tt, slope = gy - (gy - (peakY + H * 0.1)) * tt * 0.9;
    const y = slope + row * Math.min(14, H * 0.02) + 6, w = 14 + r() * 12, h = 10 + r() * 8;
    if (y + h > gy - 2) continue;
    ctx.fillStyle = scTint(colors[Math.floor(r() * colors.length)], '#2a2633'); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = n > 0.3 && r() < 0.6 ? `rgba(255,214,107,${n.toFixed(2)})` : 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + w * 0.3, y + h * 0.35, 3, 3);
  }
  // lungomare con le palme
  ctx.fillStyle = scTint('#b8a88a', '#2a2630'); ctx.fillRect(0, gy - 4, W, 4);
  for (let x = W * 0.06; x < W * 0.45; x += W * 0.11) {
    const ph = Math.min(H * 0.1, 64), sway = Math.sin(t * 1.2 + x) * 3;
    ctx.strokeStyle = scTint('#7a5a3a', '#1a1410'); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, gy - 4); ctx.quadraticCurveTo(x + 6, gy - ph * 0.5, x + 4 + sway, gy - ph); ctx.stroke();
    ctx.strokeStyle = scTint('#2f7a3a', '#0d1a10'); ctx.lineWidth = 2.5;
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.55, L = ph * 0.38;
      ctx.beginPath(); ctx.moveTo(x + 4 + sway, gy - ph);
      ctx.quadraticCurveTo(x + 4 + sway + Math.cos(a) * L * 0.7, gy - ph + Math.sin(a) * L * 0.7 - 6, x + 4 + sway + Math.cos(a) * L, gy - ph + Math.sin(a) * L + 8);
      ctx.stroke();
    }
  }
}

// ---------- disegno completo dello sfondo ----------
function drawBackground(time) {
  const sc = SCENES[sceneIdx()];
  if (sc.space) scSpaceSky(time);
  else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(bg.top)); g.addColorStop(1, rgb(bg.bot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (bg.stars > 0.01) {
      for (const s of STARS) { ctx.globalAlpha = bg.stars * (0.5 + 0.5 * Math.sin(time * 2 + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H, s.r, s.r); }
      ctx.globalAlpha = 1;
    }
    if (bg.sunA > 0.01) {
      const sx = W * 0.78, sy = H * bg.sunY, rr = Math.min(W, H) * 0.07, c = bg.sunC.map(v => v | 0).join(',');
      ctx.globalAlpha = bg.sunA;
      const sg = ctx.createRadialGradient(sx, sy, rr * 0.3, sx, sy, rr * 3);
      sg.addColorStop(0, `rgba(${c},0.55)`); sg.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, rr * 3, 0, 6.28); ctx.fill();
      ctx.fillStyle = rgb(bg.sunC); ctx.beginPath(); ctx.arc(sx, sy, rr, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (bg.moon > 0.01) {
      const mx = W * 0.18, my = H * 0.22, rr = Math.min(W, H) * 0.05;
      ctx.globalAlpha = bg.moon;
      ctx.fillStyle = 'rgba(230,235,255,0.15)'; ctx.beginPath(); ctx.arc(mx, my, rr * 2, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#eef0ff'; ctx.beginPath(); ctx.arc(mx, my, rr, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(160,165,200,0.5)';
      [[-0.3, -0.2, 0.2], [0.25, 0.15, 0.15], [-0.05, 0.35, 0.1]].forEach(([a, b, c]) => { ctx.beginPath(); ctx.arc(mx + a * rr, my + b * rr, c * rr, 0, 6.28); ctx.fill(); });
      ctx.globalAlpha = 1;
    }
  }
  const gy = groundY();
  sc.draw(gy, time);
  ctx.fillStyle = sc.space ? '#55555f' : scTint(sc.ground[0], sc.ground[1]);
  ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(0, gy, W, 3);
}
