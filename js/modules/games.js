/* ===========================================================
   🎮 游戏厅(调度器)
   各游戏在 js/games/*.js 里通过 App.registerGame({...}) 注册:
   { id, name, icon, color, desc, mount(host), unmount() }
   游戏数据统一存 Store 'games' 键下自己的子键:
   const all = Store.get('games', {}); all[myId] = {...}; Store.set('games', all)
   =========================================================== */
(() => {
  let activeGame = null;

  const CSS = `
    .ga-grid {
      display: grid; gap: 16px;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
    .ga-card {
      display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
      padding: 20px; cursor: pointer; border: 1px solid var(--line);
      text-align: left; transition: transform .15s, box-shadow .15s;
      background: linear-gradient(135deg, var(--ga-soft) 0%, #fff 70%);
    }
    .ga-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lift); }
    .ga-icon { font-size: 34px; line-height: 1; }
    .ga-name { font-size: 16px; font-weight: 800; color: var(--ink); }
    .ga-desc { font-size: 13px; color: var(--muted); }
    .ga-stage-head {
      display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    }
    .ga-stage-title { font-size: 19px; font-weight: 800; }
    .ga-host { display: flex; justify-content: center; padding: 8px 0 24px; }
  `;
  const style = document.createElement('style');
  style.id = 'style-games-hub';
  style.textContent = CSS;
  document.head.appendChild(style);

  function leaveGame() {
    if (activeGame) {
      try { activeGame.unmount && activeGame.unmount(); } catch (e) { console.error(e); }
      activeGame = null;
    }
  }

  function renderPicker(container) {
    leaveGame();
    const games = App.getGames();
    container.innerHTML = `
      <div class="module-head">
        <h1>🎮 游戏厅</h1>
        <p class="module-sub">摸鱼五分钟,精神一整天</p>
      </div>
      ${games.length ? `<div class="ga-grid">
        ${games.map(g => `
          <button class="ga-card card" data-id="${g.id}"
                  style="--ga-soft:var(--${g.color}-soft)">
            <span class="ga-icon">${g.icon}</span>
            <span class="ga-name">${App.esc(g.name)}</span>
            <span class="ga-desc">${App.esc(g.desc || '')}</span>
          </button>`).join('')}
      </div>` : `<div class="empty-state"><div class="empty-icon">🕹️</div><p>还没有游戏注册进来</p></div>`}
    `;
    container.querySelectorAll('.ga-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const game = games.find(g => g.id === btn.dataset.id);
        if (game) renderGame(container, game);
      });
    });
  }

  function renderGame(container, game) {
    leaveGame();
    container.innerHTML = `
      <div class="ga-stage-head">
        <button class="btn ghost small" data-act="back">← 返回游戏厅</button>
        <span class="ga-stage-title">${game.icon} ${App.esc(game.name)}</span>
      </div>
      <div class="ga-host"></div>
    `;
    container.querySelector('[data-act="back"]').addEventListener('click', () => renderPicker(container));
    activeGame = game;
    try {
      game.mount(container.querySelector('.ga-host'));
    } catch (e) {
      console.error(e);
      App.toast('游戏启动失败', 'error');
      renderPicker(container);
    }
  }

  App.registerModule({
    id: 'games',
    name: '游戏厅',
    icon: '🎮',
    color: 'purple',
    render(container) { renderPicker(container); },
    onLeave() { leaveGame(); },
  });
})();
