/* JUEGO: PAREJAS
   Con animales o con las fotos de la familia. Al girar un animal, la voz dice su nombre. */
App.registerGame({
  id: 'pairs', title: 'Parejas', color: 'var(--teal)', order: 2,
  art: '<svg viewBox="0 0 120 100"><rect x="12" y="14" width="50" height="70" rx="10" fill="#fff" transform="rotate(-10 37 49)"/><rect x="58" y="14" width="50" height="70" rx="10" fill="#fff" transform="rotate(8 83 49)"/><circle cx="38" cy="50" r="13" fill="#ff8c1a"/><circle cx="84" cy="50" r="13" fill="#ff8c1a"/><circle cx="33" cy="46" r="2.5" fill="#2a1d0f"/><circle cx="43" cy="46" r="2.5" fill="#2a1d0f"/><circle cx="79" cy="46" r="2.5" fill="#2a1d0f"/><circle cx="89" cy="46" r="2.5" fill="#2a1d0f"/></svg>',

  html: () => `
    <div class="bar">${App.homeBtn()}<div class="chips opts"></div><button class="ib again" aria-label="Nueva partida">${App.icon('replay')}</button></div>
    <div class="board"></div>`,

  init(el) {
    const S = App.settings, board = el.querySelector('.board'), optsEl = el.querySelector('.opts');
    if (!S.pairs) S.pairs = 3;
    if (!S.deck) S.deck = 'animals';
    let cards = [], open = [], lock = false, done = 0;

    function opts() {
      const ph = App.photos.list();
      if (S.deck === 'photos' && ph.length < 2) S.deck = 'animals';
      optsEl.innerHTML =
        `<button class="chip${S.deck === 'animals' ? ' on' : ''}" data-deck="animals" aria-label="Animales">🐱</button>` +
        (ph.length >= 2 ? `<button class="chip${S.deck === 'photos' ? ' on' : ''}" data-deck="photos" aria-label="Mis fotos"><img src="${ph[0]}" alt=""></button>` : '') +
        `<button class="chip" data-np="1" aria-label="Cambiar número de parejas">${'<i></i>'.repeat(S.pairs)}</button>`;
    }
    const newGame = () => {
      opts();
      const n = S.pairs, ph = App.photos.list();
      const items = S.deck === 'photos'
        ? App.shuffle(ph).slice(0, n).map(img => ({ img, name: '' }))
        : App.shuffle(App.data.animals).slice(0, n).map(([e, name]) => ({ e, name }));
      const deck = []; items.forEach((it, pid) => deck.push({ ...it, pid }, { ...it, pid }));
      cards = App.shuffle(deck); open = []; lock = false; done = 0;
      board.innerHTML = cards.map((c, i) => `<button class="card" data-i="${i}" aria-label="Carta"><span class="in"><span class="back"></span><span class="face">${c.img ? `<img src="${c.img}" alt="">` : `<b>${c.e}</b>`}</span></span></button>`).join('');
      App.fitGrid(board, cards.length, 220);
    };
    this.newGame = newGame;
    const ro = new ResizeObserver(() => App.fitGrid(board, cards.length, 220)); ro.observe(board);

    board.addEventListener('click', e => {
      const b = e.target.closest('.card'); if (!b || lock) return;
      const i = +b.dataset.i, c = cards[i]; if (c.up || c.done) return;
      c.up = true; b.classList.add('up'); App.sfx.flip(); if (c.name) App.say(c.name);
      open.push(i); if (open.length < 2) return;
      lock = true; const [a, z] = open;
      if (cards[a].pid === cards[z].pid) {
        setTimeout(() => {
          [a, z].forEach(x => { cards[x].done = true; board.children[x].classList.add('done'); });
          App.sfx.yes(); App.say('¡Pareja!'); open = []; lock = false; done++;
          if (done === cards.length / 2) setTimeout(() => App.win(newGame), 900);
        }, 500);
      } else setTimeout(() => { [a, z].forEach(x => { cards[x].up = false; board.children[x].classList.remove('up'); }); open = []; lock = false; }, 1200);
    });
    optsEl.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.deck) S.deck = b.dataset.deck;
      if (b.dataset.np) { const o = [2, 3, 4, 6]; S.pairs = o[(o.indexOf(S.pairs) + 1) % o.length]; }
      App.saveSettings(); App.sfx.pop(); newGame();
    });
    el.querySelector('.again').addEventListener('click', () => { App.sfx.pop(); newGame(); });
  },

  start() { this.newGame(); }
});
