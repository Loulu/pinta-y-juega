/* FOTO → DIBUJO PARA COLOREAR
   App.lineArt(imagen, 'fino' | 'cartoon', detalle 1-10) devuelve un canvas
   con líneas negras sobre fondo transparente.
   Técnica: escala de grises con contraste estirado, diferencia de dos desenfoques
   gaussianos (DoG), limpieza de puntitos sueltos y engrosado de líneas. */
App.lineArt = (() => {
  function gblur(src, w, h, sig) {
    const r = Math.ceil(sig * 3), k = new Float32Array(2 * r + 1); let s = 0;
    for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-i * i / (2 * sig * sig)); s += k[i + r]; }
    for (let i = 0; i < k.length; i++) k[i] /= s;
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { const o = y * w; for (let x = 0; x < w; x++) { let a = 0; for (let j = -r; j <= r; j++) { let xx = x + j; xx = xx < 0 ? 0 : xx >= w ? w - 1 : xx; a += src[o + xx] * k[j + r]; } tmp[o + x] = a; } }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let j = -r; j <= r; j++) { let yy = y + j; yy = yy < 0 ? 0 : yy >= h ? h - 1 : yy; a += tmp[yy * w + x] * k[j + r]; } out[y * w + x] = a; }
    return out;
  }
  function despeckle(m, w, h, minA) {
    const lab = new Uint8Array(w * h), st = [], comp = [], n = w * h;
    for (let i = 0; i < n; i++) {
      if (!m[i] || lab[i]) continue;
      st.length = 0; comp.length = 0; st.push(i); lab[i] = 1;
      while (st.length) {
        const j = st.pop(); comp.push(j); const x = j % w;
        const nb = [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w, x > 0 ? j - w - 1 : -1, x < w - 1 ? j - w + 1 : -1, x > 0 ? j + w - 1 : -1, x < w - 1 ? j + w + 1 : -1];
        for (const q of nb) if (q >= 0 && q < n && m[q] && !lab[q]) { lab[q] = 1; st.push(q); }
      }
      if (comp.length < minA) for (const j of comp) m[j] = 0;
    }
  }
  function dilate(m, w, h) {
    const o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (m[i] || (x > 0 && m[i - 1]) || (x < w - 1 && m[i + 1]) || (y > 0 && m[i - w]) || (y < h - 1 && m[i + w])) o[i] = 1; }
    return o;
  }
  return function lineArt(img, style, detail) {
    const cart = style === 'cartoon', max = cart ? 700 : 900;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.min(1, max / Math.max(iw, ih)), w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s)), n = w * h;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    const src = x.getImageData(0, 0, w, h).data;
    const g = new Float32Array(n), hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) { const v = .299 * src[i * 4] + .587 * src[i * 4 + 1] + .114 * src[i * 4 + 2]; g[i] = v; hist[v | 0]++; }
    let lo = 0, hi = 255, acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * .02) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * .02) { hi = v; break; } }
    const sc = 255 / Math.max(20, hi - lo);
    for (let i = 0; i < n; i++) g[i] = Math.max(0, Math.min(255, (g[i] - lo) * sc));
    const s1 = cart ? 2.2 : 1.1, g1 = gblur(g, w, h, s1), g2 = gblur(g, w, h, s1 * 1.6);
    const t = cart ? 9.5 - detail * .65 : 6.2 - detail * .48;
    const m = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (g1[i] - g2[i] < -t) m[i] = 1;
    despeckle(m, w, h, cart ? Math.round(n / 3500) + 25 : Math.round(n / 9000) + 10);
    let mm = dilate(m, w, h); if (cart) mm = dilate(mm, w, h);
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const o = out.getContext('2d'), id = o.createImageData(w, h);
    for (let i = 0; i < n; i++) if (mm[i]) id.data[i * 4 + 3] = 255;
    o.putImageData(id, 0, 0);
    return out;
  };
})();
