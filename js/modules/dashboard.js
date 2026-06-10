/* ===========================================================
   Max Station · 总览模块(dashboard)
   落地首页:问候 / 统计卡 / 今日任务 / 今日日程 / 快速记一笔 / 本周专注
   =========================================================== */
(() => {
  const MODULE_ID = 'dashboard';
  const PALETTE = ['blue', 'orange', 'green', 'red', 'purple', 'teal', 'pink', 'yellow'];
  const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

  // 快速记一笔的未保存草稿(重渲染 / 切 tab 不丢)
  let draft = '';

  /* ---------- 模块样式(只注入一次) ---------- */
  if (!document.getElementById('style-dashboard')) {
    const st = document.createElement('style');
    st.id = 'style-dashboard';
    st.textContent = `
      .dash-hero h1 { font-size: 26px; }
      .dash-hero .module-sub { font-size: 14.5px; }

      .dash-stats {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 14px; margin-bottom: 18px;
      }
      .dash-stat {
        border-radius: var(--radius); padding: 14px 16px 12px;
        cursor: pointer; box-shadow: var(--shadow);
        transition: transform .15s, box-shadow .15s;
      }
      .dash-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-lift); }
      .dash-stat-label { font-size: 13px; font-weight: 700; color: var(--ink); opacity: .72; }
      .dash-stat-num { font-size: 32px; font-weight: 800; line-height: 1.25; margin-top: 2px; }
      .dash-stat-sub { font-size: 12px; color: var(--muted); }
      .dash-stat-sub.dash-warn { color: var(--red); font-weight: 700; }

      .dash-cols {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 16px; margin-bottom: 16px;
      }
      .dash-panel { padding: 16px 18px; margin-bottom: 16px; }
      .dash-cols .dash-panel { margin-bottom: 0; }
      .dash-panel-head {
        display: flex; align-items: center; justify-content: space-between;
        font-size: 15px; font-weight: 800; margin-bottom: 10px;
      }
      .dash-panel-more {
        font-size: 12px; font-weight: 700; color: var(--muted);
        cursor: pointer; transition: color .15s; white-space: nowrap;
      }
      .dash-panel-more:hover { color: var(--ink); }

      .dash-list { display: flex; flex-direction: column; gap: 4px; max-height: 300px; overflow-y: auto; }
      .dash-item {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 10px; border-radius: 10px; cursor: pointer;
        transition: background .15s;
      }
      .dash-item:hover { background: var(--bg); }
      .dash-item-main { flex: 1; min-width: 0; }
      .dash-item-title {
        font-size: 14px; font-weight: 600;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .dash-item-meta { font-size: 12px; color: var(--muted); line-height: 1.4; }
      .dash-item .chip { flex: none; }
      .dash-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
      .dash-time {
        font-size: 12.5px; font-weight: 700; color: var(--muted);
        flex: none; font-variant-numeric: tabular-nums;
      }

      .dash-mini-empty { text-align: center; color: var(--muted); padding: 30px 10px; font-size: 13.5px; }
      .dash-mini-empty .dash-mini-ico { font-size: 30px; margin-bottom: 6px; line-height: 1; }

      .dash-quick-ta { margin-bottom: 10px; min-height: 72px; }
      .dash-quick-foot { display: flex; justify-content: flex-end; }

      .dash-chart {
        display: flex; align-items: flex-end; gap: 8px;
        padding: 34px 4px 2px;
      }
      .dash-bar-col {
        flex: 1; min-width: 0; position: relative;
        display: flex; flex-direction: column; align-items: center; gap: 6px;
      }
      .dash-bar-wrap {
        height: 110px; width: 100%; max-width: 46px;
        display: flex; align-items: flex-end; justify-content: center;
      }
      .dash-bar {
        width: 100%; min-height: 4px; border-radius: 8px 8px 4px 4px;
        background: var(--red); opacity: .6; transition: opacity .15s;
      }
      .dash-bar-col:hover .dash-bar { opacity: 1; }
      .dash-bar-col.dash-today .dash-bar { opacity: .95; }
      .dash-bar.dash-zero { background: var(--line); opacity: 1; }
      .dash-bar-label { font-size: 12px; font-weight: 600; color: var(--muted); }
      .dash-bar-col.dash-today .dash-bar-label { color: var(--red); font-weight: 800; }
      .dash-bar-col::after {
        content: attr(data-tip);
        position: absolute; bottom: calc(100% + 4px); left: 50%;
        transform: translate(-50%, 4px);
        background: var(--ink); color: #fff;
        font-size: 12px; font-weight: 600; padding: 3px 9px;
        border-radius: 8px; white-space: nowrap;
        opacity: 0; pointer-events: none; z-index: 5;
        transition: opacity .15s, transform .15s;
      }
      .dash-bar-col:hover::after { opacity: 1; transform: translate(-50%, 0); }

      @media (max-width: 800px) {
        .dash-stats { grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .dash-stat-num { font-size: 27px; }
        .dash-cols { grid-template-columns: 1fr; }
        .dash-chart { gap: 5px; }
      }
    `;
    document.head.appendChild(st);
  }

  /* ---------- 小工具 ---------- */
  const safeColor = c => (PALETTE.includes(c) ? c : 'blue');

  function greeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return '早上好☀️';
    if (h >= 11 && h < 13) return '中午好🍚';
    if (h >= 13 && h < 18) return '下午好🌤';
    if (h >= 18 && h < 23) return '晚上好🌙';
    return '夜深了🌌';
  }

  function dateLine() {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${WEEK_CN[d.getDay()]}`;
  }

  // due <= 今天 且不在最后一列(最后一列视为「已完成」)的卡片
  function dueTasks(kanban, todayStr) {
    const cols = Array.isArray(kanban.columns) ? kanban.columns : [];
    const cards = (kanban.cards && typeof kanban.cards === 'object') ? kanban.cards : {};
    const list = [];
    cols.slice(0, Math.max(0, cols.length - 1)).forEach(col => {
      (Array.isArray(col.cardIds) ? col.cardIds : []).forEach(id => {
        const c = cards[id];
        if (c && c.due && c.due <= todayStr) list.push({ card: c, colTitle: col.title || '' });
      });
    });
    list.sort((a, b) => (a.card.due < b.card.due ? -1 : a.card.due > b.card.due ? 1 : 0));
    return list;
  }

  function todayEvents(calendar, todayStr) {
    const evs = (Array.isArray(calendar.events) ? calendar.events : [])
      .filter(e => e && e.date === todayStr);
    evs.sort((a, b) => {
      if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
    return evs;
  }

  function weekData(log) {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = App.dateStr(d);
      const rec = (log && log[key]) || {};
      days.push({
        week: WEEK_CN[d.getDay()],
        isToday: i === 0,
        count: Number(rec.count) || 0,
        minutes: Number(rec.minutes) || 0,
      });
    }
    return days;
  }

  /* ---------- 渲染 ---------- */
  function render(container) {
    const todayStr = App.today();
    const kanban = Store.get('kanban', null) || { columns: [], cards: {} };
    const calendar = Store.get('calendar', null) || { events: [] };
    const notesData = Store.get('notes', null) || { notes: [] };
    const pomo = Store.get('pomodoro', null) || {};

    const tasks = dueTasks(kanban, todayStr);
    const overdueN = tasks.filter(t => t.card.due < todayStr).length;
    const events = todayEvents(calendar, todayStr);
    const pomoToday = (pomo.log && pomo.log[todayStr]) || {};
    const pomoCount = Number(pomoToday.count) || 0;
    const pomoMin = Number(pomoToday.minutes) || 0;
    const noteN = Array.isArray(notesData.notes) ? notesData.notes.length : 0;
    const week = weekData(pomo.log);
    const weekMax = Math.max(...week.map(d => d.count), 1);
    const weekAllZero = week.every(d => d.count === 0);

    /* 统计卡 */
    const statsHtml = `
      <div class="dash-stats">
        <div class="dash-stat" data-go="kanban" style="background:var(--blue-soft)">
          <div class="dash-stat-label">📋 今日任务</div>
          <div class="dash-stat-num" style="color:var(--blue)">${tasks.length}</div>
          <div class="dash-stat-sub${overdueN ? ' dash-warn' : ''}">${overdueN ? `其中 ${overdueN} 张逾期` : '没有逾期,稳'}</div>
        </div>
        <div class="dash-stat" data-go="calendar" style="background:var(--purple-soft)">
          <div class="dash-stat-label">📅 今日日程</div>
          <div class="dash-stat-num" style="color:var(--purple)">${events.length}</div>
          <div class="dash-stat-sub">${events.length ? (events[0].time ? `最早 ${App.esc(events[0].time)}` : '含全天安排') : '今天空闲'}</div>
        </div>
        <div class="dash-stat" data-go="pomodoro" style="background:var(--red-soft)">
          <div class="dash-stat-label">🍅 今日番茄</div>
          <div class="dash-stat-num" style="color:var(--red)">${pomoCount}</div>
          <div class="dash-stat-sub">${pomoMin} 分钟专注</div>
        </div>
        <div class="dash-stat" data-go="notes" style="background:var(--green-soft)">
          <div class="dash-stat-label">📝 笔记总数</div>
          <div class="dash-stat-num" style="color:var(--green)">${noteN}</div>
          <div class="dash-stat-sub">${noteN ? '灵感都存着呢' : '等你来记第一篇'}</div>
        </div>
      </div>`;

    /* 今日任务列表 */
    const tasksHtml = tasks.length
      ? `<div class="dash-list">${tasks.map(t => {
          const overdue = t.card.due < todayStr;
          let chip;
          if (overdue) {
            const days = Math.max(1, Math.round((Date.parse(todayStr) - Date.parse(t.card.due)) / 86400000));
            chip = `<span class="chip" style="background:var(--red-soft);color:var(--red)">逾期 ${days} 天</span>`;
          } else {
            chip = `<span class="chip" style="background:var(--orange-soft);color:var(--orange)">今天到期</span>`;
          }
          return `
            <div class="dash-item" data-go="kanban">
              <div class="dash-item-main">
                <div class="dash-item-title">${App.esc(t.card.title)}</div>
                <div class="dash-item-meta">${App.esc(t.colTitle)}</div>
              </div>
              ${chip}
            </div>`;
        }).join('')}</div>`
      : `<div class="dash-mini-empty"><div class="dash-mini-ico">🍃</div>今天没有到期任务,轻松✌️</div>`;

    /* 今日日程列表 */
    const eventsHtml = events.length
      ? `<div class="dash-list">${events.map(ev => `
          <div class="dash-item" data-go="calendar">
            <span class="dash-dot" style="background:var(--${safeColor(ev.color)})"></span>
            <div class="dash-item-main">
              <div class="dash-item-title">${App.esc(ev.title)}</div>
            </div>
            <span class="dash-time">${ev.time ? App.esc(ev.time) : '全天'}</span>
          </div>`).join('')}</div>`
      : `<div class="dash-mini-empty"><div class="dash-mini-ico">🌿</div>今天没有日程,自由安排</div>`;

    /* 本周专注柱状图 */
    const chartHtml = weekAllZero
      ? `<div class="dash-mini-empty"><div class="dash-mini-ico">🍅</div>这 7 天还没有专注记录,去开一个番茄吧</div>`
      : `<div class="dash-chart">${week.map(d => {
          const pct = d.count ? Math.max(12, Math.round(d.count / weekMax * 100)) : 0;
          return `
            <div class="dash-bar-col${d.isToday ? ' dash-today' : ''}" data-tip="${d.count} 个 / ${d.minutes} 分钟">
              <div class="dash-bar-wrap"><div class="dash-bar${d.count ? '' : ' dash-zero'}" style="height:${pct}%"></div></div>
              <div class="dash-bar-label">${d.isToday ? '今天' : d.week}</div>
            </div>`;
        }).join('')}</div>`;

    container.innerHTML = `
      <div class="module-head dash-hero">
        <h1>${greeting()}</h1>
        <p class="module-sub">${dateLine()}</p>
      </div>
      ${statsHtml}
      <div class="dash-cols">
        <div class="card dash-panel">
          <div class="dash-panel-head"><span>📋 今日任务</span><span class="dash-panel-more" data-go="kanban">去看板 →</span></div>
          ${tasksHtml}
        </div>
        <div class="card dash-panel">
          <div class="dash-panel-head"><span>📅 今日日程</span><span class="dash-panel-more" data-go="calendar">去日历 →</span></div>
          ${eventsHtml}
        </div>
      </div>
      <div class="card dash-panel dash-quick">
        <div class="dash-panel-head"><span>⚡ 快速记一笔</span></div>
        <textarea class="input dash-quick-ta" rows="3" placeholder="随手记点什么,第一行会变成笔记标题…"></textarea>
        <div class="dash-quick-foot"><button class="btn primary dash-quick-save">保存到笔记</button></div>
      </div>
      <div class="card dash-panel">
        <div class="dash-panel-head"><span>🍅 本周专注</span><span class="dash-panel-more" data-go="pomodoro">去番茄钟 →</span></div>
        ${chartHtml}
      </div>`;

    /* 跳转绑定 */
    container.querySelectorAll('[data-go]').forEach(el => {
      el.addEventListener('click', () => App.show(el.dataset.go));
    });

    /* 快速记一笔 */
    const ta = container.querySelector('.dash-quick-ta');
    ta.value = draft; // 回填未保存草稿
    ta.addEventListener('input', () => { draft = ta.value; });
    container.querySelector('.dash-quick-save').addEventListener('click', () => {
      const val = ta.value;
      if (!val.trim()) {
        App.toast('先写点什么再保存吧', 'error');
        ta.focus();
        return;
      }
      const data = Store.get('notes', null) || { notes: [] };
      if (!Array.isArray(data.notes)) data.notes = [];
      const now = Date.now();
      data.notes.unshift({
        id: App.uid(),
        title: val.trim().split('\n')[0].slice(0, 24),
        body: val,
        tags: ['速记'],
        pinned: false,
        createdAt: now,
        updatedAt: now,
      });
      ta.value = ''; // 必须先清 DOM 值:store:change 监听器兜草稿读的是 ta.value
      draft = '';
      Store.set('notes', data);
      App.toast('已存进笔记 📝', 'success');
    });
  }

  /* ---------- 数据变化 → 在本页时重渲染(保草稿) ---------- */
  document.addEventListener('store:change', () => {
    if (App.currentModule() !== MODULE_ID) return;
    const main = document.getElementById('main');
    if (!main) return;
    const ta = main.querySelector('.dash-quick-ta');
    if (ta) draft = ta.value; // 重渲染前兜住未保存的草稿
    main.innerHTML = '';
    render(main);
  });

  App.registerModule({
    id: MODULE_ID,
    name: '总览',
    icon: '🏠',
    color: 'teal',
    render,
    onLeave() {
      const ta = document.querySelector('.dash-quick-ta');
      if (ta) draft = ta.value; // 切走也保草稿
    },
  });
})();
