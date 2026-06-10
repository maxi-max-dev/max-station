/* ===========================================================
   Max Station · 日历模块
   月历网格 + 当日详情面板,数据 key 'calendar'
   =========================================================== */
(() => {
  const MOD_ID = 'calendar';
  const COLORS = ['blue', 'orange', 'green', 'red', 'purple', 'teal', 'pink', 'yellow'];
  const DOW_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

  /* ---------- 模块状态(跨 render 保持,数据变更不跳月不丢选中) ---------- */
  let viewY = null;          // 当前查看的年
  let viewM = null;          // 当前查看的月(0-11)
  let selectedDate = null;   // 选中的 'YYYY-MM-DD'
  let editingId = null;      // 正在编辑的事件 id
  let containerRef = null;   // render 传入的容器
  let formDraft = null;      // store:change 重绘前暂存的未提交表单草稿
  let skipStashOnce = false; // 本模块自己提交/删除触发的写入,重绘时表单按预期重置

  /* ---------- 样式注入(一次) ---------- */
  if (!document.getElementById('style-calendar')) {
    const st = document.createElement('style');
    st.id = 'style-calendar';
    st.textContent = `
.cal-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 18px; align-items: start; }
.cal-left { padding: 16px; }
.cal-toolbar { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.cal-nav-btn {
  border: none; background: var(--bg); color: var(--ink); cursor: pointer;
  width: 30px; height: 30px; border-radius: 9px; font-size: 17px; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center; line-height: 1;
  transition: background .15s, transform .1s;
}
.cal-nav-btn:hover { background: var(--orange-soft); color: var(--orange); }
.cal-nav-btn:active { transform: scale(.94); }
.cal-month-title { font-size: 17px; font-weight: 800; min-width: 104px; text-align: center; }
.cal-btn-today { margin-left: auto; }
.cal-layout .btn.primary { background: var(--orange); }
.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
.cal-weekday { text-align: center; font-size: 12px; font-weight: 700; color: var(--muted); padding: 3px 0; }
.cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px;
  background: var(--line); border: 1px solid var(--line);
  border-radius: 12px; overflow: hidden;
}
.cal-cell {
  background: var(--card); min-height: 88px; min-width: 0; padding: 6px;
  cursor: pointer; display: flex; flex-direction: column; gap: 3px;
  transition: background .15s;
}
.cal-cell:hover { background: var(--bg); }
.cal-cell.cal-selected { box-shadow: inset 0 0 0 2px var(--orange); }
.cal-daynum {
  width: 24px; height: 24px; flex: none; display: inline-flex;
  align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; border-radius: 50%;
}
.cal-cell.cal-other .cal-daynum { color: var(--muted); opacity: .55; }
.cal-cell.cal-today .cal-daynum { background: var(--orange); color: #fff; }
.cal-chip {
  font-size: 11px; font-weight: 600; line-height: 1.5;
  padding: 1px 6px; border-radius: 6px; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cal-chip-more { color: var(--muted); padding-left: 2px; }
.cal-chip-due { border: 1.5px dashed var(--muted); color: var(--muted); background: transparent; }
.cal-right { position: sticky; top: 0; }
.cal-panel { padding: 16px; }
.cal-panel-date { font-size: 16px; font-weight: 800; margin-bottom: 8px; }
.cal-empty { text-align: center; color: var(--muted); font-size: 13px; padding: 16px 6px; }
.cal-empty-icon { font-size: 30px; line-height: 1.4; }
.cal-evts { display: flex; flex-direction: column; gap: 2px; }
.cal-evt {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 7px 8px; border-radius: 10px; transition: background .15s;
}
.cal-evt:hover { background: var(--bg); }
.cal-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; margin-top: 7px; }
.cal-evt-time { font-size: 12px; font-weight: 700; color: var(--muted); flex: none; min-width: 38px; margin-top: 2px; }
.cal-evt-main { flex: 1; min-width: 0; }
.cal-evt-title { font-size: 14px; font-weight: 600; word-break: break-word; line-height: 1.45; }
.cal-evt-note { font-size: 12px; color: var(--muted); word-break: break-word; margin-top: 1px; }
.cal-evt-acts { display: flex; gap: 2px; flex: none; opacity: 0; transition: opacity .15s; }
.cal-evt:hover .cal-evt-acts { opacity: 1; }
@media (hover: none) { .cal-evt-acts { opacity: 1; } }
.cal-icon-btn {
  border: none; background: none; cursor: pointer;
  font-size: 13px; padding: 3px 5px; border-radius: 6px; line-height: 1;
  transition: background .15s, transform .1s;
}
.cal-icon-btn:hover { background: var(--line); transform: scale(1.1); }
.cal-sec-label { font-size: 12px; font-weight: 700; color: var(--muted); margin: 14px 0 6px; }
.cal-due-card {
  border: 1.5px dashed var(--muted); border-radius: 10px;
  padding: 7px 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; margin-bottom: 6px;
  display: flex; align-items: center; gap: 6px;
  transition: background .15s, border-color .15s;
}
.cal-due-card:hover { background: var(--orange-soft); border-color: var(--orange); }
.cal-due-hint { font-size: 11px; font-weight: 500; color: var(--muted); margin-left: auto; flex: none; }
.cal-form { border-top: 1px solid var(--line); margin-top: 14px; padding-top: 4px; }
.cal-form .cal-sec-label { margin-top: 8px; }
.cal-swatches { display: flex; gap: 8px; flex-wrap: wrap; padding: 2px 0; }
.cal-swatch {
  width: 24px; height: 24px; border-radius: 50%; border: none;
  cursor: pointer; position: relative; transition: transform .12s;
}
.cal-swatch:hover { transform: scale(1.18); }
.cal-swatch.on::after {
  content: '✓'; position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 13px; font-weight: 800;
}
.cal-form-btns { display: flex; gap: 8px; margin-top: 4px; }
@media (max-width: 900px) {
  .cal-layout { grid-template-columns: 1fr; }
  .cal-right { position: static; }
  .cal-left { padding: 12px; }
  .cal-cell { min-height: 64px; padding: 4px; gap: 2px; }
  .cal-daynum { width: 20px; height: 20px; font-size: 12px; }
  .cal-chip { font-size: 10px; padding: 1px 4px; }
}`;
    document.head.appendChild(st);
  }

  /* ---------- 小工具 ---------- */
  const parseDate = s => {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const colorOf = ev => (COLORS.includes(ev.color) ? ev.color : 'orange');
  const sortEv = (a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;       // 全天的排最后
    if (!b.time) return -1;
    return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
  };

  function getData() {
    const data = Store.get('calendar', { events: [] });
    if (!data || !Array.isArray(data.events)) return { events: [] };
    return data;
  }

  // 重绘前把表单里未提交的输入兜住(同 dashboard 的 draft 模式),
  // 避免后台写入(如番茄钟完成给绑定卡片 +1 pomos 写 'kanban')触发的整页重绘清空正在输入的内容
  function stashFormDraft() {
    formDraft = null;
    const form = containerRef && containerRef.querySelector('.cal-form');
    if (!form) return;
    const swOn = form.querySelector('.cal-swatch.on');
    let focusSel = null;
    let caret = null;
    const ae = document.activeElement;
    if (ae && form.contains(ae)) {
      if (ae.classList.contains('cal-f-title')) focusSel = '.cal-f-title';
      else if (ae.classList.contains('cal-f-time')) focusSel = '.cal-f-time';
      else if (ae.classList.contains('cal-f-note')) focusSel = '.cal-f-note';
      if (focusSel && typeof ae.selectionStart === 'number') caret = ae.selectionStart;
    }
    formDraft = {
      editingId,
      title: form.querySelector('.cal-f-title').value,
      time: form.querySelector('.cal-f-time').value,
      note: form.querySelector('.cal-f-note').value,
      color: swOn ? swOn.dataset.color : null,
      focusSel,
      caret,
    };
  }

  // 收集 kanban 未完成(排除最后一列)且设了截止日的卡片,按日期分组
  function getDueMap() {
    const map = {};
    const kb = Store.get('kanban', null);
    if (!kb || !Array.isArray(kb.columns) || !kb.cards) return map;
    kb.columns.slice(0, -1).forEach(col => {
      (col.cardIds || []).forEach(id => {
        const card = kb.cards[id];
        if (card && card.due) {
          if (!map[card.due]) map[card.due] = [];
          map[card.due].push(card);
        }
      });
    });
    return map;
  }

  /* ---------- 主渲染 ---------- */
  function paint() {
    const c = containerRef;
    if (!c) return;
    const today = App.today();
    const events = getData().events;
    const dueMap = getDueMap();

    // 事件按日期分组
    const evMap = {};
    events.forEach(ev => {
      if (!evMap[ev.date]) evMap[ev.date] = [];
      evMap[ev.date].push(ev);
    });

    /* ----- 月历网格(周一开头,固定 42 格) ----- */
    const offset = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(viewY, viewM, 1 - offset + i);
      const ds = App.dateStr(d);
      const cls = [
        'cal-cell',
        d.getMonth() === viewM ? '' : 'cal-other',
        ds === today ? 'cal-today' : '',
        ds === selectedDate ? 'cal-selected' : '',
      ].filter(Boolean).join(' ');

      const dayEvs = (evMap[ds] || []).slice().sort(sortEv);
      let chips = dayEvs.slice(0, 3).map(ev => {
        const col = colorOf(ev);
        return `<span class="cal-chip" style="background:var(--${col}-soft);color:var(--${col})">${App.esc(ev.title)}</span>`;
      }).join('');
      if (dayEvs.length > 3) chips += `<span class="cal-chip cal-chip-more">+${dayEvs.length - 3}</span>`;
      const dues = dueMap[ds] || [];
      if (dues.length) {
        const label = dues.length === 1 ? dues[0].title : `${dues[0].title} 等${dues.length}张`;
        chips += `<span class="cal-chip cal-chip-due">📋 ${App.esc(label)}</span>`;
      }
      cells += `<div class="${cls}" data-date="${ds}"><span class="cal-daynum">${d.getDate()}</span>${chips}</div>`;
    }

    /* ----- 详情面板 ----- */
    const sel = parseDate(selectedDate);
    const panelTitle = `${sel.getMonth() + 1}月${sel.getDate()}日 · 星期${DOW_NAMES[sel.getDay()]}`;
    const dayEvs = (evMap[selectedDate] || []).slice().sort(sortEv);
    const dayDues = dueMap[selectedDate] || [];

    const evRows = dayEvs.length
      ? `<div class="cal-evts">${dayEvs.map(ev => {
          const col = colorOf(ev);
          return `<div class="cal-evt" data-id="${App.esc(ev.id)}">
            <span class="cal-dot" style="background:var(--${col})"></span>
            <span class="cal-evt-time">${ev.time ? App.esc(ev.time) : '全天'}</span>
            <div class="cal-evt-main">
              <div class="cal-evt-title">${App.esc(ev.title)}</div>
              ${ev.note ? `<div class="cal-evt-note">${App.esc(ev.note)}</div>` : ''}
            </div>
            <div class="cal-evt-acts">
              <button class="cal-icon-btn" data-act="edit" title="编辑">✏️</button>
              <button class="cal-icon-btn" data-act="del" title="删除">🗑</button>
            </div>
          </div>`;
        }).join('')}</div>`
      : `<div class="cal-empty"><div class="cal-empty-icon">🌤️</div>这天还空着,安排点什么或好好放松吧~</div>`;

    const dueSection = dayDues.length
      ? `<div class="cal-sec-label">📋 看板到期卡片</div>
         ${dayDues.map(card => `
           <div class="cal-due-card" title="点击打开看板">
             <span>📋</span><span>${App.esc(card.title)}</span>
             <span class="cal-due-hint">去看板 →</span>
           </div>`).join('')}`
      : '';

    /* ----- 表单(添加 / 编辑共用) ----- */
    const editing = editingId ? events.find(v => v.id === editingId) : null;
    const formColor = editing ? colorOf(editing) : 'orange';
    const formHtml = `
      <form class="cal-form" novalidate>
        <div class="cal-sec-label">${editing ? '✏️ 编辑日程' : '+ 添加日程'}</div>
        <div class="field">
          <label class="field-label">标题</label>
          <input class="input cal-f-title" maxlength="60" placeholder="比如:和朋友吃饭"
                 value="${editing ? App.esc(editing.title) : ''}">
        </div>
        <div class="field">
          <label class="field-label">时间(留空 = 全天)</label>
          <input type="time" class="input cal-f-time" value="${editing && editing.time ? App.esc(editing.time) : ''}">
        </div>
        <div class="field">
          <label class="field-label">颜色</label>
          <div class="cal-swatches">${COLORS.map(col => `
            <button type="button" class="cal-swatch${col === formColor ? ' on' : ''}"
                    data-color="${col}" style="background:var(--${col})" title="${col}"></button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label class="field-label">备注(可选)</label>
          <textarea class="input cal-f-note" rows="2" placeholder="补充点细节…">${editing ? App.esc(editing.note || '') : ''}</textarea>
        </div>
        <div class="cal-form-btns">
          <button type="submit" class="btn primary small">${editing ? '保存修改' : '添加'}</button>
          ${editing ? '<button type="button" class="btn ghost small cal-f-cancel">取消</button>' : ''}
        </div>
      </form>`;

    /* ----- 拼装 ----- */
    c.innerHTML = `
      <div class="module-head">
        <h1>📅 日历</h1>
        <p class="module-sub">日程安排一目了然,看板到期卡片也会出现在这里</p>
      </div>
      <div class="cal-layout">
        <div class="card cal-left">
          <div class="cal-toolbar">
            <button class="cal-nav-btn" data-nav="-1" title="上个月">‹</button>
            <span class="cal-month-title">${viewY}年${viewM + 1}月</span>
            <button class="cal-nav-btn" data-nav="1" title="下个月">›</button>
            <button class="btn ghost small cal-btn-today">今天</button>
          </div>
          <div class="cal-weekdays">${['一', '二', '三', '四', '五', '六', '日'].map(w => `<span class="cal-weekday">${w}</span>`).join('')}</div>
          <div class="cal-grid">${cells}</div>
        </div>
        <div class="cal-right">
          <div class="card cal-panel">
            <div class="cal-panel-date">${panelTitle}</div>
            ${evRows}
            ${dueSection}
            ${formHtml}
          </div>
        </div>
      </div>`;

    bind(c);

    // 回填 store:change 重绘前暂存的草稿(仍是同一编辑态才回填)
    if (formDraft && formDraft.editingId === editingId) {
      const form = c.querySelector('.cal-form');
      form.querySelector('.cal-f-title').value = formDraft.title;
      form.querySelector('.cal-f-time').value = formDraft.time;
      form.querySelector('.cal-f-note').value = formDraft.note;
      if (formDraft.color) {
        c.querySelectorAll('.cal-swatch').forEach(s =>
          s.classList.toggle('on', s.dataset.color === formDraft.color));
      }
      if (formDraft.focusSel) {
        const el = form.querySelector(formDraft.focusSel);
        if (el) {
          el.focus();
          if (formDraft.caret !== null) {
            try { el.setSelectionRange(formDraft.caret, formDraft.caret); } catch (err) { /* time 输入不支持,忽略 */ }
          }
        }
      }
    }
    formDraft = null;
  }

  /* ---------- 事件绑定(随每次 paint 重建) ---------- */
  function bind(c) {
    // 月份切换(跨年自动进位)
    c.querySelectorAll('.cal-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        viewM += Number(btn.dataset.nav);
        if (viewM < 0) { viewM = 11; viewY--; }
        if (viewM > 11) { viewM = 0; viewY++; }
        paint();
      });
    });

    // 回到今天
    c.querySelector('.cal-btn-today').addEventListener('click', () => {
      const t = new Date();
      viewY = t.getFullYear();
      viewM = t.getMonth();
      selectedDate = App.today();
      editingId = null;
      paint();
    });

    // 点格子选日
    c.querySelector('.cal-grid').addEventListener('click', e => {
      const cell = e.target.closest('.cal-cell');
      if (!cell) return;
      selectedDate = cell.dataset.date;
      editingId = null;
      const d = parseDate(selectedDate);
      viewY = d.getFullYear();
      viewM = d.getMonth();
      paint();
    });

    // 事件行:编辑 / 删除
    const evts = c.querySelector('.cal-evts');
    if (evts) {
      evts.addEventListener('click', async e => {
        const btn = e.target.closest('.cal-icon-btn');
        if (!btn) return;
        const row = btn.closest('.cal-evt');
        const id = row && row.dataset.id;
        if (!id) return;
        if (btn.dataset.act === 'edit') {
          editingId = id;
          paint();
          const form = containerRef && containerRef.querySelector('.cal-form');
          if (form) {
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            const t = form.querySelector('.cal-f-title');
            if (t) t.focus();
          }
        } else if (btn.dataset.act === 'del') {
          const data = getData();
          const ev = data.events.find(v => v.id === id);
          const ok = await App.confirm(`确定删除日程「${ev ? ev.title : ''}」吗?`, { danger: true, okText: '删除' });
          if (!ok) return;
          data.events = data.events.filter(v => v.id !== id);
          if (editingId === id) { editingId = null; skipStashOnce = true; } // 删的是正在编辑的事件,表单重置
          Store.set('calendar', data);   // store:change 会触发重渲染
          App.toast('日程已删除', 'success');
        }
      });
    }

    // 看板到期卡片 → 跳转看板
    c.querySelectorAll('.cal-due-card').forEach(el => {
      el.addEventListener('click', () => App.show('kanban'));
    });

    // 选色
    c.querySelectorAll('.cal-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        c.querySelectorAll('.cal-swatch').forEach(s => s.classList.remove('on'));
        sw.classList.add('on');
      });
    });

    // 表单提交(添加 / 保存修改)
    const form = c.querySelector('.cal-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const titleInput = form.querySelector('.cal-f-title');
      const title = titleInput.value.trim();
      if (!title) {
        App.toast('标题不能为空哦', 'error');
        titleInput.focus();
        return;
      }
      const time = form.querySelector('.cal-f-time').value || null;
      const swOn = form.querySelector('.cal-swatch.on');
      const color = swOn ? swOn.dataset.color : 'orange';
      const note = form.querySelector('.cal-f-note').value.trim();

      const data = getData();
      if (editingId) {
        const ev = data.events.find(v => v.id === editingId);
        editingId = null;
        if (ev) {
          ev.title = title;
          ev.time = time;
          ev.color = color;
          ev.note = note;
          skipStashOnce = true; // 自己提交,重绘后表单清空
          Store.set('calendar', data);
          App.toast('修改已保存', 'success');
        } else {
          paint();   // 事件已不存在,直接还原表单
        }
      } else {
        data.events.push({ id: App.uid(), date: selectedDate, time, title, color, note });
        skipStashOnce = true; // 自己提交,重绘后表单清空
        Store.set('calendar', data);
        App.toast('日程已添加', 'success');
      }
    });

    // 取消编辑
    const cancel = c.querySelector('.cal-f-cancel');
    if (cancel) {
      cancel.addEventListener('click', () => {
        editingId = null;
        paint();
      });
    }
  }

  /* ---------- 数据变更 → 重渲染(document 级,只注册一次) ---------- */
  document.addEventListener('store:change', e => {
    if (App.currentModule() !== MOD_ID) return;
    const k = e.detail && e.detail.key;
    if ((k === 'calendar' || k === 'kanban') && containerRef && containerRef.isConnected) {
      if (skipStashOnce) skipStashOnce = false; // 自己提交/删除触发,表单按预期重置
      else stashFormDraft();                    // 外部写入(如后台番茄钟)先兜住未提交输入
      paint();
    }
  });

  /* ---------- 注册 ---------- */
  App.registerModule({
    id: MOD_ID,
    name: '日历',
    icon: '📅',
    color: 'orange',
    render(container) {
      containerRef = container;
      if (!selectedDate) {
        const t = new Date();
        viewY = t.getFullYear();
        viewM = t.getMonth();
        selectedDate = App.today();
      }
      paint();
    },
  });
})();
