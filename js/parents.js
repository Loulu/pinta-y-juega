/* PANEL DE PADRES (se abre manteniendo pulsado el engranaje del inicio) */
App.parents = (() => {
  const $ = App.$, S = App.settings;

  function renderPhotos() {
    const arr = App.photos.list();
    $('#thumbs').innerHTML = arr.map((s, i) => `<div class="th"><img src="${s}" alt=""><button data-del="${i}" aria-label="Quitar foto">×</button></div>`).join('')
      || '<p class="muted">Aún no hay fotos. Añade al menos 2 para jugar a las parejas con ellas o para usarlas en otros juegos.</p>';
  }
  function renderSwitches() { App.$$('#parent [data-set]').forEach(b => b.setAttribute('aria-checked', !!S[b.dataset.set])); }
  function renderLog() {
    $('#verText').textContent = 'Versión ' + (self.APP_VERSION || '?');
    $('#changelog').innerHTML = (self.APP_CAMBIOS || []).map(([v, t]) => `<div><b>${v}</b><span>${t}</span></div>`).join('');
  }

  function open() {
    $('#kidName').value = S.name || '';
    renderPhotos(); renderSwitches(); renderLog();
    App.store.set('pyj-seen-version', self.APP_VERSION);
    $('#gearBadge').hidden = true;
    App.openSheet('parent');
  }

  function init() {
    $('#thumbs').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) { App.photos.remove(+b.dataset.del); renderPhotos(); } });
    $('#addPhotos').addEventListener('change', async e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) { await App.photos.add(f); renderPhotos(); } });
    /* interruptores: cualquier botón con data-set="clave" dentro del panel cambia App.settings[clave] */
    $('#parent').addEventListener('click', e => {
      const b = e.target.closest('[data-set]'); if (!b) return;
      S[b.dataset.set] = !S[b.dataset.set]; App.saveSettings(); renderSwitches();
    });
    $('#kidName').addEventListener('input', e => { S.name = e.target.value.trim(); App.saveSettings(); App.renderHello(); });
    $('#updateNow').addEventListener('click', async () => {
      App.toast('Buscando la última versión…');
      try { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); } catch (e) { }
      setTimeout(() => location.reload(), 600);
    });
    App.holdBtn($('#gear'), 1200, open, () => App.toast('Mantén pulsado para abrir las opciones'));
    const seen = App.store.get('pyj-seen-version', null);
    if (seen && seen !== self.APP_VERSION) $('#gearBadge').hidden = false;
    if (!seen) App.store.set('pyj-seen-version', self.APP_VERSION);
  }
  return { init, open };
})();
