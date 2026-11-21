/* JUEGO: COLORES DE PRINCESA
   Toca un frasco y se vierte en el cerdito (o en el frasco corazón o la poción).
   Los colores se mezclan como las pinturas de verdad: rojo + azul = morado,
   amarillo + azul = verde, rojo + blanco = rosa... y la voz dice el color que sale.
   La brillantina dorada y la de arcoíris hacen que el líquido brille.
   Modo ✨ libre y modo 👸 retos: la princesa pide un color y enseña qué frascos mezclar. */
App.registerGame({
  id: 'colors', title: 'Colores', color: '#ff6fb5', order: 8,
  art: '<svg viewBox="0 0 120 100"><ellipse cx="64" cy="56" rx="38" ry="29" fill="#fff" opacity=".9"/><path d="M26 56a38 29 0 0 0 76 0z" fill="#d36bff"/><ellipse cx="28" cy="58" rx="9" ry="11" fill="#ffb3d9"/><path d="M40 32l-6-14 14 8z" fill="#ffb3d9"/><path d="M42 22l4-10 5 7 5-9 4 9 5-7 3 10z" fill="#ffd21f"/><circle cx="52" cy="13" r="2.5" fill="#ff5d9e"/><path d="M95 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/><path d="M14 22l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#fff"/></svg>',

  html: () => `
    <div class="bar">${App.homeBtn()}
      <div class="chips cmodes"><button class="chip" data-cm="free" aria-label="Mezclar libre">✨</button><button class="chip" data-cm="quest" aria-label="Retos de la princesa">👸</button><button class="chip cshape" aria-label="Cambiar recipiente">🐷</button></div>
      <button class="ib cdrain" aria-label="Vaciar">${App.icon('bin')}</button>
    </div>
    <button class="order cquest" hidden aria-label="Repetir"></button>
    <div class="cstage"><canvas class="ccv"></canvas></div>`,

  init(el) {
    const S = App.settings, q = s => el.querySelector(s);
    if (!S.colMode) S.colMode = 'free';
    if (!S.colShape) S.colShape = 'pig';
    if (!S.colLevel) S.colLevel = 0;
    const wrap = q('.cstage'), cv = q('.ccv'), ctx = cv.getContext('2d'), questEl = q('.cquest'), drainB = q('.cdrain'), shapeB = q('.cshape');
    const PI = Math.PI, TAU = PI * 2, R = Math.random;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const CAP = 8;

    /* ---------- pinturas ---------- */
    const PAINT = {
      rojo: { v: { r: 1 }, col: '#ff2d55' }, rosa: { v: { r: .5, w: .5 }, col: '#ff8fc8' }, amarillo: { v: { y: 1 }, col: '#ffd21f' },
      azul: { v: { b: 1 }, col: '#2f6bff' }, blanco: { v: { w: 1 }, col: '#ffffff' }, morado: { v: { r: .5, b: .5 }, col: '#9b4dff' },
      oro: { glitter: 'gold', col: '#ffd76b' }, arcoiris: { glitter: 'rainbow', col: '#ffe6fb' }
    };
    const FREE_SET = ['rojo', 'rosa', 'amarillo', 'azul', 'blanco', 'morado', 'oro', 'arcoiris'];
    const QUEST_SET = ['rojo', 'amarillo', 'azul', 'blanco', 'oro', 'arcoiris'];
    const NAMES = [['rojo', 225, 30, 50], ['rosa', 255, 160, 205], ['rosa fuerte', 255, 70, 160], ['naranja', 255, 140, 20], ['melocotón', 255, 195, 155], ['amarillo', 255, 222, 40], ['verde', 40, 165, 60], ['verde clarito', 160, 222, 125], ['turquesa', 40, 190, 180], ['azul', 40, 95, 205], ['azul cielo', 150, 195, 255], ['morado', 128, 30, 140], ['lila', 205, 160, 240], ['marrón', 120, 70, 30], ['blanco', 252, 248, 250], ['gris', 160, 160, 170]];
    const QUESTS = [
      { name: 'rosa', uses: ['rojo', 'blanco'], test: m => only(m, 'rw') && share(m.w, m.r + m.w, .3, .8) },
      { name: 'naranja', uses: ['rojo', 'amarillo'], test: m => only(m, 'ry') && share(m.r, m.r + m.y, .25, .75) },
      { name: 'verde', uses: ['amarillo', 'azul'], test: m => only(m, 'yb') && share(m.y, m.y + m.b, .25, .75) },
      { name: 'morado', uses: ['rojo', 'azul'], test: m => only(m, 'rb') && share(m.r, m.r + m.b, .25, .75) },
      { name: 'azul cielo', uses: ['azul', 'blanco'], test: m => only(m, 'bw') && share(m.w, m.b + m.w, .3, .8) },
      { name: 'lila', uses: ['rojo', 'azul', 'blanco'], test: m => only(m, 'rbw') && m.r > 0 && m.b > 0 && m.w > 0 },
      { name: 'melocotón', uses: ['rojo', 'amarillo', 'blanco'], test: m => only(m, 'ryw') && m.r > 0 && m.y > 0 && m.w > 0 }
    ];
    const only = (m, keys) => ['r', 'y', 'b', 'w'].every(k => keys.includes(k) ? m[k] > 0 : !m[k]);
    const share = (a, tot, lo, hi) => tot > 0 && a / tot >= lo && a / tot <= hi;

    /* RYB → RGB (como mezclar pinturas) */
    const C8 = [[1, 1, 1], [.96, .06, .25], [1, .88, .05], [.1, .35, .95], [1, .5, 0], [.55, .1, .75], [.05, .66, .25], [.35, .2, .1]];
    function ryb(r, y, b) {
      const L = (a, c, t) => a + (c - a) * t, out = [];
      for (let i = 0; i < 3; i++) {
        const c000 = C8[0][i], c100 = C8[1][i], c010 = C8[2][i], c001 = C8[3][i], c110 = C8[4][i], c101 = C8[5][i], c011 = C8[6][i], c111 = C8[7][i];
        const x0 = L(L(c000, c100, r), L(c010, c110, r), y), x1 = L(L(c001, c101, r), L(c011, c111, r), y);
        out.push(L(x0, x1, b));
      }
      return out;
    }
    function mixRGB(m) {
      const tot = (m.r || 0) + (m.y || 0) + (m.b || 0) + (m.w || 0); if (!tot) return [255, 245, 250];
      const pg = (m.r || 0) + (m.y || 0) + (m.b || 0);
      let c = [1, 1, 1];
      if (pg > 0) { const mx = Math.max(m.r || 0, m.y || 0, m.b || 0); c = ryb((m.r || 0) / mx, (m.y || 0) / mx, (m.b || 0) / mx); }
      const wf = (m.w || 0) / tot;
      c = c.map(v => v + (1 - v) * wf);
      return c.map(v => Math.round(clamp(v, 0, 1) * 255));
    }
    function colorName(rgb) {
      let best = null, bd = 1e9;
      for (const [n, r, g, b] of NAMES) { const d = (rgb[0] - r) ** 2 * .3 + (rgb[1] - g) ** 2 * .59 + (rgb[2] - b) ** 2 * .11; if (d < bd) { bd = d; best = n; } }
      return best;
    }

    /* ---------- estado ---------- */
    let W = 0, H = 0, dpr = 1, L = null, raf = 0, last = 0, running = false, t0 = 0;
    let mix = { r: 0, y: 0, b: 0, w: 0 }, units = 0, shown = 0, col = [255, 245, 250], fromCol = col, toCol = col, glitter = [], sparks = [], drops = [];
    let pour = null, draining = 0, wiggle = 0, lastName = '', quest = null, questDone = false, bottles = [], stars = [];

    /* ---------- sonidos ---------- */
    function tone(f0, f1, dur, type = 'sine', vol = .08, delay = 0) {
      const a = App.audio(); if (!a) return; const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
    }
    const snd = {
      glug() { for (let i = 0; i < 5; i++) tone(220 + R() * 120, 480 + R() * 200, .09, 'sine', .07, i * .13); },
      twinkle() { for (let i = 0; i < 6; i++) tone(1800 + R() * 1600, 2600 + R() * 1200, .12, 'sine', .04, i * .07); },
      magic() { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, f * 1.01, .35, 'triangle', .07, i * .08)); },
      gurgle() { for (let i = 0; i < 8; i++) tone(300 - i * 20, 120, .12, 'sine', .07, i * .1); }
    };

    /* ---------- recipientes ---------- */
    function makeShape(kind, cx, cy, Rr) {
      const p = new Path2D(), deco = [];
      let top, bottom, mouth;
      if (kind === 'pig') {
        p.moveTo(cx + Rr, cy); p.ellipse(cx, cy, Rr, Rr * .78, 0, 0, TAU);
        p.moveTo(cx - Rr * .77, cy + Rr * .06); p.ellipse(cx - Rr * .97, cy + Rr * .06, Rr * .2, Rr * .27, 0, 0, TAU);
        for (const lx of [-.55, -.2, .2, .55]) deco.push([cx + lx * Rr - Rr * .12, cy + Rr * .45, Rr * .24, Rr * .45]);
        top = cy - Rr * .78; bottom = cy + Rr * .78; mouth = { x: cx + Rr * .12, y: cy - Rr * .86 };
      } else if (kind === 'heart') {
        p.moveTo(cx, cy + Rr * .95);
        p.bezierCurveTo(cx - Rr * 1.25, cy + Rr * .1, cx - Rr * 1.05, cy - Rr * .85, cx, cy - Rr * .35);
        p.bezierCurveTo(cx + Rr * 1.05, cy - Rr * .85, cx + Rr * 1.25, cy + Rr * .1, cx, cy + Rr * .95);
        p.closePath();
        p.roundRect(cx - Rr * .16, cy - Rr * .78, Rr * .32, Rr * .55, Rr * .06);
        top = cy - Rr * .62; bottom = cy + Rr * .95; mouth = { x: cx, y: cy - Rr * .8 };
      } else {
        p.moveTo(cx + Rr * .82, cy + Rr * .18); p.arc(cx, cy + Rr * .18, Rr * .82, 0, TAU);
        p.roundRect(cx - Rr * .2, cy - Rr * .95, Rr * .4, Rr * .65, Rr * .06);
        top = cy - Rr * .6; bottom = cy + Rr * 1.0; mouth = { x: cx, y: cy - Rr * .97 };
      }
      return { kind, p, top, bottom, mouth, cx, cy, R: Rr, deco };
    }

    /* contorno sin rayas por dentro: se dibuja grueso y se borra el interior */
    function makeOutline(shape) {
      const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d'); x.scale(dpr, dpr);
      x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.lineWidth = 8; x.stroke(shape.p);
      x.globalCompositeOperation = 'destination-out'; x.fill(shape.p);
      return c;
    }

    /* ---------- disposición ---------- */
    function layout() {
      const r = wrap.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
      dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const set = S.colMode === 'quest' ? QUEST_SET : FREE_SET;
      const perRow = W > H * .9 ? set.length : Math.ceil(set.length / 2), rowsN = Math.ceil(set.length / perRow);
      const bw = Math.min(64, (W - 20) / perRow * .72), bh = bw * 1.7, areaH = rowsN * (bh + 14) + 10;
      const Rr = Math.min(W * .37, (H - areaH) * .4);
      const shape = makeShape(S.colShape, W / 2 + (S.colShape === 'pig' ? Rr * .08 : 0), (H - areaH) * .55, Rr);
      bottles = set.map((k, i) => { const row = Math.floor(i / perRow), inRow = Math.min(perRow, set.length - row * perRow), j = i - row * perRow; const gap = W / inRow; return { k, x: gap * (j + .5), y: H - areaH + 10 + row * (bh + 14) + bh / 2, w: bw, h: bh, bob: R() * TAU }; });
      stars = Array.from({ length: 34 }, () => ({ x: R() * W, y: R() * H, s: 3 + R() * 6, ph: R() * TAU, sp: 1 + R() * 2 }));
      L = { shape, set, outline: makeOutline(shape) };
      if (questEl && !questEl.hidden) renderQuest();
    }

    /* ---------- verter ---------- */
    function startPour(b) {
      if (pour || draining) return;
      if (units >= CAP) { wiggle = .6; App.say('¡Está lleno! Vamos a vaciarlo.'); drainB.classList.add('pulse'); return; }
      pour = { b, t: 0, poured: false };
      const pt = PAINT[b.k];
      if (pt.glitter) snd.twinkle(); else snd.glug();
    }
    function finishPourAmount(pt) {
      if (pt.glitter) {
        for (let i = 0; i < 40; i++) glitter.push({ x: R(), y: R(), vx: (R() - .5) * .05, vy: (R() - .5) * .05, s: 1.5 + R() * 3, ph: R() * TAU, c: pt.glitter === 'gold' ? (R() < .5 ? '#fff3b0' : '#ffd23f') : `hsl(${Math.floor(R() * 360)} 100% 75%)` });
        if (glitter.length > 260) glitter.splice(0, glitter.length - 260);
        units = Math.min(CAP, units + .3);
      } else {
        for (const k in pt.v) mix[k] = (mix[k] || 0) + pt.v[k];
        units = Math.min(CAP, units + 1);
      }
    }
    function afterPour(pt) {
      const name = colorName(mixRGB(mix));
      if (!pt.glitter && (mix.r + mix.y + mix.b + mix.w) > 0 && name !== lastName) { lastName = name; App.say(name[0].toUpperCase() + name.slice(1) + '!'); }
      if (pt.glitter) App.say(App.pick(['¡Brillantina!', '¡Qué brillo!', '¡Purpurina mágica!']));
      if (units >= CAP && !quest) { setTimeout(() => { snd.magic(); burst(60); App.say('¡Está lleno! ¡Qué color tan bonito!'); drainB.classList.add('pulse'); }, 400); }
      if (quest && !questDone) checkQuest();
    }

    /* ---------- retos ---------- */
    function renderQuest() {
      if (!quest) { questEl.hidden = true; return; }
      questEl.hidden = false;
      const dot = k => `<span class="cdot" style="background:${PAINT[k].col}"></span>`;
      const target = mixRGB(Object.fromEntries(Object.entries(quest.uses.reduce((m, k) => { for (const x in PAINT[k].v) m[x] = (m[x] || 0) + PAINT[k].v[x]; return m; }, {}))));
      questEl.innerHTML = `<span class="who">👸</span><span class="bubble"><b>¡Quiero color ${quest.name}!</b><span class="reqs">${quest.uses.map(dot).join('<i class="plus">+</i>')}<i class="plus">=</i><span class="cdot big" style="background:rgb(${target.join(',')})"></span></span></span>`;
    }
    function newQuest() {
      quest = QUESTS[(S.colLevel || 0) % QUESTS.length]; questDone = false; renderQuest();
      setTimeout(() => App.say(`¡Hola! ¿Me haces color ${quest.name}? Mezcla ${quest.uses.join(' y ')}.`), 400);
    }
    function checkQuest() {
      if (quest.test(mix)) {
        questDone = true; setTimeout(() => {
          snd.magic(); burst(90); App.say(`¡Sí! ¡Color ${quest.name}! ¡Gracias!`);
          S.colLevel = (S.colLevel || 0) + 1; App.saveSettings();
          setTimeout(() => App.win(() => { instantEmpty(); newQuest(); }, '¡Color conseguido!', 'Siguiente'), 1400);
        }, 400);
        return;
      }
      const bad = ['r', 'y', 'b', 'w'].some(k => mix[k] > 0 && !quest.uses.some(u => PAINT[u].v[k]));
      if (bad) { setTimeout(() => { App.say('¡Uy! Ese color no va. ¡Vaciamos y probamos otra vez!'); setTimeout(drain, 1200); }, 600); return; }
      if (units >= 3) {
        const keys = { rojo: 'r', amarillo: 'y', azul: 'b', blanco: 'w' }, have = quest.uses.map(u => [u, mix[keys[u]] || 0]).sort((a, b) => a[1] - b[1]);
        setTimeout(() => App.say(`¡Un poco más de ${have[0][0]}!`), 700);
      }
      if (units >= CAP) setTimeout(() => { App.say('¡Uy, se ha llenado! Vamos a vaciar.'); setTimeout(drain, 1300); }, 900);
    }

    /* ---------- vaciar ---------- */
    function drain() { if (draining || units <= 0) return; draining = 1; snd.gurgle(); drainB.classList.remove('pulse'); }
    function instantEmpty() { mix = { r: 0, y: 0, b: 0, w: 0 }; units = shown = 0; glitter = []; col = fromCol = toCol = [255, 245, 250]; lastName = ''; draining = 0; }
    function burst(n) { const s = L.shape; for (let i = 0; i < n; i++) { const a = R() * TAU, v = 80 + R() * 260; sparks.push({ x: s.cx, y: s.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, life: .8 + R() * .7, c: ['#fff', '#ffd23f', '#ff8fc8', '#d6a8ff'][i % 4], s: 4 + R() * 6 }); } }

    /* ---------- entrada ---------- */
    cv.addEventListener('pointerdown', e => {
      if (!L) return; const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      for (const b of bottles) if (Math.abs(x - b.x) < b.w * .7 && Math.abs(y - b.y) < b.h * .6) { startPour(b); return; }
      const s = L.shape;
      if (ctx.isPointInPath(s.p, x * dpr, y * dpr) || Math.hypot(x - s.cx, y - s.cy) < s.R) {
        wiggle = .6; burst(18); snd.twinkle();
        if (units > 0) App.say(mix.r + mix.y + mix.b + mix.w > 0 ? `¡Es color ${colorName(mixRGB(mix))}!` : '¡Brilla mucho!');
        else App.say('¡Elige un color de abajo!');
      }
    });
    drainB.addEventListener('click', () => { App.sfx.pop(); drain(); });
    questEl.addEventListener('click', () => quest && App.say(`¿Me haces color ${quest.name}? Mezcla ${quest.uses.join(' y ')}.`));
    const SHAPES = [['pig', '🐷'], ['heart', '💖'], ['potion', '🧪']];
    function renderShapeBtn() { shapeB.textContent = (SHAPES.find(s => s[0] === S.colShape) || SHAPES[0])[1]; }
    shapeB.addEventListener('click', () => { const i = SHAPES.findIndex(s => s[0] === S.colShape); S.colShape = SHAPES[(i + 1) % SHAPES.length][0]; App.saveSettings(); renderShapeBtn(); App.sfx.pop(); layout(); burst(30); });
    function setMode(m) {
      S.colMode = m; App.saveSettings();
      el.querySelectorAll('[data-cm]').forEach(b => b.classList.toggle('on', b.dataset.cm === m));
      instantEmpty(); pour = null;
      if (m === 'quest') newQuest(); else { quest = null; renderQuest(); }
      requestAnimationFrame(layout);
    }
    el.querySelector('.cmodes').addEventListener('click', e => { const b = e.target.closest('[data-cm]'); if (b) { App.sfx.pop(); setMode(b.dataset.cm); } });

    /* ---------- animación ---------- */
    function surfaceY() { const s = L.shape; return s.bottom - (shown / CAP) * (s.bottom - s.top) * .97; }
    function update(dt) {
      t0 += dt;
      if (pour) {
        pour.t += dt; const pt = PAINT[pour.b.k];
        if (pour.t > .35 && !pour.started) { pour.started = true; pour.base = units; fromCol = col.slice(); finishPourAmount(pt); toCol = mixRGB(mix); pour.target = units; units = pour.base; }
        if (pour.started && pour.t <= 1.1) { const k = clamp((pour.t - .35) / .7, 0, 1); units = pour.base + (pour.target - pour.base) * k; col = fromCol.map((v, i) => Math.round(v + (toCol[i] - v) * k)); if (R() < dt * 30) drops.push({ x: L.shape.mouth.x + (R() - .5) * 10, y: surfaceY(), vx: (R() - .5) * 120, vy: -60 - R() * 120, t: 0, c: pt.glitter ? '#fff6c0' : pt.col }); }
        if (pour.t > 1.1 && !pour.poured) { pour.poured = true; units = pour.target; col = toCol.slice(); afterPour(pt); }
        if (pour.t > 1.45) pour = null;
      }
      if (draining) { units = Math.max(0, units - dt * 6); if (units <= 0) instantEmpty(); }
      shown += (units - shown) * Math.min(1, dt * 10);
      for (const g of glitter) { g.x += g.vx * dt + Math.sin(t0 + g.ph) * .01 * dt; g.y += g.vy * dt + Math.cos(t0 * .8 + g.ph) * .01 * dt; if (g.x < 0 || g.x > 1) g.vx *= -1; if (g.y < 0 || g.y > 1) g.vy *= -1; g.x = clamp(g.x, 0, 1); g.y = clamp(g.y, 0, 1); }
      for (const s of sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 200 * dt; }
      sparks = sparks.filter(s => s.t < s.life);
      for (const d of drops) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 600 * dt; }
      drops = drops.filter(d => d.t < .5);
      if (wiggle > 0) wiggle = Math.max(0, wiggle - dt);
    }
    function sparkle(x, y, s, a, c) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill(); ctx.restore(); }
    function heart(x, y, s, c, a) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y + s * .9); ctx.bezierCurveTo(x - s * 1.4, y, x - s * .7, y - s, x, y - s * .3); ctx.bezierCurveTo(x + s * .7, y - s, x + s * 1.4, y, x, y + s * .9); ctx.fill(); ctx.restore(); }
    function crown(x, y, w) {
      ctx.save(); ctx.translate(x, y);
      const g = ctx.createLinearGradient(0, -w * .5, 0, w * .1); g.addColorStop(0, '#fff2a8'); g.addColorStop(1, '#f4b400');
      ctx.fillStyle = g; ctx.strokeStyle = '#c98a00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -w * .3); ctx.lineTo(-w * .25, -w * .12); ctx.lineTo(0, -w * .45); ctx.lineTo(w * .25, -w * .12); ctx.lineTo(w / 2, -w * .3); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const [gx, gy, gc] of [[0, -w * .2, '#ff4fa0'], [-w * .3, -w * .08, '#8fd6ff'], [w * .3, -w * .08, '#b388ff']]) { ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(gx, gy, w * .07, 0, TAU); ctx.fill(); }
      sparkle(w * .45, -w * .5, w * .12, .5 + .5 * Math.sin(t0 * 4), '#fff');
      ctx.restore();
    }
    function drawContainer() {
      const s = L.shape, wig = Math.sin(wiggle * 30) * wiggle * .08;
      ctx.save(); ctx.translate(s.cx, s.bottom); ctx.rotate(wig); ctx.translate(-s.cx, -s.bottom);
      /* cosas de detrás (orejas, cola) */
      ctx.fillStyle = 'rgba(255,190,225,.55)'; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
      if (s.kind === 'pig') {
        for (const [ex, ey] of [[-.5, -.62], [-.18, -.74]]) { ctx.beginPath(); ctx.moveTo(s.cx + ex * s.R - s.R * .12, s.cy + ey * s.R + s.R * .05); ctx.lineTo(s.cx + ex * s.R - s.R * .02, s.cy + ey * s.R - s.R * .32); ctx.lineTo(s.cx + ex * s.R + s.R * .16, s.cy + ey * s.R + s.R * .02); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(255,170,215,.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(s.cx + s.R * 1.08, s.cy - s.R * .05, s.R * .1, PI * .9, PI * 2.6); ctx.stroke();
        for (const [lx, ly, lw, lh] of s.deco) { ctx.beginPath(); ctx.roundRect(lx, ly, lw, lh, lw * .35); ctx.fillStyle = 'rgba(255,190,225,.75)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.stroke(); }
      }
      /* cristal */
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill(s.p);
      /* líquido */
      if (shown > .02) {
        ctx.save(); ctx.clip(s.p);
        const sy = surfaceY(), c = `rgb(${col.join(',')})`, dark = `rgb(${col.map(v => Math.round(v * .78)).join(',')})`;
        const g = ctx.createLinearGradient(0, sy, 0, s.bottom); g.addColorStop(0, c); g.addColorStop(1, dark);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, sy + Math.sin(x * .05 + t0 * 3) * 3 + (pour && pour.started ? Math.sin(x * .12 - t0 * 12) * 3 : 0));
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(0, sy - 2, W, 5);
        /* brillantina */
        const top = Math.max(sy, s.top - 10), hgt = s.bottom - top;
        for (const gl of glitter) { const gx = s.cx - s.R * 1.1 + gl.x * s.R * 2.2, gy = top + gl.y * hgt; sparkle(gx, gy, gl.s * (1 + .6 * Math.sin(t0 * 6 + gl.ph)), .5 + .5 * Math.sin(t0 * 5 + gl.ph), gl.c); }
        ctx.restore();
      }
      /* borde brillante */
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.shadowColor = 'rgba(255,120,200,.9)'; ctx.shadowBlur = 16 * dpr; ctx.drawImage(L.outline, 0, 0); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(s.cx - s.R * .1, s.cy, s.R * .62, PI * 1.12, PI * 1.38); ctx.stroke();
      /* detalles de delante */
      if (s.kind === 'pig') {
        ctx.fillStyle = 'rgba(214,80,150,.8)'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s.cx - s.R * .99, s.cy + s.R * .06 + k * s.R * .09, s.R * .04, s.R * .06, 0, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = '#7a2a5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.cx - s.R * .55, s.cy - s.R * .22, s.R * .1, .15 * PI, .85 * PI); ctx.stroke();
        for (let i = 0; i < 3; i++) { const a = PI * (.25 + i * .25); ctx.beginPath(); ctx.moveTo(s.cx - s.R * .55 + Math.cos(a) * s.R * .1, s.cy - s.R * .22 + Math.sin(a) * s.R * .1); ctx.lineTo(s.cx - s.R * .55 + Math.cos(a) * s.R * .16, s.cy - s.R * .22 + Math.sin(a) * s.R * .16); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,120,170,.5)'; ctx.beginPath(); ctx.ellipse(s.cx - s.R * .62, s.cy + s.R * .05, s.R * .12, s.R * .07, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect(s.mouth.x - s.R * .14, s.mouth.y - s.R * .04, s.R * .28, s.R * .1, s.R * .05); ctx.fill();
        crown(s.cx - s.R * .38, s.cy - s.R * .78, s.R * .42);
      } else if (s.kind === 'heart') {
        crown(s.cx, s.cy - s.R * .78, s.R * .5);
      } else {
        ctx.fillStyle = '#ffb3d9'; ctx.beginPath(); ctx.roundRect(s.cx - s.R * .26, s.cy - s.R * 1.08, s.R * .52, s.R * .16, 6); ctx.fill();
        crown(s.cx, s.cy - s.R * 1.08, s.R * .5);
      }
      ctx.restore();
    }
    function drawBottle(b, x, y, rot, lift) {
      const pt = PAINT[b.k], w = b.w, h = b.h;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (lift) ctx.scale(1.08, 1.08);
      const body = new Path2D(); body.roundRect(-w / 2, -h * .22, w, h * .72, w * .28); body.roundRect(-w * .2, -h * .5, w * .4, h * .32, w * .08);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(body);
      ctx.save(); ctx.clip(body);
      if (pt.glitter) { const g = ctx.createLinearGradient(0, -h * .3, 0, h * .5); if (pt.glitter === 'gold') { g.addColorStop(0, '#fff4b8'); g.addColorStop(1, '#f1b800'); } else { g.addColorStop(0, '#ffb3e6'); g.addColorStop(.5, '#c9b3ff'); g.addColorStop(1, '#9fe7ff'); } ctx.fillStyle = g; }
      else ctx.fillStyle = pt.col;
      ctx.fillRect(-w, -h * .12, w * 2, h);
      if (pt.glitter) for (let i = 0; i < 7; i++) sparkle(Math.sin(i * 2.3) * w * .32, h * (.0 + i * .06), 3 + Math.sin(t0 * 6 + i) * 2, .9, '#fff');
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.5; ctx.stroke(body);
      ctx.fillStyle = '#ff9fd0'; ctx.beginPath(); ctx.roundRect(-w * .25, -h * .58, w * .5, h * .12, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-w * .32, -h * .1, w * .1, h * .45);
      ctx.restore();
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#ffd9ef'); bg.addColorStop(1, '#e6d4ff'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (const st of stars) { const a = .35 + .45 * Math.sin(t0 * st.sp + st.ph); if (st.s > 7) heart(st.x, st.y, st.s * .7, '#ffffff', a * .5); else sparkle(st.x, st.y, st.s, a, '#ffffff'); }
      drawContainer();
      for (const b of bottles) { if (pour && pour.b === b) continue; drawBottle(b, b.x, b.y + Math.sin(t0 * 2 + b.bob) * 2, 0, false); }
      if (pour) {
        const b = pour.b, s = L.shape, k = clamp(pour.t / .35, 0, 1), back = clamp((pour.t - 1.1) / .35, 0, 1);
        const px = s.mouth.x - b.h * .55, py = s.mouth.y - b.h * .55;
        const e = k * (2 - k), eb = back * back;
        const x = b.x + (px - b.x) * e + (b.x - px) * eb, y = b.y + (py - b.y) * e + (b.y - py) * eb;
        const rot = (PI * .62) * e * (1 - eb);
        if (pour.started && pour.t < 1.1) {
          const tipX = x + Math.sin(rot) * b.h * .5, tipY = y - Math.cos(rot) * b.h * .5, pt = PAINT[b.k];
          ctx.strokeStyle = pt.glitter ? (pt.glitter === 'gold' ? '#ffe27a' : '#ffc6f0') : pt.col; ctx.lineWidth = b.w * .22; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo(s.mouth.x + Math.sin(t0 * 20) * 2, tipY, s.mouth.x, surfaceY()); ctx.stroke();
          if (pt.glitter) for (let i = 0; i < 6; i++) { const tt = (t0 * 2 + i / 6) % 1; sparkle(tipX + (s.mouth.x - tipX) * tt, tipY + (surfaceY() - tipY) * tt * tt, 4, 1, '#fff'); }
        }
        drawBottle(b, x, y, rot, true);
      }
      for (const d of drops) { ctx.globalAlpha = 1 - d.t / .5; ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(d.x, d.y, 3.5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      for (const sp of sparks) sparkle(sp.x, sp.y, sp.s, clamp(1 - sp.t / sp.life, 0, 1), sp.c);
    }
    function frame(ts) { if (!running) return; const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; if (L) { update(dt); draw(); } raf = requestAnimationFrame(frame); }
    const ro = new ResizeObserver(() => { if (el.classList.contains('on')) layout(); }); ro.observe(wrap);

    this.begin = () => { renderShapeBtn(); setMode(S.colMode); running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    this.end = () => { running = false; cancelAnimationFrame(raf); };
    this._debug = { get mix() { return mix; }, get units() { return units; }, startPour: k => startPour(bottles.find(b => b.k === k)), mixRGB, colorName, get quest() { return quest; }, setMode };
  },

  start() { this.begin(); },
  stop() { this.end(); }
});
