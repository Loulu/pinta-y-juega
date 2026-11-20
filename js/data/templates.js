/* DIBUJOS PARA COLOREAR
   Cada dibujo se pinta en un cuadrado de 0 a 100 con estas ayudas:
     C(c,x,y,r)            círculo          D(c,x,y,rx,ry)     óvalo relleno (ojos, narices)
     E(c,x,y,rx,ry,giro)   óvalo            P(c,[x1,y1,x2,y2,...],cerrar)   línea quebrada
     A(c,x,y,r,a0,a1)      arco             S(c,()=>{...},cerrar)  trazo libre con curvas
     CUT(c,()=>forma)      borra lo que hay debajo de una forma (para que no se crucen líneas)
     BLOB(c,[[x,y,r],...]) contorno de varios círculos unidos (nubes, copas de árboles)
   Para añadir uno: copia una línea de la lista y cambia el nombre y los trazos.
   Truco: dibuja primero lo que queda detrás, luego CUT con la forma de delante y después esa forma. */
(() => {
  const PI = Math.PI;
  const C = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, PI * 2); c.stroke(); };
  const D = (c, x, y, rx, ry = rx) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, PI * 2); c.fill(); };
  const E = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, PI * 2); c.stroke(); };
  const P = (c, a, close) => { c.beginPath(); c.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) c.lineTo(a[i], a[i + 1]); if (close) c.closePath(); c.stroke(); };
  const A = (c, x, y, r, a0, a1) => { c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke(); };
  const S = (c, f, close) => { c.beginPath(); f(); if (close) c.closePath(); c.stroke(); };
  const CUT = (c, f) => { c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); f(); c.fill(); c.restore(); };
  const CUTC = (c, x, y, r) => CUT(c, () => c.arc(x, y, r, 0, PI * 2));
  const BLOB = (c, cs) => {
    for (const [x, y, r] of cs) { CUTC(c, x, y, r); }
    for (const [x, y, r] of cs) C(c, x, y, r);
    const lw = c.lineWidth / 2 + .1;
    for (const [x, y, r] of cs) CUTC(c, x, y, r - lw);
  };
  const smile = (c, x, y, r) => A(c, x, y, r, .2 * PI, .8 * PI);

  App.data = App.data || {};
  App.data.templates = [
    ['el sol', c => { C(c, 50, 50, 20); for (let i = 0; i < 12; i++) { const a = i * PI / 6; P(c, [50 + Math.cos(a) * 27, 50 + Math.sin(a) * 27, 50 + Math.cos(a) * 41, 50 + Math.sin(a) * 41]); } D(c, 43, 46, 2.2); D(c, 57, 46, 2.2); smile(c, 50, 51, 9); }],
    ['el pez', c => { E(c, 45, 50, 28, 18); P(c, [72, 50, 92, 33, 92, 67], true); D(c, 30, 46, 2.6); A(c, 36, 50, 12, -.9, .9); P(c, [38, 33, 48, 20, 58, 33]); C(c, 14, 24, 3); C(c, 21, 13, 2.2); }],
    ['la casa', c => { P(c, [22, 47, 22, 88, 78, 88, 78, 47]); P(c, [66, 30.7, 66, 20, 74, 20, 74, 38]); P(c, [14, 49, 50, 16, 86, 49], true); P(c, [44, 88, 44, 66, 58, 66, 58, 88]); P(c, [28, 56, 40, 56, 40, 68, 28, 68], true); P(c, [34, 56, 34, 68]); P(c, [28, 62, 40, 62]); P(c, [4, 88, 96, 88]); }],
    ['la flor', c => { for (let i = 0; i < 6; i++) { const a = i * PI / 3; E(c, 50 + Math.cos(a) * 15, 36 + Math.sin(a) * 15, 7, 11, a + PI / 2); } CUTC(c, 50, 36, 8.5); C(c, 50, 36, 8); P(c, [50, 52, 50, 94]); E(c, 41, 76, 9, 4.5, -.5); E(c, 59, 68, 9, 4.5, .5); }],
    ['el gato', c => { P(c, [28, 42, 30, 13, 47, 30]); P(c, [72, 42, 70, 13, 53, 30]); CUTC(c, 50, 57, 28); C(c, 50, 57, 28); D(c, 40, 51, 3.5, 5); D(c, 60, 51, 3.5, 5); P(c, [46.5, 61, 53.5, 61, 50, 65], true); A(c, 46, 65, 4, 0, PI); A(c, 54, 65, 4, 0, PI); P(c, [16, 58, 35, 62]); P(c, [16, 67, 35, 66]); P(c, [84, 58, 65, 62]); P(c, [84, 67, 65, 66]); }],
    ['la mariposa', c => { E(c, 31, 36, 18, 14, -.4); E(c, 69, 36, 18, 14, .4); E(c, 35, 65, 13, 11, .4); E(c, 65, 65, 13, 11, -.4); C(c, 29, 36, 5); C(c, 71, 36, 5); CUT(c, () => c.ellipse(50, 50, 5.5, 25, 0, 0, PI * 2)); E(c, 50, 50, 5, 24); P(c, [48, 27, 40, 13]); P(c, [52, 27, 60, 13]); D(c, 40, 13, 2); D(c, 60, 13, 2); }],
    ['el perro', c => { E(c, 27, 50, 9, 19, .35); E(c, 73, 50, 9, 19, -.35); CUTC(c, 50, 52, 25); C(c, 50, 52, 25); E(c, 50, 64, 12, 9); D(c, 50, 58, 5, 3.5); D(c, 41, 47, 3, 4); D(c, 59, 47, 3, 4); P(c, [50, 61.5, 50, 66]); A(c, 46, 66, 4, .1 * PI, .9 * PI); A(c, 54, 66, 4, .1 * PI, .9 * PI); }],
    ['el conejo', c => { E(c, 40, 25, 7, 21, -.15); E(c, 60, 25, 7, 21, .15); E(c, 40, 27, 3, 13, -.15); E(c, 60, 27, 3, 13, .15); CUTC(c, 50, 62, 23); C(c, 50, 62, 23); D(c, 42, 57, 2.8, 3.8); D(c, 58, 57, 2.8, 3.8); D(c, 50, 65, 3, 2.2); P(c, [50, 67, 50, 71]); P(c, [46, 71, 46, 77, 54, 77, 54, 71]); P(c, [50, 71, 50, 77]); P(c, [24, 64, 40, 66]); P(c, [76, 64, 60, 66]); P(c, [25, 71, 40, 69]); P(c, [75, 71, 60, 69]); }],
    ['el oso', c => { C(c, 28, 33, 10); C(c, 72, 33, 10); C(c, 28, 33, 5); C(c, 72, 33, 5); CUTC(c, 50, 57, 27); C(c, 50, 57, 27); E(c, 50, 67, 12, 9); D(c, 50, 62, 4.5, 3); D(c, 40, 50, 3, 3.5); D(c, 60, 50, 3, 3.5); P(c, [50, 65, 50, 69]); A(c, 46, 69, 4, .1 * PI, .9 * PI); A(c, 54, 69, 4, .1 * PI, .9 * PI); }],
    ['el pájaro', c => { P(c, [26, 52, 8, 40, 10, 62], true); CUT(c, () => c.ellipse(46, 58, 26, 19, 0, 0, PI * 2)); E(c, 46, 58, 26, 19); CUTC(c, 68, 40, 13); C(c, 68, 40, 13); P(c, [80, 37, 93, 42, 80, 47], true); D(c, 71, 37, 2.4); S(c, () => { c.moveTo(30, 54); c.quadraticCurveTo(44, 46, 56, 56); c.quadraticCurveTo(44, 70, 30, 54); }); P(c, [42, 76, 40, 88]); P(c, [52, 76, 54, 88]); P(c, [36, 88, 44, 88]); P(c, [50, 88, 58, 88]); }],
    ['la tortuga', c => { E(c, 22, 72, 7, 5); E(c, 74, 72, 7, 5); C(c, 86, 58, 9); P(c, [20, 62, 8, 66, 20, 66]); CUT(c, () => { c.ellipse(50, 64, 32, 26, 0, PI, 0); c.closePath(); }); S(c, () => { c.ellipse(50, 64, 32, 26, 0, PI, 0); }, true); D(c, 88, 55, 1.8); smile(c, 87, 58, 4); P(c, [38, 64, 42, 50, 58, 50, 62, 64]); P(c, [42, 50, 36, 41]); P(c, [58, 50, 64, 41]); P(c, [50, 50, 50, 38]); }],
    ['el coche', c => { P(c, [8, 72, 8, 56, 24, 52, 34, 36, 68, 36, 80, 52, 92, 56, 92, 72], true); P(c, [37, 40, 49, 40, 49, 52, 29, 52], true); P(c, [53, 40, 66, 40, 75, 52, 53, 52], true); P(c, [50, 56, 56, 56]); CUTC(c, 28, 73, 10); CUTC(c, 72, 73, 10); C(c, 28, 73, 9); C(c, 72, 73, 9); C(c, 28, 73, 3.5); C(c, 72, 73, 3.5); P(c, [88, 60, 92, 60]); }],
    ['el tren', c => { P(c, [10, 36, 36, 36, 36, 74, 10, 74], true); P(c, [6, 36, 40, 36]); P(c, [15, 43, 31, 43, 31, 56, 15, 56], true); P(c, [36, 52, 82, 52, 82, 74, 36, 74]); P(c, [64, 52, 64, 36, 76, 36, 76, 52]); P(c, [61, 36, 79, 36]); P(c, [82, 62, 92, 62, 92, 74, 82, 74]); CUTC(c, 22, 77, 9); CUTC(c, 48, 77, 9); CUTC(c, 72, 77, 9); C(c, 22, 77, 8); C(c, 48, 77, 8); C(c, 72, 77, 8); C(c, 70, 22, 5); C(c, 80, 13, 4); }],
    ['el barco', c => { P(c, [10, 62, 90, 62, 76, 80, 24, 80], true); C(c, 36, 71, 3.5); C(c, 50, 71, 3.5); C(c, 64, 71, 3.5); P(c, [52, 62, 52, 12]); P(c, [55, 16, 55, 56, 84, 56], true); P(c, [49, 22, 49, 56, 24, 56], true); P(c, [52, 12, 62, 15, 52, 18]); for (let i = 0; i < 4; i++) A(c, 18 + i * 21, 92, 10.5, PI * 1.1, PI * 1.9); }],
    ['el árbol', c => { P(c, [44, 92, 44, 50, 56, 50, 56, 92]); BLOB(c, [[50, 36, 20], [32, 46, 14], [68, 46, 14], [38, 26, 13], [62, 26, 13]]); C(c, 40, 40, 3.5); C(c, 60, 34, 3.5); C(c, 52, 50, 3.5); P(c, [6, 92, 94, 92]); }],
    ['el arcoíris', c => { A(c, 50, 78, 40, PI, 0); A(c, 50, 78, 32, PI, 0); A(c, 50, 78, 24, PI, 0); A(c, 50, 78, 16, PI, 0); BLOB(c, [[14, 80, 9], [24, 76, 10], [32, 83, 7], [8, 86, 6], [20, 87, 7]]); BLOB(c, [[86, 80, 9], [76, 76, 10], [68, 83, 7], [92, 86, 6], [80, 87, 7]]); }],
    ['la estrella', c => { const pts = []; for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? 19 : 42; pts.push(50 + Math.cos(a) * r, 54 + Math.sin(a) * r); } P(c, pts, true); D(c, 44, 52, 2.4); D(c, 56, 52, 2.4); smile(c, 50, 56, 6); }],
    ['el corazón', c => { S(c, () => { c.moveTo(50, 88); c.bezierCurveTo(14, 64, 6, 40, 20, 26); c.bezierCurveTo(32, 14, 46, 20, 50, 32); c.bezierCurveTo(54, 20, 68, 14, 80, 26); c.bezierCurveTo(94, 40, 86, 64, 50, 88); }, true); D(c, 40, 46, 2.6); D(c, 60, 46, 2.6); smile(c, 50, 52, 8); }],
    ['el helado', c => { P(c, [32, 52, 68, 52, 50, 94], true); c.save(); c.beginPath(); c.moveTo(32, 52); c.lineTo(68, 52); c.lineTo(50, 94); c.closePath(); c.clip(); for (let i = -2; i <= 2; i++) { P(c, [32 + i * 16, 48, 80 + i * 16, 100]); P(c, [68 + i * 16, 48, 20 + i * 16, 100]); } c.restore(); CUTC(c, 50, 42, 19.5); C(c, 50, 42, 19); CUTC(c, 50, 22, 13.5); C(c, 50, 22, 13); CUTC(c, 50, 7, 4.5); C(c, 50, 7, 4); }],
    ['el cohete', c => { P(c, [36, 56, 22, 78, 36, 74]); P(c, [64, 56, 78, 78, 64, 74]); P(c, [40, 74, 50, 94, 60, 74]); CUT(c, () => { c.moveTo(50, 6); c.quadraticCurveTo(68, 22, 66, 42); c.lineTo(66, 74); c.lineTo(34, 74); c.lineTo(34, 42); c.quadraticCurveTo(32, 22, 50, 6); }); S(c, () => { c.moveTo(50, 6); c.quadraticCurveTo(68, 22, 66, 42); c.lineTo(66, 74); c.lineTo(34, 74); c.lineTo(34, 42); c.quadraticCurveTo(32, 22, 50, 6); }, true); C(c, 50, 40, 8); P(c, [35, 26, 65, 26]); C(c, 14, 20, 2); C(c, 86, 30, 2); C(c, 80, 8, 1.5); }],
    ['la manzana', c => { S(c, () => { c.moveTo(50, 30); c.bezierCurveTo(30, 18, 8, 34, 14, 60); c.bezierCurveTo(20, 86, 40, 94, 50, 86); c.bezierCurveTo(60, 94, 80, 86, 86, 60); c.bezierCurveTo(92, 34, 70, 18, 50, 30); }, true); P(c, [50, 30, 54, 12]); S(c, () => { c.moveTo(54, 20); c.quadraticCurveTo(66, 8, 78, 14); c.quadraticCurveTo(68, 26, 54, 20); }); D(c, 40, 54, 2.4); D(c, 60, 54, 2.4); smile(c, 50, 60, 8); }]
  ];

  /* pinta un dibujo centrado en un lienzo de w x h */
  App.drawTemplate = (f, c, w, h) => {
    const S = Math.min(w, h) * .86;
    c.save(); c.translate((w - S) / 2, (h - S) / 2); c.scale(S / 100, S / 100);
    c.lineWidth = 2.4; c.strokeStyle = '#111'; c.fillStyle = '#111'; c.lineCap = 'round'; c.lineJoin = 'round';
    f(c); c.restore();
  };
})();
