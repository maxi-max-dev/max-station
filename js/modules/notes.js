/* ===========================================================
   Max Station · 笔记模块
   轻量速记 + 整理:列表 / 搜索 / tag 过滤 / Markdown 预览 / 自动保存
   =========================================================== */
(() => {
  const MOD_ID = 'notes';
  const PALETTE = ['blue', 'orange', 'green', 'red', 'purple', 'teal', 'pink', 'yellow'];

  /* ---------- 模块状态 ---------- */
  let data = null;            // { notes: [...] } 内存副本,读写都走它
  let selectedId = null;      // 当前选中的笔记 id
  let query = '';             // 搜索关键词
  const activeTags = new Set(); // 选中的 tag 过滤
  let previewMode = false;    // 编辑区是否处于预览
  let dirtyId = null;         // 有未保存改动的笔记 id
  let saveTimer = null;       // debounce 计时器
  let refs = {};              // 当前 render 出来的 DOM 引用

  /* ---------- 数据 ---------- */
  function load() {
    const raw = Store.get('notes', null);
    const list = raw && Array.isArray(raw.notes) ? raw.notes : [];
    return {
      notes: list.map(n => ({
        id: typeof n.id === 'string' && n.id ? n.id : App.uid(),
        title: typeof n.title === 'string' ? n.title : '',
        body: typeof n.body === 'string' ? n.body : '',
        tags: Array.isArray(n.tags) ? n.tags.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim()) : [],
        pinned: !!n.pinned,
        createdAt: Number(n.createdAt) || Date.now(),
        updatedAt: Number(n.updatedAt) || Number(n.createdAt) || Date.now(),
      })),
    };
  }

  function persist() { Store.set('notes', data); }

  const findNote = id => data ? data.notes.find(n => n.id === id) : null;

  /* ---------- 小工具 ---------- */
  const pad = n => String(n).padStart(2, '0');
  const fmtTime = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  // 今天显示 HH:MM,其他日子显示 YYYY-MM-DD
  const fmtWhen = ts => {
    const d = new Date(ts);
    return App.dateStr(d) === App.today() ? fmtTime(ts) : App.dateStr(d);
  };

  function tagColor(tag) {
    let h = 0;
    for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  const parseTags = s => [...new Set(
    String(s).split(/[,，]/).map(t => t.trim()).filter(Boolean)
  )];

  /* ---------- 自动保存(debounce 500ms,切走必 flush) ---------- */
  function markDirty(noteId) {
    dirtyId = noteId;
    if (refs.status && refs.status.isConnected) refs.status.textContent = '输入中…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 500);
  }

  function flushSave() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!dirtyId) return;
    const n = findNote(dirtyId);
    dirtyId = null;
    if (!n) return;
    n.updatedAt = Date.now();
    persist();
    if (refs.status && refs.status.isConnected && selectedId === n.id) {
      refs.status.textContent = `已保存 ${fmtTime(n.updatedAt)}`;
    }
    renderTags();
    renderList();
  }

  // 关页面前兜底保存(document/window 级监听只在 IIFE 顶层加这一次)
  window.addEventListener('beforeunload', () => { if (dirtyId) flushSave(); });

  /* ---------- Markdown-lite 渲染(先整体 esc,再逐步转换) ---------- */
  function renderMarkdown(raw) {
    const tokens = [];
    // NUL 定界占位符:App.esc 后的文本不会出现 \u0000,它不算 \s 也不会被块级正则吃掉
    const stash = html => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };

    let text = App.esc(raw);

    // 1) ```代码块``` 先抠出来保护,内部不再做任何转换(首行可带语言名,丢弃)
    text = text.replace(/```([^\n`]*)\n?([\s\S]*?)```/g, (m, lang, code) =>
      stash(`<pre><code>${code.replace(/\n$/, '')}</code></pre>`));

    // 2) `行内代码` 同样保护起来
    text = text.replace(/`([^`\n]+)`/g, (m, c) => stash(`<code>${c}</code>`));

    // 行内转换:**粗体** → *斜体* → [文字](url) 安全链接(只放行 http/https)
    const inline = s => s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // 3) 按行处理块级结构
    const out = [];
    let block = null; // 'ul' | 'ol' | 'quote'
    const closeBlock = () => {
      if (block === 'ul') out.push('</ul>');
      else if (block === 'ol') out.push('</ol>');
      else if (block === 'quote') out.push('</blockquote>');
      block = null;
    };
    const openBlock = (type, openTag) => {
      if (block !== type) { closeBlock(); out.push(openTag); block = type; }
    };

    for (const line of text.split('\n')) {
      let m;
      if ((m = line.match(/^###\s+(.*)$/))) { closeBlock(); out.push(`<h3>${inline(m[1])}</h3>`); }
      else if ((m = line.match(/^##\s+(.*)$/))) { closeBlock(); out.push(`<h2>${inline(m[1])}</h2>`); }
      else if ((m = line.match(/^#\s+(.*)$/))) { closeBlock(); out.push(`<h1>${inline(m[1])}</h1>`); }
      else if ((m = line.match(/^&gt;\s?(.*)$/))) {
        if (block === 'quote') out.push('<br>');
        openBlock('quote', '<blockquote>');
        out.push(inline(m[1]));
      }
      else if ((m = line.match(/^-\s+(.*)$/))) { openBlock('ul', '<ul>'); out.push(`<li>${inline(m[1])}</li>`); }
      else if ((m = line.match(/^\d+\.\s+(.*)$/))) { openBlock('ol', '<ol>'); out.push(`<li>${inline(m[1])}</li>`); }
      else if (line.trim() === '') { closeBlock(); out.push('<br>'); } // 剩余换行 → <br>
      else { closeBlock(); out.push(`<div class="nt-p">${inline(line)}</div>`); }
    }
    closeBlock();

    // 4) 还原被保护的代码片段
    return out.join('').replace(/\u0000(\d+)\u0000/g, (m, i) => tokens[+i] ?? '');
  }

  /* ---------- 过滤 + 排序 ---------- */
  function visibleNotes() {
    const q = query.trim().toLowerCase();
    return data.notes
      .filter(n =>
        (!q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) &&
        [...activeTags].every(t => n.tags.includes(t)))
      .sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt));
  }

  /* ---------- 局部渲染:tag 过滤行 ---------- */
  function renderTags() {
    if (!refs.tags || !refs.tags.isConnected) return;
    const all = [...new Set(data.notes.flatMap(n => n.tags))];
    [...activeTags].forEach(t => { if (!all.includes(t)) activeTags.delete(t); });
    if (!all.length) { refs.tags.innerHTML = ''; refs.tags.style.display = 'none'; return; }
    refs.tags.style.display = '';
    refs.tags.innerHTML = all.map(t => {
      const c = tagColor(t);
      const on = activeTags.has(t);
      return `<button class="chip nt-tag" data-tag="${App.esc(t)}" title="${on ? '取消过滤' : '按这个标签过滤'}"
        style="background:var(--${c}${on ? '' : '-soft'});color:${on ? '#fff' : `var(--${c})`}">#${App.esc(t)}</button>`;
    }).join('');
  }

  /* ---------- 局部渲染:笔记列表 ---------- */
  function renderList() {
    if (!refs.list || !refs.list.isConnected) return;
    const notes = visibleNotes();
    if (!notes.length) {
      refs.list.innerHTML = data.notes.length
        ? `<div class="nt-list-empty">🔍 没有匹配的笔记<br>换个关键词或标签试试</div>`
        : `<div class="nt-list-empty">📝 还没有笔记<br>点「+ 新笔记」写下第一条吧</div>`;
      return;
    }
    refs.list.innerHTML = notes.map(n => {
      const firstLine = n.body.split('\n').find(l => l.trim()) || '';
      return `
      <div class="nt-item ${n.id === selectedId ? 'nt-on' : ''}" data-id="${n.id}">
        <div class="nt-item-top">
          <span class="nt-item-title">${n.title.trim() ? App.esc(n.title) : '<span class="nt-untitled">无标题</span>'}</span>
          ${n.pinned ? '<span class="nt-item-pin">📌</span>' : ''}
        </div>
        <div class="nt-item-sum">${firstLine ? App.esc(firstLine) : '<span class="nt-untitled">(空白)</span>'}</div>
        <div class="nt-item-meta">${fmtWhen(n.updatedAt)}</div>
      </div>`;
    }).join('');
  }

  /* ---------- 局部渲染:编辑区 ---------- */
  function renderEditor() {
    if (!refs.editor || !refs.editor.isConnected) return;
    const n = findNote(selectedId);

    if (!n) {
      refs.editor.innerHTML = `
        <div class="empty-state" style="margin:auto">
          <div class="empty-icon">✍️</div>
          <p>选一篇笔记,或者写点新东西 ✍️</p>
        </div>`;
      refs.status = null;
      refs.count = null;
      return;
    }

    refs.editor.innerHTML = `
      <input class="nt-title-input" placeholder="标题" value="${App.esc(n.title)}" maxlength="120">
      <div class="nt-tags-line">
        <span class="nt-tags-icon" title="标签">🏷️</span>
        <input class="nt-tag-input" placeholder="标签,用逗号分隔" value="${App.esc(n.tags.join(', '))}">
      </div>
      <div class="nt-toolbar">
        <button class="nt-tool nt-tool-pin ${n.pinned ? 'nt-on' : ''}" title="置顶切换">📌 ${n.pinned ? '已置顶' : '置顶'}</button>
        <button class="nt-tool nt-tool-view ${previewMode ? 'nt-on' : ''}" title="预览切换">${previewMode ? '✏️ 编辑' : '👁 预览'}</button>
        <button class="nt-tool nt-tool-del" title="删除这篇笔记">🗑 删除</button>
        <span class="nt-meta-right">
          <span class="nt-status">已保存 ${fmtTime(n.updatedAt)}</span>
          <span class="nt-count">${n.body.length} 字</span>
        </span>
      </div>
      ${previewMode
        ? `<div class="nt-preview">${n.body.trim() ? renderMarkdown(n.body) : '<div class="nt-preview-empty">👀 这篇还是空的,切回编辑写点内容吧</div>'}</div>`
        : `<textarea class="nt-body" placeholder="正文支持简易 Markdown:# 标题、**粗体**、- 列表、\`代码\`、[链接](https://…)" spellcheck="false">${App.esc(n.body)}</textarea>`}
    `;

    const $ = sel => refs.editor.querySelector(sel);
    refs.title = $('.nt-title-input');
    refs.status = $('.nt-status');
    refs.count = $('.nt-count');
    const tagInput = $('.nt-tag-input');
    const bodyEl = $('.nt-body');

    refs.title.addEventListener('input', () => {
      n.title = refs.title.value;
      markDirty(n.id);
    });
    refs.title.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); if (bodyEl) bodyEl.focus(); }
    });

    tagInput.addEventListener('input', () => {
      n.tags = parseTags(tagInput.value);
      markDirty(n.id);
    });

    if (bodyEl) {
      bodyEl.addEventListener('input', () => {
        n.body = bodyEl.value;
        if (refs.count && refs.count.isConnected) refs.count.textContent = `${n.body.length} 字`;
        markDirty(n.id);
      });
    }

    $('.nt-tool-pin').addEventListener('click', () => {
      n.pinned = !n.pinned;
      persist();
      renderList();
      const btn = $('.nt-tool-pin');
      btn.classList.toggle('nt-on', n.pinned);
      btn.innerHTML = `📌 ${n.pinned ? '已置顶' : '置顶'}`;
      App.toast(n.pinned ? '已置顶 📌' : '已取消置顶', 'info');
    });

    $('.nt-tool-view').addEventListener('click', () => {
      flushSave();
      previewMode = !previewMode;
      renderEditor();
    });

    $('.nt-tool-del').addEventListener('click', async () => {
      const name = n.title.trim() || '无标题';
      const ok = await App.confirm(`确定删除「${name}」吗?删除后无法恢复。`, { danger: true, okText: '删除' });
      if (!ok) return;
      if (dirtyId === n.id) { clearTimeout(saveTimer); saveTimer = null; dirtyId = null; }
      data.notes = data.notes.filter(x => x.id !== n.id);
      if (selectedId === n.id) selectedId = null;
      persist();
      renderTags();
      renderList();
      renderEditor();
      App.toast('笔记已删除', 'success');
    });
  }

  /* ---------- 动作 ---------- */
  function selectNote(id) {
    if (id === selectedId) return;
    flushSave(); // 切笔记前先把上一篇的改动落盘,别丢字
    selectedId = id;
    renderList();
    renderEditor();
  }

  function newNote() {
    flushSave();
    const now = Date.now();
    const note = { id: App.uid(), title: '', body: '', tags: [], pinned: false, createdAt: now, updatedAt: now };
    data.notes.unshift(note);
    persist();
    selectedId = note.id;
    previewMode = false;
    renderTags();
    renderList();
    renderEditor();
    if (refs.title) refs.title.focus();
  }

  /* ---------- 样式注入(一次) ---------- */
  function injectCSS() {
    if (document.getElementById('style-notes')) return;
    const st = document.createElement('style');
    st.id = 'style-notes';
    st.textContent = `
.nt-root{display:flex;flex-direction:column;height:calc(100vh - 56px);min-height:420px}
.nt-wrap{display:flex;gap:16px;flex:1;min-height:0}
.nt-side{width:300px;flex:none;display:flex;flex-direction:column;min-height:0}
.nt-side-top{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.nt-new{background:var(--green);color:#fff}
.nt-tagrow{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.nt-tag{border:none;cursor:pointer;transition:transform .12s,filter .15s}
.nt-tag:hover{filter:brightness(.94);transform:translateY(-1px)}
.nt-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:2px}
.nt-item{background:var(--card);border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .12s}
.nt-item:hover{border-color:var(--green);box-shadow:var(--shadow);transform:translateY(-1px)}
.nt-item.nt-on{border-color:var(--green);background:var(--green-soft)}
.nt-item-top{display:flex;align-items:center;gap:6px}
.nt-item-title{font-weight:700;font-size:14px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nt-item-pin{font-size:12px;flex:none}
.nt-untitled{color:var(--muted);font-weight:600}
.nt-item-sum{color:var(--muted);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.nt-item-meta{color:var(--muted);font-size:11.5px;margin-top:4px}
.nt-list-empty{color:var(--muted);font-size:13px;text-align:center;padding:30px 12px;line-height:2}
.nt-editor{flex:1;min-width:0;display:flex;flex-direction:column;padding:18px 22px}
.nt-title-input{border:none;outline:none;background:transparent;font-size:22px;font-weight:800;color:var(--ink);width:100%;padding:2px 0 6px}
.nt-title-input::placeholder{color:var(--muted);opacity:.55}
.nt-tags-line{display:flex;align-items:center;gap:7px}
.nt-tags-icon{font-size:13px;line-height:1}
.nt-tag-input{flex:1;border:none;outline:none;background:transparent;font-size:12.5px;color:var(--muted);padding:2px 0}
.nt-tag-input:focus{color:var(--ink)}
.nt-toolbar{display:flex;align-items:center;gap:6px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:8px 0;margin-top:10px;flex-wrap:wrap}
.nt-tool{border:none;background:var(--bg);color:var(--ink);border-radius:8px;font-size:12.5px;font-weight:700;padding:5px 10px;cursor:pointer;transition:background .15s,color .15s,transform .1s}
.nt-tool:hover{background:var(--line)}
.nt-tool:active{transform:scale(.96)}
.nt-tool.nt-on{background:var(--green-soft);color:var(--green)}
.nt-tool-del:hover{background:var(--red-soft);color:var(--red)}
.nt-meta-right{margin-left:auto;display:inline-flex;gap:10px;color:var(--muted);font-size:12px;white-space:nowrap}
.nt-body{flex:1;border:none;outline:none;resize:none;background:transparent;color:var(--ink);font-size:14.5px;line-height:1.8;padding:12px 0;min-height:180px}
.nt-body::placeholder{color:var(--muted);opacity:.6}
.nt-preview{flex:1;overflow-y:auto;padding:12px 2px;font-size:14.5px;line-height:1.8;min-height:180px;overflow-wrap:break-word}
.nt-preview-empty{color:var(--muted);text-align:center;padding:36px 0}
.nt-preview h1{font-size:21px;margin:10px 0 6px;line-height:1.4}
.nt-preview h2{font-size:18px;margin:9px 0 5px;line-height:1.4}
.nt-preview h3{font-size:15.5px;margin:8px 0 4px;line-height:1.4}
.nt-preview blockquote{border-left:3px solid var(--green);background:var(--green-soft);padding:6px 12px;margin:6px 0;border-radius:0 8px 8px 0;color:var(--muted)}
.nt-preview pre{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:6px 0;overflow-x:auto;font-size:13px;line-height:1.6}
.nt-preview pre code{background:none;padding:0;font-size:13px}
.nt-preview code{background:var(--bg);border-radius:6px;padding:1px 6px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.nt-preview ul,.nt-preview ol{padding-left:24px;margin:4px 0}
.nt-preview a{color:var(--blue);font-weight:600}
.nt-preview a:hover{text-decoration:underline}
@media (max-width:900px){
  .nt-root{height:auto;min-height:calc(100vh - 130px)}
  .nt-wrap{flex-direction:column}
  .nt-side{width:100%}
  .nt-side-top{flex-direction:row}
  .nt-side-top .nt-new{flex:none}
  .nt-tagrow{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px}
  .nt-tag{flex:none}
  .nt-list{flex:none;flex-direction:row;overflow-x:auto;overflow-y:hidden;padding:2px 2px 8px}
  .nt-item{flex:none;width:210px}
  .nt-editor{min-height:55vh}
}`;
    document.head.appendChild(st);
  }

  /* ---------- 模块注册 ---------- */
  App.registerModule({
    id: MOD_ID,
    name: '笔记',
    icon: '📝',
    color: 'green',

    render(container) {
      injectCSS();
      data = load();
      if (selectedId && !findNote(selectedId)) selectedId = null;

      container.innerHTML = `
        <div class="nt-root">
          <div class="module-head">
            <h1>📝 笔记</h1>
            <div class="module-sub">轻量速记,想到就写下来 · 支持简易 Markdown 预览</div>
          </div>
          <div class="nt-wrap">
            <aside class="nt-side">
              <div class="nt-side-top">
                <button class="btn nt-new">+ 新笔记</button>
                <input class="input nt-search" type="text" placeholder="🔍 搜索标题或正文" value="${App.esc(query)}">
              </div>
              <div class="nt-tagrow" style="display:none"></div>
              <div class="nt-list"></div>
            </aside>
            <section class="nt-editor card"></section>
          </div>
        </div>`;

      refs = {
        list: container.querySelector('.nt-list'),
        tags: container.querySelector('.nt-tagrow'),
        editor: container.querySelector('.nt-editor'),
        title: null, status: null, count: null,
      };

      container.querySelector('.nt-new').addEventListener('click', newNote);

      container.querySelector('.nt-search').addEventListener('input', e => {
        query = e.target.value;
        renderList();
      });

      refs.tags.addEventListener('click', e => {
        const chip = e.target.closest('.nt-tag');
        if (!chip) return;
        const t = chip.dataset.tag;
        if (activeTags.has(t)) activeTags.delete(t); else activeTags.add(t);
        renderTags();
        renderList();
      });

      refs.list.addEventListener('click', e => {
        const item = e.target.closest('.nt-item');
        if (item) selectNote(item.dataset.id);
      });

      renderTags();
      renderList();
      renderEditor();
    },

    onLeave() {
      flushSave(); // 离开模块前把没落盘的改动保存掉
      refs = {};
    },
  });
})();
