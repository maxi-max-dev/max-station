/* ===========================================================
   🃏 翻牌配对 —— 游戏厅小游戏
   简单 4×4(8对) / 困难 6×6(18对),CSS 3D 翻转
   最佳成绩按难度存 Store 'games' 键下 memory.{easy,hard} = { moves, seconds }
   =========================================================== */
(() => {
  const ID = 'memory';

  // 可爱 emoji 牌面池(≥18 个),每局洗牌后取所需对数
  const EMOJIS = [
    '🐶', '🐱', '🐰', '🦊', '🐼', '🐨', '🐯', '🦁',
    '🐸', '🐵', '🐥', '🦄', '🐙', '🦋', '🐢', '🐳',
    '🍓', '🍉', '🍩', '🧁', '🌈', '⭐',
  ];
  const DIFFS = {
    easy: { label: '简单 4×4', cols: 4, pairs: 8 },
    hard: { label: '困难 6×6', cols: 6, pairs: 18 },
  };
  const FLIP_BACK_MS = 800;
  const MATCH_POP_DELAY_MS = 350; // 等 .gy-inner 翻转 transition(0.35s)播完再加 gy-matched 弹跳

  /* ---------- 样式(注入一次) ---------- */
  if (!document.getElementById('style-' + ID)) {
    const style = document.createElement('style');
    style.id = 'style-' + ID;
    style.textContent = `
      .gy-wrap { width: 540px; max-width: 100%; padding: 16px 16px 14px; display: flex; flex-direction: column; gap: 12px; }
      .gy-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .gy-top .gy-restart { margin-left: auto; }
      .gy-tabs { display: flex; gap: 6px; }
      .gy-tab {
        border: none; cursor: pointer; border-radius: 99px;
        padding: 5px 14px; font-size: 13px; font-weight: 700;
        background: var(--bg); color: var(--muted);
        transition: background .15s, color .15s, transform .1s;
      }
      .gy-tab:hover { background: var(--line); color: var(--ink); }
      .gy-tab:active { transform: scale(.95); }
      .gy-tab.gy-on { background: var(--pink); color: #fff; }
      .gy-tab.gy-on:hover { background: var(--pink); filter: brightness(.95); }
      .gy-stats { display: flex; gap: 8px; flex-wrap: wrap; }
      .gy-stat b { font-weight: 800; margin-left: 2px; }

      .gy-stage { position: relative; margin: 0 auto; width: 100%; }
      .gy-stage.gy-easy { max-width: 400px; }
      .gy-stage.gy-hard { max-width: 506px; }
      .gy-grid { display: grid; gap: 8px; }
      .gy-easy .gy-grid { grid-template-columns: repeat(4, 1fr); }
      .gy-hard .gy-grid { grid-template-columns: repeat(6, 1fr); gap: 6px; }

      .gy-card {
        position: relative; aspect-ratio: 1 / 1;
        border: none; background: none; padding: 0; cursor: pointer;
        perspective: 600px; -webkit-tap-highlight-color: transparent;
      }
      .gy-inner {
        position: absolute; inset: 0;
        transform-style: preserve-3d;
        transition: transform .35s ease;
      }
      .gy-card:not(.gy-open):hover .gy-inner { transform: translateY(-3px); }
      .gy-card:not(.gy-open):active .gy-inner { transform: scale(.94); }
      .gy-card.gy-open .gy-inner { transform: rotateY(180deg); }
      .gy-face {
        position: absolute; inset: 0;
        backface-visibility: hidden; -webkit-backface-visibility: hidden;
        border-radius: 12px; border: 1.5px solid var(--line);
        display: flex; align-items: center; justify-content: center;
        line-height: 1; user-select: none;
      }
      .gy-back {
        background: var(--pink-soft); color: var(--pink);
        font-size: 26px; box-shadow: var(--shadow);
        transition: box-shadow .15s;
      }
      .gy-card:not(.gy-open):hover .gy-back { box-shadow: var(--shadow-lift); }
      .gy-front { background: var(--card); font-size: 36px; transform: rotateY(180deg); }
      .gy-hard .gy-back { font-size: 19px; border-radius: 10px; }
      .gy-hard .gy-front { font-size: 26px; border-radius: 10px; }

      .gy-card.gy-matched { pointer-events: none; opacity: .55; transition: opacity .3s ease .3s; }
      .gy-card.gy-matched .gy-inner { transform: rotateY(180deg); animation: gy-pop .5s ease; }
      @keyframes gy-pop {
        0%   { transform: rotateY(180deg) scale(1); }
        40%  { transform: rotateY(180deg) scale(1.16); }
        70%  { transform: rotateY(180deg) scale(.94); }
        100% { transform: rotateY(180deg) scale(1); }
      }

      .gy-overlay {
        position: absolute; inset: 0; z-index: 5; border-radius: 12px;
        background: rgba(35, 42, 54, .62); color: #fff;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 6px; text-align: center; padding: 16px;
      }
      .gy-win-title { font-size: 24px; font-weight: 800; }
      .gy-win-line { font-size: 15.5px; font-weight: 700; }
      .gy-win-best { font-size: 13.5px; opacity: .92; }
      .gy-overlay .btn { margin-top: 8px; }

      .gy-confetti {
        position: absolute; inset: 0; z-index: 6; border-radius: 12px;
        overflow: hidden; pointer-events: none;
      }
      .gy-confetti span {
        position: absolute; top: -36px;
        animation: gy-fall linear forwards;
      }
      @keyframes gy-fall {
        0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(580px) rotate(330deg); opacity: 0; }
      }

      .gy-help { font-size: 12.5px; color: var(--muted); text-align: center; }

      @media (max-width: 420px) {
        .gy-front { font-size: 27px; }
        .gy-back { font-size: 20px; }
        .gy-hard .gy-front { font-size: 19px; }
        .gy-hard .gy-back { font-size: 14px; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ---------- 最佳成绩存取(只动 games.memory 子键) ---------- */
  function loadBestAll() {
    const all = Store.get('games', {});
    const mine = all && typeof all === 'object' ? all[ID] : null;
    return mine && typeof mine === 'object' ? mine : {};
  }
  function saveBest(diff, rec) {
    const all = Store.get('games', {});
    const safe = all && typeof all === 'object' ? all : {};
    safe[ID] = Object.assign({}, safe[ID]);
    safe[ID][diff] = rec;
    Store.set('games', safe);
  }
  function isRecord(prev, moves, seconds) {
    if (!prev || typeof prev.moves !== 'number') return true;
    if (moves < prev.moves) return true;
    return moves === prev.moves && seconds < (typeof prev.seconds === 'number' ? prev.seconds : Infinity);
  }

  /* ---------- 工具 ---------- */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ---------- 运行时状态 ---------- */
  let root = null, stageEl = null, gridEl = null, overlayEl = null;
  let movesEl = null, timeEl = null, bestEl = null;
  let diff = 'easy';
  let deck = [], openIdx = [], lock = false;
  let moves = 0, matchedPairs = 0, totalPairs = 8;
  let started = false, startTime = 0, seconds = 0;
  let clockTimer = null, flipBackTimer = null, confettiTimer = null, matchPopTimer = null;

  /* ---------- 秒表 ---------- */
  function tickClock() {
    seconds = Math.floor((Date.now() - startTime) / 1000);
    if (timeEl) timeEl.textContent = fmt(seconds);
  }
  function startClock() {
    started = true;
    startTime = Date.now();
    seconds = 0;
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 250);
  }
  function stopClock() {
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  }

  /* ---------- 渲染辅助 ---------- */
  function updateStats() {
    if (movesEl) movesEl.textContent = moves;
    if (timeEl) timeEl.textContent = fmt(seconds);
  }
  function updateBestChip() {
    if (!bestEl) return;
    const rec = loadBestAll()[diff];
    bestEl.textContent = rec && typeof rec.moves === 'number'
      ? `${rec.moves}步 · ${fmt(rec.seconds || 0)}`
      : '—';
  }

  function clearConfetti() {
    if (confettiTimer) { clearTimeout(confettiTimer); confettiTimer = null; }
    if (stageEl) {
      const old = stageEl.querySelector('.gy-confetti');
      if (old) old.remove();
    }
  }

  // 纯 CSS emoji 彩带,2 秒左右自清
  function celebrate() {
    if (!stageEl) return;
    clearConfetti();
    const emo = ['🎉', '✨', '🎊', '💖', '⭐', '🌸'];
    const box = document.createElement('div');
    box.className = 'gy-confetti';
    let html = '';
    for (let i = 0; i < 16; i++) {
      const left = (Math.random() * 92 + 2).toFixed(1);
      const dur = (1.1 + Math.random() * .8).toFixed(2);
      const delay = (Math.random() * .5).toFixed(2);
      const size = Math.round(15 + Math.random() * 12);
      html += `<span style="left:${left}%;font-size:${size}px;animation-duration:${dur}s;animation-delay:${delay}s">${emo[i % emo.length]}</span>`;
    }
    box.innerHTML = html;
    stageEl.appendChild(box);
    confettiTimer = setTimeout(() => {
      confettiTimer = null;
      box.remove();
    }, 2300);
  }

  /* ---------- 游戏逻辑 ---------- */
  function newGame(nextDiff) {
    diff = DIFFS[nextDiff] ? nextDiff : 'easy';
    const conf = DIFFS[diff];
    totalPairs = conf.pairs;

    stopClock();
    if (flipBackTimer) { clearTimeout(flipBackTimer); flipBackTimer = null; }
    if (matchPopTimer) { clearTimeout(matchPopTimer); matchPopTimer = null; }
    clearConfetti();

    moves = 0;
    matchedPairs = 0;
    openIdx = [];
    lock = false;
    started = false;
    seconds = 0;

    const faces = shuffle(EMOJIS.slice()).slice(0, totalPairs);
    deck = shuffle(faces.concat(faces)).map(e => ({ emoji: e, open: false, matched: false }));

    if (!root) return;
    root.querySelectorAll('.gy-tab').forEach(btn => {
      btn.classList.toggle('gy-on', btn.dataset.diff === diff);
    });
    stageEl.classList.toggle('gy-easy', diff === 'easy');
    stageEl.classList.toggle('gy-hard', diff === 'hard');
    overlayEl.style.display = 'none';
    overlayEl.innerHTML = '';

    gridEl.innerHTML = deck.map((c, i) => `
      <button class="gy-card" data-i="${i}" aria-label="第 ${i + 1} 张牌">
        <span class="gy-inner">
          <span class="gy-face gy-back">🂠</span>
          <span class="gy-face gy-front">${c.emoji}</span>
        </span>
      </button>`).join('');

    updateStats();
    updateBestChip();
  }

  function onCardClick(e) {
    const btn = e.target.closest('.gy-card');
    if (!btn || !gridEl || !gridEl.contains(btn)) return;
    if (lock || openIdx.length >= 2) return; // 互锁:翻回期间 / 已有两张时不许翻第三张

    const i = Number(btn.dataset.i);
    const card = deck[i];
    if (!card || card.open || card.matched) return;

    if (!started) startClock(); // 首次翻牌开始计时

    card.open = true;
    btn.classList.add('gy-open');
    openIdx.push(i);
    if (openIdx.length < 2) return;

    // 翻开了第二张:算 1 步,判定配对
    moves++;
    updateStats();
    const [a, b] = openIdx;
    if (deck[a].emoji === deck[b].emoji) {
      deck[a].matched = deck[b].matched = true;
      openIdx = [];
      matchedPairs++;
      // 先让 0.35s 的翻转 transition 播完,再加 gy-matched 触发 gy-pop 弹跳,
      // 否则 animation 会压过 transform transition,第二张牌直接瞬移到正面
      lock = true;
      matchPopTimer = setTimeout(() => {
        matchPopTimer = null;
        const ba = cardBtn(a), bb = cardBtn(b);
        if (ba) ba.classList.add('gy-matched');
        if (bb) bb.classList.add('gy-matched');
        lock = false;
        if (matchedPairs === totalPairs) win();
      }, MATCH_POP_DELAY_MS);
    } else {
      lock = true;
      flipBackTimer = setTimeout(() => {
        flipBackTimer = null;
        deck[a].open = deck[b].open = false;
        const ba = cardBtn(a), bb = cardBtn(b);
        if (ba) ba.classList.remove('gy-open');
        if (bb) bb.classList.remove('gy-open');
        openIdx = [];
        lock = false;
      }, FLIP_BACK_MS);
    }
  }

  function cardBtn(i) {
    return gridEl ? gridEl.querySelector(`.gy-card[data-i="${i}"]`) : null;
  }

  function win() {
    stopClock();
    if (started) seconds = Math.floor((Date.now() - startTime) / 1000);
    updateStats();

    const prev = loadBestAll()[diff];
    const record = isRecord(prev, moves, seconds);
    if (record) saveBest(diff, { moves, seconds });
    updateBestChip();

    if (overlayEl) {
      overlayEl.innerHTML = `
        <div class="gy-win-title">🏆 全部配对!</div>
        <div class="gy-win-line">步数 ${moves} · 用时 ${fmt(seconds)}</div>
        <div class="gy-win-best">${record
          ? '🎉 新纪录!记忆力超神'
          : `最佳 ${prev.moves}步 · ${fmt(prev.seconds || 0)}`}</div>
        <button class="btn primary gy-again">再来一局</button>`;
      overlayEl.style.display = '';
      overlayEl.querySelector('.gy-again').addEventListener('click', () => newGame(diff));
    }
    celebrate();
  }

  /* ---------- 挂载 / 卸载 ---------- */
  function mount(host) {
    root = document.createElement('div');
    root.className = 'card gy-wrap';
    root.innerHTML = `
      <div class="gy-top">
        <div class="gy-tabs">
          <button class="gy-tab" data-diff="easy">${DIFFS.easy.label}</button>
          <button class="gy-tab" data-diff="hard">${DIFFS.hard.label}</button>
        </div>
        <button class="btn ghost small gy-restart">重新开始</button>
      </div>
      <div class="gy-stats">
        <span class="chip gy-stat" style="background:var(--pink-soft);color:var(--pink)">步数<b class="gy-moves">0</b></span>
        <span class="chip gy-stat" style="background:var(--teal-soft);color:var(--teal)">⏱<b class="gy-time">0:00</b></span>
        <span class="chip gy-stat" style="background:var(--yellow-soft);color:var(--ink)">最佳<b class="gy-best">—</b></span>
      </div>
      <div class="gy-stage gy-easy">
        <div class="gy-grid"></div>
        <div class="gy-overlay" style="display:none"></div>
      </div>
      <p class="gy-help">🖱 点击翻牌,找出两张一样的 · 📱 手机直接点卡片 · 步数越少越厉害</p>`;
    host.appendChild(root);

    stageEl = root.querySelector('.gy-stage');
    gridEl = root.querySelector('.gy-grid');
    overlayEl = root.querySelector('.gy-overlay');
    movesEl = root.querySelector('.gy-moves');
    timeEl = root.querySelector('.gy-time');
    bestEl = root.querySelector('.gy-best');

    gridEl.addEventListener('click', onCardClick);
    root.querySelector('.gy-restart').addEventListener('click', () => newGame(diff));
    root.querySelectorAll('.gy-tab').forEach(btn => {
      btn.addEventListener('click', () => newGame(btn.dataset.diff));
    });

    newGame('easy');
  }

  function unmount() {
    stopClock();
    if (flipBackTimer) { clearTimeout(flipBackTimer); flipBackTimer = null; }
    if (matchPopTimer) { clearTimeout(matchPopTimer); matchPopTimer = null; }
    if (confettiTimer) { clearTimeout(confettiTimer); confettiTimer = null; }
    root = null; stageEl = null; gridEl = null; overlayEl = null;
    movesEl = null; timeEl = null; bestEl = null;
    deck = []; openIdx = []; lock = false; started = false;
  }

  App.registerGame({
    id: ID,
    name: '翻牌配对',
    icon: '🃏',
    color: 'pink',
    desc: '考验记忆力的时候到了',
    mount,
    unmount,
  });
})();
