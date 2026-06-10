/* ===========================================================
   Max Station · 番茄钟模块
   计时器状态活在 IIFE 顶层:切去别的模块计时照跑,
   倒计时用时间戳法,后台节流也不跑偏。
   =========================================================== */
(() => {
  const MOD_ID = 'pomodoro';
  const BASE_TITLE = 'Max Station · 我的工作台';
  const DEFAULTS = { work: 25, short: 5, long: 15, longEvery: 4, sound: true, autoNext: false };
  const MODES = {
    work:  { tab: '🍅 专注', name: '专注', color: 'red' },
    short: { tab: '☕ 短休', name: '短休', color: 'green' },
    long:  { tab: '🛋 长休', name: '长休', color: 'green' },
  };
  const R = 94;
  const CIRC = +(2 * Math.PI * R).toFixed(2);
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  /* ---------- 模块样式,注入一次 ---------- */
  if (!document.getElementById('style-pomodoro')) {
    const st = document.createElement('style');
    st.id = 'style-pomodoro';
    st.textContent = `
      .pm-wrap { max-width: 540px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
      .pm-card { padding: 26px 24px 22px; display: flex; flex-direction: column; align-items: center; gap: 18px;
                 transition: box-shadow .2s; }
      .pm-card:hover { box-shadow: var(--shadow-lift); }
      .pm-tabs { display: flex; gap: 4px; background: var(--bg); padding: 4px; border-radius: 12px; max-width: 100%; }
      .pm-tab { border: none; background: none; padding: 7px 14px; border-radius: 9px;
                font-size: 14px; font-weight: 700; color: var(--muted); cursor: pointer;
                white-space: nowrap; transition: background .15s, color .15s; }
      .pm-tab:hover { color: var(--ink); }
      .pm-ring-box { position: relative; width: min(250px, 66vw); }
      .pm-ring { width: 100%; height: auto; display: block; }
      .pm-ring-bg { fill: none; stroke: var(--line); stroke-width: 12; }
      .pm-ring-prog { fill: none; stroke-width: 12; stroke-linecap: round;
                      transform: rotate(-90deg); transform-origin: 50% 50%;
                      transition: stroke-dashoffset .4s linear, stroke .3s; }
      .pm-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column;
                        align-items: center; justify-content: center; gap: 2px; }
      .pm-time { font-size: clamp(34px, 10vw, 46px); font-weight: 800; line-height: 1.1;
                 font-variant-numeric: tabular-nums; letter-spacing: 1px; }
      .pm-mode-label { font-size: 13px; font-weight: 600; color: var(--muted); }
      .pm-controls { display: flex; gap: 10px; }
      .pm-start { color: #fff; min-width: 118px; font-size: 15px; padding: 10px 20px; }
      .pm-bind-row { display: flex; gap: 8px; width: 100%; align-items: center; flex-wrap: wrap; }
      .pm-bind { flex: 1; min-width: 160px; }
      .pm-stats { padding: 18px 20px; transition: box-shadow .2s; }
      .pm-stats:hover { box-shadow: var(--shadow-lift); }
      .pm-stats-line { font-size: 15px; font-weight: 700; }
      .pm-stats-line b { color: var(--red); font-size: 17px; padding: 0 2px; }
      .pm-bars { display: flex; gap: 8px; margin-top: 14px; }
      .pm-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
      .pm-bar-num { font-size: 11px; font-weight: 700; color: var(--muted); line-height: 1; height: 12px; }
      .pm-bar-area { height: 70px; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
      .pm-bar { width: 62%; max-width: 30px; min-height: 4px; background: var(--red);
                border-radius: 6px 6px 3px 3px; transition: height .3s, filter .15s; }
      .pm-bar-zero { background: var(--line); }
      .pm-bar-col:hover .pm-bar { filter: brightness(.9); }
      .pm-bar-day { font-size: 11px; color: var(--muted); }
      .pm-bar-today { color: var(--red); font-weight: 800; }
      .pm-stats-empty { text-align: center; color: var(--muted); font-size: 13px; padding: 16px 0 4px; }
      .pm-set-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
      .pm-check { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;
                  margin: 4px 0 10px; cursor: pointer; user-select: none; }
      .pm-check input { width: 16px; height: 16px; accent-color: var(--red); cursor: pointer; }
      .pm-notif-btn { width: 100%; margin-top: 2px; }
      @media (max-width: 430px) { .pm-set-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(st);
  }

  /* ---------- 数据 ---------- */
  function getData() {
    const d = Store.get(MOD_ID, {}) || {};
    const s = Object.assign({}, DEFAULTS, d.settings || {});
    ['work', 'short', 'long', 'longEvery'].forEach(k => {
      if (!Number.isFinite(s[k]) || s[k] <= 0) s[k] = DEFAULTS[k];
    });
    s.sound = !!s.sound;
    s.autoNext = !!s.autoNext;
    return {
      settings: s,
      log: (d.log && typeof d.log === 'object') ? d.log : {},
      boundCard: typeof d.boundCard === 'string' ? d.boundCard : null,
    };
  }
  // 首次运行写入默认 settings
  if (Store.get(MOD_ID, null) === null) {
    Store.set(MOD_ID, { settings: { ...DEFAULTS }, log: {}, boundCard: null });
  }

  const durMs = m => getData().settings[m] * 60000;

  /* ---------- 计时器状态(IIFE 顶层,切模块不停) ---------- */
  let mode = 'work';          // 'work' | 'short' | 'long'
  let running = false;
  let endTime = 0;            // 运行中:结束时刻(毫秒时间戳)
  let remainingMs = durMs('work'); // 暂停/就绪时的剩余毫秒
  let tickTimer = null;
  let focusCount = 0;         // 本次会话累计完成的专注数(决定长短休)
  let refs = null;            // 当前页面 DOM 引用,离开页面置 null
  let audioCtx = null;

  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function clearChrome() {
    App.setBadge(MOD_ID, '');
    document.title = BASE_TITLE;
  }

  /* ---------- 提示音:WebAudio 三短声 ---------- */
  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t0 = audioCtx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        const t = t0 + i * 0.26;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      }
    } catch (e) { /* 没声就没声,不影响流程 */ }
  }

  /* ---------- 计时控制 ---------- */
  function start() {
    if (remainingMs <= 0) remainingMs = durMs(mode);
    endTime = Date.now() + remainingMs;
    running = true;
    if (!tickTimer) tickTimer = setInterval(tick, 1000);
    updateUI();
    tick();
  }

  function stopTimer() {
    running = false;
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    clearChrome();
  }

  function pause() {
    if (!running) return;
    remainingMs = Math.max(0, endTime - Date.now());
    stopTimer();
    updateUI();
  }

  function reset() {
    stopTimer();
    remainingMs = durMs(mode);
    updateUI();
  }

  function tick() {
    if (!running) return;
    const rem = endTime - Date.now();
    if (rem <= 0) { updateTime(0); complete(); return; }
    updateTime(rem);
    App.setBadge(MOD_ID, fmt(rem));
    document.title = `⏳ ${fmt(rem)} · Max Station`;
  }

  /* ---------- 完成流程 ---------- */
  function complete() {
    stopTimer();
    const data = getData();
    const s = data.settings;
    if (s.sound) beep();

    if (mode === 'work') {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try { new Notification('番茄完成!休息一下 🍅'); } catch (e) { /* 静默 */ }
      }
      // 记今日 log
      const t = App.today();
      const entry = data.log[t] || { count: 0, minutes: 0 };
      entry.count = (entry.count || 0) + 1;
      entry.minutes = (entry.minutes || 0) + s.work;
      data.log[t] = entry;
      // 绑定卡片 pomos +1(卡片已删/进了已完成列则优雅回退)
      if (data.boundCard) {
        const kb = Store.get('kanban', null);
        const stillBindable = getBindableCards().some(c => c.id === data.boundCard);
        if (stillBindable && kb && kb.cards && kb.cards[data.boundCard]) {
          kb.cards[data.boundCard].pomos = (kb.cards[data.boundCard].pomos || 0) + 1;
          Store.set('kanban', kb);
        } else {
          data.boundCard = null;
        }
      }
      Store.set(MOD_ID, data);
      focusCount += 1;
      const goLong = focusCount % s.longEvery === 0;
      mode = goLong ? 'long' : 'short';
      App.toast(goLong ? '🍅 番茄完成!攒够一轮了,来个长休 🛋' : '🍅 番茄完成!短休一下 ☕', 'success');
    } else {
      mode = 'work';
      App.toast('☕ 休息结束,回来继续专注!', 'success');
    }

    remainingMs = durMs(mode);
    if (s.autoNext) start();
    else updateUI();
  }

  /* ---------- 切换模式 ---------- */
  async function switchMode(m) {
    if (m === mode || !MODES[m]) return;
    if (running || remainingMs < durMs(mode)) {
      const ok = await App.confirm('当前这段计时还没走完,切换模式会放弃它,确定吗?', { okText: '放弃并切换' });
      if (!ok) return;
    }
    stopTimer();
    mode = m;
    remainingMs = durMs(mode);
    updateUI();
  }

  /* ---------- 看板卡片绑定 ---------- */
  function getBindableCards() {
    const kb = Store.get('kanban', null);
    const out = [];
    if (kb && Array.isArray(kb.columns) && kb.cards) {
      // 约定:最后一列是「已完成」,不参与绑定
      kb.columns.slice(0, -1).forEach(col => {
        (col.cardIds || []).forEach(cid => {
          const c = kb.cards[cid];
          if (c) out.push({ id: cid, label: `${col.title} · ${c.title}` });
        });
      });
    }
    return out;
  }

  function rebuildBindOptions() {
    if (!refs || !refs.bind || !refs.bind.isConnected) return;
    const data = getData();
    const list = getBindableCards();
    if (data.boundCard && !list.some(c => c.id === data.boundCard)) {
      data.boundCard = null; // 卡片没了/进了已完成列,回退为未绑定
      Store.set(MOD_ID, data);
    }
    refs.bind.innerHTML = `<option value="">🎯 不绑定任务</option>` +
      list.map(c => `<option value="${App.esc(c.id)}">${App.esc(c.label)}</option>`).join('');
    refs.bind.value = data.boundCard || '';
  }

  /* ---------- 设置弹窗 ---------- */
  function openSettings() {
    const s = getData().settings;
    App.modal({
      title: '⚙️ 番茄钟设置',
      body: `
        <div class="pm-set-grid">
          <div class="field">
            <label class="field-label">🍅 专注时长(分钟)</label>
            <input class="input" type="number" min="1" max="120" data-k="work" value="${App.esc(s.work)}">
          </div>
          <div class="field">
            <label class="field-label">☕ 短休时长(分钟)</label>
            <input class="input" type="number" min="1" max="120" data-k="short" value="${App.esc(s.short)}">
          </div>
          <div class="field">
            <label class="field-label">🛋 长休时长(分钟)</label>
            <input class="input" type="number" min="1" max="120" data-k="long" value="${App.esc(s.long)}">
          </div>
          <div class="field">
            <label class="field-label">🔁 每几个专注后长休</label>
            <input class="input" type="number" min="2" max="8" data-k="longEvery" value="${App.esc(s.longEvery)}">
          </div>
        </div>
        <label class="pm-check"><input type="checkbox" data-k="sound" ${s.sound ? 'checked' : ''}> 🔔 完成时播放提示音</label>
        <label class="pm-check"><input type="checkbox" data-k="autoNext" ${s.autoNext ? 'checked' : ''}> ⏭️ 结束后自动开始下一段</label>
        <button class="btn ghost pm-notif-btn">🖥️ 开启系统通知</button>
        <div class="modal-actions">
          <button class="btn ghost" data-act="cancel">取消</button>
          <button class="btn primary" data-act="save">保存</button>
        </div>`,
      onMount(bodyEl, close) {
        bodyEl.querySelector('.pm-notif-btn').addEventListener('click', () => {
          if (!('Notification' in window)) { App.toast('这个浏览器不支持系统通知', 'error'); return; }
          if (Notification.permission === 'granted') { App.toast('系统通知已经开启了 ✅', 'success'); return; }
          if (Notification.permission === 'denied') { App.toast('通知权限被浏览器拒绝了,要去浏览器设置里手动放行', 'error'); return; }
          Notification.requestPermission().then(p => {
            if (p === 'granted') App.toast('系统通知已开启 🔔', 'success');
            else App.toast('没拿到通知权限,先用页面提示也行', 'error');
          });
        });
        bodyEl.querySelector('[data-act="cancel"]').addEventListener('click', close);
        bodyEl.querySelector('[data-act="save"]').addEventListener('click', () => {
          const ranges = { work: [1, 120], short: [1, 120], long: [1, 120], longEvery: [2, 8] };
          const vals = {};
          for (const k of Object.keys(ranges)) {
            const v = parseInt(bodyEl.querySelector(`[data-k="${k}"]`).value, 10);
            if (!Number.isInteger(v) || v < ranges[k][0] || v > ranges[k][1]) {
              App.toast('数字超范围了:时长 1-120 分钟,长休间隔 2-8 个', 'error');
              return;
            }
            vals[k] = v;
          }
          vals.sound = bodyEl.querySelector('[data-k="sound"]').checked;
          vals.autoNext = bodyEl.querySelector('[data-k="autoNext"]').checked;
          const data = getData();
          // 没在计时且停在整段起点 → 新时长立即生效
          const atReady = !running && remainingMs === durMs(mode);
          data.settings = Object.assign({}, data.settings, vals);
          Store.set(MOD_ID, data);
          if (atReady) remainingMs = durMs(mode);
          updateUI();
          close();
          App.toast('设置已保存 ✅', 'success');
        });
      },
    });
  }

  /* ---------- 界面刷新 ---------- */
  function centerLabel() {
    if (running) return MODES[mode].name + '中…';
    if (remainingMs < durMs(mode) && remainingMs > 0) return '已暂停 · ' + MODES[mode].name;
    return mode === 'work' ? '准备专注' : '准备休息';
  }

  function updateTime(rem) {
    if (!refs || !refs.root || !refs.root.isConnected) return;
    const total = durMs(mode);
    const p = Math.min(1, Math.max(0, 1 - rem / total));
    refs.time.textContent = fmt(rem);
    refs.prog.style.strokeDashoffset = String(+(CIRC * (1 - p)).toFixed(2));
  }

  function updateUI() {
    if (!refs || !refs.root || !refs.root.isConnected) return;
    const color = MODES[mode].color;
    refs.tabs.forEach(btn => {
      const active = btn.dataset.mode === mode;
      const c = MODES[btn.dataset.mode].color;
      btn.style.background = active ? `var(--${c}-soft)` : '';
      btn.style.color = active ? `var(--${c})` : '';
    });
    refs.prog.style.stroke = `var(--${color})`;
    refs.label.textContent = centerLabel();
    refs.startBtn.style.background = `var(--${color})`;
    refs.startBtn.textContent = running ? '⏸ 暂停'
      : (remainingMs > 0 && remainingMs < durMs(mode) ? '▶ 继续' : '▶ 开始');
    updateTime(running ? Math.max(0, endTime - Date.now()) : remainingMs);
    renderStats();
  }

  function renderStats() {
    if (!refs || !refs.stats || !refs.stats.isConnected) return;
    const log = getData().log;
    const todayStr = App.today();
    const te = log[todayStr] || {};
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = App.dateStr(d);
      const e = log[ds] || {};
      days.push({
        ds,
        wd: i === 0 ? '今' : WEEK[d.getDay()],
        count: Number.isFinite(e.count) ? e.count : 0,
        minutes: Number.isFinite(e.minutes) ? e.minutes : 0,
      });
    }
    const max = Math.max(1, ...days.map(d => d.count));
    const total = days.reduce((a, d) => a + d.count, 0);
    const bars = total === 0
      ? `<div class="pm-stats-empty">🌱 最近一周还没有番茄,点上面的「开始」种下第一颗吧</div>`
      : `<div class="pm-bars">${days.map(d => `
          <div class="pm-bar-col" title="${App.esc(d.ds)} · ${d.count} 个番茄 · ${d.minutes} 分钟">
            <span class="pm-bar-num">${d.count || ''}</span>
            <div class="pm-bar-area">
              <div class="pm-bar${d.count ? '' : ' pm-bar-zero'}"
                   style="height:${d.count ? Math.max(10, Math.round(d.count / max * 100)) : 5}%"></div>
            </div>
            <span class="pm-bar-day${d.ds === todayStr ? ' pm-bar-today' : ''}">${d.wd}</span>
          </div>`).join('')}</div>`;
    refs.stats.innerHTML = `
      <div class="pm-stats-line">今日 <b>${Number.isFinite(te.count) ? te.count : 0}</b> 个番茄 · 专注 <b>${Number.isFinite(te.minutes) ? te.minutes : 0}</b> 分钟</div>
      ${bars}`;
  }

  /* ---------- 渲染 ---------- */
  function render(container) {
    container.innerHTML = `
      <div class="module-head">
        <h1>🍅 番茄钟</h1>
        <div class="module-sub">专注一阵,休息一下 —— 切到别的页面,计时也不会停</div>
      </div>
      <div class="pm-wrap">
        <div class="card pm-card">
          <div class="pm-tabs">
            ${Object.keys(MODES).map(m =>
              `<button class="pm-tab" data-mode="${m}">${MODES[m].tab}</button>`).join('')}
          </div>
          <div class="pm-ring-box">
            <svg class="pm-ring" viewBox="0 0 220 220" aria-hidden="true">
              <circle class="pm-ring-bg" cx="110" cy="110" r="${R}"></circle>
              <circle class="pm-ring-prog" cx="110" cy="110" r="${R}"
                stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"></circle>
            </svg>
            <div class="pm-ring-center">
              <div class="pm-time">--:--</div>
              <div class="pm-mode-label"></div>
            </div>
          </div>
          <div class="pm-controls">
            <button class="btn pm-start">▶ 开始</button>
            <button class="btn ghost pm-reset">重置</button>
          </div>
          <div class="pm-bind-row">
            <select class="select pm-bind" title="绑定一张看板卡片,完成的番茄会记到它头上"></select>
            <button class="btn ghost small pm-set-btn">⚙️ 设置</button>
          </div>
        </div>
        <div class="card pm-stats"><div class="pm-stats-body"></div></div>
      </div>`;

    refs = {
      root: container.querySelector('.pm-wrap'),
      tabs: [...container.querySelectorAll('.pm-tab')],
      time: container.querySelector('.pm-time'),
      label: container.querySelector('.pm-mode-label'),
      prog: container.querySelector('.pm-ring-prog'),
      startBtn: container.querySelector('.pm-start'),
      resetBtn: container.querySelector('.pm-reset'),
      bind: container.querySelector('.pm-bind'),
      stats: container.querySelector('.pm-stats-body'),
    };

    refs.tabs.forEach(b => b.addEventListener('click', () => switchMode(b.dataset.mode)));
    refs.startBtn.addEventListener('click', () => { running ? pause() : start(); });
    refs.resetBtn.addEventListener('click', reset);
    refs.bind.addEventListener('change', () => {
      const v = refs.bind.value || null;
      const data = getData();
      data.boundCard = v;
      Store.set(MOD_ID, data);
      App.toast(v ? '已绑定任务,完成的番茄会记到这张卡片上 🍅' : '已取消绑定', 'success');
    });
    container.querySelector('.pm-set-btn').addEventListener('click', openSettings);

    rebuildBindOptions();
    updateUI();
  }

  /* ---------- 顶层全局监听(只加这一次) ---------- */
  // 看板数据变了 → 在番茄钟页时刷新绑定下拉
  document.addEventListener('store:change', e => {
    if (e.detail && e.detail.key === 'kanban' && App.currentModule() === MOD_ID) {
      rebuildBindOptions();
    }
  });
  // 从后台切回来立刻补一拍,显示马上对齐
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && running) tick();
  });

  App.registerModule({
    id: MOD_ID,
    name: '番茄钟',
    icon: '🍅',
    color: 'red',
    render,
    onLeave() { refs = null; },
  });
})();
