/* JUEGO: COCINA
   Toca un ingrediente para ponerlo en la tabla, desliza el dedo por encima para cortarlo
   (se corta justo por donde pasa el dedo), arrastra los trozos a la olla, remueve y sirve.
   Modo libre: cualquier ingrediente, sin reglas.
   Modo menús: un animalito pide un plato con sus ingredientes; cada menú es un poco más difícil
   (más ingredientes, cantidades, ingredientes que sobran y trozos más pequeños). */
App.registerGame({
  id: 'cook', title: 'Cocina', color: 'var(--orange)', order: 5,
  art: '<svg viewBox="0 0 120 100"><ellipse cx="60" cy="40" rx="40" ry="12" fill="#ffe7a0"/><path d="M20 40h80l-6 40a10 10 0 01-10 8H36a10 10 0 01-10-8z" fill="#fff"/><ellipse cx="60" cy="40" rx="40" ry="12" fill="none" stroke="#fff" stroke-width="6"/><circle cx="48" cy="38" r="6" fill="#ff8c1a"/><circle cx="66" cy="36" r="5" fill="#2bd15a"/><circle cx="76" cy="41" r="4" fill="#ff3b4e"/><path d="M44 22c-4-6 4-8 0-14M60 20c-4-6 4-8 0-14M76 22c-4-6 4-8 0-14" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/></svg>',

  html: () => `
    <div class="bar">${App.homeBtn()}<div class="chips modes"><button class="chip" data-m="free" aria-label="Modo libre">🍲</button><button class="chip" data-m="menu" aria-label="Menús">📋</button></div><span class="stars clvl" hidden>Menú 1</span></div>
    <button class="order" hidden aria-label="Repetir pedido"></button>
    <div class="kstage"><canvas class="kcv"></canvas><button class="btn serve" hidden>¡Servir!</button></div>
    <div class="shelf"></div>`,

  init(el) {
    const S = App.settings;
    if (!S.cookMode) S.cookMode = 'free';
    if (!S.cookLevel) S.cookLevel = 0;
    const q = s => el.querySelector(s);
    const wrap = q('.kstage'), cv = q('.kcv'), ctx = cv.getContext('2d'), shelf = q('.shelf'), orderEl = q('.order'), serveBtn = q('.serve'), lvlEl = q('.clvl');
    const PI = Math.PI, TAU = PI * 2, R = Math.random;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

    /* ---------- ingredientes y menús ---------- */
    const ING = {
      tomate: ['🍅', 'el tomate', '#e8402a'], zanahoria: ['🥕', 'la zanahoria', '#f58a1f'], patata: ['🥔', 'la patata', '#d9b26f'],
      cebolla: ['🧅', 'la cebolla', '#e9d6b8'], pepino: ['🥒', 'el pepino', '#5aa83c'], lechuga: ['🥬', 'la lechuga', '#7cc35b'],
      maiz: ['🌽', 'el maíz', '#f5c518'], berenjena: ['🍆', 'la berenjena', '#6b3d8c'], pimiento: ['🫑', 'el pimiento', '#3aa03a'],
      seta: ['🍄', 'la seta', '#c9a27e'], pollo: ['🍗', 'el pollo', '#d08a4a'], pescado: ['🐟', 'el pescado', '#8fb3c9'],
      brocoli: ['🥦', 'el brócoli', '#3f9b3a'], queso: ['🧀', 'el queso', '#f6c945'], manzana: ['🍎', 'la manzana', '#d8323a'],
      platano: ['🍌', 'el plátano', '#f2d64b'], fresa: ['🍓', 'la fresa', '#e63946'], naranja: ['🍊', 'la naranja', '#f39c12'],
      pera: ['🍐', 'la pera', '#bcd45a'], sandia: ['🍉', 'la sandía', '#e8505b'], uvas: ['🍇', 'las uvas', '#7d3c98'], limon: ['🍋', 'el limón', '#f7dc4b']
    };
    const KEYS = Object.keys(ING);
    const MENUS = [
      { name: 'ensalada de tomate', who: '🐰', items: { tomate: 1 }, extra: 1, cuts: 2 },
      { name: 'sopa de zanahoria', who: '🐻', items: { zanahoria: 1, patata: 1 }, extra: 1, cuts: 2 },
      { name: 'ensalada verde', who: '🐱', items: { lechuga: 1, tomate: 1, pepino: 1 }, extra: 2, cuts: 2 },
      { name: 'macedonia', who: '🐵', items: { fresa: 2, platano: 1 }, extra: 2, cuts: 2 },
      { name: 'sopa de verduras', who: '🐶', items: { zanahoria: 1, patata: 1, cebolla: 1, maiz: 1 }, extra: 3, cuts: 2 },
      { name: 'puchero', who: '🐼', items: { pollo: 1, zanahoria: 2, patata: 1 }, extra: 3, cuts: 3 },
      { name: 'macedonia grande', who: '🦊', items: { fresa: 2, manzana: 1, naranja: 1, platano: 1 }, extra: 4, cuts: 3 },
      { name: 'guiso del bosque', who: '🐻', items: { seta: 2, cebolla: 1, pimiento: 1, patata: 1 }, extra: 4, cuts: 3 },
      { name: 'sopa del mar', who: '🐧', items: { pescado: 2, tomate: 1, cebolla: 1, pimiento: 1 }, extra: 5, cuts: 3 },
      { name: 'gran menú', who: '🦁', items: { brocoli: 1, zanahoria: 2, maiz: 1, patata: 1, pollo: 1 }, extra: 5, cuts: 4 }
    ];
    const WATER = [154, 209, 230];

    let W = 0, H = 0, dpr = 1, s = 1, L = null, bgc = null, raf = 0, last = 0, running = false;
    let item = null, flying = [], chunks = [], splashes = [], bubbles = [], steam = [], trail = [], knife = null;
    let pot = { cnt: {}, total: 0, col: WATER.slice(), spin: 0, stir: 0, stirring: false, lastAng: 0, bowl: null };
    let menu = null, needStir = false, done = false, ptr = null, t0 = 0;
    const imgCache = new Map();

    /* ---------- sonidos ---------- */
    let nb = null;
    const noise = a => { if (!nb) { nb = a.createBuffer(1, a.sampleRate * .4, a.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; } return nb; };
    function burst(type, f0, f1, dur, vol) { const a = App.audio(); if (!a) return; const t = a.currentTime, n = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); n.buffer = noise(a); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); n.connect(f).connect(g).connect(a.destination); n.start(t); n.stop(t + dur + .02); }
    const snd = {
      chop() { burst('highpass', 2500, 5000, .07, .35); const a = App.audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(200, t + .05); g.gain.setValueAtTime(.2, t); g.gain.exponentialRampToValueAtTime(.001, t + .06); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .07); },
      swish() { burst('bandpass', 800, 3000, .12, .08); },
      splash() { burst('lowpass', 1800, 300, .3, .35); },
      blub() { const a = App.audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(200 + R() * 100, t); o.frequency.exponentialRampToValueAtTime(600, t + .08); g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .12); },
      boing() { const a = App.audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(150, t + .25); g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .32); }
    };

    /* ---------- geometría de los trozos ---------- */
    const cross = (ax, ay, bx, by) => ax * by - ay * bx;
    function hull(pts) {
      pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const lo = [], up = [];
      for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 1][0] - lo[lo.length - 2][0], lo[lo.length - 1][1] - lo[lo.length - 2][1], p[0] - lo[lo.length - 2][0], p[1] - lo[lo.length - 2][1]) <= 0) lo.pop(); lo.push(p); }
      for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 1][0] - up[up.length - 2][0], up[up.length - 1][1] - up[up.length - 2][1], p[0] - up[up.length - 2][0], p[1] - up[up.length - 2][1]) <= 0) up.pop(); up.push(p); }
      return lo.slice(0, -1).concat(up.slice(0, -1));
    }
    const area = P => { let a = 0; for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };
    const centroid = P => { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; };
    function inPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
    function segHitsPoly(P, ax, ay, bx, by) {
      let n = 0;
      for (let i = 0; i < P.length; i++) {
        const [cx, cy] = P[i], [dx, dy] = P[(i + 1) % P.length];
        const d = cross(bx - ax, by - ay, dx - cx, dy - cy); if (Math.abs(d) < 1e-9) continue;
        const t = cross(cx - ax, cy - ay, dx - cx, dy - cy) / d, u = cross(cx - ax, cy - ay, bx - ax, by - ay) / d;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) n++;
      }
      return n >= 2;
    }
    function splitPoly(P, px, py, dx, dy) {
      const A = [], B = [];
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        const sa = cross(dx, dy, a[0] - px, a[1] - py), sb = cross(dx, dy, b[0] - px, b[1] - py);
        if (sa >= 0) A.push(a); if (sa <= 0) B.push(a);
        if ((sa > 0 && sb < 0) || (sa < 0 && sb > 0)) { const t = sa / (sa - sb), m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; A.push(m); B.push(m); }
      }
      return [A, B];
    }

    /* imagen del ingrediente y su contorno */
    function ingImage(key, size) {
      const id = key + '@' + size; if (imgCache.has(id)) return imgCache.get(id);
      const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d', { willReadFrequently: true });
      x.font = `${Math.round(size * .82)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(ING[key][0], size / 2, size / 2 + size * .04);
      const d = x.getImageData(0, 0, size, size).data, pts = [];
      for (let k = 0; k < 40; k++) {
        const a = k * TAU / 40;
        for (let r = size / 2; r > 2; r -= 1) { const px = Math.round(size / 2 + Math.cos(a) * r), py = Math.round(size / 2 + Math.sin(a) * r); if (px >= 0 && py >= 0 && px < size && py < size && d[(py * size + px) * 4 + 3] > 40) { pts.push([px - size / 2, py - size / 2]); break; } }
      }
      const poly = pts.length >= 3 ? hull(pts) : [[-size / 3, -size / 3], [size / 3, -size / 3], [size / 3, size / 3], [-size / 3, size / 3]];
      const v = { c, poly }; imgCache.set(id, v); return v;
    }

    /* ---------- disposición ---------- */
    function layout() {
      const r = wrap.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return false;
      dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      s = Math.min(W, H) / 400;
      const portrait = H > W * 1.05;
      if (portrait) { const pr = Math.min(W * .26, H * .17); L = { pot: { x: W * .5, y: H * .24, r: pr }, board: { x: W * .06, y: H * .5, w: W * .88, h: H * .46 }, counter: H * .44 }; }
      else { const pr = Math.min(W * .15, H * .28); L = { pot: { x: W * .76, y: H * .42, r: pr }, board: { x: W * .05, y: H * .14, w: W * .5, h: H * .8 }, counter: H * .55 }; }
      L.isize = Math.round(Math.min(L.board.w, L.board.h) * .6);
      buildBg();
      if (item) { item.x = boardCenter().x; item.y = boardCenter().y; }
      return true;
    }
    const boardCenter = () => ({ x: L.board.x + L.board.w / 2, y: L.board.y + L.board.h / 2 });
    function buildBg() {
      bgc = document.createElement('canvas'); bgc.width = cv.width; bgc.height = cv.height; const b = bgc.getContext('2d'); b.scale(dpr, dpr);
      b.fillStyle = '#fdf1d8'; b.fillRect(0, 0, W, H);
      b.strokeStyle = 'rgba(200,170,120,.35)'; b.lineWidth = 1.5;
      const tile = 34 * s; for (let x = 0; x < W; x += tile) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x, L.counter); b.stroke(); } for (let y = 0; y < L.counter; y += tile) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
      let g = b.createLinearGradient(0, L.counter, 0, H); g.addColorStop(0, '#d9a066'); g.addColorStop(1, '#b97a43'); b.fillStyle = g; b.fillRect(0, L.counter, W, H - L.counter);
      b.fillStyle = 'rgba(0,0,0,.12)'; b.fillRect(0, L.counter, W, 6 * s);
      const P = L.pot; b.fillStyle = '#3b3f46'; b.beginPath(); b.roundRect(P.x - P.r * 1.5, P.y + P.r * .78, P.r * 3, P.r * .5, 10 * s); b.fill();
      const B = L.board; b.save(); b.shadowColor = 'rgba(0,0,0,.25)'; b.shadowOffsetY = 6 * s; b.shadowBlur = 8 * s;
      b.fillStyle = '#e8b97c'; b.beginPath(); b.roundRect(B.x, B.y, B.w, B.h, 22 * s); b.fill(); b.restore();
      b.strokeStyle = 'rgba(150,95,40,.25)'; b.lineWidth = 2 * s;
      for (let i = 1; i < 7; i++) { const y = B.y + B.h * i / 7; b.beginPath(); b.moveTo(B.x + 20 * s, y); b.bezierCurveTo(B.x + B.w * .3, y - 6 * s, B.x + B.w * .7, y + 6 * s, B.x + B.w - 20 * s, y); b.stroke(); }
      b.fillStyle = '#b97a43'; b.beginPath(); b.ellipse(B.x + B.w - 26 * s, B.y + 26 * s, 9 * s, 9 * s, 0, 0, TAU); b.fill();
    }

    /* ---------- ingrediente en la tabla ---------- */
    function place(key) {
      if (item) splashes.push({ k: 'poof', x: item.x, y: item.y, t: 0 });
      const im = ingImage(key, L.isize), c = boardCenter();
      item = { key, im, x: c.x, y: c.y - 30 * s, ty: c.y, t: 0, pieces: [{ poly: im.poly.map(p => p.slice()), dx: 0, dy: 0, tx: 0, ty: 0 }], drag: null };
      App.sfx.pop(); App.say(ING[key][1].replace(/^(el|la|las) /, ''));
    }
    function trySplit(piece, ax, ay, bx, by) {
      if (item.pieces.length >= 12 || area(piece.poly) < L.isize * L.isize * .012) return false;
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy); if (len < 1) return false;
      const [A, B] = splitPoly(piece.poly, ax, ay, dx, dy);
      if (A.length < 3 || B.length < 3) return false;
      const a1 = area(A), a2 = area(B), tot = a1 + a2; if (a1 < tot * .08 || a2 < tot * .08) return false;
      const nx = -dy / len, ny = dx / len, push = 9 * s;
      const sideA = cross(dx, dy, centroid(A)[0] - ax, centroid(A)[1] - ay) > 0 ? 1 : -1;
      const i = item.pieces.indexOf(piece);
      item.pieces.splice(i, 1,
        { poly: A, dx: piece.dx, dy: piece.dy, tx: piece.tx - nx * push * sideA, ty: piece.ty - ny * push * sideA },
        { poly: B, dx: piece.dx, dy: piece.dy, tx: piece.tx + nx * push * sideA, ty: piece.ty + ny * push * sideA });
      return true;
    }
    function cutAlong(ax, ay, bx, by) {
      if (!item || item.drag) return;
      let cut = false;
      for (const p of item.pieces.slice()) {
        const ox = item.x + p.dx, oy = item.y + p.dy;
        const la = [ax - ox, ay - oy], lb = [bx - ox, by - oy];
        const ia = inPoly(p.poly, la[0], la[1]), ib = inPoly(p.poly, lb[0], lb[1]);
        if (!ia && ib && !p.enter) p.enter = la;
        else if (ia && !ib && p.enter) { const e = p.enter; p.enter = null; if (trySplit(p, e[0], e[1], lb[0], lb[1])) cut = true; }
        else if (!ia && !ib && segHitsPoly(p.poly, la[0], la[1], lb[0], lb[1])) { if (trySplit(p, la[0], la[1], lb[0], lb[1])) cut = true; }
      }
      if (cut) { snd.chop(); for (let i = 0; i < 4; i++) splashes.push({ k: 'crumb', x: bx, y: by, vx: (R() - .5) * 200 * s, vy: -R() * 200 * s, t: 0, c: ING[item.key][2] }); }
    }
    function hitItem(x, y) {
      if (!item) return false;
      return item.pieces.some(p => inPoly(p.poly, x - item.x - p.dx, y - item.y - p.dy));
    }
    const potAng = (x, y) => Math.atan2((y - (L.pot.y - L.pot.r * .1)) / (L.pot.r * .3), (x - L.pot.x) / (L.pot.r * .95));
    const overPot = (x, y) => Math.hypot(x - L.pot.x, y - (L.pot.y + L.pot.r * .1)) < L.pot.r * 1.35;
    const inLiquid = (x, y) => { const P = L.pot, dx = (x - P.x) / (P.r * .95), dy = (y - (P.y - P.r * .1)) / (P.r * .4); return dx * dx + dy * dy < 1.4; };

    /* ---------- olla ---------- */
    function dropInPot() {
      const it = item, ing = ING[it.key];
      if (menu) {
        const need = menu.items[it.key] || 0, have = pot.cnt[it.key] || 0;
        if (have >= need) { reject(need ? '¡Ya tenemos suficiente!' : '¡Eso no va en este plato!'); return; }
        if (it.pieces.length < menu.cuts) { reject(menu.cuts > 2 ? '¡Córtalo en trocitos más pequeños!' : '¡Primero hay que cortarlo!'); return; }
      }
      item = null;
      const P = L.pot;
      for (const p of it.pieces) {
        const [cx, cy] = centroid(p.poly);
        flying.push({ key: it.key, im: it.im, poly: p.poly, x: it.x + p.dx, y: it.y + p.dy, sx: it.x + p.dx, sy: it.y + p.dy, ex: P.x + (R() - .5) * P.r * .8 - cx * .4, ey: P.y - P.r * .1 + (R() - .5) * P.r * .25 - cy * .4, t: -R() * .15, rot: 0, vr: (R() - .5) * 8 });
      }
      pot.cnt[it.key] = (pot.cnt[it.key] || 0) + 1; pot.total++;
      const c = ing[2], n = parseInt(c.slice(1), 16), rgb = [n >> 16 & 255, n >> 8 & 255, n & 255], w = pot.total === 1 ? .75 : 1 / (pot.total + .3);
      pot.col = pot.col.map((v, i) => v + (rgb[i] - v) * w);
      setTimeout(() => { App.say(ing[1].replace(/^(el|la|las) /, '')); }, 350);
      renderOrder(); checkMenu(); updateServe();
    }
    function reject(msg) {
      const c = boardCenter(); item.drag = null; item.bounce = .5;
      item.x = c.x; item.y = c.y; snd.boing(); App.say(msg); App.toast(msg);
      if (menu) { orderEl.classList.remove('nope'); void orderEl.offsetWidth; orderEl.classList.add('nope'); }
    }
    function checkMenu() {
      if (!menu) return;
      const all = Object.entries(menu.items).every(([k, n]) => (pot.cnt[k] || 0) >= n);
      if (all && !needStir) { needStir = true; pot.stir = 0; setTimeout(() => App.say('¡Ahora remueve la olla!'), 900); }
    }
    function updateServe() {
      const ok = menu ? (needStir && pot.stir >= TAU * 2) : pot.total > 0;
      serveBtn.hidden = !ok || !!pot.bowl;
    }
    function serve() {
      if (pot.bowl) return;
      pot.bowl = { t: 0, col: pot.col.slice(), chunks: chunks.slice(0, 8).map(c => ({ ...c })), who: menu ? menu.who : '😋' };
      serveBtn.hidden = true; App.sfx.yes(); App.confetti(100);
      App.say(menu ? '¡Qué rico! ¡Gracias!' : '¡Qué rico!');
      setTimeout(() => {
        if (menu) { S.cookLevel = (S.cookLevel || 0) + 1; App.saveSettings(); App.win(() => { resetPot(); startMenu(); }, '¡Plato servido!', 'Siguiente menú'); }
        else resetPot();
      }, 1800);
    }
    function resetPot() { pot = { cnt: {}, total: 0, col: WATER.slice(), spin: 0, stir: 0, stirring: false, lastAng: 0, bowl: null }; chunks = []; needStir = false; updateServe(); }

    /* ---------- modos ---------- */
    function fillShelf(keys) { shelf.innerHTML = keys.map(k => `<button data-k="${k}" aria-label="${ING[k][1]}">${ING[k][0]}</button>`).join(''); }
    function renderOrder() {
      if (!menu) { orderEl.hidden = true; return; }
      orderEl.hidden = false;
      const chips = Object.entries(menu.items).map(([k, n]) => { const h = pot.cnt[k] || 0, ok = h >= n; return `<span class="req${ok ? ' ok' : ''}">${ING[k][0]}${n > 1 ? `<i>${Math.min(h, n)}/${n}</i>` : ''}${ok ? '<em>✓</em>' : ''}</span>`; }).join('');
      const cutsHint = menu.cuts > 2 ? `<span class="cuts">${'🔪'.repeat(Math.min(menu.cuts - 1, 3))}</span>` : '';
      const stirHint = needStir ? `<span class="req stir${pot.stir >= TAU * 2 ? ' ok' : ''}">🥄${pot.stir >= TAU * 2 ? '<em>✓</em>' : ''}</span>` : '';
      orderEl.innerHTML = `<span class="who">${menu.who}</span><span class="bubble"><b>${menu.name[0].toUpperCase() + menu.name.slice(1)}</b><span class="reqs">${chips}${stirHint}${cutsHint}</span></span>`;
    }
    function sayOrder() {
      if (!menu) return;
      const parts = Object.entries(menu.items).map(([k, n]) => { const nm = ING[k][1].replace(/^(el|la|las) /, ''); return n > 1 ? (n === 2 ? 'dos ' : n + ' ') + (nm.endsWith('n') ? nm.replace('ón', 'ones') : nm + 's') : (ING[k][1].startsWith('la') ? 'una ' : 'un ') + nm; });
      const list = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1] : parts[0];
      App.say(`¡Hola! Quiero ${menu.name}: ${list}.`);
    }
    function startMenu() {
      const i = S.cookLevel || 0;
      const base = i < MENUS.length ? MENUS[i] : App.pick(MENUS.slice(4));
      menu = { ...base, items: { ...base.items } };
      lvlEl.hidden = false; lvlEl.textContent = 'Menú ' + (i + 1);
      const need = Object.keys(menu.items), others = App.shuffle(KEYS.filter(k => !need.includes(k))).slice(0, menu.extra);
      fillShelf(App.shuffle([...need, ...others]));
      item = null; resetPot(); renderOrder(); setTimeout(sayOrder, 400);
    }
    function setMode(m) {
      S.cookMode = m; App.saveSettings();
      el.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === m));
      item = null; resetPot(); flying = [];
      if (m === 'menu') startMenu();
      else { menu = null; lvlEl.hidden = true; orderEl.hidden = true; fillShelf(KEYS); }
      requestAnimationFrame(layout);
    }

    /* ---------- entrada ---------- */
    shelf.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b && L && !pot.bowl) place(b.dataset.k); });
    el.querySelector('.modes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { App.sfx.pop(); setMode(b.dataset.m); } });
    orderEl.addEventListener('click', sayOrder);
    serveBtn.addEventListener('click', serve);
    const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => {
      if (!L || pot.bowl) return; e.preventDefault(); const [x, y] = pt(e);
      try { cv.setPointerCapture(e.pointerId); } catch (_) { }
      if (item && hitItem(x, y)) { item.drag = { ox: x - item.x, oy: y - item.y }; ptr = { mode: 'drag', id: e.pointerId }; App.sfx.pop(); return; }
      if (inLiquid(x, y) && pot.total > 0) { ptr = { mode: 'stir', id: e.pointerId, x, y }; pot.stirring = true; pot.lastAng = potAng(x, y); return; }
      ptr = { mode: 'cut', id: e.pointerId, x, y, dist: 0 }; trail = [{ x, y, t: 0 }];
      if (item) for (const p of item.pieces) p.enter = null;
    });
    cv.addEventListener('pointermove', e => {
      if (!ptr || ptr.id !== e.pointerId) return; const [x, y] = pt(e);
      if (ptr.mode === 'drag' && item && item.drag) { item.x = x - item.drag.ox; item.y = y - item.drag.oy; }
      else if (ptr.mode === 'stir') {
        const a = potAng(x, y); let d = a - pot.lastAng; if (d > PI) d -= TAU; if (d < -PI) d += TAU;
        pot.lastAng = a; pot.spin += d * .9; pot.stir += Math.abs(d); ptr.x = x; ptr.y = y;
        if (R() < .08) snd.blub();
        if (menu && needStir) { renderOrderThrottled(); if (pot.stir >= TAU * 2 && !ptr.done) { ptr.done = true; App.sfx.yes(); App.say('¡Listo! ¡A servir!'); updateServe(); } }
      } else if (ptr.mode === 'cut') {
        const px = ptr.x, py = ptr.y; ptr.dist += Math.hypot(x - px, y - py);
        cutAlong(px, py, x, y); ptr.x = x; ptr.y = y; trail.push({ x, y, t: 0 }); if (trail.length > 14) trail.shift();
        knife = { x, y, a: Math.atan2(y - py, x - px), t: 0 };
        if (ptr.dist > 60 * s && !ptr.sw) { ptr.sw = true; snd.swish(); }
      }
    });
    let rot = 0; function renderOrderThrottled() { const n = performance.now(); if (n - rot > 150) { rot = n; renderOrder(); } }
    const up = e => {
      if (!ptr || ptr.id !== e.pointerId) return; const [x, y] = pt(e);
      if (ptr.mode === 'drag' && item) {
        if (overPot(x, y)) { item.drag = null; dropInPot(); }
        else { item.drag = null; item.homing = true; }
      }
      if (ptr.mode === 'stir') { pot.stirring = false; renderOrder(); updateServe(); }
      ptr = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    /* ---------- animación ---------- */
    function update(dt) {
      t0 += dt;
      if (item) {
        item.t += dt;
        if (!item.drag) {
          const c = boardCenter();
          if (item.ty !== undefined && item.t < .4) item.y += (item.ty - item.y) * Math.min(1, dt * 12);
          if (item.homing) { item.x += (c.x - item.x) * Math.min(1, dt * 10); item.y += (c.y - item.y) * Math.min(1, dt * 10); if (Math.hypot(c.x - item.x, c.y - item.y) < 1) item.homing = false; }
        }
        for (const p of item.pieces) { p.dx += (p.tx - p.dx) * Math.min(1, dt * 14); p.dy += (p.ty - p.dy) * Math.min(1, dt * 14); }
        if (item.bounce) item.bounce = Math.max(0, item.bounce - dt);
      }
      for (const f of flying) {
        f.t += dt; const k = clamp(f.t / .55, 0, 1);
        f.x = f.sx + (f.ex - f.sx) * k; f.y = f.sy + (f.ey - f.sy) * k - Math.sin(k * PI) * 110 * s; f.rot += f.vr * dt;
        if (k >= 1 && !f.done) {
          f.done = true; snd.splash();
          for (let i = 0; i < 8; i++) splashes.push({ k: 'drop', x: f.ex, y: f.ey, vx: (R() - .5) * 260 * s, vy: -(120 + R() * 200) * s, t: 0, c: `rgb(${pot.col.map(Math.round).join(',')})` });
          if (chunks.length < 26) chunks.push({ key: f.key, im: f.im, poly: f.poly, ang: R() * TAU, rad: R() * .7, rot: f.rot, bob: R() * TAU });
        }
      }
      flying = flying.filter(f => !f.done);
      for (const c of chunks) { c.ang += pot.spin * .02 + dt * .15; c.rot += pot.spin * .02; }
      pot.spin *= Math.pow(.2, dt);
      if (pot.total > 0 && R() < dt * 6) bubbles.push({ a: R() * TAU, r: R() * .8, t: 0, size: (2 + R() * 4) * s });
      for (const b of bubbles) b.t += dt; bubbles = bubbles.filter(b => b.t < .8);
      if (R() < dt * (pot.total > 0 ? 5 : 1.5)) steam.push({ x: L.pot.x + (R() - .5) * L.pot.r, y: L.pot.y - L.pot.r * .25, t: 0, w: R() * TAU });
      for (const st of steam) st.t += dt; steam = steam.filter(st => st.t < 2);
      for (const sp of splashes) { sp.t += dt; if (sp.vx !== undefined) { sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 700 * s * dt; } }
      splashes = splashes.filter(sp => sp.t < (sp.k === 'poof' ? .35 : .6));
      for (const p of trail) p.t += dt; trail = trail.filter(p => p.t < .18);
      if (knife) { knife.t += dt; if (knife.t > .35) knife = null; }
      if (pot.bowl) pot.bowl.t += dt;
    }
    function drawPiece(im, poly, size, x, y, rot, scale, outline) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(scale, scale);
      ctx.beginPath(); poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.save(); ctx.clip(); ctx.drawImage(im.c, -size / 2, -size / 2, size, size); ctx.restore();
      if (outline) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2 / scale; ctx.stroke(); }
      ctx.restore();
    }
    function drawPot() {
      const P = L.pot, rx = P.r * 1.05, top = P.y - P.r * .1;
      const fl = t0 * 12;
      for (let i = -2; i <= 2; i++) { const fx = P.x + i * P.r * .35, h = (14 + Math.sin(fl + i * 2) * 4) * s; ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.ellipse(fx, P.y + P.r * .78, 7 * s, h, 0, PI, 0); ctx.fill(); ctx.fillStyle = '#3d7dff'; ctx.beginPath(); ctx.ellipse(fx, P.y + P.r * .78, 4 * s, h * .45, 0, PI, 0); ctx.fill(); }
      ctx.lineWidth = 3 * s; ctx.strokeStyle = '#2a1d0f';
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.roundRect(P.x + k * rx - (k > 0 ? 0 : 22 * s), top + P.r * .12, 22 * s, 12 * s, 6 * s); ctx.fillStyle = '#5a6270'; ctx.fill(); ctx.stroke(); }
      const g = ctx.createLinearGradient(P.x - rx, 0, P.x + rx, 0); g.addColorStop(0, '#8d97a5'); g.addColorStop(.35, '#dfe5ec'); g.addColorStop(1, '#7a8492');
      ctx.beginPath(); ctx.moveTo(P.x - rx, top); ctx.lineTo(P.x - rx * .92, P.y + P.r * .78); ctx.quadraticCurveTo(P.x, P.y + P.r * .9, P.x + rx * .92, P.y + P.r * .78); ctx.lineTo(P.x + rx, top); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(P.x, top, rx, P.r * .32, 0, 0, TAU); ctx.fillStyle = '#6f7885'; ctx.fill(); ctx.stroke();
      const lc = `rgb(${pot.col.map(Math.round).join(',')})`;
      ctx.save(); ctx.beginPath(); ctx.ellipse(P.x, top + P.r * .03, rx * .9, P.r * .26, 0, 0, TAU); ctx.fillStyle = lc; ctx.fill(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(P.x - rx * .3, top - P.r * .05, rx * .35, P.r * .08, 0, 0, TAU); ctx.fill();
      for (const c of chunks) { const cx = P.x + Math.cos(c.ang) * rx * .75 * c.rad, cy = top + Math.sin(c.ang) * P.r * .2 * c.rad + Math.sin(t0 * 3 + c.bob) * 2 * s; drawPiece(c.im, c.poly, L.isize, cx, cy, c.rot, .32, false); }
      for (const b of bubbles) { const k = b.t / .8, bx = P.x + Math.cos(b.a) * rx * .75 * b.r, by = top + Math.sin(b.a) * P.r * .2 * b.r; ctx.strokeStyle = `rgba(255,255,255,${.8 * (1 - k)})`; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.arc(bx, by, b.size * (.5 + k), 0, TAU); ctx.stroke(); }
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(P.x, top, rx, P.r * .32, 0, 0, TAU); ctx.lineWidth = 5 * s; ctx.strokeStyle = '#4a515c'; ctx.stroke();
      for (const st of steam) { const k = st.t / 2; ctx.fillStyle = `rgba(255,255,255,${.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(st.x + Math.sin(st.w + st.t * 3) * 10 * s, st.y - k * P.r * 1.6, (6 + k * 14) * s, 0, TAU); ctx.fill(); }
      if (menu && needStir && pot.stir < TAU * 2 && !ptr) {
        const a = t0 * 3; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.ellipse(P.x, top, rx * .55, P.r * .16, 0, a, a + PI * 1.4); ctx.stroke();
        const ex = P.x + Math.cos(a + PI * 1.4) * rx * .55, ey = top + Math.sin(a + PI * 1.4) * P.r * .16; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 7 * s, 0, TAU); ctx.fill();
      }
      if (pot.stirring && ptr) {
        ctx.strokeStyle = '#a8703a'; ctx.lineWidth = 9 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ptr.x, ptr.y); ctx.lineTo(ptr.x + 20 * s, ptr.y - P.r * 1.1); ctx.stroke();
        ctx.fillStyle = '#c48a4f'; ctx.beginPath(); ctx.ellipse(ptr.x, ptr.y, 11 * s, 7 * s, -.3, 0, TAU); ctx.fill();
      }
      if (menu && needStir) {
        const k = clamp(pot.stir / (TAU * 2), 0, 1); ctx.lineWidth = 6 * s; ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.arc(P.x - rx - 26 * s, P.y - P.r * .5, 14 * s, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#2bd15a'; ctx.beginPath(); ctx.arc(P.x - rx - 26 * s, P.y - P.r * .5, 14 * s, -PI / 2, -PI / 2 + TAU * k); ctx.stroke();
      }
    }
    function drawBowl() {
      const b = pot.bowl, k = easeOutBack(clamp(b.t / .4, 0, 1)), cx = W / 2, cy = H * .5, r = Math.min(W, H) * .26 * k;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(cx, cy);
      ctx.fillStyle = '#000'; ctx.font = `${Math.round(r * .9)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.who, 0, -r * 1.05 + Math.sin(b.t * 8) * 4 * s);
      ctx.lineWidth = 4 * s; ctx.strokeStyle = '#2a1d0f';
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(-r * .95, r * .9, 0, r * .9); ctx.quadraticCurveTo(r * .95, r * .9, r, 0); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3d7dff'; ctx.fillRect(-r * .9, r * .25, r * 1.8, r * .12);
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * .25, 0, 0, TAU); ctx.fillStyle = `rgb(${b.col.map(Math.round).join(',')})`; ctx.fill(); ctx.stroke();
      b.chunks.forEach((c, i) => drawPiece(c.im, c.poly, L.isize, Math.cos(i * 2.4) * r * .55, Math.sin(i * 2.4) * r * .12, c.rot, .3 * k, false));
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4 * s; ctx.beginPath(); const sx = (i - 1) * r * .35; ctx.moveTo(sx, -r * .2); ctx.bezierCurveTo(sx - 10 * s, -r * .4, sx + 10 * s, -r * .5, sx, -r * .7 - Math.sin(b.t * 4 + i) * 5 * s); ctx.stroke(); }
      ctx.restore();
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (bgc) ctx.drawImage(bgc, 0, 0, W, H);
      drawPot();
      if (!item && !pot.bowl && !flying.length) {
        const c = boardCenter(); ctx.fillStyle = 'rgba(120,70,20,.35)'; ctx.font = `800 ${Math.round(20 * s)}px "Baloo 2",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Elige algo de abajo ⬇', c.x, c.y);
      }
      if (item) {
        const wob = item.bounce ? Math.sin(item.bounce * 40) * 8 * s * item.bounce : 0;
        const sc = item.drag ? 1.06 : 1;
        if (item.drag) { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(item.x, item.y + L.isize * .45, L.isize * .35, L.isize * .08, 0, 0, TAU); ctx.fill(); }
        for (const p of item.pieces) drawPiece(item.im, p.poly, L.isize, item.x + p.dx * sc + wob, item.y + p.dy * sc - (item.drag ? 8 * s : 0), 0, sc, item.pieces.length > 1);
        if (item.drag && overPot(item.x, item.y)) { ctx.strokeStyle = 'rgba(43,209,90,.9)'; ctx.lineWidth = 6 * s; ctx.setLineDash([12 * s, 8 * s]); ctx.beginPath(); ctx.arc(L.pot.x, L.pot.y + L.pot.r * .1, L.pot.r * 1.3, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      }
      for (const f of flying) drawPiece(f.im, f.poly, L.isize, f.x, f.y, f.rot, 1 - .6 * clamp(f.t / .55, 0, 1), true);
      for (const sp of splashes) {
        const k = sp.t / .6;
        if (sp.k === 'drop' || sp.k === 'crumb') { ctx.fillStyle = sp.c; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(sp.x, sp.y, (sp.k === 'drop' ? 5 : 3.5) * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        else if (sp.k === 'poof') { const kk = sp.t / .35; ctx.fillStyle = `rgba(255,255,255,${.8 * (1 - kk)})`; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.arc(sp.x + Math.cos(a) * 40 * s * kk, sp.y + Math.sin(a) * 30 * s * kk, 14 * s, 0, TAU); ctx.fill(); } }
      }
      if (trail.length > 1) { ctx.lineCap = 'round'; for (let i = 1; i < trail.length; i++) { const a = trail[i - 1], b = trail[i], k = 1 - b.t / .18; ctx.strokeStyle = `rgba(255,255,255,${.85 * k})`; ctx.lineWidth = 10 * s * k * (i / trail.length); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
      if (knife) {
        ctx.save(); ctx.globalAlpha = clamp(1 - knife.t / .35, 0, 1); ctx.translate(knife.x, knife.y); ctx.rotate(knife.a);
        ctx.lineWidth = 2.5 * s; ctx.strokeStyle = '#2a1d0f';
        ctx.beginPath(); ctx.moveTo(4 * s, 0); ctx.lineTo(-44 * s, -6 * s); ctx.quadraticCurveTo(-46 * s, 8 * s, -44 * s, 10 * s); ctx.lineTo(4 * s, 0); ctx.fillStyle = '#e6ebf0'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(-74 * s, -4 * s, 30 * s, 14 * s, 5 * s); ctx.fillStyle = '#ff5d6c'; ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      if (pot.bowl) drawBowl();
    }
    function frame(ts) { if (!running) return; const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; if (L) { update(dt); draw(); } raf = requestAnimationFrame(frame); }
    const ro = new ResizeObserver(() => { if (el.classList.contains('on')) layout(); }); ro.observe(wrap);

    this.begin = () => { layout(); setMode(S.cookMode); running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    this.end = () => { running = false; cancelAnimationFrame(raf); };
    this._debug = { place, get item() { return item; }, get pot() { return pot; }, get L() { return L; }, cutAlong, setMode, get menu() { return menu; } };
  },

  start() { this.begin(); },
  stop() { this.end(); }
});
