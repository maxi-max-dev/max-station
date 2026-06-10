/* ===========================================================
   Max Station · 数据层
   所有模块的数据读写都走 Store,localStorage 持久化
   任何 set 都会在 document 上派发 'store:change' 事件
   =========================================================== */
const Store = (() => {
  const NS = 'maxstation:';

  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.error('Store.get 解析失败:', key, e);
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
    } catch (e) {
      console.error('Store.set 失败:', key, e);
      App.toast('保存失败,浏览器存储可能满了', 'error');
      return;
    }
    document.dispatchEvent(new CustomEvent('store:change', { detail: { key } }));
  }

  function remove(key) {
    localStorage.removeItem(NS + key);
    document.dispatchEvent(new CustomEvent('store:change', { detail: { key } }));
  }

  function keys() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(NS))
      .map(k => k.slice(NS.length));
  }

  /* ---------- 备份 / 恢复 ---------- */

  function exportAll() {
    const data = {};
    keys().forEach(k => { data[k] = get(k); });
    const payload = {
      app: 'max-station',
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `max-station-备份-${App.today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    App.toast('备份文件已开始下载', 'success');
  }

  async function importAll(file) {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('文件不是合法的 JSON');
    }
    if (!parsed || parsed.app !== 'max-station' || typeof parsed.data !== 'object' || parsed.data === null) {
      throw new Error('这不是 Max Station 的备份文件');
    }
    keys().forEach(k => localStorage.removeItem(NS + k));
    Object.entries(parsed.data).forEach(([k, v]) => {
      localStorage.setItem(NS + k, JSON.stringify(v));
    });
  }

  return { get, set, remove, keys, exportAll, importAll };
})();
