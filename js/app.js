/* ===========================================================
   Max Station · 应用骨架
   模块注册 / 路由 / 公共 UI 工具(esc、toast、modal、confirm)
   =========================================================== */
const App = (() => {
  const modules = [];
  const games = [];
  let currentId = null;

  /* ---------- 公共小工具(模块统一用这些,别重复造) ---------- */

  // 用户输入塞进 innerHTML 前必须先过这个,防止内容把页面搞坏(XSS)
  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // 本地时区的 YYYY-MM-DD(别用 toISOString,会按 UTC 差一天)
  const dateStr = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => dateStr();

  function toast(msg, type = 'info') {
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2600);
  }

  // 统一弹窗。body 是 HTML 字符串(自己拼的时候用户内容记得 esc)
  // onMount(bodyEl, close) 里绑事件。返回 { el, close }
  function modal({ title = '', body = '', onMount } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="modal-x" aria-label="关闭">✕</button>
        </div>
        <div class="modal-body"></div>
      </div>`;
    overlay.querySelector('.modal-body').innerHTML = body;
    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 180);
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.modal-x').addEventListener('click', close);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    if (onMount) onMount(overlay.querySelector('.modal-body'), close);
    return { el: overlay, close };
  }

  // 统一确认框,返回 Promise<boolean>
  function confirmBox(msg, { danger = false, okText = '确定' } = {}) {
    return new Promise(resolve => {
      let settled = false;
      const done = v => { if (!settled) { settled = true; resolve(v); } };
      const m = modal({
        title: '确认一下',
        body: `<p class="confirm-msg"></p>
               <div class="modal-actions">
                 <button class="btn ghost" data-act="no">取消</button>
                 <button class="btn ${danger ? 'danger' : 'primary'}" data-act="yes"></button>
               </div>`,
        onMount(bodyEl, close) {
          bodyEl.querySelector('.confirm-msg').textContent = msg;
          const yes = bodyEl.querySelector('[data-act="yes"]');
          yes.textContent = okText;
          bodyEl.querySelector('[data-act="no"]').onclick = () => { close(); done(false); };
          yes.onclick = () => { close(); done(true); };
          yes.focus();
        },
      });
      // 点遮罩 / 点 ✕ 关掉 = 取消
      m.el.addEventListener('click', e => {
        if (e.target === m.el || e.target.classList.contains('modal-x')) done(false);
      });
    });
  }

  /* ---------- 模块 & 游戏注册 ---------- */

  // mod: { id, name, icon, color(色板名如 'blue'), render(container), onLeave?() }
  function registerModule(mod) { modules.push(mod); }

  // game: { id, name, icon, color, desc, mount(host), unmount() } —— 游戏厅模块负责调度
  function registerGame(game) { games.push(game); }
  function getGames() { return games.slice(); }

  // 侧边栏小红点文字,如番茄钟倒计时;text 传空清除
  function setBadge(id, text) {
    const el = document.querySelector(`#nav [data-id="${id}"] .nav-badge`);
    if (el) {
      el.textContent = text || '';
      el.style.display = text ? '' : 'none';
    }
  }

  /* ---------- 路由 ---------- */

  function show(id) {
    const mod = modules.find(m => m.id === id) || modules[0];
    if (!mod) return;
    const prev = modules.find(m => m.id === currentId);
    if (prev && prev.onLeave) {
      try { prev.onLeave(); } catch (e) { console.error(e); }
    }
    currentId = mod.id;
    document.querySelectorAll('#nav .nav-item').forEach(btn => {
      const active = btn.dataset.id === mod.id;
      btn.classList.toggle('active', active);
      btn.style.background = active ? `var(--${mod.color}-soft)` : '';
      btn.style.color = active ? `var(--${mod.color})` : '';
    });
    const main = document.getElementById('main');
    main.innerHTML = '';
    main.scrollTop = 0;
    try {
      mod.render(main);
    } catch (e) {
      console.error(e);
      main.innerHTML = `<div class="empty-state"><div class="empty-icon">😵</div>
        <p>「${esc(mod.name)}」模块渲染出错了,按 F12 打开控制台看看报错</p></div>`;
    }
    if (location.hash.slice(1) !== mod.id) history.replaceState(null, '', '#' + mod.id);
  }

  function currentModule() { return currentId; }

  /* ---------- 启动 ---------- */

  function init() {
    const nav = document.getElementById('nav');
    nav.innerHTML = modules.map(m => `
      <button class="nav-item" data-id="${m.id}" title="${esc(m.name)}">
        <span class="nav-icon">${m.icon}</span>
        <span class="nav-name">${esc(m.name)}</span>
        <span class="nav-badge" style="display:none"></span>
      </button>`).join('');
    nav.addEventListener('click', e => {
      const btn = e.target.closest('.nav-item');
      if (btn) show(btn.dataset.id);
    });
    window.addEventListener('hashchange', () => show(location.hash.slice(1)));

    // 备份 / 恢复
    document.getElementById('btn-export').addEventListener('click', () => Store.exportAll());
    const fileInput = document.getElementById('import-file');
    document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0];
      if (!f) return;
      const ok = await confirmBox('恢复备份会覆盖当前所有数据,确定继续吗?', { danger: true, okText: '覆盖恢复' });
      if (ok) {
        try {
          await Store.importAll(f);
          toast('恢复成功,正在刷新…', 'success');
          setTimeout(() => location.reload(), 600);
        } catch (e) {
          toast('恢复失败:' + e.message, 'error');
        }
      }
      fileInput.value = '';
    });

    show(location.hash.slice(1) || 'dashboard');
  }

  return {
    registerModule, registerGame, getGames, setBadge,
    show, init, currentModule,
    esc, uid, today, dateStr, toast, modal, confirm: confirmBox,
  };
})();
