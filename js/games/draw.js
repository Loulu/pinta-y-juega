/* JUEGO: PINTAR
   Dos lienzos superpuestos: abajo la pintura, arriba las líneas del dibujo para colorear
   (así la peque nunca tapa ni borra las líneas, y el cubo rellena dentro de cada zona). */
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
        <button class="ib dotb" data-size="7" aria-label="Fino"><i style="width:8px;height:8px"></i></button>
        <button class="ib dotb on" data-size="16" aria-label="Medio"><i style="width:15px;height:15px"></i></button>
        <button class="ib dotb" data-size="32" aria-label="Gordo"><i style="width:24px;height:24px"></i></button>
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

  init(el) {
    const q = s => el.querySelector(s), qa = s => [...el.querySelectorAll(s)];
    const stage = q('.stage'), pc = q('.paint'), lc = q('.lines');
    const p = pc.getContext('2d', { willReadFrequently: true }), l = lc.getContext('2d', { willReadFrequently: true });
    const COLORS = App.data.colors, STK = App.data.stickers;
    let color = '#ff3b4e', size = 16, tool = 'brush', sticker = STK[0], hue = 0, k = 1, made = false;
    const undo = [], pts = new Map();

    q('.colors').innerHTML = COLORS.map(c => `<button class="swc${c === color ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('');
    q('.stickers').innerHTML = STK.map(s => `<button data-s="${s}"${s === sticker ? ' class="on"' : ''}>${s}</button>`).join('');

    /* el tamaño interno del lienzo se fija la primera vez; si la pantalla cambia se encaja sin deformar */
    function make() {
      const r = stage.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
      const d = Math.min(devicePixelRatio || 1, 2);
      for (const c of [pc, lc]) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
      p.fillStyle = '#fff'; p.fillRect(0, 0, pc.width, pc.height); l.clearRect(0, 0, lc.width, lc.height);
      undo.length = 0; made = true; place();
    }
    function place() {
      const r = stage.getBoundingClientRect(); if (!made || !r.width) return;
      const s = Math.min(r.width / pc.width, r.height / pc.height), w = pc.width * s, h = pc.height * s;
      for (const c of [pc, lc]) { c.style.width = w + 'px'; c.style.height = h + 'px'; c.style.left = (r.width - w) / 2 + 'px'; c.style.top = (r.height - h) / 2 + 'px'; }
    }
    this.fit = () => { if (!made) make(); else place(); };
    const ro = new ResizeObserver(() => { if (el.classList.contains('on')) this.fit(); }); ro.observe(stage);

    function snap(withLines) {
      const a = document.createElement('canvas'); a.width = pc.width; a.height = pc.height; a.getContext('2d').drawImage(pc, 0, 0);
      let b = null; if (withLines) { b = document.createElement('canvas'); b.width = lc.width; b.height = lc.height; b.getContext('2d').drawImage(lc, 0, 0); }
      undo.push({ a, b }); if (undo.length > 12) undo.shift();
    }
    function doUndo() { const s = undo.pop(); if (!s) { App.sfx.no(); return; } p.drawImage(s.a, 0, 0); if (s.b) { l.clearRect(0, 0, lc.width, lc.height); l.drawImage(s.b, 0, 0); } App.sfx.pop(); }
    function pos(e) { const r = pc.getBoundingClientRect(); k = pc.width / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; }
    function style() {
      p.lineCap = 'round'; p.lineJoin = 'round'; p.lineWidth = size * k * (tool === 'eraser' ? 2 : 1);
      if (tool === 'eraser') p.strokeStyle = p.fillStyle = '#fff';
      else if (tool === 'rainbow') { hue = (hue + 5) % 360; p.strokeStyle = p.fillStyle = `hsl(${hue} 95% 55%)`; }
      else p.strokeStyle = p.fillStyle = color;
    }
    const dot = (x, y) => { style(); p.beginPath(); p.arc(x, y, p.lineWidth / 2, 0, Math.PI * 2); p.fill(); };
    const seg = (a, b, c, d) => { style(); p.beginPath(); p.moveTo(a, b); p.lineTo(c, d); p.stroke(); };
    function stamp(x, y) {
      const s = (size * 2.4 + 44) * k; p.save();
      p.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; p.textAlign = 'center'; p.textBaseline = 'middle';
      p.translate(x, y); p.rotate((Math.random() - .5) * .5); p.fillText(sticker, 0, 0); p.restore();
    }
    /* cubo de pintura: relleno por líneas que se detiene en las líneas del dibujo */
    function fill(x, y) {
      const w = pc.width, h = pc.height; if (x < 0 || y < 0 || x >= w || y >= h) return;
      const pd = p.getImageData(0, 0, w, h), d = pd.data, ld = l.getImageData(0, 0, w, h).data;
      const n = parseInt(color.slice(1), 16), fr = n >> 16 & 255, fg = n >> 8 & 255, fb = n & 255;
      const i0 = (y * w + x) * 4; if (ld[i0 + 3] > 90) return;
      const sr = d[i0], sg = d[i0 + 1], sb = d[i0 + 2];
      if (Math.abs(sr - fr) + Math.abs(sg - fg) + Math.abs(sb - fb) < 12) return;
      const seen = new Uint8Array(w * h), st = [x, y];
      const ok = i => { const o = i * 4; return ld[o + 3] <= 90 && Math.abs(d[o] - sr) + Math.abs(d[o + 1] - sg) + Math.abs(d[o + 2] - sb) <= 70; };
      while (st.length) {
        const cy = st.pop(); let cx = st.pop(), i = cy * w + cx;
        while (cx > 0 && !seen[i - 1] && ok(i - 1)) { cx--; i--; }
        let up = false, dn = false;
        while (cx < w && !seen[i] && ok(i)) {
          seen[i] = 1; const o = i * 4; d[o] = fr; d[o + 1] = fg; d[o + 2] = fb; d[o + 3] = 255;
          if (cy > 0) { const j = i - w; if (!seen[j] && ok(j)) { if (!up) { st.push(cx, cy - 1); up = true; } } else up = false; }
          if (cy < h - 1) { const j = i + w; if (!seen[j] && ok(j)) { if (!dn) { st.push(cx, cy + 1); dn = true; } } else dn = false; }
          cx++; i++;
        }
      }
      for (let i = w; i < w * h - w; i++) { if (seen[i]) continue; const o = i * 4; if (ld[o + 3] > 20 && (seen[i - 1] || seen[i + 1] || seen[i - w] || seen[i + w])) { d[o] = fr; d[o + 1] = fg; d[o + 2] = fb; d[o + 3] = 255; } }
      p.putImageData(pd, 0, 0);
    }

    stage.addEventListener('pointerdown', e => {
      if (!made) return; e.preventDefault(); const [x, y] = pos(e);
      if (tool === 'fill') { snap(); fill(x | 0, y | 0); App.sfx.pop(); return; }
      if (tool === 'sticker') { snap(); stamp(x, y); App.sfx.pop(); return; }
      if (!pts.size) snap();
      try { stage.setPointerCapture(e.pointerId); } catch (_) { }
      pts.set(e.pointerId, { x, y }); dot(x, y);
    });
    stage.addEventListener('pointermove', e => {
      const o = pts.get(e.pointerId); if (!o) return;
      let evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; if (!evs.length) evs = [e];
      for (const ev of evs) { const [x, y] = pos(ev); seg(o.x, o.y, x, y); o.x = x; o.y = y; }
    });
    const end = e => pts.delete(e.pointerId);
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);

    function setTool(t) { tool = t; qa('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); q('.stickers').hidden = t !== 'sticker'; }
    q('.colors').addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      color = b.dataset.c; qa('.swc').forEach(s => s.classList.toggle('on', s === b));
      if (tool === 'eraser' || tool === 'rainbow' || tool === 'sticker') setTool('brush');
      App.sfx.pop();
    });
    q('.tl').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; App.sfx.pop();
      if (b.dataset.size) { size = +b.dataset.size; qa('[data-size]').forEach(x => x.classList.toggle('on', x === b)); if (tool === 'fill' || tool === 'sticker') setTool('brush'); return; }
      setTool(tool === b.dataset.tool ? 'brush' : b.dataset.tool);
    });
    q('.stickers').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; sticker = b.dataset.s; qa('.stickers button').forEach(x => x.classList.toggle('on', x === b)); App.sfx.pop(); });
    q('[data-a=undo]').addEventListener('click', doUndo);
    App.holdBtn(q('[data-a=clear]'), 900, () => { snap(); p.fillStyle = '#fff'; p.fillRect(0, 0, pc.width, pc.height); App.sfx.no(); }, () => App.toast('Mantén pulsado para borrar todo'));

    function setLines(fn) { snap(true); p.fillStyle = '#fff'; p.fillRect(0, 0, pc.width, pc.height); l.clearRect(0, 0, lc.width, lc.height); fn(l, lc.width, lc.height); }

    /* guardar */
    q('[data-a=save]').addEventListener('click', () => {
      const c = document.createElement('canvas'); c.width = pc.width; c.height = pc.height;
      const x = c.getContext('2d'); x.drawImage(pc, 0, 0); x.drawImage(lc, 0, 0);
      const u = c.toDataURL('image/png'), stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      q('.savedImg').src = u; const dl = q('.dl'); dl.href = u; dl.download = `dibujo-${stamp}.png`;
      App.openSheet(q('.saveSheet')); App.sfx.yes(); App.confetti(50);
    });

    /* dibujos para colorear */
    const T = App.data.templates;
    q('.tgrid').innerHTML = `<button data-t="blank">${App.icon('blank')}Hoja en blanco</button>` + T.map((t, i) => `<button data-t="${i}" aria-label="${t[0]}"><canvas width="160" height="160"></canvas></button>`).join('') + `<button data-t="photo">${App.icon('cam')}Desde una foto</button>`;
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
