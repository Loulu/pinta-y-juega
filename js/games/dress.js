/* JUEGO: VESTIR
   Abre el armario y viste a una princesa o a un príncipe: pelo, coronas, ropa, zapatos,
   complementos (varita, alas, capa...), mascota, fondo y color de piel.
   Todo se dibuja en SVG por capas (coordenadas 0-300 x 0-560). Cada prenda se puede
   poner de varios colores. Botón ✨ para un modelito sorpresa y botón para guardar la foto. */
App.registerGame({
  id: 'dress', title: 'Vestir', color: '#d77bff', order: 10,
  art: '<svg viewBox="0 0 120 100"><circle cx="60" cy="26" r="16" fill="#ffd9c2"/><path d="M44 22q2-16 16-16t16 16q-6-8-16-8t-16 8z" fill="#f7d774"/><path d="M50 10l4-8 6 6 6-6 4 8z" fill="#ffcf4d"/><path d="M52 42h16l20 52H32z" fill="#ff7ac0"/><path d="M52 42h16l2 14H50z" fill="#ff4fa3"/><path d="M96 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/></svg>',

  html: () => `
    <div class="bar">${App.homeBtn()}
      <div class="chips dwho"><button class="chip" data-who="girl" aria-label="Princesa">👸</button><button class="chip" data-who="boy" aria-label="Príncipe">🤴</button></div>
      <span class="sp"></span>
      <button class="ib drand" aria-label="Modelito sorpresa">✨</button>
      <button class="ib dsave" aria-label="Guardar foto">${App.icon('cam')}</button>
    </div>
    <div class="dstage"><div class="dpaper"></div></div>
    <div class="wardrobe">
      <div class="wtabs"></div>
      <div class="wbody"><div class="witems"></div><div class="wdoor l"></div><div class="wdoor r"></div></div>
      <div class="wcolors"></div>
    </div>
    <div class="sheet dsaveSheet"><div class="panel">
      <h2>¡Qué elegante!</h2>
      <p class="muted">Pulsa Descargar, o mantén pulsada la imagen para guardarla.</p>
      <img class="savedImg" alt="Foto del modelito">
      <div class="row"><a class="btn ghost ddl" download="modelito.png" href="#">Descargar</a><button class="btn" data-close>Seguir jugando</button></div>
    </div></div>`,

  init(el) {
    const S = App.settings, q = s => el.querySelector(s);
    const paper = q('.dpaper'), tabsEl = q('.wtabs'), itemsEl = q('.witems'), colorsEl = q('.wcolors'), body = q('.wbody');
    const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };
    const SKINS = ['#ffe0cc', '#f7c9a8', '#e0a47c', '#b97a52', '#7d4f33'];
    const HAIRC = ['#f7d774', '#8b5a2b', '#2b2025', '#e0703a', '#ff8fc8', '#b48cff', '#7fb6ff', '#ffffff'];
    const CLOTHC = ['#ff6fb5', '#ffb3d9', '#b57bff', '#d9c8ff', '#8fd0ff', '#8ee6c4', '#ffd34d', '#ff4d6d', '#ffffff', '#4a5cc4'];
    const star = (x, y, r, fill) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); } return `<path d="${d}Z" fill="${fill}"/>`; };
    const sparkle = (x, y, r, fill = '#fff') => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`;

    /* ---------- prendas ---------- */
    const HAIR = {
      largo: { n: 'pelo largo', back: c => `<path d="M86 112Q84 36 150 36Q216 36 214 112L224 300Q150 326 76 300Z" fill="${c}"/>`, front: c => `<path d="M88 112Q92 44 150 44Q208 44 212 112Q196 74 150 76Q112 74 88 112Z" fill="${c}"/><path d="M92 110Q80 170 96 220L110 160Z" fill="${c}"/><path d="M208 110Q220 170 204 220L190 160Z" fill="${c}"/>` },
      rizos: { n: 'rizos', back: c => [[90, 80], [110, 52], [150, 42], [190, 52], [210, 80], [216, 120], [214, 160], [208, 200], [92, 200], [86, 160], [84, 120], [96, 236], [204, 236]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="${c}"/>`).join(''), front: c => [[104, 72], [128, 58], [150, 54], [172, 58], [196, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="17" fill="${c}"/>`).join('') + `<circle cx="96" cy="96" r="13" fill="${c}"/><circle cx="204" cy="96" r="13" fill="${c}"/>` },
      coleta: { n: 'coleta', back: c => `<path d="M196 54Q252 70 240 160Q236 230 210 270Q226 190 206 120Z" fill="${c}"/><circle cx="200" cy="62" r="13" fill="${shade('#ff6fb5', 1)}"/>`, front: c => `<path d="M88 114Q88 44 150 44Q212 44 212 114Q204 84 150 82Q96 84 88 114Z" fill="${c}"/>` },
      monos: { n: 'moños', back: c => `<circle cx="96" cy="58" r="30" fill="${c}"/><circle cx="204" cy="58" r="30" fill="${c}"/><path d="M90 50Q96 36 108 40" stroke="${shade(c, .85)}" stroke-width="4" fill="none"/><path d="M196 40Q208 36 214 50" stroke="${shade(c, .85)}" stroke-width="4" fill="none"/>`, front: c => `<path d="M88 114Q88 46 150 46Q212 46 212 114Q204 84 150 82Q96 84 88 114Z" fill="${c}"/>` },
      trenza: { n: 'trenza', back: c => `<path d="M86 116Q84 38 150 38Q216 38 214 116L210 170Q150 180 90 170Z" fill="${c}"/>` + [0, 1, 2, 3, 4, 5].map(i => `<ellipse cx="${196 + (i % 2 ? 6 : -2)}" cy="${170 + i * 26}" rx="16" ry="15" fill="${c}" stroke="${shade(c, .82)}" stroke-width="2.5"/>`).join('') + `<circle cx="198" cy="330" r="8" fill="#ff6fb5"/>`, front: c => `<path d="M88 112Q92 44 150 44Q208 44 212 112Q190 66 132 74Q104 82 88 112Z" fill="${c}"/>` },
      corto: { n: 'pelo corto', back: c => `<path d="M86 124Q82 36 150 36Q218 36 214 124Q214 84 150 82Q86 84 86 124Z" fill="${c}"/>`, front: c => `<path d="M86 110Q90 40 150 40Q210 40 214 110Q204 70 176 64Q150 88 104 92Q92 98 86 110Z" fill="${c}"/>` },
      punta: { n: 'pelo de punta', back: c => '', front: c => `<path d="M88 104L96 56L112 72L120 36L138 64L150 30L164 62L182 36L188 72L206 56L212 104Q200 76 150 74Q100 76 88 104Z" fill="${c}"/>` }
    };
    const HEAD = {
      nada: { n: 'nada', svg: () => '' },
      tiara: { n: 'tiara', svg: c => `<path d="M110 62L118 38L134 52L150 26L166 52L182 38L190 62Q150 52 110 62Z" fill="${c}" stroke="${shade(c, .7)}" stroke-width="2"/><circle cx="150" cy="44" r="5" fill="#ff4fa3"/><circle cx="125" cy="52" r="3.5" fill="#8fd0ff"/><circle cx="175" cy="52" r="3.5" fill="#b57bff"/>${sparkle(196, 30, 7)}` },
      corona: { n: 'corona', svg: c => `<path d="M106 66L102 22L126 42L150 14L174 42L198 22L194 66Z" fill="${c}" stroke="${shade(c, .7)}" stroke-width="2.5"/><rect x="104" y="58" width="92" height="12" rx="4" fill="${shade(c, .85)}"/><circle cx="150" cy="40" r="6" fill="#ff4d6d"/><circle cx="124" cy="52" r="4" fill="#4a5cc4"/><circle cx="176" cy="52" r="4" fill="#8ee6c4"/>` },
      flores: { n: 'corona de flores', svg: c => [[96, 82], [110, 62], [130, 50], [150, 46], [170, 50], [190, 62], [204, 82]].map(([x, y], i) => { const fc = i % 2 ? c : '#fff'; return [0, 1, 2, 3, 4].map(k => `<circle cx="${(x + Math.cos(k * 1.257) * 7).toFixed(1)}" cy="${(y + Math.sin(k * 1.257) * 7).toFixed(1)}" r="6" fill="${fc}"/>`).join('') + `<circle cx="${x}" cy="${y}" r="4.5" fill="#ffcf4d"/>`; }).join('') },
      lazo: { n: 'lazo', svg: c => `<path d="M190 56L164 40Q156 58 168 70Z" fill="${c}"/><path d="M190 56L216 40Q224 58 212 70Z" fill="${c}"/><circle cx="190" cy="57" r="8" fill="${shade(c, .82)}"/>` },
      unicornio: { n: 'diadema de unicornio', svg: c => `<path d="M94 94Q96 46 150 44Q204 46 206 94" stroke="${c}" stroke-width="8" fill="none"/><path d="M140 52L150 4L160 52Z" fill="#ffd34d" stroke="#e0a800" stroke-width="2"/><path d="M143 40L157 34M145 28L155 22" stroke="#e0a800" stroke-width="2"/><path d="M104 62L96 34L122 52Z" fill="${c}"/><path d="M196 62L204 34L178 52Z" fill="${c}"/><circle cx="128" cy="50" r="6" fill="#ffb3d9"/><circle cx="172" cy="50" r="6" fill="#b57bff"/>` },
      sombrero: { n: 'sombrero de hada', svg: c => `<path d="M118 64L150 -30L182 64Z" fill="${c}"/><ellipse cx="150" cy="64" rx="44" ry="8" fill="${shade(c, .85)}"/><path d="M150 -28Q190 10 214 70" stroke="#ffffff" stroke-width="3" fill="none" opacity=".8"/>${star(150, -30, 9, '#ffd34d')}` }
    };
    const OUTFIT = {
      gala: { n: 'vestido de gala', svg: c => `<path d="M116 248Q150 262 184 248L252 478Q150 504 48 478Z" fill="${c}"/><path d="M116 248Q150 262 184 248L196 290Q150 300 104 290Z" fill="${shade(c, 1.08)}" opacity=".6"/>${[80, 115, 150, 185, 220].map(x => `<path d="M${x} 480Q${x + 17} 470 ${x + 35} 480" stroke="${shade(c, .82)}" stroke-width="3" fill="none"/>`).join('')}<path d="M120 192Q150 182 180 192L184 254Q150 266 116 254Z" fill="${shade(c, .9)}"/><ellipse cx="118" cy="200" rx="18" ry="13" fill="${shade(c, 1.1)}"/><ellipse cx="182" cy="200" rx="18" ry="13" fill="${shade(c, 1.1)}"/><path d="M140 250L150 262L160 250L150 244Z" fill="#ffd34d"/>${[[90, 420], [140, 380], [200, 430], [170, 330], [115, 330], [230, 465], [70, 465]].map(([x, y]) => sparkle(x, y, 6)).join('')}` },
      corto: { n: 'vestido corto', svg: c => `<path d="M120 192Q150 182 180 192L184 250Q150 258 116 250Z" fill="${c}"/><path d="M116 248Q150 258 184 248L210 362Q150 376 90 362Z" fill="${c}"/><path d="M116 248Q150 258 184 248" stroke="#fff" stroke-width="5" fill="none"/>${[100, 130, 160, 190].map((x, i) => `<circle cx="${x + 5}" cy="${300 + (i % 2) * 30}" r="7" fill="#fff" opacity=".8"/>`).join('')}` },
      hada: { n: 'vestido de hada', svg: c => `<path d="M120 192Q150 182 180 192L184 250Q150 258 116 250Z" fill="${c}"/><path d="M112 246L84 344L104 326L114 354L130 330L142 360L150 332L158 360L170 330L186 354L196 326L216 344L188 246Z" fill="${shade(c, 1.12)}" opacity=".9"/><path d="M116 246L100 316L118 302L130 326L150 302L170 326L182 302L200 316L184 246Z" fill="${c}"/>${[[110, 290], [190, 300], [150, 320], [130, 270], [172, 268]].map(([x, y]) => sparkle(x, y, 5)).join('')}` },
      principe: { n: 'traje de príncipe', svg: c => `<rect x="122" y="296" width="24" height="150" rx="10" fill="${shade('#4a5cc4', .8)}"/><rect x="154" y="296" width="24" height="150" rx="10" fill="${shade('#4a5cc4', .8)}"/><path d="M114 190Q150 180 186 190L192 312Q150 322 108 312Z" fill="${c}"/><path d="M122 198Q104 240 100 286" stroke="${c}" stroke-width="24" stroke-linecap="round" fill="none"/><path d="M178 198Q196 240 200 286" stroke="${c}" stroke-width="24" stroke-linecap="round" fill="none"/><path d="M122 192L182 300L170 308L114 204Z" fill="#ffd34d"/>${[220, 245, 270, 295].map(y => `<circle cx="138" cy="${y}" r="4" fill="#ffd34d"/>`).join('')}<rect x="108" y="290" width="84" height="12" fill="#3b2140"/><rect x="144" y="288" width="12" height="16" fill="#ffd34d"/><path d="M106 190L94 182L100 200Z" fill="#ffd34d"/><path d="M194 190L206 182L200 200Z" fill="#ffd34d"/>` },
      camiseta: { n: 'camiseta y falda', svg: c => `<path d="M118 192Q150 184 182 192L186 262Q150 270 114 262Z" fill="#ffffff"/><path d="M118 192L100 214L112 226L122 214Z" fill="#ffffff"/><path d="M182 192L200 214L188 226L178 214Z" fill="#ffffff"/><path d="M138 220Q150 236 162 220Q150 212 138 220Z" fill="${c}"/><path d="M112 258Q150 268 188 258L206 336Q150 348 94 336Z" fill="${c}"/>${[105, 125, 145, 165, 185].map(x => `<path d="M${x} 270L${x - 4} 336" stroke="${shade(c, .85)}" stroke-width="3"/>`).join('')}` },
      peto: { n: 'peto vaquero', svg: c => `<rect x="120" y="296" width="28" height="120" rx="10" fill="${c}"/><rect x="152" y="296" width="28" height="120" rx="10" fill="${c}"/><path d="M118 192Q150 184 182 192L186 260Q150 268 114 260Z" fill="#ffe08a"/><path d="M122 236H178L184 312Q150 320 116 312Z" fill="${c}"/><path d="M126 236L128 196M174 236L172 196" stroke="${c}" stroke-width="7"/><rect x="136" y="250" width="28" height="22" rx="5" fill="${shade(c, .85)}"/><circle cx="128" cy="240" r="4" fill="#ffd34d"/><circle cx="172" cy="240" r="4" fill="#ffd34d"/>` }
    };
    const SHOES = {
      nada: { n: 'descalza', svg: () => '' },
      cristal: { n: 'zapatos de cristal', svg: c => `<path d="M118 462Q134 450 150 466L146 476H120Z" fill="#cdeeff" stroke="#8fd0ff" stroke-width="2" opacity=".9"/><path d="M182 462Q166 450 150 466L154 476H180Z" fill="#cdeeff" stroke="#8fd0ff" stroke-width="2" opacity=".9" transform="translate(0)"/>${sparkle(126, 458, 5)}${sparkle(176, 458, 5)}` },
      botas: { n: 'botas', svg: c => `<path d="M122 400H146V470H112Q110 458 122 454Z" fill="${c}"/><path d="M154 400H178V454Q190 458 188 470H154Z" fill="${c}"/><rect x="120" y="398" width="28" height="10" rx="4" fill="${shade(c, .8)}"/><rect x="152" y="398" width="28" height="10" rx="4" fill="${shade(c, .8)}"/>` },
      bailarinas: { n: 'bailarinas', svg: c => `<ellipse cx="134" cy="470" rx="16" ry="8" fill="${c}"/><ellipse cx="166" cy="470" rx="16" ry="8" fill="${c}"/><path d="M128 462L140 462L134 468Z" fill="#fff"/><path d="M160 462L172 462L166 468Z" fill="#fff"/><path d="M124 450L132 466M144 450L136 466M156 450L164 466M176 450L168 466" stroke="${c}" stroke-width="2.5"/>` },
      deportivas: { n: 'zapatillas', svg: c => `<path d="M118 458Q134 452 148 460V476H112Q110 464 118 458Z" fill="#ffffff" stroke="#ddd" stroke-width="1.5"/><path d="M182 458Q166 452 152 460V476H188Q190 464 182 458Z" fill="#ffffff" stroke="#ddd" stroke-width="1.5"/><path d="M114 472H148M152 472H186" stroke="${c}" stroke-width="5"/><path d="M124 460L140 456M160 456L176 460" stroke="${c}" stroke-width="3"/>` }
    };
    const ACC = {
      varita: { n: 'varita mágica', svg: c => `<path d="M202 296L246 214" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>${star(248, 208, 18, c)}${sparkle(268, 190, 7)}${sparkle(230, 186, 5)}` },
      alas: { n: 'alas de hada', back: true, svg: c => `<path d="M140 210Q60 120 50 200Q46 260 140 240Z" fill="${c}" opacity=".55" stroke="#fff" stroke-width="3"/><path d="M160 210Q240 120 250 200Q254 260 160 240Z" fill="${c}" opacity=".55" stroke="#fff" stroke-width="3"/><path d="M140 240Q80 250 84 300Q96 320 142 256Z" fill="${c}" opacity=".45" stroke="#fff" stroke-width="3"/><path d="M160 240Q220 250 216 300Q204 320 158 256Z" fill="${c}" opacity=".45" stroke="#fff" stroke-width="3"/>${sparkle(76, 196, 6)}${sparkle(226, 196, 6)}` },
      capa: { n: 'capa', back: true, svg: c => `<path d="M114 192Q150 176 186 192L232 486Q150 504 68 486Z" fill="${c}"/><path d="M114 192Q150 176 186 192L190 206Q150 194 110 206Z" fill="#ffffff"/>` },
      collar: { n: 'collar', svg: c => `<path d="M132 192Q150 218 168 192" stroke="#ffd34d" stroke-width="3" fill="none"/><path d="M150 206L158 216L150 228L142 216Z" fill="${c}" stroke="#fff" stroke-width="1.5"/>` },
      bolso: { n: 'bolso', svg: c => `<path d="M88 300Q100 276 112 300" stroke="${shade(c, .8)}" stroke-width="4" fill="none"/><rect x="80" y="298" width="40" height="32" rx="8" fill="${c}"/><circle cx="100" cy="312" r="4" fill="#ffd34d"/>` },
      ramo: { n: 'ramo de flores', svg: c => `<path d="M100 296L94 340M100 296L104 342" stroke="#3fae5c" stroke-width="4"/>${[[88, 286], [100, 278], [112, 288], [96, 298], [108, 300]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="9" fill="${i % 2 ? c : '#fff'}"/><circle cx="${x}" cy="${y}" r="3" fill="#ffcf4d"/>`).join('')}` },
      gafas: { n: 'gafas de corazón', svg: c => `<path d="M127 112Q114 100 112 114Q112 126 127 136Q142 126 142 114Q140 100 127 112Z" fill="${c}" opacity=".85"/><path d="M173 112Q160 100 158 114Q158 126 173 136Q188 126 188 114Q186 100 173 112Z" fill="${c}" opacity=".85"/><path d="M142 116H158" stroke="${c}" stroke-width="4"/>` }
    };
    const PETS = { nada: '', unicornio: '🦄', gatito: '🐱', perrito: '🐶', conejito: '🐰', dragon: '🐉', pajarito: '🐦' };
    const BGS = {
      castillo: { n: 'salón del castillo', svg: () => `<rect width="300" height="560" fill="#ffe0f1"/><rect y="420" width="300" height="140" fill="#f4b6d8"/>${[0, 1, 2].map(i => `<path d="M${30 + i * 90} 260V120Q${60 + i * 90} 70 ${90 + i * 90} 120V260Z" fill="#cdeeff" stroke="#fff" stroke-width="6"/>`).join('')}<path d="M0 420H300" stroke="#e58fc3" stroke-width="4"/>${[50, 150, 250].map(x => `<ellipse cx="${x}" cy="500" rx="40" ry="10" fill="#ffd1ea"/>`).join('')}<path d="M110 0Q150 60 190 0" fill="#ffb3d9"/>${sparkle(40, 300, 6)}${sparkle(260, 320, 6)}` },
      jardin: { n: 'jardín', svg: () => `<rect width="300" height="560" fill="#cdeeff"/><circle cx="250" cy="70" r="30" fill="#ffe27a"/><path d="M0 380Q150 340 300 380V560H0Z" fill="#b8ecb0"/>${[[30, 420], [80, 470], [250, 430], [210, 490], [140, 520], [270, 520], [20, 520]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="9" fill="${['#ff8fc8', '#fff', '#b57bff', '#ffd34d'][i % 4]}"/><circle cx="${x}" cy="${y}" r="3" fill="#ff9f1c"/>`).join('')}<circle cx="60" cy="90" r="22" fill="#fff"/><circle cx="84" cy="96" r="18" fill="#fff"/>` },
      noche: { n: 'noche de estrellas', svg: () => `<defs><linearGradient id="dn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b2a7a"/><stop offset="1" stop-color="#e88fcf"/></linearGradient></defs><rect width="300" height="560" fill="url(#dn)"/><circle cx="240" cy="80" r="26" fill="#fff6c9"/><circle cx="252" cy="72" r="24" fill="#5a3388"/>${Array.from({ length: 24 }, (_, i) => sparkle((i * 67) % 300, (i * 41) % 380, 3 + i % 3 * 2, '#fff6c9')).join('')}<path d="M0 470Q150 440 300 470V560H0Z" fill="#a463c9"/>` },
      nubes: { n: 'cielo de arcoíris', svg: () => `<rect width="300" height="560" fill="#ffe9f6"/>${['#ff5d8f', '#ff9f43', '#ffd93d', '#6bcb77', '#4d96ff', '#9b5de5'].map((col, i) => `<path d="M${-10 + i * 14} 330A${160 - i * 14} ${160 - i * 14} 0 0 1 ${310 - i * 14} 330" stroke="${col}" stroke-width="14" fill="none"/>`).join('')}<circle cx="30" cy="330" r="36" fill="#fff"/><circle cx="70" cy="340" r="28" fill="#fff"/><circle cx="270" cy="330" r="36" fill="#fff"/><circle cx="230" cy="340" r="28" fill="#fff"/><rect y="440" width="300" height="120" fill="#ffd1ea"/>` }
    };
    const TABS = [
      ['hair', '💇', 'pelo'], ['head', '👑', 'cabeza'], ['outfit', '👗', 'ropa'], ['shoes', '👠', 'zapatos'],
      ['acc', '🪄', 'complementos'], ['pet', '🦄', 'mascota'], ['bg', '🏰', 'fondo'], ['skin', '🎨', 'piel']
    ];

    /* ---------- estado ---------- */
    const DEF = {
      girl: { hair: 'largo', hairC: HAIRC[0], head: 'tiara', headC: '#ffd34d', outfit: 'gala', outfitC: '#ff6fb5', shoes: 'cristal', shoesC: '#8fd0ff', acc: { varita: '#ffd34d' }, pet: 'unicornio', bg: 'castillo', skin: SKINS[0], lashes: true },
      boy: { hair: 'corto', hairC: HAIRC[1], head: 'corona', headC: '#ffd34d', outfit: 'principe', outfitC: '#ff4d6d', shoes: 'botas', shoesC: '#3b2140', acc: { capa: '#b57bff' }, pet: 'perrito', bg: 'castillo', skin: SKINS[1], lashes: false }
    };
    let look = JSON.parse(JSON.stringify(App.store.get('pyj-dress', DEF.girl)));
    let tab = 'outfit', lastAcc = Object.keys(look.acc || {})[0] || 'varita';
    const save = () => App.store.set('pyj-dress', look);

    /* ---------- dibujar el muñeco ---------- */
    function dollSVG(L, forExport) {
      const sk = L.skin, skd = shade(sk, .88), H = HAIR[L.hair] || HAIR.largo, acc = L.acc || {};
      const accBack = Object.entries(acc).filter(([k]) => ACC[k] && ACC[k].back).map(([k, c]) => ACC[k].svg(c)).join('');
      const accFront = Object.entries(acc).filter(([k]) => ACC[k] && !ACC[k].back).map(([k, c]) => ACC[k].svg(c)).join('');
      const lash = L.lashes ? `<path d="M119 112L113 106M122 110L118 103M181 112L187 106M178 110L182 103" stroke="#3b2140" stroke-width="2.5" stroke-linecap="round"/>` : '';
      const pet = PETS[L.pet] ? `<text x="238" y="500" font-size="72" text-anchor="middle" dominant-baseline="middle" font-family='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'>${PETS[L.pet]}</text>` : '';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 560"${forExport ? ' width="600" height="1120"' : ''}>
        <g class="lbg">${BGS[L.bg].svg()}</g>
        <ellipse cx="150" cy="482" rx="80" ry="12" fill="rgba(120,30,90,.18)"/>
        <g class="lback">${accBack}${H.back(L.hairC)}</g>
        <g class="lbody">
          <rect x="124" y="296" width="22" height="170" rx="11" fill="${sk}"/><rect x="154" y="296" width="22" height="170" rx="11" fill="${sk}"/>
          <ellipse cx="135" cy="468" rx="13" ry="7" fill="${skd}"/><ellipse cx="165" cy="468" rx="13" ry="7" fill="${skd}"/>
          <rect x="141" y="160" width="18" height="36" fill="${skd}"/>
          <path d="M120 192Q150 182 180 192L184 304Q150 312 116 304Z" fill="${sk}"/>
          <path d="M122 198Q104 240 100 290" stroke="${sk}" stroke-width="20" stroke-linecap="round" fill="none"/><path d="M178 198Q196 240 200 290" stroke="${sk}" stroke-width="20" stroke-linecap="round" fill="none"/>
          <circle cx="100" cy="294" r="11" fill="${sk}"/><circle cx="200" cy="294" r="11" fill="${sk}"/>
          <path d="M122 196Q150 188 178 196L180 262Q150 268 120 262Z" fill="#ffffff" opacity=".9"/><rect x="118" y="286" width="64" height="26" rx="8" fill="#ffe0f1"/>
        </g>
        <g class="lshoes">${SHOES[L.shoes].svg(L.shoesC)}</g>
        <g class="loutfit">${OUTFIT[L.outfit].svg(L.outfitC)}</g>
        <g class="lhead">
          <circle cx="88" cy="118" r="11" fill="${sk}"/><circle cx="212" cy="118" r="11" fill="${sk}"/>
          <circle cx="150" cy="112" r="62" fill="${sk}"/>
          <path d="M115 100Q127 92 138 100M162 100Q173 92 185 100" stroke="${shade(L.hairC === '#ffffff' ? '#8b5a2b' : L.hairC, .7)}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
          <ellipse cx="127" cy="120" rx="8.5" ry="10.5" fill="#3b2140"/><ellipse cx="173" cy="120" rx="8.5" ry="10.5" fill="#3b2140"/>
          <circle cx="130" cy="115" r="3.2" fill="#fff"/><circle cx="176" cy="115" r="3.2" fill="#fff"/><circle cx="124" cy="124" r="1.6" fill="#fff"/><circle cx="170" cy="124" r="1.6" fill="#fff"/>
          ${lash}
          <ellipse cx="111" cy="140" rx="11" ry="6.5" fill="#ff9cc5" opacity=".6"/><ellipse cx="189" cy="140" rx="11" ry="6.5" fill="#ff9cc5" opacity=".6"/>
          <path d="M147 132Q150 135 153 132" stroke="${shade(sk, .7)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M136 146Q150 160 164 146Q150 152 136 146Z" fill="#e0457b"/>
        </g>
        <g class="lhair">${H.front(L.hairC)}</g>
        <g class="lhat">${HEAD[L.head].svg(L.headC)}</g>
        <g class="lacc">${accFront}</g>
        <g class="lpet">${pet}</g>
      </svg>`;
    }
    function render(pop) {
      paper.innerHTML = dollSVG(look);
      if (pop) { paper.classList.remove('bump'); void paper.offsetWidth; paper.classList.add('bump'); }
    }

    /* ---------- armario ---------- */
    function thumb(svg, vb) { return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`; }
    function renderTabs() { tabsEl.innerHTML = TABS.map(([k, ic, n]) => `<button class="wtab${k === tab ? ' on' : ''}" data-tab="${k}" aria-label="${n}">${ic}</button>`).join(''); }
    function renderItems() {
      let h = '';
      if (tab === 'hair') h = Object.entries(HAIR).map(([k, v]) => `<button class="witem${look.hair === k ? ' on' : ''}" data-v="${k}" aria-label="${v.n}">${thumb(`<circle cx="150" cy="112" r="56" fill="#ffe7d8"/>${v.back(look.hairC)}<circle cx="150" cy="112" r="56" fill="#ffe7d8"/>${v.front(look.hairC)}`, '60 0 180 260')}</button>`).join('');
      if (tab === 'head') h = Object.entries(HEAD).map(([k, v]) => `<button class="witem${look.head === k ? ' on' : ''}" data-v="${k}" aria-label="${v.n}">${k === 'nada' ? '<span class="wno">✖️</span>' : thumb(v.svg(look.headC), k === 'sombrero' ? '90 -40 120 120' : '80 0 140 100')}</button>`).join('');
      if (tab === 'outfit') h = Object.entries(OUTFIT).map(([k, v]) => `<button class="witem${look.outfit === k ? ' on' : ''}" data-v="${k}" aria-label="${v.n}">${thumb(v.svg(look.outfitC), '40 170 220 330')}</button>`).join('');
      if (tab === 'shoes') h = Object.entries(SHOES).map(([k, v]) => `<button class="witem${look.shoes === k ? ' on' : ''}" data-v="${k}" aria-label="${v.n}">${k === 'nada' ? '<span class="wno">✖️</span>' : thumb(v.svg(look.shoesC), '100 390 100 100')}</button>`).join('');
      if (tab === 'acc') { const VB = { varita: '190 170 100 140', alas: '40 120 220 210', capa: '60 170 180 340', collar: '120 180 60 60', bolso: '70 260 60 80', ramo: '70 260 60 90', gafas: '105 95 90 50' }; h = Object.entries(ACC).map(([k, v]) => `<button class="witem${look.acc[k] ? ' on' : ''}" data-v="${k}" aria-label="${v.n}">${thumb(v.svg(look.acc[k] || '#ff6fb5'), VB[k])}</button>`).join(''); }
      if (tab === 'pet') h = Object.entries(PETS).map(([k, v]) => `<button class="witem${look.pet === k ? ' on' : ''}" data-v="${k}" aria-label="${k}"><span class="wemo">${v || '✖️'}</span></button>`).join('');
      if (tab === 'bg') h = Object.entries(BGS).map(([k, v]) => `<button class="witem tall${look.bg === k ? ' on' : ''}" data-v="${k}" aria-label="${v.n}">${thumb(v.svg(), '0 0 300 560')}</button>`).join('');
      if (tab === 'skin') h = SKINS.map(c => `<button class="witem${look.skin === c ? ' on' : ''}" data-v="${c}" aria-label="piel"><span class="wdot" style="background:${c}"></span></button>`).join('') + `<button class="witem${look.lashes ? ' on' : ''}" data-v="lashes" aria-label="pestañas"><span class="wemo">👁️</span></button>`;
      itemsEl.innerHTML = h;
      renderColors();
    }
    function renderColors() {
      let list = null, cur = null;
      if (tab === 'hair') { list = HAIRC; cur = look.hairC; }
      else if (tab === 'head' && look.head !== 'nada') { list = CLOTHC; cur = look.headC; }
      else if (tab === 'outfit') { list = CLOTHC; cur = look.outfitC; }
      else if (tab === 'shoes' && look.shoes !== 'nada' && look.shoes !== 'cristal') { list = CLOTHC; cur = look.shoesC; }
      else if (tab === 'acc' && look.acc[lastAcc]) { list = CLOTHC; cur = look.acc[lastAcc]; }
      colorsEl.innerHTML = list ? list.map(c => `<button class="wcol${c === cur ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="color"></button>`).join('') : '';
      colorsEl.hidden = !list;
    }
    function openDoors() { body.classList.remove('open'); void body.offsetWidth; body.classList.add('open'); }
    tabsEl.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; renderTabs(); renderItems(); openDoors(); App.sfx.pop(); App.say(TABS.find(t => t[0] === tab)[2]); });
    itemsEl.addEventListener('click', e => {
      const b = e.target.closest('[data-v]'); if (!b) return; const v = b.dataset.v; let said = '';
      if (tab === 'hair') { look.hair = v; said = HAIR[v].n; }
      if (tab === 'head') { look.head = v; said = HEAD[v].n; }
      if (tab === 'outfit') { look.outfit = v; said = OUTFIT[v].n; }
      if (tab === 'shoes') { look.shoes = v; said = SHOES[v].n; }
      if (tab === 'acc') { if (look.acc[v]) { delete look.acc[v]; said = ''; } else { look.acc[v] = CLOTHC[Math.floor(Math.random() * 4)]; lastAcc = v; said = ACC[v].n; } }
      if (tab === 'pet') { look.pet = v; said = v === 'nada' ? '' : v; }
      if (tab === 'bg') { look.bg = v; said = BGS[v].n; }
      if (tab === 'skin') { if (v === 'lashes') look.lashes = !look.lashes; else look.skin = v; }
      save(); render(true); renderItems(); twinkle(); if (said && said !== 'nada') App.say('¡' + said[0].toUpperCase() + said.slice(1) + '!');
    });
    colorsEl.addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c;
      if (tab === 'hair') look.hairC = c; else if (tab === 'head') look.headC = c; else if (tab === 'outfit') look.outfitC = c; else if (tab === 'shoes') look.shoesC = c; else if (tab === 'acc' && look.acc[lastAcc]) look.acc[lastAcc] = c;
      save(); render(true); renderItems(); twinkle();
    });
    function twinkle() {
      const a = App.audio(); if (a) { const t = a.currentTime; [1568, 2093, 2637].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + i * .06); g.gain.exponentialRampToValueAtTime(.06, t + i * .06 + .01); g.gain.exponentialRampToValueAtTime(.0001, t + i * .06 + .25); o.connect(g).connect(a.destination); o.start(t + i * .06); o.stop(t + i * .06 + .3); }); }
      const r = paper.getBoundingClientRect(); App.confetti(18, r.left + r.width / 2, r.top + r.height * .35);
    }
    el.querySelector('.dwho').addEventListener('click', e => {
      const b = e.target.closest('[data-who]'); if (!b) return;
      look = JSON.parse(JSON.stringify(DEF[b.dataset.who])); look.who = b.dataset.who; lastAcc = Object.keys(look.acc)[0];
      save(); render(true); renderWho(); renderItems(); twinkle(); App.say(b.dataset.who === 'girl' ? '¡Una princesa!' : '¡Un príncipe!');
    });
    function renderWho() { el.querySelectorAll('[data-who]').forEach(b => b.classList.toggle('on', b.dataset.who === (look.who || 'girl'))); }
    q('.drand').addEventListener('click', () => {
      const pick = o => { const k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; }, pc = l => l[Math.floor(Math.random() * l.length)];
      look.hair = pick(HAIR); look.hairC = pc(HAIRC); look.head = pick(HEAD); look.headC = pc(CLOTHC); look.outfit = pick(OUTFIT); look.outfitC = pc(CLOTHC);
      look.shoes = pick(SHOES); look.shoesC = pc(CLOTHC); look.acc = {}; const ak = App.shuffle(Object.keys(ACC)).slice(0, 1 + Math.floor(Math.random() * 2)); ak.forEach(k => look.acc[k] = pc(CLOTHC)); lastAcc = ak[0];
      look.pet = pick(PETS); look.bg = pick(BGS);
      save(); render(true); renderItems(); twinkle(); App.say(App.pick(['¡Sorpresa!', '¡Qué elegante!', '¡Precioso!']));
    });
    paper.addEventListener('click', () => { twinkle(); App.say(App.pick(['¡Qué elegante!', '¡Qué bonito!', '¡Me encanta!', '¡Ji, ji!'])); paper.classList.remove('bump'); void paper.offsetWidth; paper.classList.add('bump'); });
    q('.dsave').addEventListener('click', () => {
      const svg = dollSVG(look, true), url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = 600; c.height = 1120; c.getContext('2d').drawImage(im, 0, 0, 600, 1120);
        const u = c.toDataURL('image/png'); q('.dsaveSheet .savedImg').src = u; const dl = q('.ddl'); dl.href = u; dl.download = `modelito-${Date.now()}.png`;
        App.openSheet(q('.dsaveSheet')); App.sfx.yes();
      };
      im.src = url;
    });

    this.begin = () => { render(); renderTabs(); renderItems(); renderWho(); openDoors(); };
    this._debug = { get look() { return look; }, dollSVG };
  },

  start() { this.begin(); },
  stop() { }
});
