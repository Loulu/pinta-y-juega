/* FOTOS DE LA FAMILIA
   Se recortan en cuadrado, se reducen a 256 px y se guardan solo en el móvil.
   Cualquier juego puede usarlas con App.photos.list() (devuelve imágenes en data URL). */
App.photos = (() => {
  const KEY = 'pyj-photos', MAX = 12;
  let arr = App.store.get(KEY, []);
  async function thumb(file) {
    const im = await App.loadImg(file);
    const w = im.naturalWidth, h = im.naturalHeight, s = Math.min(w, h);
    const c = document.createElement('canvas'); c.width = c.height = 256;
    c.getContext('2d').drawImage(im, (w - s) / 2, (h - s) / 2, s, s, 0, 0, 256, 256);
    URL.revokeObjectURL(im.src);
    return c.toDataURL('image/jpeg', .8);
  }
  async function add(files) {
    let bad = 0;
    for (const f of files) {
      if (arr.length >= MAX) { App.toast(`Ya hay ${MAX} fotos. Quita alguna para añadir más.`); break; }
      try { arr.push(await thumb(f)); } catch (e) { bad++; }
    }
    if (!App.store.set(KEY, arr)) App.toast('No caben más fotos en este móvil.');
    if (bad) App.toast('Alguna foto no se pudo abrir.');
  }
  function remove(i) { arr.splice(i, 1); App.store.set(KEY, arr); }
  return { list: () => arr, add, remove };
})();
