/* ===========================================================
   Max Station · 看板模块
   列横向排列 / 卡片拖拽 / 列管理 / 卡片编辑弹窗
   数据 key: 'kanban'
   =========================================================== */
(() => {
  const KEY = 'kanban';
  const MOD = 'kanban';
  const PALETTE = ['blue', 'orange', 'green', 'red', 'purple', 'teal', 'pink', 'yellow'];

  let root = null;        // render 时的容器(#main)
  let data = null;        // { columns, cards }
  let dragId = null;      // 正在拖拽的卡片 id
  let lastIndKey = null;  // 上一次指示线状态,避免 dragover 频繁重绘
  let selfWrite = false;  // 区分自己写入和外部模块写入

  /* ---------- 样式(只注入一次) ---------- */
  if (!document.getElementById('style-kanban')) {
    const st = document.createElement('style');
    st.id = 'style-kanban';
    st.textContent = `
.kb-wrap{display:flex;flex-direction:column;height:100%;min-height:0}
.kb-board{display:flex;align-items:flex-start;gap:14px;flex:1;min-height:0;overflow-x:auto;overflow-y:hidden;padding:4px 2px 18px}
.kb-col{flex:0 0 280px;width:280px;display:flex;flex-direction:column;max-height:100%;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
.kb-col-bar{flex:none;height:5px;border-radius:var(--radius) var(--radius) 0 0}
.kb-col-head{position:relative;flex:none;display:flex;align-items:center;gap:8px;padding:10px 12px 8px}
.kb-col-title{flex:1;min-width:0;font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kb-count{flex:none;font-size:11px;font-weight:700;color:#fff;border-radius:99px;padding:1px 8px;line-height:1.6}
.kb-menu-btn{flex:none;width:26px;height:26px;border:none;background:none;border-radius:8px;color:var(--muted);font-size:16px;line-height:1;cursor:pointer;transition:background .15s,color .15s}
.kb-menu-btn:hover{background:var(--bg);color:var(--ink)}
.kb-menu{position:absolute;top:36px;right:10px;z-index:40;min-width:160px;background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-lift);padding:6px}
.kb-menu-item{display:block;width:100%;text-align:left;border:none;background:none;border-radius:8px;padding:7px 10px;font-size:13.5px;font-weight:600;color:var(--ink);cursor:pointer;transition:background .12s}
.kb-menu-item:hover{background:var(--bg)}
.kb-menu-danger{color:var(--red)}
.kb-menu-danger:hover{background:var(--red-soft)}
.kb-menu-label{font-size:12px;font-weight:700;color:var(--muted);padding:6px 10px 0}
.kb-menu-colors{display:flex;flex-wrap:wrap;gap:7px;padding:6px 10px 8px}
.kb-dot{width:18px;height:18px;border:none;border-radius:50%;padding:0;cursor:pointer;transition:transform .12s}
.kb-dot:hover{transform:scale(1.18)}
.kb-dot.kb-on{box-shadow:0 0 0 2px var(--card),0 0 0 4px var(--ink)}
.kb-rename-input{flex:1;min-width:0;border:1.5px solid var(--blue);border-radius:8px;padding:2px 8px;font-size:14px;font-weight:700;color:var(--ink);background:#fff;outline:none}
.kb-col-body{flex:1;min-height:64px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:4px 10px 8px}
.kb-empty-col{margin:6px 0;padding:16px 8px;text-align:center;font-size:12.5px;color:var(--muted);opacity:.6;border:1.5px dashed var(--line);border-radius:10px;pointer-events:none}
.kb-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;box-shadow:var(--shadow);cursor:grab;transition:box-shadow .15s,transform .12s,opacity .15s}
.kb-card:hover{box-shadow:var(--shadow-lift);transform:translateY(-1px)}
.kb-card:active{cursor:grabbing}
.kb-card.kb-dragging{opacity:.35}
.kb-card.kb-ind-top{box-shadow:0 -3px 0 0 var(--blue),var(--shadow)}
.kb-card.kb-ind-bottom{box-shadow:0 3px 0 0 var(--blue),var(--shadow)}
.kb-drop-hint{background:var(--blue-soft);border-radius:10px}
.kb-card-title{font-size:14px;font-weight:700;line-height:1.45;word-break:break-word}
.kb-card-meta{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:7px}
.kb-due-late{background:var(--red);color:#fff}
.kb-due-today{background:var(--orange-soft);color:var(--orange)}
.kb-due-future{background:var(--bg);color:var(--muted)}
.kb-icon{font-size:12px;line-height:1}
.kb-pomo{font-size:12px;font-weight:700;color:var(--muted)}
.kb-col-foot{flex:none;display:flex;gap:6px;padding:8px 10px 10px}
.kb-add-input{flex:1;min-width:0;font-size:13px;padding:6px 10px}
.kb-addcol{flex:0 0 220px;align-self:flex-start;min-height:120px;border:2px dashed var(--line);border-radius:var(--radius);background:none;color:var(--muted);font-size:14px;font-weight:700;cursor:pointer;transition:border-color .15s,color .15s,background .15s}
.kb-addcol:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-soft)}
.kb-board-empty{flex:0 0 300px;align-self:center}
.kb-swatches{display:flex;flex-wrap:wrap;gap:10px}
.kb-swatch{width:26px;height:26px;border:none;border-radius:50%;padding:0;cursor:pointer;transition:transform .12s}
.kb-swatch:hover{transform:scale(1.12)}
.kb-swatch.kb-on{box-shadow:0 0 0 2px var(--card),0 0 0 4px var(--ink)}
.kb-check{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--ink);cursor:pointer}
.kb-check input{width:16px;height:16px;accent-color:var(--blue);cursor:pointer}
.kb-check-hint{margin:6px 0 0;font-size:12px;color:var(--muted)}
.kb-due-row{display:flex;gap:8px;align-items:center}
.kb-due-row .input{flex:1}
.kb-actions{justify-content:space-between}
@media (max-width:800px){
  .kb-col{flex-basis:256px;width:256px}
  .kb-col-body{max-height:56vh}
  .kb-addcol{flex-basis:160px;min-height:90px}
}`;
    document.head.appendChild(st);
  }

  /* ---------- 数据 ---------- */

  function load() {
    let d = Store.get(KEY, null);
    if (!d || !Array.isArray(d.columns) || typeof d.cards !== 'object' || d.cards === null) {
      d = {
        columns: [
          { id: App.uid(), title: '待办', color: 'blue', cardIds: [] },
          { id: App.uid(), title: '进行中', color: 'orange', cardIds: [] },
          { id: App.uid(), title: '已完成', color: 'green', cardIds: [] },
        ],
        cards: {},
      };
      selfWrite = true;
      Store.set(KEY, d);
      selfWrite = false;
    }
    // 读取侧轻量加固:脏 id 过滤、非法颜色兜底
    d.columns.forEach(c => {
      if (!Array.isArray(c.cardIds)) c.cardIds = [];
      c.cardIds = c.cardIds.filter(id => d.cards[id]);
      if (!PALETTE.includes(c.color)) c.color = 'blue';
    });
    data = d;
  }

  function save() {
    selfWrite = true;
    Store.set(KEY, data);
    selfWrite = false;
  }

  const findCol = id => data.columns.find(c => c.id === id);

  /* ---------- 渲染辅助 ---------- */

  function tagColor(tag) {
    let h = 0;
    for (const ch of String(tag)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  function dueChip(due) {
    const t = App.today();
    const p = String(due).split('-');
    const md = p.length === 3 ? `${+p[1]}/${+p[2]}` : App.esc(due);
    if (due < t) return `<span class="chip kb-due-late">逾期 ${md}</span>`;
    if (due === t) return `<span class="chip kb-due-today">今天</span>`;
    return `<span class="chip kb-due-future">${md}</span>`;
  }

  function cardHTML(card) {
    const metas = [];
    if (card.due) metas.push(dueChip(card.due));
    (card.tags || []).forEach(t => {
      const c = tagColor(t);
      metas.push(`<span class="chip" style="background:var(--${c}-soft);color:var(--${c})">${App.esc(t)}</span>`);
    });
    if (card.desc) metas.push('<span class="kb-icon" title="有描述">📄</span>');
    if (card.pomos > 0) metas.push(`<span class="kb-pomo" title="完成的番茄数">🍅×${Number(card.pomos)}</span>`);
    return `<article class="kb-card" draggable="true" data-card="${App.esc(card.id)}">
      <div class="kb-card-title">${App.esc(card.title)}</div>
      ${metas.length ? `<div class="kb-card-meta">${metas.join('')}</div>` : ''}
    </article>`;
  }

  function colHTML(col) {
    const cards = col.cardIds.map(id => data.cards[id]).filter(Boolean);
    return `<section class="kb-col" data-col="${App.esc(col.id)}">
      <div class="kb-col-bar" style="background:var(--${col.color})"></div>
      <div class="kb-col-head">
        <span class="kb-col-title" title="${App.esc(col.title)}">${App.esc(col.title)}</span>
        <span class="kb-count" style="background:var(--${col.color})">${cards.length}</span>
        <button class="kb-menu-btn" data-act="menu" title="列操作">⋯</button>
      </div>
      <div class="kb-col-body">
        ${cards.map(cardHTML).join('')}
        ${cards.length === 0 ? '<div class="kb-empty-col">拖卡片到这里</div>' : ''}
      </div>
      <div class="kb-col-foot">
        <input class="input kb-add-input" placeholder="＋ 添加卡片" maxlength="200">
        <button class="btn ghost small" data-act="addcard">添加</button>
      </div>
    </section>`;
  }

  function refresh() {
    if (!root) return;
    const board = root.querySelector('.kb-board');
    if (!board) return;
    const sl = board.scrollLeft;
    const total = Object.keys(data.cards).length;
    const sub = root.querySelector('.kb-sub');
    if (sub) {
      sub.textContent = total > 0
        ? `共 ${data.columns.length} 列 · ${total} 张卡片,拖动卡片即可移动`
        : '把要做的事拆成卡片,拖一拖就能推进进度';
    }
    board.innerHTML =
      (data.columns.length === 0
        ? '<div class="kb-board-empty empty-state"><div class="empty-icon">🗂️</div><p>看板空空的~ 点旁边「＋ 新建列」搭起你的工作流吧</p></div>'
        : data.columns.map(colHTML).join('')) +
      '<button class="kb-addcol" data-act="addcol">＋ 新建列</button>';
    board.scrollLeft = sl;
    lastIndKey = null;
  }

  /* ---------- 卡片操作 ---------- */

  function addCard(colId, inputEl) {
    const col = findCol(colId);
    if (!col) return;
    const title = (inputEl.value || '').trim();
    if (!title) {
      App.toast('先写个标题再添加哦', 'error');
      inputEl.focus();
      return;
    }
    const id = App.uid();
    data.cards[id] = { id, title, desc: '', tags: [], due: null, createdAt: Date.now(), pomos: 0 };
    col.cardIds.push(id);
    save();
    refresh();
    const colEl = root.querySelector(`.kb-col[data-col="${colId}"]`);
    if (colEl) {
      const body = colEl.querySelector('.kb-col-body');
      if (body) body.scrollTop = body.scrollHeight;
      const inp = colEl.querySelector('.kb-add-input');
      if (inp) inp.focus();
    }
  }

  function openCardModal(cardId) {
    const card = data.cards[cardId];
    if (!card) return;
    const fromCol = data.columns.find(c => c.cardIds.includes(cardId));
    const colOpts = data.columns.map(c =>
      `<option value="${App.esc(c.id)}"${fromCol && c.id === fromCol.id ? ' selected' : ''}>${App.esc(c.title)}</option>`
    ).join('');
    App.modal({
      title: '编辑卡片',
      body: `
        <div class="field"><label class="field-label">标题 *</label><input class="input" data-f="title" maxlength="200"></div>
        <div class="field"><label class="field-label">描述</label><textarea class="input" data-f="desc" rows="3" placeholder="补充一点细节…"></textarea></div>
        <div class="field"><label class="field-label">截止日期</label>
          <div class="kb-due-row"><input type="date" class="input" data-f="due"><button type="button" class="btn ghost small" data-act="cleardue">清空</button></div>
        </div>
        <div class="field"><label class="field-label">标签(用逗号分隔)</label><input class="input" data-f="tags" placeholder="如:工作, 紧急"></div>
        <div class="field"><label class="field-label">所在列</label><select class="select" data-f="col">${colOpts}</select></div>
        <div class="modal-actions kb-actions">
          <button class="btn danger" data-act="del">删除</button>
          <button class="btn primary" data-act="save">保存</button>
        </div>`,
      onMount(body, close) {
        const f = n => body.querySelector(`[data-f="${n}"]`);
        f('title').value = card.title || '';
        f('desc').value = card.desc || '';
        f('due').value = card.due || '';
        f('tags').value = (card.tags || []).join(', ');
        body.querySelector('[data-act="cleardue"]').onclick = () => { f('due').value = ''; };
        body.querySelector('[data-act="del"]').onclick = async () => {
          const ok = await App.confirm(`确定删除卡片「${card.title}」吗?删了就找不回来啦`, { danger: true, okText: '删除' });
          if (!ok) return;
          // 弹窗开着时数据可能被外部模块(如番茄钟)刷新过,一律按 id 在最新 data 上操作
          if (!data.cards[cardId]) { close(); refresh(); return; }
          data.columns.forEach(c => {
            const i = c.cardIds.indexOf(cardId);
            if (i > -1) c.cardIds.splice(i, 1);
          });
          delete data.cards[cardId];
          save();
          refresh();
          close();
          App.toast('卡片已删除', 'success');
        };
        body.querySelector('[data-act="save"]').onclick = () => {
          const title = f('title').value.trim();
          if (!title) {
            App.toast('标题不能为空', 'error');
            f('title').focus();
            return;
          }
          // 弹窗开着时数据可能被外部模块(如番茄钟 +1)刷新过,闭包里的 card/fromCol
          // 可能已是孤儿旧对象,必须按 id 在最新 data 上重新定位再写,否则编辑会静默丢失
          const liveCard = data.cards[cardId];
          if (!liveCard) {
            close();
            refresh();
            App.toast('这张卡片已被删除,改动没有保存', 'error');
            return;
          }
          liveCard.title = title;
          liveCard.desc = f('desc').value.trim();
          liveCard.due = f('due').value || null;
          liveCard.tags = f('tags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
          const toId = f('col').value;
          const liveFrom = data.columns.find(c => c.cardIds.includes(cardId));
          const toCol = findCol(toId);
          if (liveFrom && toCol && toId !== liveFrom.id) {
            const i = liveFrom.cardIds.indexOf(cardId);
            if (i > -1) liveFrom.cardIds.splice(i, 1);
            toCol.cardIds.push(cardId);
          }
          save();
          refresh();
          close();
          App.toast('已保存', 'success');
        };
        f('title').focus();
      },
    });
  }

  /* ---------- 列操作 ---------- */

  function closeMenu() {
    document.querySelectorAll('.kb-menu').forEach(m => m.remove());
  }

  function toggleMenu(colEl) {
    if (!colEl) return;
    const had = colEl.querySelector('.kb-menu');
    closeMenu();
    if (had) return;
    const col = findCol(colEl.dataset.col);
    if (!col) return;
    const menu = document.createElement('div');
    menu.className = 'kb-menu';
    menu.innerHTML = `
      <button class="kb-menu-item" data-act="rename">✏️ 重命名</button>
      <div class="kb-menu-label">换颜色</div>
      <div class="kb-menu-colors">${PALETTE.map(c =>
        `<button class="kb-dot${c === col.color ? ' kb-on' : ''}" data-color="${c}" style="background:var(--${c})" title="${c}"></button>`
      ).join('')}</div>
      <button class="kb-menu-item kb-menu-danger" data-act="delcol">🗑️ 删除列</button>`;
    colEl.querySelector('.kb-col-head').appendChild(menu);
  }

  function startRename(colId) {
    closeMenu();
    const colEl = root && root.querySelector(`.kb-col[data-col="${colId}"]`);
    const col = findCol(colId);
    if (!colEl || !col) return;
    const titleEl = colEl.querySelector('.kb-col-title');
    if (!titleEl) return;
    const input = document.createElement('input');
    input.className = 'kb-rename-input';
    input.value = col.title;
    input.maxLength = 30;
    titleEl.replaceWith(input);
    input.focus();
    input.select();
    let done = false, cancelled = false;
    const commit = () => {
      if (done) return;
      done = true;
      const v = input.value.trim();
      // 数据可能被外部模块刷新过,按 id 重新定位列,别写闭包里的旧对象
      const liveCol = findCol(colId);
      if (!cancelled && liveCol && v && v !== liveCol.title) {
        liveCol.title = v;
        save();
        App.toast('已重命名', 'success');
      }
      refresh();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) input.blur();
      else if (e.key === 'Escape') { cancelled = true; input.blur(); }
    });
    input.addEventListener('blur', commit);
  }

  async function deleteColumn(colId) {
    const col = findCol(colId);
    if (!col) return;
    const n = col.cardIds.length;
    // 最右列被 dashboard / 日历 / 番茄钟当「已完成」排除,删掉它语义会滑到前一列,要提醒
    const isLast = data.columns.length > 1 && data.columns[data.columns.length - 1].id === colId;
    const lastWarn = isLast
      ? `它是最右边的列(看板把最右列当「已完成」做统计),删掉后「${data.columns[data.columns.length - 2].title}」会变成新的「已完成」列。`
      : '';
    const msg = n > 0
      ? `删除「${col.title}」会连带删除其中 ${n} 张卡片。${lastWarn}确定吗?`
      : (lastWarn ? `「${col.title}」是空列,但${lastWarn}确定删除吗?` : `确定删除空列「${col.title}」吗?`);
    const ok = await App.confirm(msg, { danger: true, okText: n > 0 ? '连卡片一起删' : '删除' });
    if (!ok) return;
    col.cardIds.forEach(id => { delete data.cards[id]; });
    data.columns = data.columns.filter(c => c.id !== colId);
    save();
    refresh();
    App.toast('列已删除', 'success');
  }

  function openColModal() {
    let picked = PALETTE[data.columns.length % PALETTE.length];
    App.modal({
      title: '新建列',
      body: `
        <div class="field"><label class="field-label">列名 *</label><input class="input" data-f="title" maxlength="30" placeholder="如:待回顾"></div>
        <div class="field"><label class="field-label">颜色</label>
          <div class="kb-swatches">${PALETTE.map(c =>
            `<button type="button" class="kb-swatch${c === picked ? ' kb-on' : ''}" data-color="${c}" style="background:var(--${c})" title="${c}"></button>`
          ).join('')}</div>
        </div>
        <div class="field">
          <label class="kb-check"><input type="checkbox" data-f="aslast"> 作为「已完成」列放到最右</label>
          <p class="kb-check-hint">看板把最右一列当「已完成」:统计和番茄钟绑定会排除它</p>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" data-act="cancel">取消</button>
          <button class="btn primary" data-act="ok">创建</button>
        </div>`,
      onMount(body, close) {
        const titleInp = body.querySelector('[data-f="title"]');
        body.querySelector('.kb-swatches').addEventListener('click', e => {
          const s = e.target.closest('.kb-swatch');
          if (!s) return;
          picked = s.dataset.color;
          body.querySelectorAll('.kb-swatch').forEach(x => x.classList.toggle('kb-on', x === s));
        });
        const create = () => {
          const t = titleInp.value.trim();
          if (!t) {
            App.toast('先给列起个名字吧', 'error');
            titleInp.focus();
            return;
          }
          const col = { id: App.uid(), title: t, color: picked, cardIds: [] };
          // 约定:最后一列视为「已完成」,新列默认插在它前面,保住这个约定;
          // 勾了「放到最右」或列太少(≤1,通常是删光重建)时直接追加,让创建顺序=显示顺序
          const n = data.columns.length;
          const asLast = body.querySelector('[data-f="aslast"]').checked;
          if (asLast || n <= 1) data.columns.push(col);
          else data.columns.splice(n - 1, 0, col);
          save();
          refresh();
          close();
          App.toast(`列「${t}」已创建`, 'success');
          const board = root && root.querySelector('.kb-board');
          if (board) board.scrollLeft = board.scrollWidth;
        };
        body.querySelector('[data-act="ok"]').onclick = create;
        body.querySelector('[data-act="cancel"]').onclick = close;
        titleInp.addEventListener('keydown', e => {
          if (e.key === 'Enter' && !e.isComposing) create();
        });
        titleInp.focus();
      },
    });
  }

  /* ---------- 拖拽 ---------- */

  function clearInd() {
    if (root) {
      root.querySelectorAll('.kb-ind-top, .kb-ind-bottom').forEach(el =>
        el.classList.remove('kb-ind-top', 'kb-ind-bottom'));
      root.querySelectorAll('.kb-drop-hint').forEach(el => el.classList.remove('kb-drop-hint'));
    }
    lastIndKey = null;
  }

  function onDragStart(e) {
    const cardEl = e.target.closest && e.target.closest('.kb-card');
    if (!cardEl) return;
    closeMenu();
    dragId = cardEl.dataset.card;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragId); } catch (err) { /* 某些浏览器限制,无碍 */ }
    setTimeout(() => cardEl.classList.add('kb-dragging'), 0);
  }

  function onDragOver(e) {
    if (!dragId) return;
    const colEl = e.target.closest && e.target.closest('.kb-col');
    if (!colEl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cardEl = e.target.closest('.kb-card');
    let key, apply;
    if (cardEl && cardEl.dataset.card !== dragId) {
      const r = cardEl.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      key = cardEl.dataset.card + (before ? ':t' : ':b');
      apply = () => cardEl.classList.add(before ? 'kb-ind-top' : 'kb-ind-bottom');
    } else if (!cardEl) {
      key = 'col:' + colEl.dataset.col;
      apply = () => {
        const body = colEl.querySelector('.kb-col-body');
        if (body) body.classList.add('kb-drop-hint');
      };
    } else {
      key = 'self';
      apply = null;
    }
    if (key === lastIndKey) return;
    clearInd();
    lastIndKey = key;
    if (apply) apply();
  }

  function onDrop(e) {
    if (!dragId) return;
    const colEl = e.target.closest && e.target.closest('.kb-col');
    if (!colEl) return;
    e.preventDefault();
    const toCol = findCol(colEl.dataset.col);
    const fromCol = data.columns.find(c => c.cardIds.includes(dragId));
    const cardEl = e.target.closest('.kb-card');
    const id = dragId;
    dragId = null;
    if (!toCol || !fromCol) { clearInd(); return; }
    if (cardEl && cardEl.dataset.card === id) { clearInd(); return; } // 落回自己,无事发生
    let idx;
    if (cardEl) {
      const r = cardEl.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      idx = toCol.cardIds.indexOf(cardEl.dataset.card) + (before ? 0 : 1);
    } else {
      idx = toCol.cardIds.length; // 列空白区:追加到列尾
    }
    const fromIdx = fromCol.cardIds.indexOf(id);
    fromCol.cardIds.splice(fromIdx, 1);
    if (fromCol === toCol && fromIdx < idx) idx--;
    toCol.cardIds.splice(idx, 0, id);
    save();
    refresh();
  }

  function onDragEnd() {
    dragId = null;
    clearInd();
    if (root) root.querySelectorAll('.kb-dragging').forEach(el => el.classList.remove('kb-dragging'));
  }

  /* ---------- document 级监听(只挂一次) ---------- */

  // 点击浮层外部 → 关闭列菜单
  document.addEventListener('click', e => {
    if (App.currentModule() !== MOD) return;
    if (e.target.closest && (e.target.closest('.kb-menu') || e.target.closest('.kb-menu-btn'))) return;
    closeMenu();
  });

  // 其他模块改了 kanban 数据(比如番茄钟 +1)→ 当前在看板页就刷新
  document.addEventListener('store:change', e => {
    if (selfWrite || !e.detail || e.detail.key !== KEY) return;
    if (App.currentModule() === MOD && root && root.querySelector('.kb-board')) {
      load();
      refresh();
    }
  });

  /* ---------- render ---------- */

  function render(container) {
    load();
    root = container;
    container.innerHTML = `
      <div class="kb-wrap">
        <div class="module-head">
          <h1>📋 看板</h1>
          <p class="module-sub kb-sub"></p>
        </div>
        <div class="kb-board"></div>
      </div>`;
    const wrap = container.querySelector('.kb-wrap');

    // 事件全部委托在 wrap 上(随 render 重建,不会累积)
    wrap.addEventListener('click', e => {
      const colEl = e.target.closest('.kb-col');
      const actEl = e.target.closest('[data-act]');
      if (actEl) {
        const act = actEl.dataset.act;
        if (act === 'menu') { toggleMenu(colEl); return; }
        if (act === 'rename') { if (colEl) startRename(colEl.dataset.col); return; }
        if (act === 'delcol') { closeMenu(); if (colEl) deleteColumn(colEl.dataset.col); return; }
        if (act === 'addcard') {
          if (colEl) addCard(colEl.dataset.col, colEl.querySelector('.kb-add-input'));
          return;
        }
        if (act === 'addcol') { openColModal(); return; }
      }
      const dot = e.target.closest('.kb-dot');
      if (dot && colEl) {
        const col = findCol(colEl.dataset.col);
        if (col) { col.color = dot.dataset.color; save(); refresh(); }
        return;
      }
      const cardEl = e.target.closest('.kb-card');
      if (cardEl) openCardModal(cardEl.dataset.card);
    });

    wrap.addEventListener('keydown', e => {
      if (e.target.classList && e.target.classList.contains('kb-add-input')) {
        if (e.key === 'Enter' && !e.isComposing) {
          const colEl = e.target.closest('.kb-col');
          if (colEl) addCard(colEl.dataset.col, e.target);
        } else if (e.key === 'Escape') {
          e.target.value = '';
          e.target.blur();
        }
      }
    });

    wrap.addEventListener('dragstart', onDragStart);
    wrap.addEventListener('dragover', onDragOver);
    wrap.addEventListener('drop', onDrop);
    wrap.addEventListener('dragend', onDragEnd);

    refresh();
  }

  App.registerModule({
    id: MOD,
    name: '看板',
    icon: '📋',
    color: 'blue',
    render,
    onLeave() {
      closeMenu();
      dragId = null;
    },
  });
})();
