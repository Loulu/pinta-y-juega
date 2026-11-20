/* JUEGO: BUSCAR
   Dos modos (botones de arriba):
   🗺️ Mapa escondite: un mapa grande con animalitos escondidos (ver hide.js).
   🔍 ¿Dónde está?: "¿Dónde está el gato?" con pocas fichas grandes (para empezar).
   En "¿Dónde está?" sube cada 3 aciertos hasta el máximo del panel de padres. */
App.registerGame({
  id: 'find', title: 'Buscar', color: 'var(--blue)', order: 3,
  art: '<svg viewBox="0 0 120 100"><circle cx="50" cy="44" r="30" fill="#fff"/><circle cx="50" cy="44" r="30" fill="none" stroke="#ffd21f" stroke-width="9"/><path d="M72 66l26 24" stroke="#ffd21f" stroke-width="13" stroke-linecap="round"/><path d="M50 28l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#ff5d6c"/></svg>',

  html: () => `
    <div class="bar">${App.homeBtn()}
      <div class="chips fmodes"><button class="chip" data-fm2="map" aria-label="Mapa escondite">🗺️</button><button class="chip" data-fm2="quick" aria-label="¿Dónde está?">❓</button></div>
      <button class="ib hintb" aria-label="Pista">${App.icon('search')}</button>
      <span class="stars fs">⭐ 0</span></div>
    <div class="quickv"><button class="ask" aria-label="Repetir pregunta"></button><div class="board"></div></div>
    <div class="mapv"></div>`,

  parentHtml: () => `
    <div class="tg"><span>Buscar (¿Dónde está?): enseñar el dibujo que hay que encontrar</span><button class="sw2" role="switch" data-set="findHint" aria-label="Pista en Buscar"></button></div>
    <h3>Buscar (¿Dónde está?): máximo de cosas en pantalla</h3>
    <div class="chips fmax" style="justify-content:flex-start"></div>
    <div class="tg"><span>Mapa escondite: volver a empezar desde el nivel 1</span><button class="btn ghost resetHide" style="min-height:44px">Reiniciar</button></div>`,

  parentInit(box) {
    const S = App.settings, fm = box.querySelector('.fmax');
    const render = () => { fm.innerHTML = [4, 6, 9, 12].map(n => `<button class="chip${+S.findMax === n ? ' on' : ''}" data-fm="${n}">${n}</button>`).join(''); };
    fm.addEventListener('click', e => { const b = e.target.closest('[data-fm]'); if (b) { S.findMax = +b.dataset.fm; App.saveSettings(); render(); } });
    box.querySelector('.resetHide').addEventListener('click', () => { S.hideLevel = 1; App.saveSettings(); App.toast('El mapa escondite empezará en el nivel 1'); });
    render();
  },

  init(el) {
    const S = App.settings;
    if (S.findHint === undefined) S.findHint = true;
    if (!S.findMax) S.findMax = 9;
    if (!S.findMode) S.findMode = 'map';
    const grid = el.querySelector('.board'), ask = el.querySelector('.ask'), starsEl = el.querySelector('.fs');
    const quickV = el.querySelector('.quickv'), mapV = el.querySelector('.mapv'), hintB = el.querySelector('.hintb');

    /* --- mapa escondite --- */
    const map = App.makeHideMap(mapV, { onLevel: L => { if (S.findMode === 'map') starsEl.textContent = 'Nivel ' + L; } });
    hintB.addEventListener('click', () => map.hint());
    this._map = map;

    /* --- ¿Dónde está? --- */
    const POOL = [...App.data.animals, ...App.data.things];
    const PASTEL = ['#ffe1e5', '#dff6f3', '#e3ecff', '#fff2c4', '#efe4ff', '#ffe6cf'];
    const LV = [3, 4, 6, 9, 12];
    let lvl = 0, streak = 0, target = null, last = null, busy = false, stars = 0, items = [];
    const maxLv = () => { const i = LV.indexOf(+S.findMax); return i < 0 ? 3 : i; };
    const question = () => target && App.say('¿Dónde está ' + target[1] + '?');
    const round = () => {
      busy = false; if (lvl > maxLv()) lvl = maxLv();
      const n = LV[lvl];
      items = App.shuffle(POOL).slice(0, n);
      target = App.pick(items);
      if (last && target[0] === last[0]) target = items.find(i => i[0] !== last[0]) || target;
      last = target;
      ask.innerHTML = (S.findHint ? `<b>${target[0]}</b>` : App.icon('speaker')) + `<span>¿Dónde está ${target[1]}?</span>`;
      grid.innerHTML = items.map((it, i) => `<button class="ft" data-i="${i}" style="--r:${(Math.random() * 10 - 5).toFixed(1)}deg;background:${PASTEL[i % PASTEL.length]}" aria-label="${it[1]}">${it[0]}</button>`).join('');
      App.fitGrid(grid, n, 240);
      setTimeout(question, 250);
    };
    const ro = new ResizeObserver(() => App.fitGrid(grid, items.length, 240)); ro.observe(grid);
    ask.addEventListener('click', question);
    grid.addEventListener('click', e => {
      const b = e.target.closest('.ft'); if (!b || busy) return;
      const it = items[+b.dataset.i];
      if (it === target) {
        busy = true; b.classList.add('right'); App.sfx.yes();
        const r = b.getBoundingClientRect(); App.confetti(45, r.left + r.width / 2, r.top + r.height / 2);
        App.say('¡Sí! ¡' + target[1] + '!');
        stars++; starsEl.textContent = '⭐ ' + stars;
        if (++streak >= 3) { streak = 0; lvl++; }
        if (stars % 10 === 0) setTimeout(() => App.win(round), 1100); else setTimeout(round, 1500);
      } else {
        b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); App.sfx.no();
        App.say((it[1].startsWith('la') ? 'Esa es ' : 'Ese es ') + it[1] + '. ¿Dónde está ' + target[1] + '?');
      }
    });

    /* --- cambiar de modo --- */
    const setMode = m => {
      S.findMode = m; App.saveSettings();
      el.querySelectorAll('[data-fm2]').forEach(b => b.classList.toggle('on', b.dataset.fm2 === m));
      quickV.hidden = m !== 'quick'; mapV.hidden = m !== 'map'; hintB.hidden = m !== 'map';
      App.quiet();
      if (m === 'map') { map.start(); }
      else { map.stop(); starsEl.textContent = '⭐ ' + stars; round(); }
    };
    el.querySelector('.fmodes').addEventListener('click', e => { const b = e.target.closest('[data-fm2]'); if (b) { App.sfx.pop(); setMode(b.dataset.fm2); } });
    this.enter = () => setMode(S.findMode);
    this.leave = () => map.stop();
  },

  start() { this.enter(); },
  stop() { this.leave(); }
});
