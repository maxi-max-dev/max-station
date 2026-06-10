/* ===========================================================
   🐍 贪吃蛇 —— 游戏厅小游戏
   canvas 20×20 格,方向键/WASD 转向,空格暂停,触屏十字键
   最高分存 Store 'games' 键下的 snake.best
   =========================================================== */
(() => {
  const ID = 'snake';
  const SIZE = 20;          // 20×20 格
  const CELL = 20;          // 每格 20px
  const PX = SIZE * CELL;   // 400
  const BASE_MS = 160;      // 起始间隔
  const STEP_MS = 12;       // 每档提速
  const MIN_MS = 70;        // 间隔下限
  const SPEED_EVERY = 5;    // 每吃 5 个提速一档

  /* ---------- 样式(注入一次) ---------- */
  if (!document.getElementById('style-' + ID)) {
    const style = document.createElement('style');
    style.id = 'style-' + ID;
    style.textContent = `
      .gs-wrap { width: 440px; max-width: 100%; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
      .gs-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .gs-top .gs-restart { margin-left: auto; }
      .gs-stat b { font-weight: 800; margin-left: 2px; }
      .gs-stage { position: relative; width: 400px; max-width: 100%; margin: 0 auto; }
      .gs-canvas { display: block; width: 100%; height: auto; border-radius: 12px; background: var(--bg); }
      .gs-overlay {
        position: absolute; inset: 0; border-radius: 12px;
        background: rgba(35, 42, 54, .62); color: #fff;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 6px; text-align: center; padding: 16px;
      }
      .gs-over-title { font-size: 24px; font-weight: 800; }
      .gs-over-score { font-size: 16px; font-weight: 700; }
      .gs-over-best { font-size: 13.5px; opacity: .9; }
      .gs-overlay .btn { margin-top: 8px; }
      .gs-pad {
        display: grid; gap: 6px; justify-content: center;
        grid-template-columns: repeat(3, 42px); grid-template-rows: repeat(3, 42px);
      }
      .gs-pad-btn {
        border: none; border-radius: 50%; cursor: pointer;
        background: var(--green-soft); color: var(--green);
        font-size: 15px; font-weight: 800; line-height: 1;
        display: flex; align-items: center; justify-content: center;
        transition: filter .15s, transform .1s; touch-action: manipulation;
        -webkit-tap-highlight-color: transparent; user-select: none;
      }
      .gs-pad-btn:hover { filter: brightness(.93); }
      .gs-pad-btn:active { transform: scale(.9); }
      .gs-pad-pause { background: var(--yellow-soft); color: var(--ink); font-size: 14px; }
      .gs-up    { grid-area: 1 / 2; }
      .gs-left  { grid-area: 2 / 1; }
      .gs-pause { grid-area: 2 / 2; }
      .gs-right { grid-area: 2 / 3; }
      .gs-down  { grid-area: 3 / 2; }
      .gs-help { font-size: 12.5px; color: var(--muted); text-align: center; }
    `;
    document.head.appendChild(style);
  }

  /* ---------- 工具 ---------- */
  // #rrggbb 按比例压暗(蛇头用),解析失败原样返回
  function shade(hex, k) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const f = c => Math.round(Math.max(0, Math.min(255, c * k))).toString(16).padStart(2, '0');
    return '#' + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255);
  }

  function loadBest() {
    const all = Store.get('games', {});
    const mine = all && typeof all === 'object' ? all[ID] : null;
    return (mine && typeof mine.best === 'number') ? mine.best : 0;
  }
  function saveBest(best) {
    const all = Store.get('games', {});
    const safe = all && typeof all === 'object' ? all : {};
    safe[ID] = Object.assign({}, safe[ID], { best });
    Store.set('games', safe);
  }

  /* ---------- 运行时状态 ---------- */
  let root = null, canvas = null, ctx = null;
  let scoreEl = null, bestEl = null, speedEl = null, overlayEl = null, pauseBtn = null;
  let colors = null;

  let snake = [], dir = { x: 1, y: 0 }, queue = [], food = null;
  let score = 0, best = 0, eaten = 0, interval = BASE_MS;
  let newRecord = false; // 本局是否已破纪录(破纪录即落盘,中途离开不丢)
  let running = false, paused = false;
  let timer = null;

  /* ---------- 绘制 ---------- */
  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    if (!ctx) return;
    // 底色 + 细网格
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, PX, PX);
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < SIZE; i++) {
      ctx.moveTo(i * CELL + .5, 0); ctx.lineTo(i * CELL + .5, PX);
      ctx.moveTo(0, i * CELL + .5); ctx.lineTo(PX, i * CELL + .5);
    }
    ctx.stroke();

    // 食物:红圆点 + 小高光
    if (food) {
      const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
      ctx.fillStyle = colors.red;
      circle(fx, fy, 6.5);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      circle(fx - 2, fy - 2.5, 1.8);
    }

    // 蛇:绿色圆角方块,头部更深 + 一对眼睛
    for (let i = snake.length - 1; i >= 0; i--) {
      const c = snake[i];
      ctx.fillStyle = i === 0 ? colors.head : colors.green;
      rr(c.x * CELL + 1, c.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 7 : 5);
    }
    if (snake.length) {
      const h = snake[0];
      const cx = h.x * CELL + CELL / 2, cy = h.y * CELL + CELL / 2;
      const px = -dir.y, py = dir.x; // 垂直方向
      ctx.fillStyle = '#fff';
      circle(cx + dir.x * 4 + px * 3.5, cy + dir.y * 4 + py * 3.5, 2);
      circle(cx + dir.x * 4 - px * 3.5, cy + dir.y * 4 - py * 3.5, 2);
    }

    // 暂停遮罩
    if (paused && running) {
      ctx.fillStyle = 'rgba(35,42,54,.55)';
      ctx.fillRect(0, 0, PX, PX);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '800 30px ' + getComputedStyle(document.body).fontFamily;
      ctx.fillText('已暂停', PX / 2, PX / 2 - 6);
      ctx.font = '600 14px ' + getComputedStyle(document.body).fontFamily;
      ctx.fillText('按空格或 ⏸ 继续', PX / 2, PX / 2 + 22);
    }
  }

  /* ---------- 游戏逻辑 ---------- */
  function placeFood() {
    const used = new Set(snake.map(c => c.x + ',' + c.y));
    const free = [];
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++)
        if (!used.has(x + ',' + y)) free.push({ x, y });
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function updateStats() {
    if (scoreEl) scoreEl.textContent = score;
    if (bestEl) bestEl.textContent = best;
    if (speedEl) speedEl.textContent = 'Lv.' + (Math.floor(eaten / SPEED_EVERY) + 1);
  }

  function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(tick, interval);
  }

  function tick() {
    if (!running || paused) return;
    if (queue.length) dir = queue.shift();
    const head = snake[0];
    const nx = head.x + dir.x, ny = head.y + dir.y;
    if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) return gameOver(false); // 撞墙
    const eating = food && nx === food.x && ny === food.y;
    const body = eating ? snake : snake.slice(0, -1); // 不吃时尾巴会让开
    if (body.some(c => c.x === nx && c.y === ny)) return gameOver(false);     // 撞自己
    snake.unshift({ x: nx, y: ny });
    if (eating) {
      score += 10;
      if (score > best) {
        best = score;
        saveBest(best);
        newRecord = true;
      }
      eaten++;
      if (eaten % SPEED_EVERY === 0) {
        interval = Math.max(MIN_MS, BASE_MS - STEP_MS * (eaten / SPEED_EVERY));
        startTimer();
      }
      updateStats();
      placeFood();
      if (!food) { draw(); return gameOver(true); } // 填满全场,通关
    } else {
      snake.pop();
    }
    draw();
  }

  function gameOver(win) {
    running = false;
    paused = false;
    if (timer) { clearInterval(timer); timer = null; }
    updateStats();
    if (pauseBtn) pauseBtn.textContent = '⏸';
    if (overlayEl) {
      overlayEl.innerHTML = `
        <div class="gs-over-title">${win ? '🏆 通关了!' : '💀 游戏结束'}</div>
        <div class="gs-over-score">得分 ${score}</div>
        <div class="gs-over-best">${newRecord ? '🎉 新纪录!' : '最佳 ' + best}</div>
        <button class="btn primary gs-again">再来一局</button>`;
      overlayEl.style.display = '';
      overlayEl.querySelector('.gs-again').addEventListener('click', reset);
    }
  }

  function reset() {
    const mid = Math.floor(SIZE / 2);
    snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    eaten = 0;
    newRecord = false;
    interval = BASE_MS;
    paused = false;
    running = true;
    placeFood();
    updateStats();
    if (pauseBtn) pauseBtn.textContent = '⏸';
    if (overlayEl) { overlayEl.style.display = 'none'; overlayEl.innerHTML = ''; }
    startTimer();
    draw();
  }

  function pushDir(nd) {
    if (!running || paused) return;
    const last = queue.length ? queue[queue.length - 1] : dir;
    if (nd.x === -last.x && nd.y === -last.y) return; // 禁止 180° 回头
    if (nd.x === last.x && nd.y === last.y) return;
    if (queue.length < 3) queue.push(nd);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (pauseBtn) pauseBtn.textContent = paused ? '▶' : '⏸';
    draw();
  }

  const KEY_DIR = {
    ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
  };

  function onKey(e) {
    if (!root) return;
    // 焦点在按钮/输入框等控件上,或页面有弹窗打开时,把按键让给它们,不拦截
    const t = e.target;
    if (t && t.closest && (t.closest('button, input, textarea, select') || t.isContentEditable)) return;
    if (document.querySelector('.modal-overlay')) return;
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!running) reset(); else togglePause();
      return;
    }
    const d = KEY_DIR[e.key];
    if (!d) return;
    if (e.key.startsWith('Arrow')) e.preventDefault();
    pushDir(d);
  }

  /* ---------- 挂载 / 卸载 ---------- */
  function mount(host) {
    const cs = getComputedStyle(document.documentElement);
    const cv = name => cs.getPropertyValue('--' + name).trim();
    colors = { bg: cv('bg'), line: cv('line'), green: cv('green'), red: cv('red') };
    colors.head = shade(colors.green, .72);

    best = loadBest();

    root = document.createElement('div');
    root.className = 'card gs-wrap';
    root.innerHTML = `
      <div class="gs-top">
        <span class="chip gs-stat" style="background:var(--green-soft);color:var(--green)">分数<b class="gs-score">0</b></span>
        <span class="chip gs-stat" style="background:var(--yellow-soft);color:var(--ink)">最佳<b class="gs-best">0</b></span>
        <span class="chip gs-stat" style="background:var(--teal-soft);color:var(--teal)">速度<b class="gs-speed">Lv.1</b></span>
        <button class="btn ghost small gs-restart">重新开始</button>
      </div>
      <div class="gs-stage">
        <canvas class="gs-canvas" width="${PX}" height="${PX}"></canvas>
        <div class="gs-overlay" style="display:none"></div>
      </div>
      <div class="gs-pad">
        <button class="gs-pad-btn gs-up" aria-label="上">▲</button>
        <button class="gs-pad-btn gs-left" aria-label="左">◀</button>
        <button class="gs-pad-btn gs-pad-pause gs-pause" aria-label="暂停/继续">⏸</button>
        <button class="gs-pad-btn gs-right" aria-label="右">▶</button>
        <button class="gs-pad-btn gs-down" aria-label="下">▼</button>
      </div>
      <p class="gs-help">⌨️ 方向键 / WASD 转向 · 空格暂停 · 📱 手机点上面的圆按钮操作</p>`;
    host.appendChild(root);

    canvas = root.querySelector('.gs-canvas');
    ctx = canvas.getContext('2d');
    scoreEl = root.querySelector('.gs-score');
    bestEl = root.querySelector('.gs-best');
    speedEl = root.querySelector('.gs-speed');
    overlayEl = root.querySelector('.gs-overlay');
    pauseBtn = root.querySelector('.gs-pause');

    root.querySelector('.gs-restart').addEventListener('click', reset);
    pauseBtn.addEventListener('click', togglePause);
    const pads = [
      ['.gs-up', { x: 0, y: -1 }], ['.gs-down', { x: 0, y: 1 }],
      ['.gs-left', { x: -1, y: 0 }], ['.gs-right', { x: 1, y: 0 }],
    ];
    pads.forEach(([sel, d]) => {
      root.querySelector(sel).addEventListener('click', () => pushDir(d));
    });

    document.addEventListener('keydown', onKey);
    reset();
  }

  function unmount() {
    if (timer) { clearInterval(timer); timer = null; }
    document.removeEventListener('keydown', onKey);
    running = false;
    paused = false;
    root = null; canvas = null; ctx = null;
    scoreEl = null; bestEl = null; speedEl = null; overlayEl = null; pauseBtn = null;
  }

  App.registerGame({
    id: ID,
    name: '贪吃蛇',
    icon: '🐍',
    color: 'green',
    desc: '童年经典,撞墙就凉',
    mount,
    unmount,
  });
})();
