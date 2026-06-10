/* ===========================================================
   🔢 2048 —— 游戏厅小游戏
   方向键 / WASD / 触屏滑动,合并出 2048
   最高分存 Store 'games' 键下的 '2048' 子键 { best }
   =========================================================== */
(() => {
  const GID = '2048';
  const SIZE = 4;

  /* ---------- 样式(只注入一次) ---------- */
  if (!document.getElementById('style-2048')) {
    const style = document.createElement('style');
    style.id = 'style-2048';
    style.textContent = `
      .g2-wrap { padding: 18px; width: 390px; max-width: 100%; }
      .g2-top {
        display: flex; align-items: center; justify-content: space-between;
        gap: 10px; margin-bottom: 14px; flex-wrap: wrap;
      }
      .g2-scores { display: flex; gap: 8px; }
      .g2-scorebox {
        border-radius: 10px; padding: 5px 14px; text-align: center; min-width: 76px;
        transition: transform .15s;
      }
      .g2-scorebox:hover { transform: translateY(-2px); }
      .g2-scorebox.g2-cur  { background: var(--yellow-soft); }
      .g2-scorebox.g2-best { background: var(--orange-soft); }
      .g2-score-label { font-size: 11px; font-weight: 700; color: var(--muted); line-height: 1.4; }
      .g2-score-val { font-size: 18px; font-weight: 800; line-height: 1.3; }
      .g2-board-wrap { position: relative; }
      .g2-board {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, 1fr);
        gap: 2px; padding: 2px;
        background: var(--line); border-radius: 12px;
        width: 354px; max-width: 100%; aspect-ratio: 1 / 1;
        touch-action: none; user-select: none; -webkit-user-select: none;
      }
      .g2-cell { background: var(--bg); border-radius: 7px; position: relative; }
      .g2-tile {
        position: absolute; inset: 0; border-radius: 7px;
        display: flex; align-items: center; justify-content: center;
        font-weight: 800; font-size: 31px; line-height: 1;
      }
      .g2-t2    { background: var(--yellow-soft); color: var(--ink); }
      .g2-t4    { background: var(--orange-soft); color: var(--ink); }
      .g2-t8    { background: var(--yellow); color: var(--ink); }
      .g2-t16   { background: var(--orange); color: var(--ink); }
      .g2-t32   { background: var(--red);    color: var(--ink); }
      .g2-t64   { background: var(--pink);   color: var(--ink); }
      .g2-t128  { background: var(--purple); color: var(--ink); }
      .g2-t256  { background: var(--blue);   color: var(--ink); }
      .g2-t512  { background: var(--teal);   color: #fff; }
      .g2-t1024 { background: var(--ink);    color: #fff; }
      .g2-t2048 {
        background: var(--yellow); color: #fff;
        box-shadow: 0 0 4px var(--yellow), 0 0 20px var(--yellow);
        z-index: 2;
      }
      .g2-tmax {
        background: var(--purple); color: #fff;
        box-shadow: 0 0 16px var(--purple); z-index: 2;
      }
      .g2-len3 { font-size: 25px; }
      .g2-len4 { font-size: 20px; }
      .g2-len5 { font-size: 16px; }
      @keyframes g2-pop {
        0%   { transform: scale(.2); opacity: 0; }
        70%  { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes g2-pulse {
        0%   { transform: scale(1); }
        40%  { transform: scale(1.18); }
        100% { transform: scale(1); }
      }
      .g2-new    { animation: g2-pop .18s ease; }
      .g2-merged { animation: g2-pulse .22s ease; }
      .g2-overlay {
        position: absolute; inset: 0; z-index: 5; border-radius: 12px;
        background: rgba(255, 255, 255, .88);
        display: none; flex-direction: column; align-items: center; justify-content: center;
        gap: 6px; text-align: center; padding: 16px;
      }
      .g2-overlay.g2-show { display: flex; animation: g2-fade .25s ease; }
      @keyframes g2-fade { from { opacity: 0; } to { opacity: 1; } }
      .g2-ov-emoji { font-size: 46px; line-height: 1.2; }
      .g2-ov-title { font-size: 22px; font-weight: 800; }
      .g2-ov-sub { font-size: 14px; color: var(--muted); margin-bottom: 8px; }
      .g2-ov-btns { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
      .g2-help { margin-top: 12px; text-align: center; font-size: 12.5px; color: var(--muted); }
      @media (max-width: 430px) {
        .g2-wrap { padding: 14px; }
        .g2-tile { font-size: 26px; }
        .g2-len3 { font-size: 21px; }
        .g2-len4 { font-size: 17px; }
        .g2-len5 { font-size: 13px; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ---------- 状态 ---------- */
  let grid = [];          // 4×4 数值矩阵,0 = 空
  let score = 0;
  let best = 0;
  let won = false;        // 已经弹过 2048 庆祝
  let over = false;       // 游戏结束
  let paused = false;     // overlay 显示期间不响应移动
  let newPos = new Set();     // 本次新生成的格子 index(r*4+c)
  let mergedPos = new Set();  // 本次合并落点 index
  let touchStart = null;

  // DOM 引用(mount 时赋值,unmount 清空)
  let boardEl = null, overlayEl = null, scoreEl = null, bestEl = null;

  const TILE_CLASS = {
    2: 'g2-t2', 4: 'g2-t4', 8: 'g2-t8', 16: 'g2-t16', 32: 'g2-t32',
    64: 'g2-t64', 128: 'g2-t128', 256: 'g2-t256', 512: 'g2-t512',
    1024: 'g2-t1024', 2048: 'g2-t2048',
  };

  /* ---------- 持久化 ---------- */
  function loadBest() {
    const all = Store.get('games', {});
    best = (all && all[GID] && Number(all[GID].best)) || 0;
  }
  function saveBest() {
    const all = Store.get('games', {});
    all[GID] = Object.assign({}, all[GID], { best });
    Store.set('games', all);
  }

  /* ---------- 核心逻辑 ---------- */
  function emptyCells() {
    const out = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (grid[r][c] === 0) out.push([r, c]);
    return out;
  }

  function spawn() {
    const empties = emptyCells();
    if (!empties.length) return;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    newPos.add(r * SIZE + c);
  }

  // 按方向返回 4 条「移动线」,每条是 4 个坐标,排列顺序 = 滑动的目标方向在前
  function getLines(dir) {
    const lines = [];
    for (let i = 0; i < SIZE; i++) {
      const line = [];
      for (let j = 0; j < SIZE; j++) {
        if (dir === 'L') line.push([i, j]);
        else if (dir === 'R') line.push([i, SIZE - 1 - j]);
        else if (dir === 'U') line.push([j, i]);
        else line.push([SIZE - 1 - j, i]);
      }
      lines.push(line);
    }
    return lines;
  }

  function isGameOver() {
    if (emptyCells().length) return false;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return false;
        if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return false;
      }
    return true;
  }

  function doMove(dir) {
    if (!boardEl || over || paused) return;
    let movedAny = false, gained = 0, hit2048 = false;
    const mergedTargets = [];

    for (const coords of getLines(dir)) {
      const vals = coords.map(([r, c]) => grid[r][c]);
      const compact = vals.filter(v => v !== 0);
      const out = [];
      for (let i = 0; i < compact.length; i++) {
        // 正统规则:相邻同值合并一次,合并产物本轮不再参与合并
        if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
          const v = compact[i] * 2;
          gained += v;
          if (v === 2048) hit2048 = true;
          mergedTargets.push(coords[out.length]);
          out.push(v);
          i++;
        } else {
          out.push(compact[i]);
        }
      }
      while (out.length < SIZE) out.push(0);
      out.forEach((v, i) => {
        const [r, c] = coords[i];
        if (grid[r][c] !== v) movedAny = true;
        grid[r][c] = v;
      });
    }

    if (!movedAny) return; // 这个方向推不动,不生成新块

    mergedTargets.forEach(([r, c]) => mergedPos.add(r * SIZE + c));
    score += gained;
    if (score > best) { best = score; saveBest(); }
    spawn();
    renderBoard();
    renderScores();

    if (hit2048 && !won) {
      won = true;
      paused = true;
      showOverlay(`
        <div class="g2-ov-emoji">🎉</div>
        <div class="g2-ov-title">你做到了!</div>
        <div class="g2-ov-sub">滑出了 2048!要不要继续冲 4096?</div>
        <div class="g2-ov-btns">
          <button class="btn primary" data-g2="continue">继续玩</button>
          <button class="btn ghost" data-g2="again">再来一局</button>
        </div>`);
      return;
    }
    checkGameOver();
  }

  // 死局则弹结束面板;返回是否已结束
  function checkGameOver() {
    if (!isGameOver()) return false;
    over = true;
    showOverlay(`
      <div class="g2-ov-emoji">🧱</div>
      <div class="g2-ov-title">没路可走啦</div>
      <div class="g2-ov-sub">本局 ${score} 分 · 最佳 ${best} 分</div>
      <div class="g2-ov-btns">
        <button class="btn primary" data-g2="again">再来一局</button>
      </div>`);
    return true;
  }

  function restart() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    won = false;
    over = false;
    paused = false;
    newPos.clear();
    mergedPos.clear();
    hideOverlay();
    spawn();
    spawn();
    renderBoard();
    renderScores();
  }

  /* ---------- 渲染 ---------- */
  function renderBoard() {
    if (!boardEl) return;
    let html = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        const idx = r * SIZE + c;
        let tile = '';
        if (v) {
          const cls = TILE_CLASS[v] || 'g2-tmax';
          const len = String(v).length;
          const lenCls = len >= 3 ? ` g2-len${Math.min(len, 5)}` : '';
          const anim = newPos.has(idx) ? ' g2-new' : (mergedPos.has(idx) ? ' g2-merged' : '');
          tile = `<div class="g2-tile ${cls}${lenCls}${anim}">${v}</div>`;
        }
        html += `<div class="g2-cell">${tile}</div>`;
      }
    }
    boardEl.innerHTML = html;
    newPos.clear();
    mergedPos.clear();
  }

  function renderScores() {
    if (scoreEl) scoreEl.textContent = score;
    if (bestEl) bestEl.textContent = best;
  }

  function showOverlay(html) {
    if (!overlayEl) return;
    overlayEl.innerHTML = html;
    overlayEl.classList.add('g2-show');
  }
  function hideOverlay() {
    if (!overlayEl) return;
    overlayEl.classList.remove('g2-show');
    overlayEl.innerHTML = '';
  }

  /* ---------- 输入 ---------- */
  const KEYMAP = {
    ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D',
    a: 'L', A: 'L', d: 'R', D: 'R', w: 'U', W: 'U', s: 'D', S: 'D',
  };

  function onKey(e) {
    if (!boardEl) return;
    if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return;
    // 防页面滚动;但焦点在按钮上时放行空格,保留「空格激活按钮」的键盘可达性
    const onButton = e.target && e.target.closest && e.target.closest('button');
    if ((e.key === ' ' && !onButton) || (typeof e.key === 'string' && e.key.startsWith('Arrow'))) e.preventDefault();
    const dir = KEYMAP[e.key];
    if (dir) {
      e.preventDefault();
      doMove(dir);
    }
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }
  function onTouchEnd(e) {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return; // 滑动太短,忽略
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
  }

  /* ---------- 挂载 / 卸载 ---------- */
  function mount(host) {
    loadBest();
    host.innerHTML = `
      <div class="card g2-wrap">
        <div class="g2-top">
          <div class="g2-scores">
            <div class="g2-scorebox g2-cur">
              <div class="g2-score-label">当前分</div>
              <div class="g2-score-val" data-g2="score">0</div>
            </div>
            <div class="g2-scorebox g2-best">
              <div class="g2-score-label">最佳</div>
              <div class="g2-score-val" data-g2="best">0</div>
            </div>
          </div>
          <button class="btn ghost small" data-g2="restart">🔄 重新开始</button>
        </div>
        <div class="g2-board-wrap">
          <div class="g2-board" data-g2="board" aria-label="2048 棋盘"></div>
          <div class="g2-overlay" data-g2="overlay"></div>
        </div>
        <div class="g2-help">⌨️ 方向键 / WASD 滑动合并 · 📱 手机直接在棋盘上划(超过 30px 才算) · 相同数字相撞会合体</div>
      </div>`;

    boardEl = host.querySelector('[data-g2="board"]');
    overlayEl = host.querySelector('[data-g2="overlay"]');
    scoreEl = host.querySelector('[data-g2="score"]');
    bestEl = host.querySelector('[data-g2="best"]');

    host.querySelector('[data-g2="restart"]').addEventListener('click', restart);
    overlayEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-g2]');
      if (!btn) return;
      if (btn.dataset.g2 === 'continue') {
        paused = false;
        hideOverlay();
        checkGameOver(); // 胜利那步可能恰好锁死棋盘,补查死局
      }
      else if (btn.dataset.g2 === 'again') restart();
    });
    boardEl.addEventListener('touchstart', onTouchStart, { passive: true });
    boardEl.addEventListener('touchend', onTouchEnd);

    document.addEventListener('keydown', onKey);
    restart();
  }

  function unmount() {
    document.removeEventListener('keydown', onKey);
    boardEl = null;
    overlayEl = null;
    scoreEl = null;
    bestEl = null;
    touchStart = null;
    paused = false;
  }

  App.registerGame({
    id: GID,
    name: '2048',
    icon: '🔢',
    color: 'yellow',
    desc: '滑出一块 2048',
    mount,
    unmount,
  });
})();
