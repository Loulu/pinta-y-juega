/* DIBUJOS PARA COLOREAR
   Cada dibujo se pinta en un cuadrado de 0 a 100 con estas ayudas:
     C(c,x,y,r)          círculo         D(c,x,y,rx,ry)    óvalo relleno (ojos)
     E(c,x,y,rx,ry,giro) óvalo           P(c,[x1,y1,x2,y2,...],cerrar)  línea quebrada
     A(c,x,y,r,a0,a1)    arco            CUT(c,()=>forma)  borra lo que hay debajo
   Para añadir uno: copia una línea de la lista y cambia el nombre y los trazos. */
(() => {
  const PI = Math.PI;
  const C = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, PI * 2); c.stroke(); };
  const D = (c, x, y, rx, ry = rx) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, PI * 2); c.fill(); };
  const E = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, PI * 2); c.stroke(); };
  const P = (c, a, close) => { c.beginPath(); c.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) c.lineTo(a[i], a[i + 1]); if (close) c.closePath(); c.stroke(); };
  const A = (c, x, y, r, a0, a1) => { c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke(); };
  const CUT = (c, f) => { c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); f(); c.fill(); c.restore(); };

  App.data = App.data || {};
  App.data.templates = [
    ['el sol', c => { C(c, 50, 50, 20); for (let i = 0; i < 12; i++) { const a = i * PI / 6; P(c, [50 + Math.cos(a) * 27, 50 + Math.sin(a) * 27, 50 + Math.cos(a) * 41, 50 + Math.sin(a) * 41]); } D(c, 43, 46, 2.2); D(c, 57, 46, 2.2); A(c, 50, 51, 9, .2 * PI, .8 * PI); }],
    ['el pez', c => { E(c, 45, 50, 28, 18); P(c, [72, 50, 92, 33, 92, 67], true); D(c, 30, 46, 2.6); A(c, 36, 50, 12, -.9, .9); P(c, [38, 33, 48, 20, 58, 33]); C(c, 14, 24, 3); C(c, 21, 13, 2.2); }],
    ['la casa', c => { P(c, [22, 47, 22, 88, 78, 88, 78, 47]); P(c, [66, 30.7, 66, 20, 74, 20, 74, 38]); P(c, [14, 49, 50, 16, 86, 49], true); P(c, [44, 88, 44, 66, 58, 66, 58, 88]); P(c, [28, 56, 40, 56, 40, 68, 28, 68], true); P(c, [34, 56, 34, 68]); P(c, [28, 62, 40, 62]); P(c, [4, 88, 96, 88]); }],
    ['la flor', c => { for (let i = 0; i < 6; i++) { const a = i * PI / 3; E(c, 50 + Math.cos(a) * 15, 36 + Math.sin(a) * 15, 7, 11, a + PI / 2); } CUT(c, () => c.arc(50, 36, 8.5, 0, PI * 2)); C(c, 50, 36, 8); P(c, [50, 52, 50, 94]); E(c, 41, 76, 9, 4.5, -.5); E(c, 59, 68, 9, 4.5, .5); }],
    ['el gato', c => { P(c, [28, 42, 30, 13, 47, 30]); P(c, [72, 42, 70, 13, 53, 30]); CUT(c, () => c.arc(50, 57, 28, 0, PI * 2)); C(c, 50, 57, 28); D(c, 40, 51, 3.5, 5); D(c, 60, 51, 3.5, 5); P(c, [46.5, 61, 53.5, 61, 50, 65], true); A(c, 46, 65, 4, 0, PI); A(c, 54, 65, 4, 0, PI); P(c, [16, 58, 35, 62]); P(c, [16, 67, 35, 66]); P(c, [84, 58, 65, 62]); P(c, [84, 67, 65, 66]); }],
    ['la mariposa', c => { E(c, 31, 36, 18, 14, -.4); E(c, 69, 36, 18, 14, .4); E(c, 35, 65, 13, 11, .4); E(c, 65, 65, 13, 11, -.4); C(c, 29, 36, 5); C(c, 71, 36, 5); CUT(c, () => c.ellipse(50, 50, 5.5, 25, 0, 0, PI * 2)); E(c, 50, 50, 5, 24); P(c, [48, 27, 40, 13]); P(c, [52, 27, 60, 13]); D(c, 40, 13, 2); D(c, 60, 13, 2); }]
  ];

  /* pinta un dibujo centrado en un lienzo de w x h */
  App.drawTemplate = (f, c, w, h) => {
    const S = Math.min(w, h) * .86;
    c.save(); c.translate((w - S) / 2, (h - S) / 2); c.scale(S / 100, S / 100);
    c.lineWidth = 2.4; c.strokeStyle = '#111'; c.fillStyle = '#111'; c.lineCap = 'round'; c.lineJoin = 'round';
    f(c); c.restore();
  };
})();
