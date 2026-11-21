/* ARRANQUE
   Crea un botón en el inicio y una pantalla por cada juego registrado,
   añade sus opciones al panel de padres y activa el modo sin conexión. */
(() => {
  const $ = App.$;

  App.renderHello = () => { $('#hello').textContent = App.kid() ? `¡Hola, ${App.kid()}!` : '¡Hola!'; };
  App.renderHello();

  const tiles = $('#tiles'), screens = $('#screens'), opts = $('#gameOptions');
  tiles.classList.toggle('many', App.games.length > 3);
  tiles.classList.toggle('lots', App.games.length > 6);
  for (const g of App.games) {
    tiles.insertAdjacentHTML('beforeend', `<button class="tile" data-go="${g.id}" style="background:${g.color}">${g.art || ''}<span>${g.title}</span></button>`);
    const sec = document.createElement('section');
    sec.className = 'screen'; sec.id = g.id; sec.innerHTML = g.html();
    screens.appendChild(sec);
    if (g.parentHtml) {
      const box = document.createElement('div'); box.innerHTML = g.parentHtml(); opts.appendChild(box);
      if (g.parentInit) g.parentInit(box);
    }
  }
  App.wireSheets();
  for (const g of App.games) {
    try { g.init && g.init($('#' + g.id)); } catch (e) { console.error('Error al iniciar el juego', g.id, e); }
  }
  App.parents.init();

  /* navegación: cualquier botón con data-go="id" lleva a esa pantalla */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    App.sfx.pop(); App.show(b.dataset.go);
  });
  $('#again').addEventListener('click', () => { App.closeSheet('yay'); App.sfx.pop(); if (App.againFn) App.againFn(); });

  /* botón atrás de Android: vuelve al inicio en lugar de cerrar la app */
  history.replaceState({ s: 'home' }, '');
  const origShow = App.show;
  App.show = id => {
    if (id === 'home') { if (history.state && history.state.s !== 'home') { history.back(); return; } origShow('home'); return; }
    history.pushState({ s: id }, ''); origShow(id);
  };
  addEventListener('popstate', () => {
    const open = document.querySelector('.sheet.on');
    if (open) { open.classList.remove('on'); history.pushState({ s: 'x' }, ''); return; }
    origShow('home');
  });

  /* modo sin conexión e instalación */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { }));
  }
})();
