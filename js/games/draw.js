/* JUEGO: PINTAR
   Dos lienzos superpuestos: abajo la pintura, arriba las líneas del dibujo para colorear
   (así la peque nunca tapa ni borra las líneas, y el cubo rellena dentro de cada zona).
   "No salirse de las líneas": al empezar un trazo se calcula la zona del dibujo donde ha
   tocado y todo ese trazo se recorta a esa zona. */
App.registerGame({
  id: 'draw', title: 'Pintar', color: 'var(--coral)', order: 1,
  art: '<svg viewBox="0 0 120 100"><ellipse cx="56" cy="54" rx="48" ry="38" fill="#fff"/><circle cx="34" cy="40" r="9" fill="#ffd21f"/><circle cx="56" cy="30" r="9" fill="#2f7bff"/><circle cx="78" cy="40" r="9" fill="#2bd15a"/><circle cx="36" cy="66" r="9" fill="#8b5cf6"/><circle cx="70" cy="68" r="11" fill="#ff5d6c" opacity=".25"/><path d="M80 82l30-46" stroke="#8b5a2b" stroke-width="9" stroke-linecap="round"/><path d="M108 38l6-10" stroke="#1d1d1f" stroke-width="9" stroke-linecap="round"/></svg>',

  html() {
    const I = App.icon;
    return `
    <div class="bar">
      ${App.homeBtn()}
      <button class="ib" data-a="undo" aria-label="Deshacer">${I('undo')}</button>
      <span class="sp"></span>
      <button class="ib" data-a="tpl" aria-label="Dibujos para colorear">${I('tpl')}</button>
      <button class="ib" data-a="photo" aria-label="Foto a dibujo">${I('cam')}</button>
      <button class="ib" data-a="save" aria-label="Guardar dibujo">${I('save')}</button>
      <button class="ib" data-a="clear" aria-label="Borrar todo (mantén pulsado)">${I('bin')}<i class="ring"></i></button>
    </div>
    <div class="stage"><canvas class="paint"></canvas><canvas class="lines"></canvas></div>
    <div class="tools">
      <div class="stickers" hidden></div>
      <div class="colors"></div>
      <div class="tl">
        <button class="ib dotb" data-a="size" aria-label="Grosor"><i></i></button>
        <button class="ib on" data-tool="brush" aria-label="Pincel">${I('brush')}</button>
        <button class="ib" data-tool="pencil" aria-label="Lápiz de color">${I('pencil')}</button>
        <button class="ib" data-tool="rainbow" aria-label="Arcoíris">${I('rainbow')}</button>
        <button class="ib" data-tool="fill" aria-label="Rellenar">${I('bucket')}</button>
        <button class="ib" data-tool="sticker" aria-label="Pegatinas">${I('star')}</button>
        <button class="ib" data-tool="eraser" aria-label="Goma">${I('eraser')}</button>
      </div>
    </div>
    <input type="file" accept="image/*" class="pickLine" hidden>

    <div class="sheet tplSheet"><div class="panel">
      <h2>¿Qué pintamos?</h2>
      <p class="muted">Elige un dibujo para colorear o convierte una foto del móvil.</p>
      <div class="tgrid"></div>
      <div class="row"><button class="btn ghost" data-close>Cerrar</button></div>
    </div></div>

    <div class="sheet lineSheet"><div class="panel">
      <h2>Foto para colorear</h2>
      <div class="prevbox"><canvas class="linePrev" width="10" height="10"></canvas><div class="busy">Preparando…</div></div>
      <div class="seg"><button data-style="fino" class="on">Contorno fino</button><button data-style="cartoon">Cartoon</button></div>
      <label class="range">Menos líneas <input type="range" class="detail" min="1" max="10" value="5"> Más</label>
      <div class="row"><button class="btn ghost" data-close>Cancelar</button><button class="btn useLines">Pintar esta</button></div>
    </div></div>

    <div class="sheet saveSheet"><div class="panel">
      <h2>¡Qué bonito!</h2>
      <p class="muted">Pulsa Descargar, o mantén pulsada la imagen para guardarla.</p>
      <img class="savedImg" alt="Dibujo terminado">
      <div class="row"><a class="btn ghost dl" download="dibujo.png" href="#">Descargar</a><button class="btn" data-close>Seguir pintando</button></div>
    </div></div>`;
  },

  parentHtml: () => `
    <div class="tg"><span>Pintar: no salirse de las líneas en los dibujos para colorear</span><button class="sw2" role="switch" data-set="drawClip" aria-label="No salirse de las líneas"></button></div>`,

  init(el) {
    const S = App.settings;
    if (S.drawClip === undefined) { S.drawClip = true; App.saveSettings(); }
    const q = s => el.querySelector(s), qa = s => [...el.querySelectorAll(s)];
    const stage = q('.stage'), pc = q('.paint'), lc = q('.lines');
    const p = pc.getContext('2d', { willReadFrequently: true }), l = lc.getContext('2d', { willReadFrequently: true });
    const scratch = document.createElement('canvas'), sx = scratch.getContext('2d');
    const COLORS = App.data.colors, STK = App.data.stickers, SIZES = [7, 16, 32];
    let color = '#ff3b4e', size = 16, tool = 'brush', sticker = STK[0], hue = 0, k = 1, made = false;
    const undo = [], pts = new Map();

    q('.colors').innerHTML = COLORS.map(c => `<button class="swc${c === color ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('');
    q('.stickers').innerHTML = STK.map(s => `<button data-s="${s}"${s === sticker ? ' class="on"' : ''}>${s}</button>`).join('');
    const sizeDot = () => { const d = q('[data-a=size] i'), px = { 7: 8, 16: 15, 32: 24 }[size]; d.style.width = d.style.height = px + 'px'; };
    sizeDot();

    /* ---- lienzos ---- */
    function make() {
      const r = stage.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
      const d = Math.min(devicePixelRatio || 1, 2);
      for (const c of [pc, lc, scratch]) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
      p.fillStyle = '#fff'; p.fillRect(0, 0, pc.width, pc.height); l.clearRect(0, 0, lc.width, lc.height);
      undo.length = 0; made = true; linesChanged(); place();
    }
    function place() {
      const r = stage.getBoundingClientRect(); if (!made || !r.width) return;
      const s = Math.min(r.width / pc.width, r.height / pc.height), w = pc.width * s, h = pc.height * s;
      for (const c of [pc, lc]) { c.style.width = w + 'px'; c.style.height = h + 'px'; c.style.left = (r.width - w) / 2 + 'px'; c.style.top = (r.height - h) / 2 + 'px'; }
    }
    this.fit = () => { if (!made) make(); else place(); };
    const ro = new ResizeObserver(() => { if (el.classList.contains('on')) this.fit(); }); ro.observe(stage);

    /* transparencia de la capa de líneas, guardada para no leerla en cada trazo */
    let LA = null, hasLines = false;
    function linesChanged() { LA = null; }
    function linesAlpha() {
      if (!LA) {
        const d = l.getImageData(0, 0, lc.width, lc.height).data, n = lc.width * lc.height;
        LA = new Uint8Array(n); hasLines = false;
        for (let i = 0; i < n; i++) { const a = d[i * 4 + 3]; LA[i] = a; if (a > 90) hasLines = true; }
      }
      return LA;
    }

    /* relleno por líneas genérico: marca en "seen" todos los píxeles conectados que cumplen ok(i) */
    function scanFill(w, h, x, y, ok, onPixel) {
      const seen = new Uint8Array(w * h), st = [x, y];
      while (st.length) {
        const cy = st.pop(); let cx = st.pop(), i = cy * w + cx;
        while (cx > 0 && !seen[i - 1] && ok(i - 1)) { cx--; i--; }
        let up = false, dn = false;
        while (cx < w && !seen[i] && ok(i)) {
          seen[i] = 1; if (onPixel) onPixel(i);
          if (cy > 0) { const j = i - w; if (!seen[j] && ok(j)) { if (!up) { st.push(cx, cy - 1); up = true; } } else up = false; }
          if (cy < h - 1) { const j = i + w; if (!seen[j] && ok(j)) { if (!dn) { st.push(cx, cy + 1); dn = true; } } else dn = false; }
          cx++; i++;
        }
      }
      return seen;
    }
    /* si el dedo cae justo encima de una línea, busca el hueco más cercano */
    function offLine(A, w, h, x, y) {
      if (A[y * w + x] <= 90) return [x, y];
      const R = Math.round(10 * k);
      for (let r = 1; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && A[yy * w + xx] <= 90) return [xx, yy];
      }
      return null;
    }
    /* máscara de la zona donde empieza el trazo (o null si se puede pintar libre) */
    function regionMask(x, y) {
      if (!S.drawClip) return null;
      const A = linesAlpha(); if (!hasLines) return null;
      const w = lc.width, h = lc.height, st = offLine(A, w, h, x | 0, y | 0); if (!st) return null;
      const seen = scanFill(w, h, st[0], st[1], i => A[i] <= 90);
      for (let pass = 0; pass < 2; pass++) { const prev = seen.slice(); for (let i = w; i < w * h - w; i++) if (!prev[i] && (prev[i - 1] || prev[i + 1] || prev[i - w] || prev[i + w])) seen[i] = 1; }
      const m = document.createElement('canvas'); m.width = w; m.height = h;
      const mx = m.getContext('2d'), id = mx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) if (seen[i]) id.data[i * 4 + 3] = 255;
      mx.putImageData(id, 0, 0);
      return m;
    }

    /* ---- lápiz de color: grano de papel teñido de cada color ---- */
    const grain = (() => {
      /* ruido grueso suavizado (la textura del papel) mezclado con ruido fino */
      const N = 128, sm = document.createElement('canvas'); sm.width = N / 2; sm.height = N / 4;
      const sxx = sm.getContext('2d'), sid = sxx.createImageData(sm.width, sm.height);
      for (let i = 0; i < sm.width * sm.height; i++) sid.data[i * 4 + 3] = Math.random() * 255;
      sxx.putImageData(sid, 0, 0);
      const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
      x.imageSmoothingEnabled = true; x.drawImage(sm, 0, 0, N, N);
      const id = x.getImageData(0, 0, N, N);
      for (let i = 0; i < N * N; i++) { const a = id.data[i * 4 + 3] * .75 + Math.random() * 64; id.data[i * 4 + 3] = a < 95 ? 0 : Math.min(255, (a - 95) * 2.2); }
      x.putImageData(id, 0, 0); return c;
    })();
    const pencilCache = new Map();
    function pencilPattern(ctx, col) {
      if (!pencilCache.has(col)) {
        const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
        x.fillStyle = col; x.fillRect(0, 0, 128, 128); x.globalCompositeOperation = 'destination-in'; x.drawImage(grain, 0, 0);
        pencilCache.set(col, c);
      }
      return ctx.createPattern(pencilCache.get(col), 'repeat');
    }

    /* ---- trazos ---- */
    function snap(withLines) {
      const a = document.createElement('canvas'); a.width = pc.width; a.height = pc.height; a.getContext('2d').drawImage(pc, 0, 0);
      let b = null; if (withLines) { b = document.createElement('canvas'); b.width = lc.width; b.height = lc.height; b.getContext('2d').drawImage(lc, 0, 0); }
      undo.push({ a, b }); if (undo.length > 12) undo.shift();
    }
    function doUndo() { const s = undo.pop(); if (!s) { App.sfx.no(); return; } p.drawImage(s.a, 0, 0); if (s.b) { l.clearRect(0, 0, lc.width, lc.height); l.drawImage(s.b, 0, 0); linesChanged(); } App.sfx.pop(); }
    function pos(e) { const r = pc.getBoundingClientRect(); k = pc.width / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; }
    const width = () => size * k * (tool === 'eraser' ? 2 : tool === 'pencil' ? .8 : 1);
    function style(ctx) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width(); ctx.globalAlpha = 1;
      if (tool === 'eraser') ctx.strokeStyle = ctx.fillStyle = '#fff';
      else if (tool === 'rainbow') { hue = (hue + 5) % 360; ctx.strokeStyle = ctx.fillStyle = `hsl(${hue} 95% 55%)`; }
      else if (tool === 'pencil') { const pat = pencilPattern(ctx, color); ctx.strokeStyle = ctx.fillStyle = pat; ctx.globalAlpha = .55; }
      else ctx.strokeStyle = ctx.fillStyle = color;
    }
    function rawSeg(ctx, a, b, c, d) {
      style(ctx);
      if (a === c && b === d) { ctx.beginPath(); ctx.arc(a, b, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); }
      else if (tool === 'pencil') {
        /* dos pasadas un poco desplazadas: borde irregular como un lápiz de verdad */
        const j = ctx.lineWidth * .18;
        for (let t = 0; t < 2; t++) { const ox = (Math.random() - .5) * j, oy = (Math.random() - .5) * j; ctx.beginPath(); ctx.moveTo(a + ox, b + oy); ctx.lineTo(c + ox, d + oy); ctx.stroke(); }
      } else { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    function seg(ptr, a, b, c, d) {
      if (!ptr.mask) { rawSeg(p, a, b, c, d); return; }
      const r = width() / 2 + 4;
      const x0 = Math.max(0, Math.floor(Math.min(a, c) - r)), y0 = Math.max(0, Math.floor(Math.min(b, d) - r));
      const x1 = Math.min(pc.width, Math.ceil(Math.max(a, c) + r)), y1 = Math.min(pc.height, Math.ceil(Math.max(b, d) + r));
      const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
      rawSeg(sx, a, b, c, d);
      sx.globalCompositeOperation = 'destination-in'; sx.drawImage(ptr.mask, x0, y0, w, h, x0, y0, w, h); sx.globalCompositeOperation = 'source-over';
      p.drawImage(scratch, x0, y0, w, h, x0, y0, w, h);
      sx.clearRect(x0, y0, w, h);
    }
    function stamp(x, y) {
      const s = (size * 2.4 + 44) * k; p.save();
      p.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; p.textAlign = 'center'; p.textBaseline = 'middle';
      p.translate(x, y); p.rotate((Math.random() - .5) * .5); p.fillText(sticker, 0, 0); p.restore();
    }
    /* cubo de pintura: rellena la zona del mismo color, sin pasar las líneas del dibujo */
    function fill(x, y) {
      const w = pc.width, h = pc.height; if (x < 0 || y < 0 || x >= w || y >= h) return;
      const A = linesAlpha(), st = offLine(A, w, h, x, y); if (!st) return;
      [x, y] = st;
      const pd = p.getImageData(0, 0, w, h), d = pd.data;
      const n = parseInt(color.slice(1), 16), fr = n >> 16 & 255, fg = n >> 8 & 255, fb = n & 255;
      const i0 = (y * w + x) * 4, sr = d[i0], sg = d[i0 + 1], sb = d[i0 + 2];
      if (Math.abs(sr - fr) + Math.abs(sg - fg) + Math.abs(sb - fb) < 12) return;
      const ok = i => { const o = i * 4; return A[i] <= 90 && Math.abs(d[o] - sr) + Math.abs(d[o + 1] - sg) + Math.abs(d[o + 2] - sb) <= 70; };
      const seen = scanFill(w, h, x, y, ok, i => { const o = i * 4; d[o] = fr; d[o + 1] = fg; d[o + 2] = fb; d[o + 3] = 255; });
      for (let i = w; i < w * h - w; i++) { if (seen[i]) continue; const o = i * 4; if (A[i] > 20 && (seen[i - 1] || seen[i + 1] || seen[i - w] || seen[i + w])) { d[o] = fr; d[o + 1] = fg; d[o + 2] = fb; d[o + 3] = 255; } }
      p.putImageData(pd, 0, 0);
    }

    stage.addEventListener('pointerdown', e => {
      if (!made) return; e.preventDefault(); const [x, y] = pos(e);
      if (tool === 'fill') { snap(); fill(x | 0, y | 0); App.sfx.pop(); return; }
      if (tool === 'sticker') { snap(); stamp(x, y); App.sfx.pop(); return; }
      if (!pts.size) snap();
      try { stage.setPointerCapture(e.pointerId); } catch (_) { }
      const ptr = { x, y, mask: regionMask(x, y) };
      pts.set(e.pointerId, ptr); seg(ptr, x, y, x, y);
    });
    stage.addEventListener('pointermove', e => {
      const o = pts.get(e.pointerId); if (!o) return;
      let evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; if (!evs.length) evs = [e];
      for (const ev of evs) { const [x, y] = pos(ev); seg(o, o.x, o.y, x, y); o.x = x; o.y = y; }
    });
    const end = e => pts.delete(e.pointerId);
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);

    /* ---- controles ---- */
    function setTool(t) { tool = t; qa('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); q('.stickers').hidden = t !== 'sticker'; }
    q('.colors').addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      color = b.dataset.c; qa('.swc').forEach(s => s.classList.toggle('on', s === b));
      if (tool === 'eraser' || tool === 'rainbow' || tool === 'sticker') setTool('brush');
      App.sfx.pop();
    });
    q('.tl').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; App.sfx.pop();
      if (b.dataset.a === 'size') { size = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length]; sizeDot(); if (tool === 'fill' || tool === 'sticker') setTool('brush'); return; }
      setTool(b.dataset.tool);
    });
    q('.stickers').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; sticker = b.dataset.s; qa('.stickers button').forEach(x => x.classList.toggle('on', x === b)); App.sfx.pop(); });
    q('[data-a=undo]').addEventListener('click', doUndo);
    App.holdBtn(q('[data-a=clear]'), 900, () => { snap(); p.fillStyle = '#fff'; p.fillRect(0, 0, pc.width, pc.height); App.sfx.no(); }, () => App.toast('Mantén pulsado para borrar todo'));

    function setLines(fn) { snap(true); p.fillStyle = '#fff'; p.fillRect(0, 0, pc.width, pc.height); l.clearRect(0, 0, lc.width, lc.height); fn(l, lc.width, lc.height); linesChanged(); }

    /* guardar */
    q('[data-a=save]').addEventListener('click', () => {
      const c = document.createElement('canvas'); c.width = pc.width; c.height = pc.height;
      const x = c.getContext('2d'); x.drawImage(pc, 0, 0); x.drawImage(lc, 0, 0);
      const u = c.toDataURL('image/png'), when = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      q('.savedImg').src = u; const dl = q('.dl'); dl.href = u; dl.download = `dibujo-${when}.png`;
      App.openSheet(q('.saveSheet')); App.sfx.yes(); App.confetti(50);
    });

    /* dibujos para colorear */
    const T = App.data.templates;
    q('.tgrid').innerHTML = `<button data-t="blank">${App.icon('blank')}Hoja en blanco</button><button data-t="photo">${App.icon('cam')}Desde una foto</button>` + T.map((t, i) => `<button data-t="${i}" aria-label="${t[0]}"><canvas width="160" height="160"></canvas></button>`).join('');
    qa('.tgrid canvas').forEach((cv, i) => App.drawTemplate(T[i][1], cv.getContext('2d'), 160, 160));
    q('[data-a=tpl]').addEventListener('click', () => App.openSheet(q('.tplSheet')));
    q('.tgrid').addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return; const t = b.dataset.t;
      App.closeSheet(q('.tplSheet')); App.sfx.pop();
      if (t === 'blank') make();
      else if (t === 'photo') q('.pickLine').click();
      else { setLines((c, w, h) => App.drawTemplate(T[+t][1], c, w, h)); App.say(T[+t][0]); }
    });

    /* foto → dibujo */
    let img = null, lstyle = 'fino', art = null;
    function renderLine() {
      if (!img) return; q('.busy').hidden = false;
      setTimeout(() => {
        try {
          art = App.lineArt(img, lstyle, +q('.detail').value);
          const pv = q('.linePrev'); pv.width = art.width; pv.height = art.height;
          const x = pv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, pv.width, pv.height); x.drawImage(art, 0, 0);
        } catch (err) { App.toast('No se pudo preparar esta foto.'); }
        q('.busy').hidden = true;
      }, 40);
    }
    q('[data-a=photo]').addEventListener('click', () => q('.pickLine').click());
    q('.pickLine').addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { img = await App.loadImg(f); App.openSheet(q('.lineSheet')); renderLine(); } catch (err) { App.toast('No se pudo abrir esa foto.'); }
    });
    q('.seg').addEventListener('click', e => { const b = e.target.closest('[data-style]'); if (!b) return; lstyle = b.dataset.style; qa('.seg button').forEach(x => x.classList.toggle('on', x === b)); renderLine(); });
    q('.detail').addEventListener('change', renderLine);
    q('.useLines').addEventListener('click', () => {
      if (!art) return; const a = art;
      setLines((c, w, h) => { const s = Math.min(w * .96 / a.width, h * .96 / a.height), dw = a.width * s, dh = a.height * s; c.imageSmoothingEnabled = true; c.drawImage(a, (w - dw) / 2, (h - dh) / 2, dw, dh); });
      App.closeSheet(q('.lineSheet')); App.sfx.yes();
    });
  },

  start() { this.fit(); }
});
