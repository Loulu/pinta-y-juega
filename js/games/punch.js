/* JUEGO: ¡PUM!
   Una pistola de juguete dispara un guante de boxeo con muelle, como en los dibujos
   animados antiguos. Los monstruitos asoman por los agujeros; si les da, salen volando
   dando vueltas o se quedan aplastados y mareados. Si no les da, se esconden sacando la lengua.
   Cada 6 aciertos sube de nivel: más agujeros, más monstruos a la vez y más rápidos.
   Todo se dibuja en un canvas, sin imágenes. */
App.registerGame({
  id: 'punch', title: '¡Pum!', color: 'var(--violet)', order: 4,
  art: '<svg viewBox="0 0 120 100"><path d="M14 74l10-12 8 12 8-12 8 12 8-12 8 12" fill="none" stroke="#ffd21f" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><rect x="2" y="62" width="16" height="24" rx="4" fill="#ff5d6c"/><rect x="60" y="56" width="12" height="24" rx="4" fill="#fff"/><ellipse cx="88" cy="62" rx="24" ry="22" fill="#ff3b4e"/><ellipse cx="80" cy="42" rx="10" ry="7" fill="#ff3b4e" transform="rotate(-20 80 42)"/><ellipse cx="94" cy="52" rx="10" ry="6" fill="#fff" opacity=".45"/><path d="M98 8l3 9 9 1-7 6 2 9-7-5-8 5 2-9-7-6 9-1z" fill="#fff"/></svg>',

  html: () => `
    <div class="bar">${App.homeBtn()}<span class="sp"></span><span class="stars lvl">Nivel 1</span><span class="stars sc">⭐ 0</span></div>
    <div class="pstage"><canvas class="pcv"></canvas></div>`,

  init(el) {
    const wrap = el.querySelector('.pstage'), cv = el.querySelector('.pcv'), ctx = cv.getContext('2d');
    const lvlEl = el.querySelector('.lvl'), scEl = el.querySelector('.sc');
    const PI = Math.PI, TAU = PI * 2, R = Math.random;
    const OUT = .15, HOLD = .07, BACK = .24;                 /* tiempos del puñetazo */
    const HITS_PER_LEVEL = 6;
    const WORDS = ['¡POW!', '¡PAF!', '¡PUM!', '¡ZAS!', '¡BOING!', '¡PLAF!'];
    const CHEER = ['¡Toma!', '¡Pum!', '¡Muy bien!', '¡Zas!', '¡Qué fuerte!'];
    const TYPES = [
      { body: '#ff6b9a', feat: 'horns' }, { body: '#7b6bff', feat: 'antenna' }, { body: '#ffb627', feat: 'cyclops' },
      { body: '#2ec4b6', feat: 'ears' }, { body: '#9be564', feat: 'horns' }, { body: '#ff8c42', feat: 'antenna' }
    ];
    const GOLD = { body: '#ffd21f', feat: 'crown', bonus: true };
    const LAYOUT = {
      3: [[.2, .47], [.5, .63], [.8, .47]],
      5: [[.27, .34], [.73, .34], [.18, .62], [.5, .66], [.82, .62]],
      6: [[.18, .34], [.5, .3], [.82, .34], [.18, .62], [.5, .66], [.82, .62]]
    };

    let W = 0, H = 0, dpr = 1, s = 1, bg = null, raf = 0, last = 0, running = false;
    let holes = [], holeCount = 3, pendingHoles = 0, targets = [], fx = [], banner = null, shake = 0;
    let level = 1, inLevel = 0, stars = 0, spawnT = .6, cheerN = 0;
    const glove = { ph: 'rest', t: 0, ang: -PI / 2, tx: 0, ty: 0, hitDone: false };

    const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const easeIn = t => t * t;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function diff(L) {
      const holes = L <= 2 ? 3 : L <= 4 ? 5 : 6;
      return {
        holes,
        maxActive: Math.min(holes - 1, L === 1 ? 1 : L <= 3 ? 2 : L <= 6 ? 3 : 4),
        stay: Math.max(1.0, 3.8 - (L - 1) * .35),
        gap: Math.max(.3, 1.5 - (L - 1) * .15),
        gold: L >= 3 ? .12 : 0,
        peek: L >= 5 ? .2 : 0
      };
    }

    /* ---------- sonidos de dibujos animados ---------- */
    let noiseBuf = null;
    const noise = a => { if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * .5, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; } return noiseBuf; };
    function env(a, g, t, peak, dur) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
    const snd = {
      boing() {
        const a = App.audio(); if (!a) return; const t = a.currentTime;
        const o = a.createOscillator(), g = a.createGain(), l = a.createOscillator(), lg = a.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(640, t + .13);
        l.frequency.value = 32; lg.gain.value = 70; l.connect(lg).connect(o.frequency);
        env(a, g, t, .22, .24); o.connect(g).connect(a.destination); o.start(t); l.start(t); o.stop(t + .26); l.stop(t + .26);
      },
      pow() {
        const a = App.audio(); if (!a) return; const t = a.currentTime;
        const n = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
        n.buffer = noise(a); f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(300, t + .16);
        env(a, g, t, .55, .18); n.connect(f).connect(g).connect(a.destination); n.start(t); n.stop(t + .2);
        const o = a.createOscillator(), og = a.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(45, t + .2);
        env(a, og, t, .6, .22); o.connect(og).connect(a.destination); o.start(t); o.stop(t + .24);
      },
      whistle(up) {
        const a = App.audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(up ? 500 : 1400, t); o.frequency.exponentialRampToValueAtTime(up ? 1600 : 350, t + .6);
        env(a, g, t, .09, .65); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .7);
      },
      squish() {
        const a = App.audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(90, t + .15);
        env(a, g, t, .08, .18); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .2);
      },
      plop() {
        const a = App.audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(280, t); o.frequency.exponentialRampToValueAtTime(760, t + .07);
        env(a, g, t, .12, .1); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .12);
      },
      raspberry() {
        const a = App.audio(); if (!a) return; const t = a.currentTime;
        const o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), l = a.createOscillator(), lg = a.createGain();
        o.type = 'sawtooth'; o.frequency.value = 105; l.frequency.value = 22; lg.gain.value = 35; l.connect(lg).connect(o.frequency);
        f.type = 'lowpass'; f.frequency.value = 900; env(a, g, t, .1, .38);
        o.connect(f).connect(g).connect(a.destination); o.start(t); l.start(t); o.stop(t + .4); l.stop(t + .4);
      },
      levelUp() { App.sfx.win(); }
    };

    /* ---------- tamaño y escenario ---------- */
    function resize() {
      const r = wrap.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
      dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      s = Math.min(W, H) / 420;
      buildBg(); layoutHoles(holeCount);
    }
    function layoutHoles(n) {
      holeCount = n; const r = n === 3 ? Math.min(W * .145, H * .1) : Math.min(W * .118, H * .09);
      holes = LAYOUT[n].map(([x, y]) => ({ x: x * W, y: y * H, r }));
    }
    function buildBg() {
      bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
      const b = bg.getContext('2d'); b.scale(dpr, dpr);
      const hz = H * .17;
      let g = b.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#7fcbff'); g.addColorStop(1, '#cdeeff');
      b.fillStyle = g; b.fillRect(0, 0, W, hz + 2);
      b.fillStyle = '#fff';
      for (const [cx, cy, k] of [[.18, .07, 1], [.7, .05, 1.3], [.92, .11, .8]]) { const x = cx * W, y = cy * H, rr = 16 * s * k; b.beginPath(); b.arc(x, y, rr, 0, TAU); b.arc(x + rr, y + 4 * s, rr * .8, 0, TAU); b.arc(x - rr, y + 5 * s, rr * .7, 0, TAU); b.fill(); }
      b.fillStyle = '#9fdc6f';
      b.beginPath(); b.ellipse(W * .2, hz + 8 * s, W * .35, 40 * s, 0, PI, 0); b.fill();
      b.beginPath(); b.ellipse(W * .8, hz + 10 * s, W * .4, 46 * s, 0, PI, 0); b.fill();
      g = b.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#8fdc5e'); g.addColorStop(1, '#58ad3e');
      b.fillStyle = g; b.fillRect(0, hz, W, H - hz);
      b.strokeStyle = 'rgba(40,110,30,.45)'; b.lineWidth = 2 * s; b.lineCap = 'round';
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 70; i++) { const x = rnd() * W, y = hz + 10 + rnd() * (H - hz - 10), h = (5 + rnd() * 6) * s; b.beginPath(); b.moveTo(x - 3 * s, y); b.lineTo(x - 4 * s, y - h); b.moveTo(x, y); b.lineTo(x, y - h * 1.2); b.moveTo(x + 3 * s, y); b.lineTo(x + 4 * s, y - h); b.stroke(); }
      for (let i = 0; i < 14; i++) { const x = rnd() * W, y = hz + 20 + rnd() * (H - hz - 30); b.fillStyle = ['#fff', '#ffd21f', '#ff8fb1'][i % 3]; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; b.beginPath(); b.arc(x + Math.cos(a) * 3 * s, y + Math.sin(a) * 3 * s, 2.4 * s, 0, TAU); b.fill(); } b.fillStyle = '#ffb627'; b.beginPath(); b.arc(x, y, 1.8 * s, 0, TAU); b.fill(); }
    }

    /* ---------- pistola y guante ---------- */
    const pivot = () => ({ x: W / 2, y: H - 14 * s });
    const barrel = () => 80 * s, gR = () => 25 * s;
    function gloveState() {
      const P = pivot(), d = { x: Math.cos(glove.ang), y: Math.sin(glove.ang) };
      const T = { x: P.x + d.x * barrel(), y: P.y + d.y * barrel() };
      let ext = 0;
      if (glove.ph === 'out') ext = easeOutBack(clamp(glove.t / OUT, 0, 1));
      else if (glove.ph === 'hold') ext = 1;
      else if (glove.ph === 'back') ext = 1 - easeIn(clamp(glove.t / BACK, 0, 1));
      const rest = gR() * .55, full = Math.max(rest, Math.hypot(glove.tx - T.x, glove.ty - T.y));
      const dist = rest + (full - rest) * ext;
      return { P, d, T, ext, G: { x: T.x + d.x * dist, y: T.y + d.y * dist } };
    }
    function punch(x, y) {
      const P = pivot();
      let best = null, bd = 1e9;
      for (const t of targets) { if (t.ph !== 'up' && t.ph !== 'idle') continue; const c = bodyCenter(t), dd = Math.hypot(c.x - x, c.y - y); if (dd < t.rx * 1.35 && dd < bd) { best = t; bd = dd; } }
      if (best) { const c = bodyCenter(best); x = c.x; y = c.y; }
      glove.ang = clamp(Math.atan2(y - P.y, x - P.x), -PI * .96, -PI * .04);
      glove.tx = x; glove.ty = y; glove.ph = 'out'; glove.t = 0; glove.hitDone = false; glove.aim = best;
      snd.boing();
    }

    /* ---------- monstruos ---------- */
    function bodyCenter(t) {
      if (t.ph === 'hit' && t.style === 'fly') return { x: t.x, y: t.y };
      const h = holes[t.h]; return { x: h.x, y: h.y + t.ry - t.rise * 2 * t.ry };
    }
    function spawn(D) {
      const used = new Set(targets.filter(t => !(t.ph === 'hit' && t.style === 'fly')).map(t => t.h));
      const free = holes.map((_, i) => i).filter(i => !used.has(i)); if (!free.length) return;
      const h = App.pick(free), hr = holes[h].r, gold = R() < D.gold, peek = !gold && R() < D.peek;
      targets.push({
        h, type: gold ? GOLD : App.pick(TYPES), ph: 'up', t: 0, rise: 0, rx: hr * .82, ry: hr * .95,
        stay: gold ? D.stay * .6 : peek ? .55 : D.stay * (.85 + R() * .3), blink: 1 + R() * 2, wob: R() * TAU
      });
      snd.plop();
    }
    function hit(t) {
      const c = bodyCenter(t);
      t.ph = 'hit'; t.t = 0; t.style = R() < .5 ? 'fly' : 'squash'; t.face = R() < .5 ? 'x' : 'spiral';
      if (t.style === 'fly') { const dir = c.x < W / 2 ? -1 : 1; t.x = c.x; t.y = c.y; t.vx = dir * (180 + R() * 160) * s; t.vy = -(520 + R() * 160) * s; t.rot = 0; t.vr = dir * (9 + R() * 6); t.sc = 1; snd.whistle(true); }
      else snd.squish();
      snd.pow();
      fx.push({ k: 'burst', x: c.x, y: c.y - t.ry * .3, t: 0, word: App.pick(WORDS), rot: (R() - .5) * .5 });
      for (let i = 0; i < 12; i++) { const a = R() * TAU, v = (140 + R() * 220) * s; fx.push({ k: 'star', x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120 * s, t: 0, life: .7 + R() * .4, c: ['#ffd21f', '#fff', '#ff5d6c', '#3d7dff'][i % 4], r: (4 + R() * 4) * s, rot: R() * TAU }); }
      if (!App.reduce) shake = .14;
      const gain = t.type.bonus ? 3 : 1; stars += gain; scEl.textContent = '⭐ ' + stars;
      if (t.type.bonus) fx.push({ k: 'float', x: c.x, y: c.y - t.ry * 1.6, t: 0, text: '+3 ⭐' });
      if (++cheerN % 3 === 0) App.say(App.pick(CHEER));
      if (++inLevel >= HITS_PER_LEVEL) levelUp();
    }
    function levelUp() {
      level++; inLevel = 0; lvlEl.textContent = 'Nivel ' + level;
      banner = { t: 0, text: '¡Nivel ' + level + '!' };
      snd.levelUp(); App.say('¡Nivel ' + level + '!');
      App.confetti(90);
      const D = diff(level); if (D.holes !== holeCount) pendingHoles = D.holes;
    }

    /* ---------- actualización ---------- */
    function update(dt) {
      const D = diff(level);
      /* guante */
      if (glove.ph !== 'rest') {
        glove.t += dt;
        if (glove.ph === 'out') {
          if (!glove.hitDone && glove.t >= OUT * .8) {
            glove.hitDone = true;
            const a = glove.aim;
            if (a && (a.ph === 'up' || a.ph === 'idle')) hit(a);
            else fx.push({ k: 'puff', x: glove.tx, y: glove.ty, t: 0 });
          }
          if (glove.t >= OUT) { glove.ph = 'hold'; glove.t = 0; }
        } else if (glove.ph === 'hold' && glove.t >= HOLD) { glove.ph = 'back'; glove.t = 0; }
        else if (glove.ph === 'back' && glove.t >= BACK) { glove.ph = 'rest'; glove.t = 0; }
      } else glove.ang += (-PI / 2 - glove.ang) * Math.min(1, dt * 3);

      /* monstruos */
      for (const t of targets) {
        t.t += dt; t.blink -= dt; if (t.blink < -.12) t.blink = 1.5 + R() * 2.5;
        if (t.ph === 'up') { t.rise = easeOutBack(clamp(t.t / .28, 0, 1)); if (t.t >= .28) { t.ph = 'idle'; t.t = 0; } }
        else if (t.ph === 'idle') { t.rise = 1; if (t.t >= t.stay) { t.ph = 'down'; t.t = 0; snd.raspberry(); } }
        else if (t.ph === 'down') { const k = clamp((t.t - .35) / .3, 0, 1); t.rise = 1 - easeIn(k); if (t.t >= .65) t.dead = true; }
        else if (t.ph === 'hit') {
          if (t.style === 'fly') { t.x += t.vx * dt; t.y += t.vy * dt; t.vy += 900 * s * dt; t.rot += t.vr * dt; t.sc = Math.max(.25, 1 - t.t * .5); if (t.t > 1.4 || t.y > H + 100) t.dead = true; }
          else { if (t.t > .95) { t.rise = 1 - easeIn(clamp((t.t - .95) / .3, 0, 1)); } if (t.t > 1.25) t.dead = true; }
        }
      }
      targets = targets.filter(t => !t.dead);

      /* cambio de agujeros al subir de nivel, cuando no queda nadie dentro */
      if (pendingHoles && !targets.some(t => !(t.ph === 'hit' && t.style === 'fly'))) { layoutHoles(pendingHoles); pendingHoles = 0; spawnT = .5; }

      /* aparecer */
      if (!pendingHoles && !banner) {
        spawnT -= dt;
        const active = targets.filter(t => t.ph === 'up' || t.ph === 'idle').length;
        if (spawnT <= 0 && active < D.maxActive) { spawn(D); spawnT = D.gap * (.7 + R() * .6); }
      }

      /* efectos */
      for (const f of fx) {
        f.t += dt;
        if (f.k === 'star') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 700 * s * dt; f.rot += dt * 6; }
      }
      fx = fx.filter(f => f.k === 'star' ? f.t < f.life : f.k === 'burst' ? f.t < .55 : f.k === 'puff' ? f.t < .35 : f.t < 1);
      if (banner) { banner.t += dt; if (banner.t > 1.7) banner = null; }
      if (shake > 0) shake -= dt;
    }

    /* ---------- dibujo ---------- */
    const INK = '#2a1d0f';
    function star(c, x, y, r, rot, fill) {
      c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = fill; c.fill(); c.restore();
    }
    function drawMonster(c, t, x, y, sx, sy, rot) {
      const rx = t.rx, ry = t.ry, ty = t.type, lw = 3 * s;
      c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(sx, sy);
      c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round';
      /* lo que va detrás del cuerpo */
      c.fillStyle = ty.body;
      if (ty.feat === 'horns') for (const k of [-1, 1]) { c.beginPath(); c.moveTo(k * rx * .35, -ry * .8); c.quadraticCurveTo(k * rx * .75, -ry * 1.35, k * rx * .55, -ry * 1.45); c.quadraticCurveTo(k * rx * .4, -ry * 1.1, k * rx * .1, -ry * .9); c.closePath(); c.fillStyle = '#fff6d8'; c.fill(); c.stroke(); }
      if (ty.feat === 'antenna') for (const k of [-1, 1]) { c.beginPath(); c.moveTo(k * rx * .25, -ry * .85); c.quadraticCurveTo(k * rx * .5, -ry * 1.3, k * rx * .45, -ry * 1.45); c.stroke(); c.beginPath(); c.arc(k * rx * .45, -ry * 1.5, rx * .14, 0, TAU); c.fillStyle = '#ffd21f'; c.fill(); c.stroke(); }
      if (ty.feat === 'ears') for (const k of [-1, 1]) { c.beginPath(); c.ellipse(k * rx * .85, -ry * .55, rx * .3, ry * .22, k * .6, 0, TAU); c.fillStyle = ty.body; c.fill(); c.stroke(); }
      /* cuerpo con un poco de bamboleo */
      const wob = t.ph === 'idle' ? Math.sin(t.t * 6 + t.wob) * .03 : 0;
      c.beginPath(); c.ellipse(0, 0, rx * (1 + wob), ry * (1 - wob), 0, 0, TAU); c.fillStyle = ty.body; c.fill(); c.stroke();
      c.beginPath(); c.ellipse(0, ry * .35, rx * .62, ry * .5, 0, 0, TAU); c.fillStyle = 'rgba(255,255,255,.3)'; c.fill();
      c.beginPath(); c.ellipse(-rx * .4, -ry * .5, rx * .22, ry * .12, -.5, 0, TAU); c.fillStyle = 'rgba(255,255,255,.45)'; c.fill();
      if (ty.feat === 'crown') { c.beginPath(); c.moveTo(-rx * .5, -ry * .85); c.lineTo(-rx * .55, -ry * 1.35); c.lineTo(-rx * .25, -ry * 1.1); c.lineTo(0, -ry * 1.45); c.lineTo(rx * .25, -ry * 1.1); c.lineTo(rx * .55, -ry * 1.35); c.lineTo(rx * .5, -ry * .85); c.closePath(); c.fillStyle = '#ffb627'; c.fill(); c.stroke(); for (let i = 0; i < 6; i++) star(c, (R() - .5) * rx * 2.2, (R() - .5) * ry * 2.2, 3 * s, 0, 'rgba(255,255,255,.8)'); }
      /* cara */
      const hitF = t.ph === 'hit', tease = t.ph === 'down', ey = -ry * .18;
      const eyes = ty.feat === 'cyclops' ? [[0, rx * .34]] : [[-rx * .36, rx * .22], [rx * .36, rx * .22]];
      const G = gloveState().G;
      for (const [ex, er] of eyes) {
        if (hitF && t.face === 'x') { c.beginPath(); c.moveTo(ex - er * .7, ey - er * .7); c.lineTo(ex + er * .7, ey + er * .7); c.moveTo(ex + er * .7, ey - er * .7); c.lineTo(ex - er * .7, ey + er * .7); c.stroke(); continue; }
        if (hitF) { c.beginPath(); for (let a = 0; a < TAU * 2.2; a += .3) { const rr = er * a / (TAU * 2.2); c.lineTo(ex + Math.cos(a + t.t * 14) * rr, ey + Math.sin(a + t.t * 14) * rr); } c.stroke(); continue; }
        if (tease || t.blink < 0) { c.beginPath(); c.arc(ex, ey + er * .3, er * .7, PI * 1.1, PI * 1.9); c.stroke(); continue; }
        c.beginPath(); c.ellipse(ex, ey, er, er * 1.15, 0, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.stroke();
        const wx = x + ex * sx, wy = y + ey * sy, dx = G.x - wx, dy = G.y - wy, dl = Math.hypot(dx, dy) || 1, po = er * .42;
        c.beginPath(); c.arc(ex + dx / dl * po, ey + dy / dl * po, er * .45, 0, TAU); c.fillStyle = INK; c.fill();
        c.beginPath(); c.arc(ex + dx / dl * po - er * .15, ey + dy / dl * po - er * .15, er * .14, 0, TAU); c.fillStyle = '#fff'; c.fill();
      }
      c.fillStyle = 'rgba(255,120,150,.55)';
      for (const k of [-1, 1]) { c.beginPath(); c.ellipse(k * rx * .62, ry * .12, rx * .14, ry * .08, 0, 0, TAU); c.fill(); }
      const my = ry * .32;
      if (hitF) { c.beginPath(); c.ellipse(0, my, rx * .16, ry * .2, 0, 0, TAU); c.fillStyle = '#7a1f2b'; c.fill(); c.stroke(); }
      else if (tease) { c.beginPath(); c.arc(0, my - ry * .05, rx * .26, .1 * PI, .9 * PI); c.stroke(); c.beginPath(); c.ellipse(rx * .05, my + ry * .17, rx * .14, ry * .17, .2, 0, PI); c.fillStyle = '#ff7aa2'; c.fill(); c.stroke(); }
      else { c.beginPath(); c.arc(0, my - ry * .1, rx * .3, .15 * PI, .85 * PI); c.fillStyle = '#7a1f2b'; c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-rx * .12, my + ry * .02, rx * .1, ry * .1); c.fillRect(rx * .03, my + ry * .02, rx * .1, ry * .1); }
      c.restore();
    }
    function drawHoleBack(h) {
      ctx.fillStyle = '#7a4e26'; ctx.beginPath(); ctx.ellipse(h.x, h.y + h.r * .05, h.r * 1.35, h.r * .55, 0, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(h.x, h.y + h.r * .1, h.r * .1, h.x, h.y, h.r * 1.1); g.addColorStop(0, '#1a0f06'); g.addColorStop(1, '#4a2e16');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * 1.1, h.r * .38, 0, 0, TAU); ctx.fill();
    }
    function drawHoleFront(h) {
      ctx.strokeStyle = '#a5743f'; ctx.lineWidth = h.r * .2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * 1.13, h.r * .4, 0, .05 * PI, .95 * PI); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = h.r * .06;
      ctx.beginPath(); ctx.ellipse(h.x, h.y + h.r * .04, h.r * 1.13, h.r * .4, 0, .25 * PI, .75 * PI); ctx.stroke();
    }
    function drawDizzy(x, y, rx, t) {
      for (let i = 0; i < 3; i++) { const a = t * 7 + i * TAU / 3; star(ctx, x + Math.cos(a) * rx * .9, y + Math.sin(a) * rx * .25, 7 * s, a, i === 1 ? '#fff' : '#ffd21f'); }
    }
    function drawGun(gs) {
      const { P, d, T, G, ext } = gs, L = Math.hypot(G.x - T.x, G.y - T.y), back = gR() * .95;
      /* muelle en zigzag */
      const len = Math.max(0, L - back);
      if (len > 2 * s) {
        const n = Math.max(3, Math.round(len / (9 * s))), amp = 9 * s * (1 - .35 * Math.min(1, len / (300 * s))), nx = -d.y, ny = d.x;
        ctx.strokeStyle = '#8a8f98'; ctx.lineWidth = 4.5 * s; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(T.x, T.y);
        for (let i = 1; i < n; i++) { const k = i / n, side = i % 2 ? 1 : -1; ctx.lineTo(T.x + d.x * len * k + nx * amp * side, T.y + d.y * len * k + ny * amp * side); }
        ctx.lineTo(T.x + d.x * len, T.y + d.y * len); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5 * s; ctx.stroke();
      }
      /* guante */
      const r = gR(); ctx.save(); ctx.translate(G.x, G.y); ctx.rotate(Math.atan2(d.y, d.x));
      const sq = glove.ph === 'hold' || (glove.ph === 'out' && glove.t > OUT * .8) ? .86 : 1;
      ctx.scale(sq, 2 - sq);
      ctx.lineWidth = 3 * s; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.roundRect(-r * 1.35, -r * .55, r * .75, r * 1.1, r * .2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * .95, 0, 0, TAU); ctx.fillStyle = '#ff3b4e'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-r * .1, -r * .78, r * .42, r * .25, -.35, 0, TAU); ctx.fillStyle = '#ff3b4e'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(42,29,15,.5)'; ctx.lineWidth = 2 * s;
      for (const k of [-.35, 0, .35]) { ctx.beginPath(); ctx.arc(r * .55, k * r, r * .28, -.9, .9); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(-r * .2, -r * .25, r * .45, r * .2, -.3, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill();
      ctx.restore();
      /* pistola de juguete (se echa un poco atrás al disparar) */
      const rec = glove.ph === 'out' ? 7 * s * (1 - clamp(glove.t / OUT, 0, 1)) : 0;
      ctx.save(); ctx.translate(P.x - d.x * rec, P.y - d.y * rec); ctx.rotate(Math.atan2(d.y, d.x) + PI / 2);
      const bl = barrel(), bw = 18 * s; ctx.lineWidth = 3 * s; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.roundRect(-bw * 1.5, -bw * .2, bw * 3, bw * 3, bw * .6); ctx.fillStyle = '#3d7dff'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-bw, -bl, bw * 2, bl, bw * .5); ctx.fillStyle = '#ff5d6c'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd21f'; ctx.fillRect(-bw + 1.5 * s, -bl * .62, bw * 2 - 3 * s, bl * .12); ctx.fillRect(-bw + 1.5 * s, -bl * .38, bw * 2 - 3 * s, bl * .12);
      ctx.beginPath(); ctx.roundRect(-bw * 1.25, -bl - 4 * s, bw * 2.5, 12 * s, 5 * s); ctx.fillStyle = '#ffd21f'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-bw * .4, -bl * .8, bw * .25, bl * .12, 0, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill();
      ctx.restore();
    }
    function drawBurst(f) {
      const k = f.t < .12 ? easeOutBack(f.t / .12) : 1, a = f.t > .35 ? 1 - (f.t - .35) / .2 : 1, r = 46 * s * k;
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.beginPath(); for (let i = 0; i < 24; i++) { const ang = i * TAU / 24, rr = i % 2 ? r * .62 : r * (1 + (i % 4 === 0 ? .15 : 0)); ctx.lineTo(Math.cos(ang) * rr * 1.25, Math.sin(ang) * rr); }
      ctx.closePath(); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.lineWidth = 4 * s; ctx.strokeStyle = '#ff3b4e'; ctx.stroke();
      ctx.font = `800 ${Math.round(22 * s * k)}px "Baloo 2",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5 * s; ctx.strokeStyle = '#fff'; ctx.strokeText(f.word, 0, 2 * s); ctx.fillStyle = '#e0122e'; ctx.fillText(f.word, 0, 2 * s);
      ctx.restore();
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (shake > 0) ctx.translate((R() - .5) * 10 * s, (R() - .5) * 10 * s);
      if (bg) ctx.drawImage(bg, 0, 0, W, H);
      const gs = gloveState();
      /* agujeros con su monstruo dentro (recortado para que parezca que sale del agujero) */
      for (let i = 0; i < holes.length; i++) {
        const h = holes[i]; drawHoleBack(h);
        const t = targets.find(x => x.h === i && !(x.ph === 'hit' && x.style === 'fly'));
        if (t) {
          ctx.save(); ctx.beginPath(); ctx.rect(h.x - h.r * 3, -H, h.r * 6, h.y + H); ctx.clip();
          const c = bodyCenter(t);
          if (t.ph === 'hit') {
            const k = clamp(t.t / .1, 0, 1), sy = 1 - .6 * easeOutBack(k) * (t.t < .95 ? 1 : 1), sx = 1 + .45 * k;
            const by = h.y + t.ry - t.rise * 2 * t.ry, flatY = by + t.ry * (1 - sy);
            drawMonster(ctx, t, c.x, flatY, sx, sy, 0);
            if (t.t < .95) drawDizzy(c.x, flatY - t.ry * sy - 10 * s, t.rx, t.t);
          } else drawMonster(ctx, t, c.x, c.y, 1, 1, 0);
          ctx.restore();
        }
        drawHoleFront(h);
      }
      for (const t of targets) if (t.ph === 'hit' && t.style === 'fly') { drawMonster(ctx, t, t.x, t.y, t.sc, t.sc, t.rot); if (t.t < .9) drawDizzy(t.x, t.y - t.ry * t.sc, t.rx * t.sc, t.t); }
      for (const f of fx) {
        if (f.k === 'puff') { const k = f.t / .35; ctx.fillStyle = `rgba(255,255,255,${.7 * (1 - k)})`; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 26 * s * k, f.y + Math.sin(a) * 18 * s * k, 9 * s * (1 - k * .5), 0, TAU); ctx.fill(); } }
        else if (f.k === 'star') { ctx.globalAlpha = clamp(1 - f.t / f.life, 0, 1); star(ctx, f.x, f.y, f.r, f.rot, f.c); ctx.globalAlpha = 1; }
        else if (f.k === 'float') { ctx.globalAlpha = clamp(1 - f.t, 0, 1); ctx.font = `800 ${Math.round(24 * s)}px "Baloo 2",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 5 * s; ctx.strokeStyle = '#fff'; ctx.strokeText(f.text, f.x, f.y - f.t * 40 * s); ctx.fillStyle = '#b8860b'; ctx.fillText(f.text, f.x, f.y - f.t * 40 * s); ctx.globalAlpha = 1; }
      }
      for (const f of fx) if (f.k === 'burst') drawBurst(f);
      drawGun(gs);
      if (banner) {
        const k = banner.t < .3 ? easeOutBack(banner.t / .3) : 1, a = banner.t > 1.3 ? 1 - (banner.t - 1.3) / .4 : 1;
        ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(W / 2, H * .42); ctx.scale(k, k); ctx.rotate(-.06);
        ctx.font = `800 ${Math.round(54 * s)}px "Baloo 2",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 10 * s; ctx.strokeStyle = INK; ctx.strokeText(banner.text, 0, 0); ctx.fillStyle = '#ffd21f'; ctx.fillText(banner.text, 0, 0);
        ctx.restore();
      }
    }

    function frame(ts) {
      if (!running) return;
      const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
      update(dt); draw();
      raf = requestAnimationFrame(frame);
    }
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); const r = cv.getBoundingClientRect();
      punch(e.clientX - r.left, e.clientY - r.top);
    });
    const ro = new ResizeObserver(() => { if (el.classList.contains('on')) resize(); }); ro.observe(wrap);

    this.begin = () => {
      level = 1; inLevel = 0; stars = 0; cheerN = 0; targets = []; fx = []; banner = null; pendingHoles = 0; spawnT = .8;
      glove.ph = 'rest'; glove.ang = -PI / 2; holeCount = 3;
      lvlEl.textContent = 'Nivel 1'; scEl.textContent = '⭐ 0';
      resize(); running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    };
    this.end = () => { running = false; cancelAnimationFrame(raf); };
    this._debug = { punch, get targets() { return targets; }, get level() { return level; }, get holes() { return holes; }, bodyCenter };
  },

  start() { this.begin(); },
  stop() { this.end(); }
});
