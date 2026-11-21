/* JUEGO: GUSANITOS (99 niveles)
   Arrastra cada gusanito por la cabeza o por la cola hasta el agujero de su color.
   Los gusanos no pueden atravesarse entre ellos ni salirse del tablero.
   Cada nivel se genera con una semilla fija y SIEMPRE tiene solución: el tablero se construye
   al revés (los gusanos salen de su agujero y se mueven al azar), y como todos los movimientos
   se pueden deshacer, deshaciendo ese camino se gana.
   Dificultad: tableros más grandes y con huecos, más gusanos, más largos y más enredados. */
App.registerGame({
  id: 'snakes', title: 'Gusanitos', color: '#5b6bd6', order: 7,
  art: '<svg viewBox="0 0 120 100"><path d="M24 74h34V40h38" fill="none" stroke="#1e7a2f" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 74h34V40h38" fill="none" stroke="#7ed957" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><circle cx="92" cy="34" r="6" fill="#fff"/><circle cx="92" cy="46" r="6" fill="#fff"/><circle cx="94" cy="34" r="3" fill="#222"/><circle cx="94" cy="46" r="3" fill="#222"/><circle cx="22" cy="40" r="12" fill="#1e7a2f"/><circle cx="22" cy="40" r="7" fill="#123"/></svg>',

  html: () => `
    <div class="bar">${App.homeBtn()}
      <button class="stars snlvl" aria-label="Elegir nivel">Nivel 1</button>
      <span class="sp"></span>
      <button class="ib snundo" aria-label="Deshacer">${App.icon('undo')}</button>
      <button class="ib snreset" aria-label="Empezar otra vez">${App.icon('replay')}</button>
    </div>
    <div class="snstage"><canvas class="sncv"></canvas></div>
    <div class="sheet snsheet"><div class="panel">
      <h2>Elige nivel</h2>
      <div class="mjgrid sngrid"></div>
      <div class="row"><button class="btn ghost" data-close>Cerrar</button></div>
    </div></div>`,

  init(el) {
    const S = App.settings, q = s => el.querySelector(s);
    if (!S.snLevel) S.snLevel = 1;
    if (!S.snMax) S.snMax = 1;
    const wrap = q('.snstage'), cv = q('.sncv'), ctx = cv.getContext('2d'), lvlBtn = q('.snlvl');
    const MAXL = 99, PI = Math.PI, TAU = PI * 2;
    const COLORS = [['#7ed957', '#2f8f3a'], ['#3d8bff', '#1f4fb8'], ['#ff6fb5', '#b8336f'], ['#ffa62b', '#c46a00'], ['#a77bff', '#5b33b8'], ['#ffd21f', '#b38f00']];
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let level = S.snLevel, cols = 0, rows = 0, mask = [], holes = [], snakes = [], start = null, hist = [], solution = [];
    let W = 0, H = 0, dpr = 1, cell = 40, ox = 0, oy = 0, raf = 0, last = 0, running = false, drag = null, won = false, t0 = 0;

    function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    const key = (x, y) => x + ',' + y;
    const same = (a, b) => a[0] === b[0] && a[1] === b[1];

    function params(L) {
      return {
        cols: Math.min(8, 4 + Math.floor(L / 14)), rows: Math.min(10, 5 + Math.floor(L / 11)),
        n: Math.min(6, 1 + Math.floor((L + 2) / 8)),
        len: Math.min(6, 3 + Math.floor(L / 22)),
        scramble: Math.round(8 + L * 2.2),
        gaps: Math.min(.1, L * .0016)
      };
    }

    /* ---------- reglas ---------- */
    const inBoard = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && mask[y][x];
    function occupied(list, x, y, except) {
      for (const s of list) { if (s.gone || s === except) continue; for (const b of s.body) if (b[0] === x && b[1] === y) return true; }
      return false;
    }
    /* ¿puede el extremo "end" (0 cabeza, 1 cola) de la serpiente s ir a la casilla c? */
    function canMove(list, s, end, c) {
      if (!inBoard(c[0], c[1])) return false;
      const lead = end === 0 ? s.body[0] : s.body[s.body.length - 1];
      if (Math.abs(lead[0] - c[0]) + Math.abs(lead[1] - c[1]) !== 1) return false;
      if (occupied(list, c[0], c[1], s)) return false;
      const vac = end === 0 ? s.body[s.body.length - 1] : s.body[0];
      for (const b of s.body) if (same(b, c) && !(same(b, vac) && s.body.length >= 4)) return false;
      return true;
    }
    function doMove(s, end, c) {
      const vac = end === 0 ? s.body[s.body.length - 1] : s.body[0];
      s.body = end === 0 ? [c.slice(), ...s.body.slice(0, -1)] : [...s.body.slice(1), c.slice()];
      return vac;
    }
    const atHole = s => same(s.body[0], s.hole) ? 0 : same(s.body[s.body.length - 1], s.hole) ? 1 : -1;

    /* ---------- generar nivel (al revés) ---------- */
    function generate(L) {
      const P = params(L);
      for (let attempt = 0; attempt < 60; attempt++) {
        const r = rng(L * 104729 + attempt * 7 + 3);
        cols = P.cols; rows = P.rows;
        mask = Array.from({ length: rows }, () => Array(cols).fill(true));
        /* huecos en el tablero, sin partirlo en trozos */
        const gapsN = Math.round(cols * rows * P.gaps);
        for (let g = 0, tries = 0; g < gapsN && tries < 200; tries++) {
          const x = Math.floor(r() * cols), y = Math.floor(r() * rows); if (!mask[y][x]) continue;
          mask[y][x] = false; if (connected()) g++; else mask[y][x] = true;
        }
        const cells = []; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (mask[y][x]) cells.push([x, y]);
        const edge = cells.filter(([x, y]) => DIRS.some(([dx, dy]) => !inBoard(x + dx, y + dy)));
        const pool = (edge.length >= P.n ? edge : cells).slice();
        holes = [];
        for (let i = 0; i < P.n; i++) {
          let hc = null;
          for (let k = 0; k < 40 && !hc; k++) { const c = pool[Math.floor(r() * pool.length)]; if (!holes.some(h => Math.abs(h[0] - c[0]) + Math.abs(h[1] - c[1]) < 2)) hc = c; }
          if (!hc) break; holes.push(hc);
        }
        if (holes.length < P.n) continue;
        const list = [], ops = [];
        let ok = true;
        const randomMove = () => {
          const t = list[Math.floor(r() * list.length)], end = r() < .5 ? 0 : 1;
          const lead = end === 0 ? t.body[0] : t.body[t.body.length - 1], d = DIRS[Math.floor(r() * 4)], c = [lead[0] + d[0], lead[1] + d[1]];
          if (!canMove(list, t, end, c)) return false;
          const vac = doMove(t, end, c); ops.push({ s: t.c, end, vac }); return true;
        };
        const freeAround = h => DIRS.some(([dx, dy]) => inBoard(h[0] + dx, h[1] + dy) && !occupied(list, h[0] + dx, h[1] + dy));
        for (let i = 0; i < P.n && ok; i++) {
          /* si el agujero de este gusano está tapado, mover a los demás hasta despejarlo */
          for (let m = 0; m < 800 && list.length && (occupied(list, holes[i][0], holes[i][1]) || !freeAround(holes[i])); m++) randomMove();
          const len = Math.max(2, P.len - (r() < .35 ? 1 : 0));
          /* sale del agujero: cabeza en el agujero y cuerpo por casillas libres */
          const isHole = (x, y) => holes.some(h => h[0] === x && h[1] === y);
          let body = null;
          for (let k = 0; k < 30 && !body; k++) {
            const b = [holes[i].slice()];
            while (b.length < len) {
              const [x, y] = b[b.length - 1];
              const opts = DIRS.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => inBoard(nx, ny) && !isHole(nx, ny) && !occupied(list, nx, ny) && !b.some(p => p[0] === nx && p[1] === ny));
              if (!opts.length) break; b.push(opts[Math.floor(r() * opts.length)]);
            }
            if (b.length === len) body = b;
          }
          if (!body || occupied(list, holes[i][0], holes[i][1])) { ok = false; break; }
          const s = { c: i, body, hole: holes[i], gone: false };
          list.push(s); ops.push({ emerge: i });
          /* moverlo todo al azar */
          const steps = Math.round(P.scramble / P.n) + 4;
          for (let m = 0, done = 0; m < steps * 4 && done < steps; m++) if (randomMove()) done++;
        }
        if (!ok) continue;
        /* el siguiente agujero tiene que quedar libre y ningún gusano puede empezar ya en su agujero */
        const tooEasy = () => list.some(s => atHole(s) >= 0) || (L >= 4 && list.some(s => Math.min(...[s.body[0], s.body[s.body.length - 1]].map(e => Math.abs(e[0] - s.hole[0]) + Math.abs(e[1] - s.hole[1]))) < 2));
        for (let m = 0; m < 1500 && tooEasy(); m++) randomMove();
        if (tooEasy()) continue;
        snakes = list.map(s => ({ ...s, body: s.body.map(p => p.slice()) }));
        solution = ops;
        return true;
      }
      return false;
    }
    function connected() {
      let first = null, total = 0;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (mask[y][x]) { total++; if (!first) first = [x, y]; }
      if (!first) return false;
      const seen = new Set([key(...first)]), st = [first];
      while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (inBoard(nx, ny) && !seen.has(key(nx, ny))) { seen.add(key(nx, ny)); st.push([nx, ny]); } } }
      return seen.size === total;
    }

    function load(L) {
      level = L; S.snLevel = L; App.saveSettings();
      if (!generate(L)) { snakes = []; }
      for (const s of snakes) { s.prev = s.body.map(p => p.slice()); s.t = 1; s.exit = 0; }
      start = snakes.map(s => s.body.map(p => p.slice()));
      hist = []; won = false; drag = null;
      lvlBtn.textContent = 'Nivel ' + L;
      layout();
    }
    function reset() { snakes.forEach((s, i) => { s.body = start[i].map(p => p.slice()); s.prev = s.body.map(p => p.slice()); s.t = 1; s.gone = false; s.exit = 0; }); hist = []; won = false; App.sfx.pop(); }

    /* ---------- sonidos ---------- */
    function tone(f0, f1, dur, type = 'sine', vol = .1) {
      const a = App.audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
    }
    const snd = { step: () => tone(420 + Math.random() * 80, 520, .05, 'triangle', .06), bump: () => tone(160, 110, .1, 'sine', .1), slurp: () => { tone(900, 160, .5, 'sine', .14); setTimeout(() => tone(500, 900, .08, 'triangle', .1), 480); } };

    /* ---------- disposición ---------- */
    function layout() {
      const r = wrap.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
      dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cell = Math.floor(Math.min((W - 28) / cols, (H - 28) / rows, 92));
      ox = (W - cell * cols) / 2; oy = (H - cell * rows) / 2;
    }
    const center = p => [ox + (p[0] + .5) * cell, oy + (p[1] + .5) * cell];

    /* ---------- arrastrar ---------- */
    function cellAt(x, y) { return [Math.floor((x - ox) / cell), Math.floor((y - oy) / cell)]; }
    cv.addEventListener('pointerdown', e => {
      if (won) return; e.preventDefault();
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, c = cellAt(x, y);
      let pick = null;
      for (const s of snakes) { if (s.gone || s.exit) continue; const i = s.body.findIndex(b => same(b, c)); if (i >= 0) { pick = { s, end: i < s.body.length / 2 ? 0 : 1 }; break; } }
      if (!pick) {
        /* tocar cerca de un extremo también vale */
        let best = null, bd = cell * .9;
        for (const s of snakes) { if (s.gone || s.exit) continue; for (const end of [0, 1]) { const p = center(end ? s.body[s.body.length - 1] : s.body[0]), d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = { s, end }; } } }
        pick = best;
      }
      if (!pick) return;
      try { cv.setPointerCapture(e.pointerId); } catch (_) { }
      drag = { id: e.pointerId, s: pick.s, end: pick.end, stack: [], fx: x, fy: y, moved: false };
      hist.push(snakes.map(s => ({ body: s.body.map(p => p.slice()), gone: s.gone })));
      App.sfx.pop();
    });
    cv.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; drag.fx = x; drag.fy = y;
      const s = drag.s; if (s.exit || s.gone) return;
      for (let guard = 0; guard < 12; guard++) {
        const target = cellAt(x, y), lead = drag.end === 0 ? s.body[0] : s.body[s.body.length - 1];
        if (same(target, lead)) break;
        /* volver atrás por donde ha venido */
        const behind = drag.end === 0 ? s.body[1] : s.body[s.body.length - 2];
        if (behind && same(target, behind) && drag.stack.length) { animate(s); s.body = drag.stack.pop(); snd.step(); continue; }
        const dx = target[0] - lead[0], dy = target[1] - lead[1];
        const tryDirs = Math.abs(dx) >= Math.abs(dy) ? [[Math.sign(dx), 0], [0, Math.sign(dy)]] : [[0, Math.sign(dy)], [Math.sign(dx), 0]];
        let moved = false;
        for (const [ddx, ddy] of tryDirs) {
          if (!ddx && !ddy) continue;
          const c = [lead[0] + ddx, lead[1] + ddy];
          if (canMove(snakes, s, drag.end, c)) { drag.stack.push(s.body.map(p => p.slice())); animate(s); doMove(s, drag.end, c); drag.moved = true; moved = true; snd.step(); break; }
        }
        if (!moved) { if (!drag.bumped) { snd.bump(); drag.bumped = true; } break; }
        drag.bumped = false;
        if (atHole(s) >= 0) { startExit(s, atHole(s)); drag = null; return; }
      }
    });
    const up = e => { if (!drag || drag.id !== e.pointerId) return; if (!drag.moved) hist.pop(); drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    function animate(s) { s.prev = renderPts(s).map(p => p.slice()); s.t = 0; }
    function renderPts(s) {
      const k = Math.min(1, s.t), e = k * (2 - k);
      return s.body.map((b, i) => { const p = (s.prev && s.prev[i]) || b; return [p[0] + (b[0] - p[0]) * e, p[1] + (b[1] - p[1]) * e]; });
    }
    function startExit(s, end) {
      s.exit = 1; s.exitEnd = end; s.exitT = 0; snd.slurp();
      App.say(App.pick(['¡Muy bien!', '¡Adentro!', '¡Bien!']));
    }

    q('.snundo').addEventListener('click', () => {
      const h = hist.pop(); if (!h) { App.sfx.no(); return; }
      snakes.forEach((s, i) => { animate(s); s.body = h[i].body; s.gone = h[i].gone; s.exit = 0; });
      won = false; App.sfx.pop();
    });
    q('.snreset').addEventListener('click', reset);

    /* ---------- animación y dibujo ---------- */
    function update(dt) {
      t0 += dt;
      for (const s of snakes) {
        if (s.t < 1) s.t += dt / .09;
        if (s.exit && !s.gone) {
          s.exitT += dt;
          if (s.exitT > .06) {
            s.exitT = 0; animate(s);
            s.body = s.exitEnd === 0 ? [s.hole.slice(), ...s.body.slice(0, -1)] : [...s.body.slice(1), s.hole.slice()];
            if (s.body.every(b => same(b, s.hole))) { s.gone = true; s.exit = 0; const p = center(s.hole), r = cv.getBoundingClientRect(); App.confetti(30, r.left + p[0], r.top + p[1]); }
          }
        }
      }
      if (!won && snakes.length && snakes.every(s => s.gone)) {
        won = true;
        if (level >= S.snMax) S.snMax = Math.min(MAXL, level + 1); App.saveSettings();
        setTimeout(() => App.win(() => load(Math.min(MAXL, level + 1)), level >= MAXL ? '¡Has terminado los 99 niveles!' : `¡Nivel ${level} superado!`, level >= MAXL ? 'Otra vez' : 'Siguiente'), 500);
      }
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    function drawBoard() {
      ctx.fillStyle = '#262b45'; ctx.fillRect(0, 0, W, H);
      const g = cell * .06;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (!mask[y][x]) continue;
        const px = ox + x * cell, py = oy + y * cell;
        ctx.fillStyle = '#aab3d9'; roundRect(px + g, py + g * 1.6, cell - g * 2, cell - g * 2, cell * .14); ctx.fill();
        ctx.fillStyle = '#e4e9fb'; roundRect(px + g, py + g, cell - g * 2, cell - g * 2.4, cell * .14); ctx.fill();
      }
      for (const s of snakes) {
        const [hx, hy] = center(s.hole), [col, dark] = COLORS[s.c], R = cell * .34;
        const near = !s.gone && [s.body[0], s.body[s.body.length - 1]].some(e => Math.abs(e[0] - s.hole[0]) + Math.abs(e[1] - s.hole[1]) === 1);
        const pulse = near ? 1 + Math.sin(t0 * 8) * .06 : 1;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy, R * pulse, 0, TAU); ctx.fill();
        ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(hx, hy, R * .78 * pulse, 0, TAU); ctx.fill();
        const gr = ctx.createRadialGradient(hx, hy - R * .2, R * .1, hx, hy, R * .7); gr.addColorStop(0, '#0d1022'); gr.addColorStop(1, dark);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(hx, hy + R * .06, R * .62 * pulse, 0, TAU); ctx.fill();
        if (s.gone) { ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(R)}px "Baloo 2",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', hx, hy + 1); }
      }
    }
    function drawSnake(s, lifted) {
      const pts = renderPts(s).map(center), [col, dark] = COLORS[s.c], w = cell * .62 * (lifted ? 1.06 : 1);
      if (s.exit) { ctx.save(); const [hx, hy] = center(s.hole); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(hx, hy, cell * .26, 0, TAU, true); ctx.clip('evenodd'); }
      const path = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (pts.length === 1 || pts.every(p => p[0] === pts[0][0] && p[1] === pts[0][1])) ctx.lineTo(pts[0][0] + .1, pts[0][1]); };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (lifted) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = w + 8; ctx.save(); ctx.translate(0, cell * .08); path(); ctx.stroke(); ctx.restore(); }
      ctx.strokeStyle = dark; ctx.lineWidth = w + cell * .08; path(); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = w; path(); ctx.stroke();
      ctx.save(); ctx.translate(-cell * .05, -cell * .08); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = w * .28; path(); ctx.stroke(); ctx.restore();
      /* punta de la cola */
      const n = pts.length;
      if (n >= 2) {
        const [tx, ty] = pts[n - 1], [px, py] = pts[n - 2], a = Math.atan2(ty - py, tx - px);
        if (Math.hypot(tx - px, ty - py) > 1) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(a); ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(w * .32, 0); ctx.lineTo(-w * .12, -w * .24); ctx.lineTo(-w * .12, w * .24); ctx.closePath(); ctx.fill(); ctx.restore(); }
      }
      /* ojos en la cabeza */
      const [hx, hy] = pts[0], nx = pts[1] || [hx - 1, hy], a = Math.atan2(hy - nx[1], hx - nx[0]);
      const look = drag && drag.s === s ? Math.atan2(drag.fy - hy, drag.fx - hx) : Math.atan2(center(s.hole)[1] - hy, center(s.hole)[0] - hx);
      for (const side of [-1, 1]) {
        const ex = hx + Math.cos(a) * w * .12 + Math.cos(a + PI / 2) * side * w * .26, ey = hy + Math.sin(a) * w * .12 + Math.sin(a + PI / 2) * side * w * .26, er = w * .22;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1b1b2a'; ctx.beginPath(); ctx.arc(ex + Math.cos(look) * er * .38, ey + Math.sin(look) * er * .38, er * .5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + Math.cos(look) * er * .38 - er * .15, ey + Math.sin(look) * er * .38 - er * .15, er * .16, 0, TAU); ctx.fill();
      }
      if (s.exit) ctx.restore();
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBoard();
      for (const s of snakes) if (!s.gone && !(drag && drag.s === s)) drawSnake(s, false);
      if (drag && !drag.s.gone) drawSnake(drag.s, true);
    }
    function frame(ts) { if (!running) return; const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; if (cols) { update(dt); draw(); } raf = requestAnimationFrame(frame); }
    const ro = new ResizeObserver(() => { if (el.classList.contains('on')) layout(); }); ro.observe(wrap);

    /* ---------- elegir nivel ---------- */
    const sheet = q('.snsheet');
    function openPicker() {
      let h = ''; for (let n = 1; n <= MAXL; n++) { const locked = n > S.snMax; h += `<button class="chip${n === level ? ' on' : ''}${n < S.snMax ? ' done' : ''}" data-lv="${n}"${locked ? ' disabled' : ''}>${locked ? '🔒' : n}</button>`; }
      q('.sngrid').innerHTML = h; App.openSheet(sheet);
    }
    lvlBtn.addEventListener('click', openPicker);
    q('.sngrid').addEventListener('click', e => { const b = e.target.closest('[data-lv]'); if (!b || b.disabled) return; App.closeSheet(sheet); App.sfx.pop(); load(+b.dataset.lv); });

    this.begin = () => { if (!cols || level !== S.snLevel) load(S.snLevel || 1); else layout(); running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    this.end = () => { running = false; cancelAnimationFrame(raf); };
    /* para las pruebas: reproduce la solución guardada */
    this._debug = {
      generate, params, get snakes() { return snakes; }, get solution() { return solution; }, canMove, doMove, atHole, load,
      verify(L) {
        if (!generate(L)) return 'no-gen';
        const list = snakes.map(s => ({ ...s, body: s.body.map(p => p.slice()), gone: false }));
        const ops = solution.slice().reverse();
        for (const op of ops) {
          if (op.emerge !== undefined) { const s = list[op.emerge]; if (!s.gone) { if (atHole(s) < 0) return 'not-at-hole ' + op.emerge; s.gone = true; } continue; }
          const s = list[op.s]; if (s.gone) continue;
          const end = 1 - op.end;
          if (!canMove(list, s, end, op.vac)) return 'blocked';
          doMove(s, end, op.vac);
          if (atHole(s) >= 0) s.gone = true;
        }
        return list.every(s => s.gone) ? 'ok' : 'left';
      }
    };
  },

  start() { this.begin(); },
  stop() { this.end(); }
});
