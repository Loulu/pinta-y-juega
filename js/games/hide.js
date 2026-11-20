/* MAPA ESCONDITE (lo usa el juego Buscar)
   Un mapa grande que se mueve con el dedo, lleno de arbustos, árboles, casas, rocas y vallas.
   Detrás de algunos hay animalitos asomando. Hay que encontrar todos los del tipo pedido.
   Cada nivel: más animales, mapa más grande, animales más pequeños y más escondidos,
   y a partir del nivel 3 otros animales que despistan.
   App.makeHideMap(contenedor, {onLevel, onFound}) → { start, stop, hint } */
App.makeHideMap = (wrap, ui = {}) => {
  const cv = document.createElement('canvas'); cv.className = 'mcv'; wrap.appendChild(cv);
  const ctx = cv.getContext('2d'), S = App.settings;
  const PI = Math.PI, TAU = PI * 2, R = Math.random;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const KINDS = {
    gato: ['🐱', 'gatito', 'gatitos'], perro: ['🐶', 'perrito', 'perritos'], conejo: ['🐰', 'conejito', 'conejitos'],
    oso: ['🐻', 'osito', 'ositos'], pollito: ['🐤', 'pollito', 'pollitos'], zorro: ['🦊', 'zorrito', 'zorritos'],
    rana: ['🐸', 'ranita', 'ranitas'], cerdo: ['🐷', 'cerdito', 'cerditos'], mono: ['🐵', 'monito', 'monitos'], panda: ['🐼', 'panda', 'pandas']
  };
  const TARGET_KINDS = ['gato', 'perro', 'conejo', 'pollito', 'oso', 'zorro'];

  const MX = () => Math.max(0, world.w - W), MY = () => Math.max(0, world.h - H);
  let W = 0, H = 0, dpr = 1, s = 1, q = 1, world = { w: 0, h: 0 }, cam = { x: 0, y: 0, vx: 0, vy: 0 }, camGo = null;
  let layer = null, objs = [], animals = [], anims = [], sparkles = [], wiggles = [], level = 1, kind = 'gato', total = 0, found = 0;
  let raf = 0, last = 0, running = false, drag = null, idle = 0, t0 = 0, built = false, ending = false;

  function cfg(L) {
    return {
      n: Math.min(3 + (L - 1), 10),
      decoys: L < 3 ? 0 : Math.min(L - 1, 7),
      mw: 1.3 + Math.min(L, 8) * .22, mh: 1.05 + Math.min(L, 8) * .1,
      size: Math.max(30, 52 - L * 2.2),
      peek: Math.max(.34, .64 - (L - 1) * .035)
    };
  }

  /* ---------- sonidos ---------- */
  function meow() {
    const a = App.audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(860, t + .12); o.frequency.linearRampToValueAtTime(560, t + .4);
    f.type = 'bandpass'; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1500, t + .15); f.frequency.linearRampToValueAtTime(800, t + .4); f.Q.value = 3;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .04); g.gain.exponentialRampToValueAtTime(.001, t + .45);
    o.connect(f).connect(g).connect(a.destination); o.start(t); o.stop(t + .5);
  }

  /* ---------- tamaño ---------- */
  function resize() {
    const r = wrap.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return false;
    const nw = r.width, nh = r.height, changed = !W || Math.abs(nw - W) / W > .15 || Math.abs(nh - H) / H > .15;
    W = nw; H = nh; dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    if (!built || changed) build(level);
    return true;
  }

  /* ---------- crear el mapa ---------- */
  function build(L) {
    built = true; ending = false;
    const C = cfg(L);
    s = Math.min(W, H) / 400; q = Math.min(dpr, 1.5);
    world.w = Math.round(W * C.mw); world.h = Math.round(H * C.mh);
    objs = []; animals = []; anims = []; sparkles = []; wiggles = []; found = 0; idle = 0;
    kind = L <= 4 ? 'gato' : (L % 2 ? App.pick(TARGET_KINDS.filter(k => k !== 'gato')) : 'gato');
    /* objetos repartidos sin pisarse */
    const TYPES = [['bush', .34], ['tree', .26], ['rock', .12], ['house', .1], ['fence', .08], ['flowers', .08], ['pond', .02]];
    const FP = { bush: 40, tree: 52, rock: 32, house: 78, fence: 54, flowers: 22, pond: 80 };
    const pickType = () => { let r = R(), acc = 0; for (const [t, w] of TYPES) { acc += w; if (r < acc) return t; } return 'bush'; };
    const top = 90 * s;
    for (let tries = 0; tries < 900; tries++) {
      const type = pickType(), fp = FP[type] * s;
      const x = fp + R() * (world.w - fp * 2), y = top + fp + R() * (world.h - top - fp * 1.2);
      if (objs.some(o => Math.hypot(o.x - x, o.y - y) < (o.fp + fp) * .82)) continue;
      const o = { type, x, y, fp, seed: R() };
      if (type === 'bush') o.r = (26 + R() * 10) * s;
      if (type === 'tree') { o.cr = (34 + R() * 10) * s; o.th = (26 + R() * 10) * s; }
      if (type === 'rock') o.r = (20 + R() * 8) * s;
      if (type === 'house') { o.w = (96 + R() * 20) * s; o.h = (70 + R() * 14) * s; o.col = App.pick(['#ff8fa3', '#8ecae6', '#ffd166', '#cdb4db', '#b5e48c']); o.roof = App.pick(['#e63946', '#3d5a80', '#9c6644', '#6a4c93']); }
      if (type === 'fence') o.w = (70 + R() * 30) * s;
      if (type === 'pond') { o.rx = 64 * s; o.ry = 28 * s; }
      objs.push(o);
    }
    objs.sort((a, b) => a.y - b.y);
    /* esconder animales */
    const spots = App.shuffle(objs.filter(o => ['bush', 'tree', 'rock', 'house', 'fence'].includes(o.type)));
    const size = C.size * s, n = Math.min(C.n, spots.length), nd = Math.min(C.decoys, spots.length - n);
    const decoyKinds = Object.keys(KINDS).filter(k => k !== kind);
    for (let i = 0; i < n + nd; i++) {
      const o = spots[i], target = i < n, k = target ? kind : App.pick(decoyKinds);
      const a = { kind: k, emoji: KINDS[k][0], target, obj: o, size, found: false };
      placeAnimal(a, o, C.peek); o.animal = a; animals.push(a);
    }
    total = n;
    renderLayer();
    const first = animals.find(a => a.target);
    cam.x = clamp(world.w / 2 - W / 2, 0, MX()); cam.y = clamp(world.h / 2 - H / 2, 0, MY()); cam.vx = cam.vy = 0; camGo = null;
    if (ui.onLevel) ui.onLevel(L);
    setTimeout(() => App.say(`¡Busca ${n === 1 ? 'el' : 'los'} ${n} ${KINDS[kind][2]}!`), 300);
    return first;
  }
  function placeAnimal(a, o, peek) {
    const sz = a.size;
    if (o.type === 'bush' || o.type === 'rock' || o.type === 'fence') {
      const topY = o.type === 'bush' ? o.y - o.r * 1.7 : o.type === 'rock' ? o.y - o.r * 1.35 : o.y - 30 * s;
      const span = o.type === 'fence' ? o.w * .35 : (o.r || 20) * .5;
      a.x = o.x + (R() - .5) * span * 2; a.y = topY + sz * (.5 - peek); a.hx = a.x; a.hy = topY - sz * peek / 2;
    } else if (o.type === 'tree') {
      const cy = o.y - o.th - o.cr * .7, ang = -PI / 2 + (R() < .5 ? -1 : 1) * (.35 + R() * .5), d = o.cr + sz * (peek - .5);
      a.x = o.x + Math.cos(ang) * d; a.y = cy + Math.sin(ang) * d; a.rot = (ang + PI / 2) * .6;
      a.hx = o.x + Math.cos(ang) * (o.cr + sz * peek / 2); a.hy = cy + Math.sin(ang) * (o.cr + sz * peek / 2);
    } else if (o.type === 'house') {
      const left = R() < .5, wx = o.x + (left ? -o.w * .26 : o.w * .26), wy = o.y - o.h * .55, ws = o.w * .24;
      a.win = { x: wx - ws / 2, y: wy - ws / 2, w: ws, h: ws };
      a.size = Math.min(sz, ws * 1.15); a.x = wx; a.y = wy + a.size * (.5 - peek) + ws * .1; a.hx = wx; a.hy = wy;
    }
    a.hr = Math.max(a.size * .6, 24 * s);
  }

  /* ---------- dibujar el mapa fijo ---------- */
  function drawAnimal(c, a, alpha) {
    c.save(); c.globalAlpha = alpha == null ? 1 : alpha; c.fillStyle = '#000';
    c.font = `${Math.round(a.size)}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.translate(a.x, a.y); if (a.rot) c.rotate(a.rot); c.fillText(a.emoji, 0, a.size * .05); c.restore();
  }
  function blob(c, circles, fill, line) {
    c.fillStyle = line; for (const [x, y, r] of circles) { c.beginPath(); c.arc(x, y, r + 3 * s, 0, TAU); c.fill(); }
    c.fillStyle = fill; for (const [x, y, r] of circles) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  }
  function drawObj(c, o) {
    const ink = '#2f5a1f';
    if (o.type === 'bush') {
      const r = o.r, cy = o.y - r * .75;
      blob(c, [[o.x - r * .55, cy + r * .15, r * .7], [o.x + r * .55, cy + r * .15, r * .7], [o.x, cy - r * .2, r * .85]], o.seed < .5 ? '#4caf50' : '#5cb85c', ink);
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(o.x - r * .25, cy - r * .45, r * .3, 0, TAU); c.fill();
      if (o.seed > .65) { c.fillStyle = '#e63946'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(o.x + Math.cos(i * 1.7 + o.seed * 9) * r * .6, cy + Math.sin(i * 1.7) * r * .4, 3.5 * s, 0, TAU); c.fill(); } }
    } else if (o.type === 'tree') {
      c.fillStyle = '#8d5a32'; c.strokeStyle = '#5c3a1e'; c.lineWidth = 3 * s;
      c.beginPath(); c.roundRect(o.x - 9 * s, o.y - o.th - o.cr * .3, 18 * s, o.th + o.cr * .3, 4 * s); c.fill(); c.stroke();
      const cy = o.y - o.th - o.cr * .7, cr = o.cr;
      blob(c, [[o.x - cr * .62, cy + cr * .3, cr * .62], [o.x + cr * .62, cy + cr * .3, cr * .62], [o.x, cy, cr]], o.seed < .5 ? '#3e9b47' : '#57b34f', '#255c25');
      c.fillStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.arc(o.x - cr * .35, cy - cr * .4, cr * .35, 0, TAU); c.fill();
      if (o.seed > .6) { c.fillStyle = '#ff4d5a'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(o.x + Math.cos(i * 2.1 + o.seed * 7) * cr * .55, cy + Math.sin(i * 2.1) * cr * .45, 4.5 * s, 0, TAU); c.fill(); } }
    } else if (o.type === 'rock') {
      const r = o.r; c.fillStyle = '#9aa1a9'; c.strokeStyle = '#5f666e'; c.lineWidth = 3 * s;
      c.beginPath(); c.moveTo(o.x - r * 1.1, o.y); c.quadraticCurveTo(o.x - r * 1.2, o.y - r * 1.2, o.x - r * .2, o.y - r * 1.35); c.quadraticCurveTo(o.x + r * 1.1, o.y - r * 1.3, o.x + r * 1.15, o.y); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(o.x - r * .35, o.y - r * .9, r * .3, r * .15, -.3, 0, TAU); c.fill();
    } else if (o.type === 'fence') {
      const hgt = 30 * s, n = Math.max(3, Math.round(o.w / (16 * s))); c.fillStyle = '#f4e3c1'; c.strokeStyle = '#a07845'; c.lineWidth = 2.5 * s;
      c.beginPath(); c.rect(o.x - o.w / 2, o.y - hgt * .75, o.w, 6 * s); c.rect(o.x - o.w / 2, o.y - hgt * .35, o.w, 6 * s); c.fill(); c.stroke();
      for (let i = 0; i < n; i++) { const px = o.x - o.w / 2 + i * o.w / (n - 1) - 5 * s; c.beginPath(); c.moveTo(px, o.y); c.lineTo(px, o.y - hgt + 5 * s); c.lineTo(px + 5 * s, o.y - hgt); c.lineTo(px + 10 * s, o.y - hgt + 5 * s); c.lineTo(px + 10 * s, o.y); c.closePath(); c.fill(); c.stroke(); }
    } else if (o.type === 'flowers') {
      for (let i = 0; i < 5; i++) { const fx = o.x + Math.cos(i * 1.3 + o.seed * 5) * 14 * s, fy = o.y - Math.abs(Math.sin(i * 1.9)) * 10 * s; c.strokeStyle = '#2f7d32'; c.lineWidth = 2 * s; c.beginPath(); c.moveTo(fx, fy + 10 * s); c.lineTo(fx, fy); c.stroke(); c.fillStyle = ['#ff6b9a', '#ffd166', '#fff', '#c77dff'][(i + Math.floor(o.seed * 4)) % 4]; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(fx + Math.cos(k * TAU / 5) * 3.5 * s, fy + Math.sin(k * TAU / 5) * 3.5 * s, 3 * s, 0, TAU); c.fill(); } c.fillStyle = '#ffb703'; c.beginPath(); c.arc(fx, fy, 2.2 * s, 0, TAU); c.fill(); }
    } else if (o.type === 'pond') {
      c.fillStyle = '#7a5a3a'; c.beginPath(); c.ellipse(o.x, o.y - o.ry, o.rx + 5 * s, o.ry + 4 * s, 0, 0, TAU); c.fill();
      c.fillStyle = '#5ab4e5'; c.beginPath(); c.ellipse(o.x, o.y - o.ry, o.rx, o.ry, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2 * s; c.beginPath(); c.ellipse(o.x - o.rx * .2, o.y - o.ry * 1.2, o.rx * .4, o.ry * .25, 0, PI * 1.1, PI * 1.9); c.stroke();
      c.font = `${Math.round(28 * s)}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText('🦆', o.x + o.rx * .3, o.y - o.ry * 1.1);
    } else if (o.type === 'house') {
      const x0 = o.x - o.w / 2, y0 = o.y - o.h;
      c.lineWidth = 3 * s; c.strokeStyle = '#3b2a1a';
      c.fillStyle = o.col; c.beginPath(); c.rect(x0, y0, o.w, o.h); c.fill(); c.stroke();
      c.fillStyle = o.roof; c.beginPath(); c.moveTo(x0 - 10 * s, y0 + 2 * s); c.lineTo(o.x, y0 - o.h * .62); c.lineTo(x0 + o.w + 10 * s, y0 + 2 * s); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#8d5a32'; c.beginPath(); c.roundRect(o.x - o.w * .1, o.y - o.h * .45, o.w * .2, o.h * .45, [8 * s, 8 * s, 0, 0]); c.fill(); c.stroke();
      c.fillStyle = '#ffd166'; c.beginPath(); c.arc(o.x + o.w * .05, o.y - o.h * .22, 2.5 * s, 0, TAU); c.fill();
      for (const side of [-1, 1]) {
        const ws = o.w * .24, wx = o.x + side * o.w * .26 - ws / 2, wy = o.y - o.h * .55 - ws / 2;
        c.fillStyle = '#bde0fe'; c.fillRect(wx, wy, ws, ws);
        const a = o.animal && !o.animal.found && o.animal.win && Math.abs(o.animal.win.x - wx) < 1 ? o.animal : null;
        if (a) { c.save(); c.beginPath(); c.rect(wx, wy, ws, ws); c.clip(); drawAnimal(c, a); c.restore(); }
        c.strokeStyle = '#fff'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(wx + ws / 2, wy); c.lineTo(wx + ws / 2, wy + ws); c.moveTo(wx, wy + ws * .45); c.lineTo(wx + ws, wy + ws * .45); c.stroke();
        c.strokeStyle = '#3b2a1a'; c.strokeRect(wx, wy, ws, ws);
      }
    }
  }
  function renderLayer() {
    layer = document.createElement('canvas'); layer.width = Math.round(world.w * q); layer.height = Math.round(world.h * q);
    const c = layer.getContext('2d'); c.scale(q, q);
    const g = c.createLinearGradient(0, 0, 0, world.h); g.addColorStop(0, '#9ee27a'); g.addColorStop(1, '#6cc25a'); c.fillStyle = g; c.fillRect(0, 0, world.w, world.h);
    let seed = level * 97 + 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < world.w * world.h / (9000 * s * s); i++) { c.fillStyle = rnd() < .5 ? 'rgba(255,255,255,.08)' : 'rgba(0,80,0,.07)'; c.beginPath(); c.ellipse(rnd() * world.w, rnd() * world.h, (20 + rnd() * 40) * s, (8 + rnd() * 14) * s, 0, 0, TAU); c.fill(); }
    /* camino */
    const pts = []; for (let x = -50 * s; x <= world.w + 50 * s; x += 160 * s) pts.push([x, world.h * (.35 + rnd() * .4)]);
    for (const [w, col] of [[44 * s, '#d9b77a'], [34 * s, '#ecd39f']]) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } c.stroke(); }
    c.strokeStyle = 'rgba(30,90,20,.35)'; c.lineWidth = 2 * s; c.lineCap = 'round';
    for (let i = 0; i < world.w * world.h / (2500 * s * s); i++) { const x = rnd() * world.w, y = rnd() * world.h, h = (4 + rnd() * 5) * s; c.beginPath(); c.moveTo(x - 3 * s, y); c.lineTo(x - 4 * s, y - h); c.moveTo(x, y); c.lineTo(x, y - h * 1.2); c.moveTo(x + 3 * s, y); c.lineTo(x + 4 * s, y - h); c.stroke(); }
    for (const o of objs) {
      c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(o.x, o.y, (o.type === 'house' ? o.w * .55 : o.type === 'fence' ? o.w * .5 : o.fp * .7), 7 * s, 0, 0, TAU); c.fill();
      const a = o.animal && !o.animal.found ? o.animal : null;
      if (a && o.type !== 'house') drawAnimal(c, a);
      drawObj(c, o);
    }
  }

  /* ---------- encontrar ---------- */
  function slotPos(i) { const n = total, gap = Math.min(46 * s, (W - 40) / n), x0 = W / 2 - gap * (n - 1) / 2; return { x: x0 + i * gap, y: 30 * s, gap }; }
  function tap(sx, sy) {
    const wx = sx + cam.x, wy = sy + cam.y; idle = 0;
    let best = null, bd = 1e9;
    for (const a of animals) { if (a.found) continue; const d = Math.hypot(a.hx - wx, a.hy - wy); if (d < a.hr && d < bd) { best = a; bd = d; } }
    if (!best) return;
    if (!best.target) {
      wiggles.push({ a: best, t: 0 }); App.sfx.no();
      App.say(`Ese es un ${KINDS[best.kind][1]}. ¡Busca ${KINDS[kind][2]}!`);
      return;
    }
    best.found = true; const idx = found++;
    renderLayer();
    const sp = slotPos(idx);
    anims.push({ a: best, t: 0, sx: best.x - cam.x, sy: best.y - cam.y, ex: sp.x, ey: sp.y, done: false });
    for (let i = 0; i < 14; i++) { const ang = R() * TAU, v = (100 + R() * 200) * s; sparkles.push({ x: best.hx, y: best.hy, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, t: 0, life: .6 + R() * .4, c: ['#ffd21f', '#fff', '#ff6b9a'][i % 3] }); }
    if (kind === 'gato') meow(); else App.sfx.yes();
    const left = total - found;
    if (ui.onFound) ui.onFound(found, total);
    if (left === 0) {
      ending = true;
      App.say(`¡Has encontrado ${total === 1 ? 'el' : 'todos los'} ${KINDS[kind][2]}!`);
      setTimeout(() => App.win(() => { level++; S.hideLevel = level; App.saveSettings(); build(level); }, `¡Nivel ${level} superado!`, 'Siguiente'), 1300);
    } else App.say(`¡Un ${KINDS[kind][1]}! Quedan ${left}.`);
  }
  function hint() {
    const rest = animals.filter(a => a.target && !a.found); if (!rest.length) return;
    const cx = cam.x + W / 2, cy = cam.y + H / 2;
    const a = rest.sort((p, r) => Math.hypot(p.hx - cx, p.hy - cy) - Math.hypot(r.hx - cx, r.hy - cy))[0];
    camGo = { x: clamp(a.hx - W / 2, 0, MX()), y: clamp(a.hy - H / 2, 0, MY()) };
    sparkles.push({ ring: true, x: a.hx, y: a.hy, t: 0, life: 2.6, r: a.hr });
    App.sfx.flip(); idle = 0;
  }

  /* ---------- entrada ---------- */
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); const r = cv.getBoundingClientRect();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX - r.left, sy: e.clientY - r.top, moved: false, lt: performance.now() };
    cam.vx = cam.vy = 0; camGo = null;
    try { cv.setPointerCapture(e.pointerId); } catch (_) { }
  });
  cv.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx - cv.getBoundingClientRect().left, e.clientY - drag.sy - cv.getBoundingClientRect().top) > 9) drag.moved = true;
    if (drag.moved) {
      const now = performance.now(), dt = Math.max(1, now - drag.lt) / 1000;
      cam.x = clamp(cam.x - dx, 0, MX()); cam.y = clamp(cam.y - dy, 0, MY());
      cam.vx = -dx / dt * .8; cam.vy = -dy / dt * .8; drag.lt = now;
    }
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const up = e => {
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.moved) { cam.vx = cam.vy = 0; tap(drag.sx, drag.sy); }
    else if (performance.now() - drag.lt > 80) { cam.vx = cam.vy = 0; }
    drag = null;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  /* ---------- animación ---------- */
  function update(dt) {
    t0 += dt; idle += dt;
    if (!drag) {
      if (camGo) { cam.x += (camGo.x - cam.x) * Math.min(1, dt * 5); cam.y += (camGo.y - cam.y) * Math.min(1, dt * 5); if (Math.hypot(camGo.x - cam.x, camGo.y - cam.y) < 1) camGo = null; }
      else if (Math.abs(cam.vx) + Math.abs(cam.vy) > 5) { cam.x = clamp(cam.x + cam.vx * dt, 0, MX()); cam.y = clamp(cam.y + cam.vy * dt, 0, MY()); const k = Math.pow(.04, dt); cam.vx *= k; cam.vy *= k; }
    }
    for (const a of anims) { a.t += dt; if (a.t > 1.05) a.done = true; }
    anims = anims.filter(a => !a.done || false);
    for (const sp of sparkles) { sp.t += dt; if (!sp.ring) { sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 300 * s * dt; } }
    sparkles = sparkles.filter(sp => sp.t < sp.life);
    for (const w of wiggles) w.t += dt; wiggles = wiggles.filter(w => w.t < .6);
    if (idle > 20 && !ending) { idle = 0; const rest = animals.filter(a => a.target && !a.found); if (rest.length) { const a = App.pick(rest); sparkles.push({ ring: true, x: a.hx, y: a.hy, t: 0, life: 2.2, r: a.hr, soft: true }); } }
  }
  function star(c, x, y, r, rot, fill) { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fillStyle = fill; c.fill(); c.restore(); }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cam.x = clamp(cam.x, 0, MX()); cam.y = clamp(cam.y, 0, MY());
    if (layer) ctx.drawImage(layer, cam.x * q, cam.y * q, W * q, H * q, 0, 0, W, H);
    for (const w of wiggles) {
      const a = w.a, k = Math.sin(w.t * 40) * (1 - w.t / .6);
      ctx.save(); ctx.translate(-cam.x, -cam.y);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(a.hx, a.hy, a.hr * .9, 0, TAU); ctx.fill();
      ctx.translate(a.hx, a.hy); ctx.rotate(k * .3); ctx.font = `${Math.round(a.size)}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(a.emoji, 0, 0);
      ctx.restore();
    }
    for (const sp of sparkles) {
      const x = sp.x - cam.x, y = sp.y - cam.y;
      if (sp.ring) {
        const k = sp.t / sp.life, pulse = 1 + Math.sin(sp.t * 8) * .12;
        ctx.strokeStyle = `rgba(255,255,255,${(sp.soft ? .6 : .95) * (1 - k * .6)})`; ctx.lineWidth = 5 * s;
        ctx.beginPath(); ctx.arc(x, y, sp.r * 1.4 * pulse, 0, TAU); ctx.stroke();
        for (let i = 0; i < 4; i++) { const a = sp.t * 2 + i * TAU / 4; star(ctx, x + Math.cos(a) * sp.r * 1.6, y + Math.sin(a) * sp.r * 1.6, 7 * s, a, '#ffd21f'); }
        if (!sp.soft && (x < 0 || x > W || y < 0 || y > H)) drawArrow(x, y);
      } else { ctx.globalAlpha = clamp(1 - sp.t / sp.life, 0, 1); star(ctx, x, y, 6 * s, sp.t * 6, sp.c); ctx.globalAlpha = 1; }
    }
    /* marcador de arriba */
    const p0 = slotPos(0), pad = 10 * s;
    ctx.fillStyle = 'rgba(255,248,230,.92)'; ctx.beginPath(); ctx.roundRect(p0.x - p0.gap / 2 - pad, 8 * s, p0.gap * total + pad * 2, 44 * s, 22 * s); ctx.fill();
    ctx.font = `${Math.round(30 * s)}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    const flyingIdx = new Set(anims.map(a => animals.filter(x => x.target && x.found).indexOf(a.a)));
    for (let i = 0; i < total; i++) { const p = slotPos(i); ctx.globalAlpha = i < found && !flyingIdx.has(i) ? 1 : .22; ctx.fillText(KINDS[kind][0], p.x, p.y + 2 * s); }
    ctx.globalAlpha = 1;
    /* animales encontrados: saltan y vuelan al marcador */
    for (const a of anims) {
      let x, y, sc;
      if (a.t < .45) { const k = a.t / .45; x = a.sx; y = a.sy - Math.sin(k * PI) * 50 * s; sc = 1 + .8 * easeOutBack(Math.min(1, k * 1.6)); }
      else { const k = clamp((a.t - .45) / .6, 0, 1), e = k * k * (3 - 2 * k); x = a.sx + (a.ex - a.sx) * e; y = a.sy + (a.ey - a.sy) * e - Math.sin(e * PI) * 40 * s; sc = 1.8 - (1.8 - 30 * s / a.a.size) * e; }
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(a.t * 18) * .15); ctx.font = `${Math.round(a.a.size * sc)}px ${EMOJI_FONT}`; ctx.fillText(a.a.emoji, 0, 0); ctx.restore();
    }
  }
  function drawArrow(x, y) {
    const cx = W / 2, cy = H / 2, ang = Math.atan2(y - cy, x - cx), ex = clamp(x, 30 * s, W - 30 * s), ey = clamp(y, 70 * s, H - 30 * s);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang); ctx.fillStyle = '#ff5d6c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(18 * s, 0); ctx.lineTo(-10 * s, -14 * s); ctx.lineTo(-10 * s, 14 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function frame(ts) { if (!running) return; const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; if (built) { update(dt); draw(); } raf = requestAnimationFrame(frame); }
  const ro = new ResizeObserver(() => { if (running) resize(); }); ro.observe(wrap);

  return {
    start() { level = S.hideLevel || 1; built = false; running = true; resize(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    hint,
    _debug: { get animals() { return animals; }, get cam() { return cam; }, get level() { return level; }, tap }
  };
};
