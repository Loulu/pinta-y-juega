/* JUEGO: MAHJONG SOLITARIO (999 niveles)
   Se quitan parejas de fichas iguales que estén libres: sin ficha encima y con el lado
   izquierdo o el derecho despejado.
   Cada nivel se genera con una semilla fija (el nivel 37 siempre es el mismo) y SIEMPRE tiene
   solución: el tablero se construye simulando una partida completa que quita parejas libres.
   Dificultad: más fichas (de 12 a 144), más pisos (hasta 5) y más dibujos distintos.
   Al terminar: globos que se pueden explotar, fanfarria y "¡Muy bien!". */
App.registerGame({
  id: 'mahjong', title: 'Mahjong', color: '#e05fae', order: 6,
  art: '<svg viewBox="0 0 120 100"><g transform="rotate(-8 60 50)"><rect x="18" y="22" width="40" height="54" rx="7" fill="#c9b48a"/><rect x="14" y="18" width="40" height="54" rx="7" fill="#fffdf5"/><circle cx="34" cy="45" r="12" fill="#ff5d6c"/></g><g transform="rotate(8 60 50)"><rect x="66" y="22" width="40" height="54" rx="7" fill="#c9b48a"/><rect x="62" y="18" width="40" height="54" rx="7" fill="#fffdf5"/><circle cx="82" cy="45" r="12" fill="#ff5d6c"/></g></svg>',

  html: () => `
    <div class="bar">${App.homeBtn()}
      <button class="stars mjlvl" aria-label="Elegir nivel">Nivel 1</button>
      <span class="sp"></span>
      <button class="ib mjundo" aria-label="Deshacer">${App.icon('undo')}</button>
      <button class="ib mjmix" aria-label="Mezclar">${App.icon('replay')}</button>
      <button class="ib mjhint" aria-label="Pista">${App.icon('search')}</button>
    </div>
    <div class="mjboard"></div>
    <div class="mjwin" hidden><canvas class="mjfx"></canvas>
      <div class="mjcard"><div class="big">🏆</div><h2 class="mjwt">¡Nivel completado!</h2>
        <div class="row" style="justify-content:center"><button class="btn ghost mjpick">Niveles</button><button class="btn mjnext">Siguiente</button></div></div>
    </div>
    <div class="sheet mjsheet"><div class="panel">
      <h2>Elige nivel</h2>
      <div class="mjpages"><button class="ib mjprev" aria-label="Anteriores">‹</button><span class="mjrange"></span><button class="ib mjnextp" aria-label="Siguientes">›</button></div>
      <div class="mjgrid"></div>
      <div class="row"><button class="btn ghost" data-close>Cerrar</button></div>
    </div></div>`,

  init(el) {
    const S = App.settings, q = s => el.querySelector(s);
    if (!S.mjLevel) S.mjLevel = 1;
    if (!S.mjMax) S.mjMax = 1;
    const board = q('.mjboard'), lvlBtn = q('.mjlvl'), winEl = q('.mjwin'), fx = q('.mjfx'), fxc = fx.getContext('2d');
    const MAXL = 999;
    const FACES = ['🐱', '🐶', '🐰', '🐻', '🐼', '🦊', '🐸', '🐵', '🐷', '🐮', '🦁', '🐨', '🐔', '🐧', '🐤', '🦋', '🐞', '🐢', '🐟', '🐙', '🦄', '🍎', '🍌', '🍓', '🍇', '🍉', '🍒', '🍍', '🥕', '🌽', '🍄', '🌸', '🌻', '🌈', '⭐', '🌙', '🚗', '🚂', '⚽', '🎈', '🍦', '🧁'];
    let tiles = [], sel = null, history = [], level = S.mjLevel, busy = false, page = 0, builtLevel = 0;

    /* ---------- azar con semilla ---------- */
    function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    const shuffleR = (arr, r) => { arr = arr.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

    function params(L) {
      const pairs = Math.min(72, 6 + Math.floor(Math.sqrt(L) * 2.1));
      const layers = 1 + Math.min(4, Math.floor(L / 20));
      const types = Math.min(FACES.length, pairs, Math.max(3, Math.floor(pairs * .42 + L / 45)));
      return { pairs, layers, types };
    }

    /* ---------- reglas ---------- */
    const covers = (a, b) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
    function isFree(t, alive) {
      let left = false, right = false;
      for (const o of alive) {
        if (o === t) continue;
        if (o.z === t.z + 1 && covers(o, t)) return false;
        if (o.z === t.z && Math.abs(o.y - t.y) < 2) { if (o.x === t.x - 2) left = true; else if (o.x === t.x + 2) right = true; }
      }
      return !(left && right);
    }
    /* reparte dibujos simulando una partida: siempre queda una forma de ganar */
    function deal(positions, pairFaces, r) {
      for (let attempt = 0; attempt < 300; attempt++) {
        const alive = positions.slice(), faces = shuffleR(pairFaces, r), out = new Map();
        let ok = true;
        for (const f of faces) {
          const free = alive.filter(t => isFree(t, alive));
          if (free.length < 2) { ok = false; break; }
          const i = Math.floor(r() * free.length); let j = Math.floor(r() * (free.length - 1)); if (j >= i) j++;
          const a = free[i], b = free[j]; out.set(a, f); out.set(b, f);
          alive.splice(alive.indexOf(a), 1); alive.splice(alive.indexOf(b), 1);
        }
        if (ok) return out;
      }
      return null;
    }

    /* ---------- forma del tablero ---------- */
    function shape(L, n, layers, r, aspect) {
      const W8 = [1, .62, .38, .22, .12].slice(0, layers), sum = W8.reduce((a, b) => a + b, 0);
      const want = W8.map(w => Math.round(n * w / sum));
      const base = want[0] + 2;
      const cols = Math.max(2, Math.round(Math.sqrt(base * aspect))), rows = Math.max(2, Math.ceil(base / cols) + 1);
      const kind = Math.floor(r() * 5), cx = (cols - 1) / 2, cy = (rows - 1) / 2;
      const score = (i, j) => {
        const dx = (i - cx) / (cols / 2), dy = (j - cy) / (rows / 2);
        const sh = kind === 0 ? Math.max(Math.abs(dx), Math.abs(dy)) : kind === 1 ? Math.abs(dx) + Math.abs(dy) : kind === 2 ? Math.hypot(dx, dy) : kind === 3 ? Math.min(Math.abs(dx), Math.abs(dy)) * 1.6 + Math.max(Math.abs(dx), Math.abs(dy)) * .4 : Math.hypot(dx * .8, dy * 1.2);
        return sh;
      };
      const noise = {};
      const cells = [];
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const mi = cols - 1 - i, key = Math.min(i, mi) + ',' + j; if (noise[key] === undefined) noise[key] = r() * .25; cells.push({ i, j, s: score(i, j) + noise[key] }); }
      cells.sort((a, b) => a.s - b.s);
      let layer = cells.slice(0, Math.min(cells.length, want[0])).map(c => ({ x: c.i * 2, y: c.j * 2, z: 0 }));
      const all = layer.slice();
      for (let z = 1; z < layers; z++) {
        const cand = layer.map(t => ({ t, s: Math.hypot((t.x / 2 - cx) / (cols / 2), (t.y / 2 - cy) / (rows / 2)) + r() * .3 })).sort((a, b) => a.s - b.s);
        const k = Math.min(want[z], Math.floor(layer.length * .7));
        layer = cand.slice(0, k).map(c => ({ x: c.t.x, y: c.t.y, z }));
        all.push(...layer);
      }
      /* ajustar al número exacto de fichas */
      while (all.length > n) { let top = all.reduce((a, b) => b.z > a.z ? b : a); const idx = all.lastIndexOf(top); all.splice(idx, 1); }
      let extra = cells.slice(want[0]);
      while (all.length < n && extra.length) { const c = extra.shift(); all.push({ x: c.i * 2, y: c.j * 2, z: 0 }); }
      if (all.length % 2) all.pop();
      return all;
    }

    function build(L) {
      const P = params(L), r = rng(L * 7919 + 17);
      const rb = board.getBoundingClientRect(), aspect = rb.width && rb.height ? clampA((rb.width / (rb.height / 1.3))) : 1.2;
      let positions = null, assign = null;
      for (let tryN = 0; tryN < 20 && !assign; tryN++) {
        positions = shape(L, P.pairs * 2, Math.max(1, P.layers - Math.floor(tryN / 6)), r, aspect);
        const pairsN = positions.length / 2, faceSet = shuffleR(FACES, r).slice(0, P.types);
        const pairFaces = Array.from({ length: pairsN }, (_, i) => faceSet[i % faceSet.length]);
        assign = deal(positions, pairFaces, r);
      }
      tiles = positions.map((p, i) => ({ id: i, x: p.x, y: p.y, z: p.z, face: assign.get(p), alive: true, el: null }));
      sel = null; history = []; busy = false; builtLevel = L;
      render();
    }
    const clampA = a => Math.max(.55, Math.min(2.2, a));

    /* ---------- dibujar fichas ---------- */
    function render() {
      board.innerHTML = '';
      for (const t of tiles) {
        const b = document.createElement('button'); b.className = 'mj'; b.dataset.id = t.id; b.innerHTML = `<span>${t.face}</span>`;
        b.style.zIndex = t.z * 10000 + t.y * 60 + t.x; t.el = b; if (!t.alive) b.classList.add('gone'); board.appendChild(b);
      }
      place(); refresh();
      lvlBtn.textContent = 'Nivel ' + level;
    }
    function place() {
      const r = board.getBoundingClientRect(); if (!r.width || !tiles.length) return;
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, maxZ = 0;
      for (const t of tiles) { minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x); minY = Math.min(minY, t.y); maxY = Math.max(maxY, t.y); maxZ = Math.max(maxZ, t.z); }
      const across = (maxX - minX) / 2 + 1, down = (maxY - minY) / 2 + 1, pad = 14;
      const tw = Math.min(78, (r.width - pad * 2) / (across + maxZ * .1 + .15), (r.height - pad * 2) / ((down + maxZ * .1 + .2) * 1.3));
      const th = tw * 1.3, ox = tw * .1, oy = tw * .12;
      const bw = across * tw, bh = down * th, x0 = (r.width - bw) / 2 + maxZ * ox / 2, y0 = (r.height - bh) / 2 + maxZ * oy / 2;
      board.style.setProperty('--tw', tw + 'px');
      for (const t of tiles) {
        const e = t.el.style; e.width = (tw - 2) + 'px'; e.height = (th - 2) + 'px';
        e.left = (x0 + (t.x - minX) / 2 * tw - t.z * ox) + 'px'; e.top = (y0 + (t.y - minY) / 2 * th - t.z * oy) + 'px';
      }
    }
    const alive = () => tiles.filter(t => t.alive);
    function refresh() {
      const al = alive();
      for (const t of al) t.el.classList.toggle('blocked', !isFree(t, al));
    }
    function freePairs() {
      const al = alive(), free = al.filter(t => isFree(t, al)), by = {};
      for (const t of free) (by[t.face] = by[t.face] || []).push(t);
      return Object.values(by).filter(v => v.length >= 2);
    }

    /* ---------- sonidos ---------- */
    function tones(fs, type = 'triangle', dur = .25, gap = .08, vol = .16) {
      const a = App.audio(); if (!a) return; const t0 = a.currentTime;
      fs.forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(), t = t0 + i * gap; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02); });
    }
    const snd = {
      tap: () => tones([880], 'sine', .08, 0, .08),
      match: () => tones([1046, 1568], 'sine', .45, .07, .14),
      nope: () => tones([180], 'sine', .12, 0, .12),
      fanfare() {
        const a = App.audio(); if (!a) return; const t0 = a.currentTime;
        const notes = [[523, 0, .14], [659, .14, .14], [784, .28, .14], [1046, .44, .7], [784, .44, .7], [659, .44, .7]];
        for (const [f, d, len] of notes) {
          const o = a.createOscillator(), o2 = a.createOscillator(), fl = a.createBiquadFilter(), g = a.createGain(), t = t0 + d;
          o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f * 1.005; fl.type = 'lowpass'; fl.frequency.value = 2200;
          g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .03); g.gain.setValueAtTime(.09, t + len * .7); g.gain.exponentialRampToValueAtTime(.0001, t + len);
          o.connect(fl); o2.connect(fl); fl.connect(g).connect(a.destination); o.start(t); o2.start(t); o.stop(t + len + .02); o2.stop(t + len + .02);
        }
        /* aplausos suaves */
        const len = 1.6, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) { const clap = Math.random() < .002 ? 1 : 0; d[i] = (Math.random() * 2 - 1) * (clap ? 1 : .15) * Math.exp(-i / d.length * 2); }
        const n = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); n.buffer = buf; f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = .6; g.gain.value = .35;
        n.connect(f).connect(g).connect(a.destination); n.start(t0 + .5);
      },
      pop() { const a = App.audio(); if (!a) return; const t = a.currentTime, len = .08, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const n = a.createBufferSource(), g = a.createGain(); n.buffer = buf; g.gain.value = .5; n.connect(g).connect(a.destination); n.start(t); }
    };

    /* ---------- jugar ---------- */
    board.addEventListener('click', e => {
      const b = e.target.closest('.mj'); if (!b || busy || !winEl.hidden) return;
      const t = tiles[+b.dataset.id]; if (!t.alive) return;
      if (!isFree(t, alive())) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); snd.nope(); return; }
      if (sel === t) { t.el.classList.remove('sel'); sel = null; return; }
      if (sel && sel.face === t.face) {
        const a = sel; sel = null; a.el.classList.remove('sel');
        a.alive = t.alive = false; history.push([a, t]);
        a.el.classList.add('gone'); t.el.classList.add('gone'); snd.match();
        refresh(); after();
        return;
      }
      if (sel) sel.el.classList.remove('sel');
      sel = t; t.el.classList.add('sel'); snd.tap();
    });
    function after() {
      if (!alive().length) { setTimeout(win, 450); return; }
      if (!freePairs().length) { App.toast('No quedan parejas libres. ¡Vamos a mezclar!'); setTimeout(mix, 900); }
    }
    function mix() {
      const al = alive(); if (!al.length) return;
      const faces = []; const cnt = {}; for (const t of al) cnt[t.face] = (cnt[t.face] || 0) + 1;
      for (const [f, c] of Object.entries(cnt)) for (let i = 0; i < c / 2; i++) faces.push(f);
      const res = deal(al, faces, Math.random); if (!res) return;
      if (sel) { sel.el.classList.remove('sel'); sel = null; }
      for (const t of al) { t.face = res.get(t); t.el.classList.add('flip'); }
      setTimeout(() => { for (const t of al) t.el.querySelector('span').textContent = t.face; }, 150);
      setTimeout(() => { for (const t of al) t.el.classList.remove('flip'); }, 320);
      App.sfx.flip(); history = [];
    }
    function hint() {
      const p = freePairs(); if (!p.length) { mix(); return; }
      const [a, b] = p[0];
      for (const t of [a, b]) { t.el.classList.remove('hint'); void t.el.offsetWidth; t.el.classList.add('hint'); }
      setTimeout(() => { a.el.classList.remove('hint'); b.el.classList.remove('hint'); }, 1600);
      App.sfx.flip();
    }
    function undo() {
      const h = history.pop(); if (!h) { snd.nope(); return; }
      for (const t of h) { t.alive = true; t.el.classList.remove('gone'); }
      if (sel) { sel.el.classList.remove('sel'); sel = null; }
      refresh(); App.sfx.pop();
    }
    q('.mjhint').addEventListener('click', hint);
    q('.mjmix').addEventListener('click', mix);
    q('.mjundo').addEventListener('click', undo);

    /* ---------- victoria: globos ---------- */
    let balloons = [], bits = [], fxRaf = 0, fxLast = 0;
    const BCOL = ['#ff5d6c', '#ffd21f', '#3d7dff', '#2bd15a', '#8b5cf6', '#ff8c1a', '#ff6fb5', '#13a89c'];
    function win() {
      if (level >= S.mjMax) S.mjMax = Math.min(MAXL, level + 1);
      App.saveSettings();
      q('.mjwt').textContent = level >= MAXL ? '¡Has terminado los 999 niveles!' : `¡Nivel ${level} completado!`;
      q('.mjnext').hidden = level >= MAXL;
      winEl.hidden = false; snd.fanfare();
      setTimeout(() => App.say(App.kid() ? `¡Muy bien, ${App.kid()}!` : '¡Muy bien!'), 700);
      const r = winEl.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      fx.width = r.width * d; fx.height = r.height * d; fxc.setTransform(d, 0, 0, d, 0, 0);
      balloons = []; bits = [];
      for (let i = 0; i < 22; i++) balloons.push(newBalloon(r, true));
      fxLast = performance.now(); cancelAnimationFrame(fxRaf); fxRaf = requestAnimationFrame(fxFrame);
    }
    function newBalloon(r, first) {
      const s = 30 + Math.random() * 18;
      return { x: Math.random() * r.width, y: first ? r.height * (.35 + Math.random() * .95) : r.height + s * 2, r: s, vy: 90 + Math.random() * 90, sw: Math.random() * 6.28, c: BCOL[Math.floor(Math.random() * BCOL.length)] };
    }
    function fxFrame(ts) {
      if (winEl.hidden) return;
      const dt = Math.min(.05, (ts - fxLast) / 1000); fxLast = ts;
      const r = winEl.getBoundingClientRect(); fxc.clearRect(0, 0, r.width, r.height);
      for (const b of balloons) {
        b.y -= b.vy * dt; b.sw += dt * 1.6; const x = b.x + Math.sin(b.sw) * 14;
        if (b.y < -b.r * 4) Object.assign(b, newBalloon(r, false));
        fxc.strokeStyle = 'rgba(80,60,40,.6)'; fxc.lineWidth = 1.5; fxc.beginPath(); fxc.moveTo(x, b.y + b.r * 1.15);
        for (let k = 1; k <= 6; k++) fxc.lineTo(x + Math.sin(b.sw * 2 + k) * 5, b.y + b.r * 1.15 + k * b.r * .35); fxc.stroke();
        fxc.fillStyle = b.c; fxc.beginPath(); fxc.ellipse(x, b.y, b.r * .85, b.r, 0, 0, Math.PI * 2); fxc.fill();
        fxc.beginPath(); fxc.moveTo(x, b.y + b.r * .95); fxc.lineTo(x - b.r * .14, b.y + b.r * 1.17); fxc.lineTo(x + b.r * .14, b.y + b.r * 1.17); fxc.closePath(); fxc.fill();
        fxc.fillStyle = 'rgba(255,255,255,.45)'; fxc.beginPath(); fxc.ellipse(x - b.r * .3, b.y - b.r * .35, b.r * .16, b.r * .28, -.5, 0, Math.PI * 2); fxc.fill();
        b.px = x;
      }
      for (const p of bits) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.t += dt; fxc.globalAlpha = Math.max(0, 1 - p.t / .8); fxc.fillStyle = p.c; fxc.fillRect(p.x, p.y, 6, 4); }
      fxc.globalAlpha = 1; bits = bits.filter(p => p.t < .8);
      fxRaf = requestAnimationFrame(fxFrame);
    }
    fx.addEventListener('pointerdown', e => {
      const r = fx.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      for (const b of balloons) {
        if (Math.hypot((x - (b.px || b.x)) / .85, y - b.y) < b.r * 1.1) {
          for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, v = 80 + Math.random() * 200; bits.push({ x: b.px || b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0, c: b.c }); }
          snd.pop(); Object.assign(b, newBalloon(r, false)); break;
        }
      }
    });
    function closeWin() { winEl.hidden = true; cancelAnimationFrame(fxRaf); }
    q('.mjnext').addEventListener('click', () => { closeWin(); level = Math.min(MAXL, level + 1); S.mjLevel = level; App.saveSettings(); App.sfx.pop(); build(level); });
    q('.mjpick').addEventListener('click', () => { closeWin(); openPicker(); });

    /* ---------- elegir nivel ---------- */
    const PER = 60, sheet = q('.mjsheet');
    function renderPicker() {
      const from = page * PER + 1, to = Math.min(MAXL, from + PER - 1);
      q('.mjrange').textContent = `${from} – ${to}`;
      q('.mjprev').disabled = page === 0; q('.mjnextp').disabled = to >= MAXL;
      let h = '';
      for (let n = from; n <= to; n++) { const locked = n > S.mjMax; h += `<button class="chip${n === level ? ' on' : ''}${n < S.mjMax ? ' done' : ''}" data-lv="${n}"${locked ? ' disabled' : ''}>${locked ? '🔒' : n}</button>`; }
      q('.mjgrid').innerHTML = h;
    }
    function openPicker() { page = Math.floor((level - 1) / PER); renderPicker(); App.openSheet(sheet); }
    lvlBtn.addEventListener('click', openPicker);
    q('.mjprev').addEventListener('click', () => { if (page > 0) { page--; renderPicker(); } });
    q('.mjnextp').addEventListener('click', () => { if ((page + 1) * PER < MAXL) { page++; renderPicker(); } });
    q('.mjgrid').addEventListener('click', e => { const b = e.target.closest('[data-lv]'); if (!b || b.disabled) return; level = +b.dataset.lv; S.mjLevel = level; App.saveSettings(); App.closeSheet(sheet); App.sfx.pop(); build(level); });

    const ro = new ResizeObserver(() => { if (el.classList.contains('on')) place(); }); ro.observe(board);
    this.begin = () => { level = S.mjLevel || 1; if (!tiles.length || builtLevel !== level) build(level); else place(); };
    this._debug = { params, build, shape, deal, rng, FACES, get tiles() { return tiles; }, isFree, freePairs, win, alive: () => alive(), get level() { return level; } };
  },

  start() { this.begin(); },
  stop() { }
});
