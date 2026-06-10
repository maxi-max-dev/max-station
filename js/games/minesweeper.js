/* ===========================================================
   💣 扫雷 —— 游戏厅小游戏
   经典规则:首次点击保证安全(先点击后布雷),0 格泛洪展开,
   右键/旗模式插旗,按难度记录最佳时间。
   =========================================================== */
(() => {
  const ID = 'minesweeper';

  const DIFFS = {
    easy:   { label: '初级', tag: '9×9',   rows: 9,  cols: 9,  mines: 10 },
    medium: { label: '中级', tag: '16×16', rows: 16, cols: 16, mines: 40 },
    hard:   { label: '高级', tag: '16×30', rows: 16, cols: 30, mines: 99 },
  };

  /* ---------- 样式(注入一次) ---------- */
  if (!document.getElementById('style-' + ID)) {
    const style = document.createElement('style');
    style.id = 'style-' + ID;
    style.textContent = `
      .gm-wrap { width: fit-content; max-width: 100%; padding: 16px 18px 14px; }
      .gm-tabs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
      .gm-tab {
        border: none; background: var(--bg); color: var(--muted);
        font-size: 13px; font-weight: 700; padding: 5px 13px;
        border-radius: 99px; cursor: pointer;
        transition: background .15s, color .15s;
      }
      .gm-tab:hover { background: var(--line); color: var(--ink); }
      .gm-tab.gm-on { background: var(--blue); color: #fff; }
      .gm-tab small { font-weight: 600; opacity: .75; margin-left: 3px; }
      .gm-best { margin-left: auto; font-size: 12.5px; font-weight: 700; color: var(--muted); white-space: nowrap; }
      .gm-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; user-select: none; }
      .gm-stat {
        font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums;
        background: var(--blue-soft); color: var(--blue);
        padding: 5px 11px; border-radius: 9px; min-width: 78px; text-align: center;
        line-height: 1.4;
      }
      .gm-face {
        border: none; background: var(--bg); cursor: pointer;
        font-size: 21px; width: 40px; height: 40px; line-height: 1;
        border-radius: 10px; transition: background .15s, transform .1s;
      }
      .gm-face:hover { background: var(--line); transform: scale(1.08); }
      .gm-face:active { transform: scale(.94); }
      .gm-flagbtn {
        border: 1.5px solid var(--line); background: var(--card); color: var(--muted);
        font-size: 13px; font-weight: 700; padding: 6px 12px;
        border-radius: 10px; cursor: pointer;
        transition: background .15s, color .15s, border-color .15s;
      }
      .gm-flagbtn:hover { border-color: var(--yellow); color: var(--ink); }
      .gm-flagbtn.gm-on { background: var(--yellow-soft); border-color: var(--yellow); color: var(--ink); }
      .gm-stage { position: relative; }
      .gm-scroll { overflow-x: auto; max-width: 100%; padding-bottom: 4px; }
      .gm-board { display: grid; gap: 2px; width: max-content; touch-action: manipulation; }
      .gm-cell {
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 800; line-height: 1;
        font-variant-numeric: tabular-nums;
        border-radius: 5px; cursor: pointer; user-select: none;
        background: var(--blue-soft);
        box-shadow: inset 1.5px 1.5px 0 rgba(255,255,255,.85),
                    inset -1.5px -1.5px 0 rgba(79,124,247,.22);
        transition: filter .08s;
      }
      .gm-cell:hover { filter: brightness(.94); }
      .gm-cell.gm-open {
        background: var(--card); box-shadow: none;
        border: 1px solid var(--line); cursor: default;
      }
      .gm-cell.gm-open:hover { filter: none; }
      .gm-cell.gm-hit { background: var(--red); border-color: var(--red); }
      .gm-cell.gm-wrong { background: var(--red-soft); box-shadow: none; border: 1px solid var(--red); cursor: default; }
      .gm-n1 { color: var(--blue); }
      .gm-n2 { color: var(--green); }
      .gm-n3 { color: var(--red); }
      .gm-n4 { color: var(--purple); }
      .gm-n5 { color: var(--orange); }
      .gm-n6 { color: var(--teal); }
      .gm-n7 { color: var(--ink); }
      .gm-n8 { color: var(--muted); }
      .gm-overlay {
        position: absolute; inset: 0; z-index: 5; display: none;
        flex-direction: column; align-items: center; justify-content: center;
        gap: 6px; padding: 16px; text-align: center;
        background: rgba(244, 246, 251, .9); border-radius: 10px;
      }
      .gm-overlay.gm-show { display: flex; }
      .gm-ov-emoji { font-size: 42px; line-height: 1; }
      .gm-ov-title { font-size: 18px; font-weight: 800; }
      .gm-ov-sub { font-size: 13.5px; color: var(--muted); }
      .gm-ov-btn { margin-top: 6px; }
      .gm-help { margin-top: 12px; font-size: 12.5px; color: var(--muted); text-align: center; }
    `;
    document.head.appendChild(style);
  }

  /* ---------- 状态 ---------- */
  let diff = 'easy';
  let rows = 9, cols = 9, mines = 10;
  let cells = [];      // { mine, adj, revealed, flagged }
  let cellEls = [];
  let placed = false;  // 是否已布雷(首次点击后)
  let over = false;
  let flagMode = false;
  let flags = 0;
  let revealed = 0;
  let seconds = 0;
  let timerId = null;
  let els = null;      // DOM 引用
  let docUp = null;    // document mouseup 监听器引用

  /* ---------- 最佳纪录(Store 'games' 下只动自己的子键) ---------- */
  function getBest() {
    const all = Store.get('games', {});
    const rec = all[ID];
    return (rec && typeof rec === 'object') ? rec : {};
  }
  function saveBest(d, s) {
    const all = Store.get('games', {});
    const rec = (all[ID] && typeof all[ID] === 'object') ? all[ID] : {};
    rec[d] = s;
    all[ID] = rec;
    Store.set('games', all);
  }

  /* ---------- 工具 ---------- */
  function neighbors(i) {
    const r = Math.floor(i / cols), c = i % cols, out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
      }
    }
    return out;
  }

  function fmtMines(v) {
    return v < 0
      ? '-' + String(Math.min(99, -v)).padStart(2, '0')
      : String(Math.min(999, v)).padStart(3, '0');
  }

  function updateMines() {
    if (els) els.mines.textContent = '💣 ' + fmtMines(mines - flags);
  }
  function updateTime() {
    if (els) els.time.textContent = '⏱ ' + String(Math.min(999, seconds)).padStart(3, '0');
  }
  function updateBestLabel() {
    if (!els) return;
    const b = getBest()[diff];
    els.best.textContent = (b == null) ? '🏆 最佳 --' : `🏆 最佳 ${b} 秒`;
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(() => {
      if (seconds < 999) { seconds++; updateTime(); }
    }, 1000);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  /* ---------- 渲染单格 ---------- */
  function paintCell(i) {
    const c = cells[i], el = cellEls[i];
    el.className = 'gm-cell';
    el.textContent = '';
    if (c.revealed) {
      el.classList.add('gm-open');
      if (c.mine) {
        el.textContent = '💣';
      } else if (c.adj > 0) {
        el.textContent = String(c.adj);
        el.classList.add('gm-n' + c.adj);
      }
    } else if (c.flagged) {
      el.textContent = '🚩';
    }
  }

  /* ---------- 开局 / 布雷 ---------- */
  function newGame() {
    stopTimer();
    seconds = 0; flags = 0; revealed = 0;
    placed = false; over = false;
    const d = DIFFS[diff];
    rows = d.rows; cols = d.cols; mines = d.mines;
    cells = [];
    for (let i = 0; i < rows * cols; i++) {
      cells.push({ mine: false, adj: 0, revealed: false, flagged: false });
    }
    if (!els) return;
    // 重建棋盘 DOM
    els.board.style.gridTemplateColumns = `repeat(${cols}, 28px)`;
    els.board.innerHTML = '';
    cellEls = [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < rows * cols; i++) {
      const cell = document.createElement('div');
      cell.className = 'gm-cell';
      cell.dataset.i = String(i);
      frag.appendChild(cell);
      cellEls.push(cell);
    }
    els.board.appendChild(frag);
    els.overlay.classList.remove('gm-show');
    els.overlay.innerHTML = '';
    els.face.textContent = '😊';
    els.tabs.forEach(t => t.classList.toggle('gm-on', t.dataset.diff === diff));
    updateMines();
    updateTime();
    updateBestLabel();
  }

  function placeMines(safeIdx) {
    const banned = new Set([safeIdx, ...neighbors(safeIdx)]);
    const pool = [];
    for (let i = 0; i < rows * cols; i++) if (!banned.has(i)) pool.push(i);
    for (let k = 0; k < mines; k++) {
      const j = k + Math.floor(Math.random() * (pool.length - k));
      [pool[k], pool[j]] = [pool[j], pool[k]];
      cells[pool[k]].mine = true;
    }
    for (let i = 0; i < rows * cols; i++) {
      if (cells[i].mine) continue;
      cells[i].adj = neighbors(i).reduce((a, n) => a + (cells[n].mine ? 1 : 0), 0);
    }
    placed = true;
  }

  /* ---------- 交互逻辑 ---------- */
  function floodReveal(start) {
    const q = [start];
    cells[start].revealed = true;
    revealed++;
    paintCell(start);
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      if (cells[cur].adj !== 0) continue;
      for (const n of neighbors(cur)) {
        const c = cells[n];
        if (!c.revealed && !c.flagged && !c.mine) {
          c.revealed = true;
          revealed++;
          paintCell(n);
          q.push(n);
        }
      }
    }
  }

  function tryReveal(i) {
    const c = cells[i];
    if (c.flagged || c.revealed) return;
    if (!placed) {
      placeMines(i);
      startTimer();
    }
    if (c.mine) { lose(i); return; }
    floodReveal(i);
    if (revealed === rows * cols - mines) win();
  }

  function toggleFlag(i) {
    const c = cells[i];
    if (c.revealed) return;
    c.flagged = !c.flagged;
    flags += c.flagged ? 1 : -1;
    paintCell(i);
    updateMines();
  }

  function lose(hitIdx) {
    over = true;
    stopTimer();
    els.face.textContent = '😵';
    cells.forEach((c, i) => {
      const el = cellEls[i];
      if (c.mine && !c.flagged) {
        el.classList.add('gm-open');
        el.textContent = '💣';
      } else if (!c.mine && c.flagged) {
        el.className = 'gm-cell gm-wrong';
        el.textContent = '❌';
      }
    });
    cellEls[hitIdx].classList.add('gm-hit');
    showOverlay('💥', '踩到雷了!', `坚持了 ${seconds} 秒,再接再厉~`);
  }

  function win() {
    over = true;
    stopTimer();
    els.face.textContent = '😎';
    cells.forEach((c, i) => {
      if (c.mine && !c.flagged) {
        c.flagged = true;
        flags++;
        paintCell(i);
      }
    });
    updateMines();
    const prev = getBest()[diff];
    const isRecord = prev == null || seconds < prev;
    if (isRecord) saveBest(diff, seconds);
    updateBestLabel();
    showOverlay('🎉', `通关!用时 ${seconds} 秒`,
      isRecord ? '🏆 新纪录,太强了!' : `离最佳纪录 ${prev} 秒还差一点点`);
  }

  function showOverlay(emoji, title, sub) {
    els.overlay.innerHTML = `
      <div class="gm-ov-emoji">${emoji}</div>
      <div class="gm-ov-title">${App.esc(title)}</div>
      <div class="gm-ov-sub">${App.esc(sub)}</div>
      <button class="btn primary gm-ov-btn">再来一局</button>`;
    els.overlay.querySelector('.gm-ov-btn').addEventListener('click', newGame);
    els.overlay.classList.add('gm-show');
  }

  /* ---------- 挂载 / 卸载 ---------- */
  function mount(host) {
    const root = document.createElement('div');
    root.className = 'card gm-wrap';
    root.innerHTML = `
      <div class="gm-tabs">
        ${Object.entries(DIFFS).map(([k, d]) =>
          `<button class="gm-tab" data-diff="${k}">${d.label}<small>${d.tag}</small></button>`).join('')}
        <span class="gm-best">🏆 最佳 --</span>
      </div>
      <div class="gm-top">
        <span class="gm-stat gm-mines" title="剩余雷数">💣 010</span>
        <button class="gm-face" title="重新开始">😊</button>
        <span class="gm-stat gm-time" title="用时(秒)">⏱ 000</span>
        <button class="gm-flagbtn" aria-pressed="false" title="开启后点击格子=插旗,触屏专用">🚩 旗模式</button>
      </div>
      <div class="gm-stage">
        <div class="gm-scroll"><div class="gm-board"></div></div>
        <div class="gm-overlay"></div>
      </div>
      <div class="gm-help">🖱 左键翻开 · 右键插旗/取消 · 📱 触屏开「🚩 旗模式」后点按即插旗</div>`;
    host.appendChild(root);

    els = {
      board:   root.querySelector('.gm-board'),
      overlay: root.querySelector('.gm-overlay'),
      mines:   root.querySelector('.gm-mines'),
      time:    root.querySelector('.gm-time'),
      face:    root.querySelector('.gm-face'),
      flag:    root.querySelector('.gm-flagbtn'),
      best:    root.querySelector('.gm-best'),
      tabs:    Array.from(root.querySelectorAll('.gm-tab')),
    };

    // 难度切换(切换即重开)
    els.tabs.forEach(t => t.addEventListener('click', () => {
      diff = t.dataset.diff;
      newGame();
    }));

    // 重开按钮
    els.face.addEventListener('click', newGame);

    // 旗模式开关
    els.flag.classList.toggle('gm-on', flagMode);
    els.flag.setAttribute('aria-pressed', String(flagMode));
    els.flag.addEventListener('click', () => {
      flagMode = !flagMode;
      els.flag.classList.toggle('gm-on', flagMode);
      els.flag.setAttribute('aria-pressed', String(flagMode));
      App.toast(flagMode ? '🚩 旗模式开启:点击=插旗' : '旗模式关闭:点击=翻开');
    });

    // 棋盘交互(事件委托)
    els.board.addEventListener('click', e => {
      const t = e.target.closest('.gm-cell');
      if (!t || over) return;
      const i = Number(t.dataset.i);
      if (flagMode) toggleFlag(i); else tryReveal(i);
    });
    els.board.addEventListener('contextmenu', e => {
      e.preventDefault();
      const t = e.target.closest('.gm-cell');
      if (!t || over) return;
      toggleFlag(Number(t.dataset.i));
    });
    // 按下时的小表情(纯彩蛋)
    els.board.addEventListener('mousedown', e => {
      if (e.button !== 0 || over || flagMode) return;
      const t = e.target.closest('.gm-cell');
      if (!t) return;
      const c = cells[Number(t.dataset.i)];
      if (c && !c.revealed && !c.flagged) els.face.textContent = '😮';
    });
    docUp = () => { if (els && !over) els.face.textContent = '😊'; };
    document.addEventListener('mouseup', docUp);

    newGame();
  }

  function unmount() {
    stopTimer();
    if (docUp) {
      document.removeEventListener('mouseup', docUp);
      docUp = null;
    }
    els = null;
    cellEls = [];
    cells = [];
    over = true;
  }

  App.registerGame({
    id: ID,
    name: '扫雷',
    icon: '💣',
    color: 'blue',
    desc: '小心脚下',
    mount,
    unmount,
  });
})();
