/* JUEGO: PUZLE
   Piezas de puzle de verdad (con salientes y huecos) a partir de un dibujo de la app
   (unicornio, castillo, hada, sirena...) o de una foto del móvil.
   Se elige el número de piezas (de 4 a 36). Las piezas se arrastran y encajan solas
   cuando están cerca de su sitio. Debajo se ve la imagen en flojito como guía (se puede quitar). */
App.registerGame({
  id: 'puzzle', title: 'Puzle', color: '#ff8fc8', order: 9,
  art: '<svg viewBox="0 0 120 100"><path d="M20 20h28a8 8 0 1 1 16 0h28v28a8 8 0 1 0 0 16v28H64a8 8 0 1 0-16 0H20V64a8 8 0 1 1 0-16z" fill="#fff"/><path d="M20 20h28a8 8 0 1 1 16 0h4v32H52a8 8 0 1 0 0 16H20z" fill="#ffd1ea"/><circle cx="40" cy="42" r="8" fill="#ff5fa2"/><path d="M76 66l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffcf4d"/></svg>',

  html: () => `
    <div class="bar">${App.homeBtn()}
      <button class="stars pzpick" aria-label="Elegir puzle">🧩 Elegir</button>
      <span class="sp"></span>
      <button class="ib pzghost on" aria-label="Ver la imagen guía">👁️</button>
      <button class="ib pzmix" aria-label="Mezclar piezas">${App.icon('replay')}</button>
    </div>
    <div class="pzstage"><canvas class="pzcv"></canvas></div>
    <input type="file" accept="image/*" class="pzfile" hidden>
    <div class="sheet pzsheet"><div class="panel">
      <h2>¿Qué puzle hacemos?</h2>
      <h3>Piezas</h3>
      <div class="chips pzn" style="justify-content:flex-start"></div>
      <h3>Dibujo</h3>
      <div class="tgrid pzgrid"></div>
      <div class="row"><button class="btn ghost" data-close>Cerrar</button></div>
    </div></div>`,

  init(el) {
    const S = App.settings, q = s => el.querySelector(s);
    if (!S.pzN) S.pzN = 4;
    if (S.pzGhost === undefined) S.pzGhost = true;
    const wrap = q('.pzstage'), cv = q('.pzcv'), ctx = cv.getContext('2d'), sheet = q('.pzsheet');
    const PI = Math.PI, TAU = PI * 2, R = Math.random;
    const COUNTS = [4, 6, 9, 12, 16, 25, 36];
    const GRID = { 4: [2, 2], 6: [3, 2], 9: [3, 3], 12: [4, 3], 16: [4, 4], 25: [5, 5], 36: [6, 6] };
    const EF = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

    /* ---------- dibujos de la app ---------- */
    function em(c, ch, x, y, size, rot) { c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.font = `${Math.round(size)}px ${EF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(ch, 0, size * .05); c.restore(); }
    function sky(c, w, h, a, b) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    function cloud(c, x, y, s, col = '#fff') { c.fillStyle = col; for (const [dx, dy, r] of [[0, 0, .5], [.45, .1, .38], [-.45, .12, .36], [.15, -.25, .36]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); } }
    function rainbow(c, x, y, r, wdt) { ['#ff5d8f', '#ff9f43', '#ffd93d', '#6bcB77', '#4d96ff', '#9b5de5'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = wdt; c.beginPath(); c.arc(x, y, r - i * wdt, PI, 0); c.stroke(); }); }
    function sparkles(c, w, h, n, col = '#fff') { for (let i = 0; i < n; i++) { const x = ((i * 137.5) % 100) / 100 * w, y = ((i * 61.8) % 100) / 100 * h, s = (6 + (i % 4) * 4) * w / 900; c.fillStyle = col; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); } }
    function hills(c, w, h, y, col) { c.fillStyle = col; c.beginPath(); c.moveTo(0, h); c.lineTo(0, y); for (let x = 0; x <= w; x += w / 6) c.quadraticCurveTo(x + w / 12, y - h * .06, x + w / 6, y); c.lineTo(w, h); c.fill(); }
    const SCENES = [
      ['Unicornio', (c, w, h) => { const u = Math.min(w, h); sky(c, w, h, '#ffc6e8', '#e9d1ff'); rainbow(c, w * .5, h * .62, u * .5, u * .045); cloud(c, w * .18, h * .62, u * .14); cloud(c, w * .82, h * .62, u * .14); hills(c, w, h, h * .78, '#c8f0c0'); sparkles(c, w, h, 26); em(c, '🦄', w * .5, h * .58, u * .5); em(c, '🌸', w * .12, h * .9, u * .12); em(c, '🌷', w * .88, h * .9, u * .12); em(c, '⭐', w * .85, h * .15, u * .1); em(c, '💖', w * .15, h * .18, u * .09); }],
      ['Castillo', (c, w, h) => { const u = Math.min(w, h); sky(c, w, h, '#ffd9f0', '#fff0d6'); em(c, '☀️', w * .85, h * .14, u * .14); cloud(c, w * .2, h * .16, u * .12); hills(c, w, h, h * .72, '#f7b6dc'); em(c, '🏰', w * .5, h * .5, u * .55); em(c, '👸', w * .25, h * .8, u * .26); em(c, '🌷', w * .72, h * .86, u * .12); em(c, '🌷', w * .84, h * .88, u * .1); sparkles(c, w, h, 18); em(c, '👑', w * .14, h * .4, u * .1); }],
      ['Hada', (c, w, h) => { const u = Math.min(w, h); sky(c, w, h, '#6d3fa6', '#f29bd3'); sparkles(c, w, h, 40, '#fff6c9'); em(c, '🌙', w * .82, h * .15, u * .16); hills(c, w, h, h * .8, '#9d5fc2'); em(c, '🧚', w * .5, h * .48, u * .48); em(c, '🍄', w * .15, h * .85, u * .17); em(c, '🌼', w * .82, h * .88, u * .12); em(c, '✨', w * .25, h * .3, u * .12); }],
      ['Sirena', (c, w, h) => { const u = Math.min(w, h); sky(c, w, h, '#7fd8ff', '#c39bff'); c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 18; i++) { c.beginPath(); c.arc(((i * 53) % 100) / 100 * w, ((i * 37) % 100) / 100 * h, (4 + i % 5 * 3) * u / 900, 0, TAU); c.fill(); } c.fillStyle = '#ffd6a5'; c.fillRect(0, h * .85, w, h * .15); c.strokeStyle = '#3fbf8f'; c.lineWidth = u * .02; c.lineCap = 'round'; for (const x of [.08, .14, .9]) { c.beginPath(); c.moveTo(w * x, h); c.bezierCurveTo(w * x - u * .05, h * .8, w * x + u * .05, h * .75, w * x, h * .6); c.stroke(); } em(c, '🧜‍♀️', w * .5, h * .5, u * .5); em(c, '🐚', w * .3, h * .9, u * .11); em(c, '🐠', w * .82, h * .3, u * .13); em(c, '🐙', w * .76, h * .85, u * .13); }],
      ['Tarta', (c, w, h) => { const u = Math.min(w, h); c.fillStyle = '#ffd1ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; for (let y = 0; y < h; y += u * .1) for (let x = (y / (u * .1)) % 2 ? u * .05 : 0; x < w; x += u * .1) { c.beginPath(); c.arc(x, y, u * .015, 0, TAU); c.fill(); } em(c, '🎂', w * .5, h * .58, u * .5); em(c, '🎈', w * .15, h * .25, u * .2); em(c, '🎈', w * .85, h * .22, u * .18, .2); em(c, '🎁', w * .15, h * .85, u * .15); em(c, '🧁', w * .86, h * .85, u * .15); sparkles(c, w, h, 16, '#ffcf4d'); }],
      ['Gatitos', (c, w, h) => { const u = Math.min(w, h); sky(c, w, h, '#ffe0f0', '#ffc2dd'); for (let i = 0; i < 12; i++) em(c, '💗', ((i * 71) % 100) / 100 * w, ((i * 43) % 100) / 100 * h, u * .06); em(c, '🐱', w * .33, h * .55, u * .38); em(c, '😺', w * .7, h * .58, u * .34); em(c, '🎀', w * .33, h * .3, u * .16); em(c, '🧶', w * .5, h * .86, u * .14); }],
      ['Mariposas', (c, w, h) => { const u = Math.min(w, h); sky(c, w, h, '#d8f3ff', '#fff2fa'); hills(c, w, h, h * .7, '#bff0b3'); for (let i = 0; i < 7; i++) em(c, ['🌸', '🌻', '🌷', '🌼'][i % 4], w * (.08 + i * .14), h * (.84 + (i % 2) * .06), u * .12); em(c, '🦋', w * .5, h * .4, u * .36); em(c, '🦋', w * .18, h * .22, u * .16, -.3); em(c, '🦋', w * .82, h * .55, u * .18, .3); sparkles(c, w, h, 14, '#ffb3d9'); }],
      ['Arcoíris', (c, w, h) => { const u = Math.min(w, h); sky(c, w, h, '#a8dcff', '#ffd6f0'); rainbow(c, w * .5, h * .75, u * .62, u * .07); cloud(c, w * .16, h * .75, u * .2); cloud(c, w * .84, h * .75, u * .2); em(c, '💖', w * .5, h * .5, u * .22); sparkles(c, w, h, 30); em(c, '⭐', w * .2, h * .2, u * .1); em(c, '⭐', w * .8, h * .25, u * .08); }]
    ];

    /* ---------- estado ---------- */
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, running = false, t0 = 0;
    let src = null, srcName = '', cols = 2, rows = 2, pieces = [], board = null, drag = null, done = false, sparks = [], doneT = 0, sceneIdx = 0;

    /* ---------- forma de las piezas ---------- */
    /* salientes clásicos: cuello estrecho y cabeza redonda. u: a lo largo del lado; v: hacia fuera */
    const TAB = [[.36, 0, .40, .0, .40, .08], [.34, .2, .4, .3, .5, .3], [.6, .3, .66, .2, .6, .08], [.6, 0, .64, 0, .64, 0]];
    function side(p, x0, y0, ux, uy, nx, ny, len, d, S) {
      if (!d) { p.lineTo(x0 + ux * len, y0 + uy * len); return; }
      const P = (u, v) => [x0 + ux * len * u + nx * S * v * d, y0 + uy * len * u + ny * S * v * d];
      p.lineTo(...P(.36, 0));
      for (const [a, b, c2, d2, e, f] of TAB.slice(0, 3)) p.bezierCurveTo(...P(a, b), ...P(c2, d2), ...P(e, f));
      p.bezierCurveTo(...P(.58, .04), ...P(.6, 0), ...P(.64, 0));
      p.lineTo(x0 + ux * len, y0 + uy * len);
    }
    function piecePath(w, h, sides, off) {
      const p = new Path2D(), S = Math.min(w, h), o = off;
      p.moveTo(o, o);
      side(p, o, o, 1, 0, 0, -1, w, sides[0], S);
      side(p, o + w, o, 0, 1, 1, 0, h, sides[1], S);
      side(p, o + w, o + h, -1, 0, 0, 1, w, sides[2], S);
      side(p, o, o + h, 0, -1, -1, 0, h, sides[3], S);
      p.closePath(); return p;
    }

    /* ---------- preparar ---------- */
    function layoutBoard() {
      const r = wrap.getBoundingClientRect(); if (r.width < 10) return false;
      dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const portrait = H > W;
      const aspect = cols / rows;
      let bw, bh;
      if (portrait) { bw = Math.min(W - 30, (H * .56) * aspect); bh = bw / aspect; }
      else { bh = Math.min(H - 30, (W * .56) / aspect); bw = bh * aspect; }
      const bx = portrait ? (W - bw) / 2 : 16, by = portrait ? 16 : (H - bh) / 2;
      board = { x: bx, y: by, w: bw, h: bh, cw: bw / cols, ch: bh / rows, portrait };
      return true;
    }
    function build(keepPositions) {
      if (!src || !layoutBoard()) return;
      const { cw, ch } = board, S = Math.min(cw, ch), pad = Math.ceil(S * .34);
      if (!keepPositions) {
        const vt = [], hz = [];
        for (let r = 0; r < rows; r++) { vt[r] = []; for (let c = 0; c < cols - 1; c++) vt[r][c] = R() < .5 ? 1 : -1; }
        for (let r = 0; r < rows - 1; r++) { hz[r] = []; for (let c = 0; c < cols; c++) hz[r][c] = R() < .5 ? 1 : -1; }
        pieces = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const sides = [r === 0 ? 0 : -hz[r - 1][c], c === cols - 1 ? 0 : vt[r][c], r === rows - 1 ? 0 : hz[r][c], c === 0 ? 0 : -vt[r][c - 1]];
          pieces.push({ r, c, sides, placed: false, gx: 0, gy: 0 });
        }
      }
      /* imagen del tamaño del tablero (recortada al centro si es una foto) */
      const img = document.createElement('canvas'); img.width = Math.round(board.w * dpr); img.height = Math.round(board.h * dpr);
      const ix = img.getContext('2d');
      const sw = src.width, sh = src.height, a = board.w / board.h;
      let cw0 = sw, ch0 = sw / a; if (ch0 > sh) { ch0 = sh; cw0 = sh * a; }
      ix.drawImage(src, (sw - cw0) / 2, (sh - ch0) / 2, cw0, ch0, 0, 0, img.width, img.height);
      board.img = img;
      for (const p of pieces) {
        p.pad = pad; p.path = piecePath(cw, ch, p.sides, pad);
        const c = document.createElement('canvas'); c.width = Math.ceil((cw + pad * 2) * dpr); c.height = Math.ceil((ch + pad * 2) * dpr);
        const x = c.getContext('2d'); x.scale(dpr, dpr);
        x.save(); x.clip(p.path); x.drawImage(img, 0, 0, img.width, img.height, pad - p.c * cw, pad - p.r * ch, board.w, board.h);
        /* relieve para que se vean bien las piezas */
        x.lineJoin = 'round';
        x.save(); x.translate(-1, -1); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 3; x.stroke(p.path); x.restore();
        x.save(); x.translate(1.2, 1.2); x.strokeStyle = 'rgba(70,0,50,.35)'; x.lineWidth = 3; x.stroke(p.path); x.restore();
        x.restore();
        x.strokeStyle = 'rgba(120,30,90,.7)'; x.lineWidth = 1.6; x.stroke(p.path);
        p.canvas = c;
        const sh2 = document.createElement('canvas'); sh2.width = c.width; sh2.height = c.height; const y = sh2.getContext('2d'); y.scale(dpr, dpr); y.filter = 'blur(4px)'; y.fillStyle = 'rgba(80,0,60,.45)'; y.fill(p.path); p.shadow = sh2;
      }
      if (!keepPositions) scatter();
    }
    function scatter() {
      const { cw, ch } = board;
      const area = board.portrait ? { x: 6, y: board.y + board.h + 10, w: W - 12, h: H - (board.y + board.h + 10) - 6 } : { x: board.x + board.w + 10, y: 6, w: W - (board.x + board.w + 10) - 6, h: H - 12 };
      const loose = App.shuffle(pieces.filter(p => !p.placed)), n = loose.length;
      if (!(area.w > cw * .8 && area.h > ch * .8)) { area.x = 6; area.y = 6; area.w = W - 12; area.h = H - 12; }
      /* repartir en una cuadrícula holgada para que se vean todas */
      const ar = area.w / area.h;
      let nc = Math.max(1, Math.round(Math.sqrt(n * ar * ch / cw))), nr = Math.ceil(n / nc);
      while (nc * nr < n) nr++;
      const sx = nc > 1 ? (area.w - cw) / (nc - 1) : 0, sy = nr > 1 ? (area.h - ch) / (nr - 1) : 0;
      loose.forEach((p, i) => {
        const cc = i % nc, rr = Math.floor(i / nc);
        let x = area.x + (nc > 1 ? cc * sx : (area.w - cw) / 2) + (R() - .5) * Math.min(12, sx * .15);
        let y = area.y + (nr > 1 ? rr * sy : (area.h - ch) / 2) + (R() - .5) * Math.min(12, sy * .15);
        x = Math.max(4, Math.min(W - cw - 4, x)); y = Math.max(4, Math.min(H - ch - 4, y));
        p.gx = (x - board.x) / cw; p.gy = (y - board.y) / ch;
      });
      done = false;
    }
    function use(canvas, name) {
      src = canvas; srcName = name; [cols, rows] = GRID[S.pzN] || [2, 2]; done = false; sparks = [];
      build(false); App.say(`¡Puzle de ${name}!`);
    }
    function sceneCanvas(i, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; SCENES[i][1](c.getContext('2d'), w, h); return c; }
    function useScene(i) { sceneIdx = i; [cols, rows] = GRID[S.pzN] || [2, 2]; const big = 1100; const w = cols >= rows ? big : Math.round(big * cols / rows), h = cols >= rows ? Math.round(big * rows / cols) : big; use(sceneCanvas(i, w, h), SCENES[i][0].toLowerCase()); }

    /* ---------- elegir ---------- */
    function renderSheet() {
      q('.pzn').innerHTML = COUNTS.map(n => `<button class="chip${n === S.pzN ? ' on' : ''}" data-n="${n}">${n}</button>`).join('');
      q('.pzgrid').innerHTML = `<button data-ph="1">${App.icon('cam')}Foto del móvil</button>` + SCENES.map((s, i) => `<button data-sc="${i}" aria-label="${s[0]}"><canvas width="160" height="160"></canvas></button>`).join('');
      q('.pzgrid').querySelectorAll('canvas').forEach((cnv, i) => SCENES[i][1](cnv.getContext('2d'), 160, 160));
    }
    q('.pzn').addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (!b) return; S.pzN = +b.dataset.n; App.saveSettings(); q('.pzn').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); App.sfx.pop(); });
    q('.pzgrid').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      App.closeSheet(sheet); App.sfx.pop();
      if (b.dataset.ph) q('.pzfile').click(); else useScene(+b.dataset.sc);
    });
    q('.pzfile').addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { const im = await App.loadImg(f); const c = document.createElement('canvas'); const k = Math.min(1, 1400 / Math.max(im.naturalWidth, im.naturalHeight)); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); [cols, rows] = GRID[S.pzN] || [2, 2]; use(c, 'tu foto'); }
      catch (err) { App.toast('No se pudo abrir esa foto.'); }
    });
    q('.pzpick').addEventListener('click', () => { renderSheet(); App.openSheet(sheet); });
    const ghostB = q('.pzghost');
    ghostB.addEventListener('click', () => { S.pzGhost = !S.pzGhost; App.saveSettings(); ghostB.classList.toggle('on', S.pzGhost); App.sfx.pop(); });
    q('.pzmix').addEventListener('click', () => { for (const p of pieces) p.placed = false; scatter(); App.sfx.flip(); });

    /* ---------- arrastrar ---------- */
    const pos = p => ({ x: board.x + p.gx * board.cw - p.pad, y: board.y + p.gy * board.ch - p.pad });
    cv.addEventListener('pointerdown', e => {
      if (!board || done) return; e.preventDefault();
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i]; if (p.placed) continue;
        const o = pos(p);
        if (ctx.isPointInPath(p.path, (x - o.x) * dpr, (y - o.y) * dpr)) {
          pieces.splice(i, 1); pieces.push(p);
          drag = { id: e.pointerId, p, dx: x - (board.x + p.gx * board.cw), dy: y - (board.y + p.gy * board.ch) };
          try { cv.setPointerCapture(e.pointerId); } catch (_) { }
          App.sfx.pop(); return;
        }
      }
    });
    cv.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, p = drag.p;
      p.gx = (x - drag.dx - board.x) / board.cw; p.gy = (y - drag.dy - board.y) / board.ch;
    });
    const up = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const p = drag.p; drag = null;
      const tol = S.pzN <= 9 ? .38 : .3;
      if (Math.abs(p.gx - p.c) < tol && Math.abs(p.gy - p.r) < tol) {
        p.placed = true; p.snap = { fx: p.gx, fy: p.gy, t: 0 };
        pieces.splice(pieces.indexOf(p), 1); pieces.unshift(p);
        click();
        const cx = board.x + (p.c + .5) * board.cw, cy = board.y + (p.r + .5) * board.ch;
        for (let i = 0; i < 10; i++) { const a = R() * TAU, v = 60 + R() * 120; sparks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, c: ['#fff', '#ffcf4d', '#ff8fc8'][i % 3] }); }
        if (pieces.every(q2 => q2.placed)) finish();
      } else {
        /* que no se pierda fuera de la pantalla */
        p.gx = Math.max(-p.pad / board.cw * 0 + (-board.x) / board.cw, Math.min((W - board.x - board.cw) / board.cw, p.gx));
        p.gy = Math.max((-board.y) / board.ch, Math.min((H - board.y - board.ch) / board.ch, p.gy));
      }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    function click() { const a = App.audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(1400, t + .06); g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .14); }
    function finish() {
      done = true; doneT = 0;
      setTimeout(() => { App.sfx.win(); App.confetti(160); App.say(App.kid() ? `¡Muy bien, ${App.kid()}! ¡Has terminado el puzle!` : '¡Muy bien! ¡Has terminado el puzle!'); }, 300);
      setTimeout(() => App.win(() => { renderSheet(); App.openSheet(sheet); }, '¡Puzle terminado!', 'Otro puzle'), 2200);
    }

    /* ---------- dibujo ---------- */
    function draw(dt) {
      t0 += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#ffe3f3'); bg.addColorStop(1, '#f1defc'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!board || !src) {
        ctx.fillStyle = '#c2185b'; ctx.font = `800 22px "Baloo 2",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Toca "🧩 Elegir" para empezar', W / 2, H / 2); return;
      }
      const B = board;
      ctx.save(); ctx.shadowColor = 'rgba(150,40,110,.25)'; ctx.shadowBlur = 14; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(B.x - 8, B.y - 8, B.w + 16, B.h + 16, 16); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fbe4f2'; ctx.fillRect(B.x, B.y, B.w, B.h);
      if (S.pzGhost && !done) { ctx.globalAlpha = .28; ctx.drawImage(B.img, B.x, B.y, B.w, B.h); ctx.globalAlpha = 1; }
      if (!done) { ctx.save(); ctx.strokeStyle = 'rgba(194,24,91,.22)'; ctx.lineWidth = 1.2; for (const p of pieces) { ctx.save(); ctx.translate(B.x + p.c * B.cw - p.pad, B.y + p.r * B.ch - p.pad); ctx.stroke(p.path); ctx.restore(); } ctx.restore(); }
      for (const p of pieces) {
        if (p.snap) { p.snap.t += dt / .15; const k = Math.min(1, p.snap.t); p.gx = p.snap.fx + (p.c - p.snap.fx) * k; p.gy = p.snap.fy + (p.r - p.snap.fy) * k; if (k >= 1) p.snap = null; }
        const o = pos(p), cw = p.canvas.width / dpr, chh = p.canvas.height / dpr;
        if (!p.placed) { const lift = drag && drag.p === p ? 6 : 2; ctx.drawImage(p.shadow, o.x + lift, o.y + lift * 1.5, cw, chh); }
        const sc = drag && drag.p === p ? 1.05 : 1;
        if (sc !== 1) { ctx.save(); ctx.translate(o.x + cw / 2, o.y + chh / 2); ctx.scale(sc, sc); ctx.drawImage(p.canvas, -cw / 2, -chh / 2, cw, chh); ctx.restore(); }
        else ctx.drawImage(p.canvas, o.x, o.y, cw, chh);
      }
      if (done) { doneT += dt; const a = Math.min(1, doneT / .6); ctx.globalAlpha = a; ctx.drawImage(B.img, B.x, B.y, B.w, B.h); ctx.globalAlpha = 1; const sx = B.x + ((doneT * .6) % 1.4 - .2) * B.w; const g = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.save(); ctx.beginPath(); ctx.rect(B.x, B.y, B.w, B.h); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(B.x, B.y, B.w, B.h); ctx.restore(); }
      for (const s of sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; ctx.globalAlpha = Math.max(0, 1 - s.t / .6); ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      sparks = sparks.filter(s => s.t < .6);
    }
    function frame(ts) { if (!running) return; const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; draw(dt); raf = requestAnimationFrame(frame); }
    const ro = new ResizeObserver(() => { if (el.classList.contains('on') && src) build(true); else if (el.classList.contains('on')) layoutBoard(); }); ro.observe(wrap);

    this.begin = () => {
      ghostB.classList.toggle('on', S.pzGhost);
      layoutBoard(); if (!src) useScene(Math.floor(R() * SCENES.length)); else build(true);
      running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    };
    this.end = () => { running = false; cancelAnimationFrame(raf); };
    this._debug = { get pieces() { return pieces; }, get board() { return board; }, useScene, solveAll() { for (const p of pieces) { p.gx = p.c; p.gy = p.r; } } };
  },

  start() { this.begin(); },
  stop() { this.end(); }
});
