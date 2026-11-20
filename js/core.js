/* NÚCLEO DE LA APP
   Todo lo que comparten los juegos vive en el objeto global App:
   ajustes, sonidos, voz, avisos, confeti, paneles, rejillas y el registro de juegos.
   Un juego nuevo solo necesita llamar a App.registerGame({...}) (ver js/games/_plantilla.txt). */
window.App = (() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* guardado en el móvil (localStorage), a prueba de fallos */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  const settings = Object.assign({ sound: true, voice: true, name: '' }, store.get('pyj-set', {}));
  const saveSettings = () => store.set('pyj-set', settings);

  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.random() * a.length | 0];

  /* iconos de línea (24x24) */
  const IC = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
    tpl: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    save: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    bin: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    replay: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
    bucket: '<path d="M5 11l7-7 7 7-7 7z"/><path d="M5 11h14"/><path d="M20.5 15c0 1.8-.8 3-1.6 3s-1.6-1.2-1.6-3l1.6-2.6z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    eraser: '<path d="M8 20h12"/><path d="M4 15l9-9 6 6-7 7H8z"/><path d="M9 10l6 6"/>',
    speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 8a5 5 0 010 8"/><path d="M19.5 5.5a8.5 8.5 0 010 13"/>',
    blank: '<rect x="5" y="3" width="14" height="18" rx="2"/>',
    brush: '<path d="M19 3l2 2-8.5 8.5-2-2z"/><path d="M10.5 11.5c-3 0-4.5 1.8-4.5 4 0 1.8-1.2 3.2-3 4.5 4.5 0 9-1.2 9.5-5.5"/>',
    pencil: '<path d="M15.5 4.5l4 4L9 19l-5 1 1-5z"/><path d="M13.5 6.5l4 4"/><path d="M5 15l4 4" stroke-dasharray="1.5 2"/>',
    rainbow: '<path d="M3 18a9 9 0 0118 0" stroke="#ff3b4e"/><path d="M6.5 18a5.5 5.5 0 0111 0" stroke="#ffd21f"/><path d="M10 18a2 2 0 014 0" stroke="#2f7bff"/>'
  };
  const icon = n => `<svg class="i" viewBox="0 0 24 24">${IC[n] || ''}</svg>`;
  const homeBtn = () => `<button class="ib home" data-go="home" aria-label="Inicio">${icon('home')}</button>`;

  /* sonidos sintetizados (no hace falta ningún archivo de audio) */
  let ac = null;
  function tone(fs, dur = .12, type = 'sine', gap = .09) {
    if (!settings.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t0 = ac.currentTime;
      fs.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), t = t0 + i * gap;
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .02);
      });
    } catch (e) { }
  }
  const sfx = {
    pop: () => tone([660], .08, 'triangle'),
    flip: () => tone([520, 700], .08, 'triangle', .05),
    yes: () => tone([523, 659, 784, 1047], .18, 'triangle', .09),
    no: () => tone([300, 240], .15, 'sine', .1),
    win: () => tone([523, 659, 784, 1047, 784, 1047, 1319], .2, 'triangle', .11)
  };

  /* voz en español del propio móvil */
  let esVoice = null;
  function pickVoice() { try { const v = speechSynthesis.getVoices(); esVoice = v.find(x => /^es[-_]ES/i.test(x.lang)) || v.find(x => /^es/i.test(x.lang)) || null; } catch (e) { } }
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { }
  function say(t) {
    if (!settings.voice) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'es-ES'; if (esVoice) u.voice = esVoice; u.rate = .9; u.pitch = 1.15; speechSynthesis.speak(u); } catch (e) { }
  }
  const quiet = () => { try { speechSynthesis.cancel(); } catch (e) { } };
  const kid = () => (settings.name || '').trim();

  let toastT = 0;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

  /* confeti */
  let fx, fxc, parts = [], fxRun = false;
  function confetti(n = 80, x = innerWidth / 2, y = innerHeight / 2) {
    if (reduce) return;
    fx = fx || $('#fx'); fxc = fxc || fx.getContext('2d');
    const d = Math.min(devicePixelRatio || 1, 2); fx.width = innerWidth * d; fx.height = innerHeight * d; fxc.setTransform(d, 0, 0, d, 0, 0);
    const cs = ['#ff5d6c', '#13a89c', '#3d7dff', '#ffd21f', '#8b5cf6', '#ff8c1a'];
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, r: 4 + Math.random() * 6, c: cs[i % cs.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 1 }); }
    if (!fxRun) { fxRun = true; requestAnimationFrame(stepFx); }
  }
  function stepFx() {
    fxc.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.rot += p.vr; p.life -= .012; fxc.save(); fxc.globalAlpha = Math.max(p.life, 0); fxc.translate(p.x, p.y); fxc.rotate(p.rot); fxc.fillStyle = p.c; fxc.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); fxc.restore(); }
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
    if (parts.length) requestAnimationFrame(stepFx); else { fxRun = false; fxc.clearRect(0, 0, innerWidth, innerHeight); }
  }

  /* paneles que suben desde abajo */
  const openSheet = el => (typeof el === 'string' ? $('#' + el) : el).classList.add('on');
  const closeSheet = el => (typeof el === 'string' ? $('#' + el) : el).classList.remove('on');
  function wireSheets(root = document) {
    root.querySelectorAll('.sheet').forEach(s => {
      if (s.dataset.wired) return; s.dataset.wired = 1;
      s.addEventListener('click', e => { if (e.target === s && s.id !== 'yay') s.classList.remove('on'); });
      s.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => s.classList.remove('on')));
    });
  }

  /* botón que hay que mantener pulsado (para que la peque no lo active sin querer) */
  function holdBtn(btn, ms, fn, tap) {
    let t0 = 0, raf = 0, fired = false;
    const ring = btn.querySelector('.ring');
    const stop = () => { cancelAnimationFrame(raf); t0 = 0; if (ring) ring.style.setProperty('--p', 0); };
    btn.addEventListener('pointerdown', () => {
      fired = false; t0 = performance.now();
      const tick = n => { if (!t0) return; const f = (n - t0) / ms; if (ring) ring.style.setProperty('--p', Math.min(f, 1) * 100); if (f >= 1) { fired = true; stop(); fn(); } else raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('click', () => { if (!fired && tap) tap(); });
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* reparte n casillas cuadradas aprovechando al máximo la pantalla */
  function fitGrid(el, n, maxS = 240) {
    const r = el.getBoundingClientRect(), gap = 10;
    if (!n || r.width < 20) return;
    const W = r.width - gap * 2, H = r.height - gap * 2;
    let best = 0, bc = 1;
    for (let c = 1; c <= n; c++) { const rows = Math.ceil(n / c), s = Math.min((W - (c - 1) * gap) / c, (H - (rows - 1) * gap) / rows); if (s > best) { best = s; bc = c; } }
    el.style.setProperty('--cols', bc);
    el.style.setProperty('--cs', Math.max(40, Math.floor(Math.min(best, maxS))) + 'px');
  }

  function loadImg(file) {
    return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => res(im); im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); }; im.src = u; });
  }

  /* celebración común */
  let againFn = null;
  function win(fn, text) {
    againFn = fn;
    $('#yayText').textContent = text || (kid() ? `¡Muy bien, ${kid()}!` : '¡Muy bien!');
    openSheet('yay'); sfx.win(); confetti(140);
    say(kid() ? `¡Muy bien, ${kid()}!` : '¡Muy bien!');
  }

  /* registro de juegos
     Campos de un juego:
       id, title, color (CSS), art (SVG del botón de inicio), order (número para ordenar)
       html()            → HTML interior de su pantalla
       init(screen)      → se llama una vez al arrancar
       start(screen)     → cada vez que se entra al juego
       stop(screen)      → (opcional) al salir
       parentHtml()      → (opcional) opciones propias en el panel de padres
       parentInit(box)   → (opcional) da vida a esas opciones */
  const games = [];
  const registerGame = g => { games.push(g); games.sort((a, b) => (a.order || 99) - (b.order || 99)); };

  let current = 'home';
  function show(id) {
    const prev = games.find(g => g.id === current);
    if (prev && prev.stop) prev.stop($('#' + current));
    quiet();
    $$('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    current = id;
    const g = games.find(x => x.id === id);
    if (g && g.start) requestAnimationFrame(() => g.start($('#' + id)));
  }

  return { $, $$, store, settings, saveSettings, shuffle, pick, icon, homeBtn, sfx, say, quiet, kid, toast, confetti, openSheet, closeSheet, wireSheets, holdBtn, fitGrid, loadImg, win, games, registerGame, show, reduce, get againFn() { return againFn; } };
})();
