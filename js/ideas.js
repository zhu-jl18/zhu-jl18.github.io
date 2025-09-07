(function(){
  const PAGE_ID = 'ideas-page';

  function byId(id){ return document.getElementById(id); }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function on(el, ev, fn){ el && el.addEventListener(ev, fn); }

  function isIdeasPage(){ return !!document.getElementById(PAGE_ID); }

  function partitionByType(list){
    const theorems = list.filter(x => x.type === 'theorem');
    const algos = list.filter(x => x.type === 'algorithm');
    return { theorems, algos };
  }

  function dayOfYear(d){
    const start = new Date(d.getFullYear(), 0, 1);
    return Math.floor((d - start) / 86400000) + 1;
  }

  async function tryLoadDailyFromJson(){
    try {
      const ts = Date.now();
      const res = await fetch(`/ideas/ideas_daily.json?ts=${ts}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const j = await res.json();
      if (!j || !j.type || !j.title || !j.summary) return null;
      // 统一到前端渲染需要的最小字段集合
      return {
        id: j.id || 'daily',
        type: j.type === 'theorem' ? 'theorem' : 'algorithm',
        title: j.title,
        category: j.source ? `${j.source}${j.lang ? ' · ' + j.lang : ''}` : '',
        statement: j.summary,
        intuition: '',
        tags: j.lang ? [j.lang] : [],
        references: j.url ? [{ text: '来源', url: j.url }] : []
      };
    } catch (e) {
      return null;
    }
  }

  function pickDaily(ideas){
    const {theorems, algos} = partitionByType(ideas);
    const now = new Date();
    const doy = dayOfYear(now);
    const year = now.getFullYear();
    const wantType = (doy % 2 === 0) ? 'theorem' : 'algorithm'; // 保证整体 50/50 的节奏
    const pool = wantType === 'theorem' ? theorems : algos;
    if (pool.length === 0){ return ideas[ (year*1000 + doy) % ideas.length ]; }
    const idx = (year * 1000 + doy) % pool.length;
    return pool[idx];
  }

  function nextOfSameType(ideas, curr){
    const pool = ideas.filter(x => x.type === curr.type);
    if (pool.length === 0) return curr;
    const idx = pool.findIndex(x => x.id === curr.id);
    const next = pool[(idx + 1) % pool.length];
    return next;
  }

  function renderDailyCard(item){
    const host = byId('ideas-daily-card');
    if (!host) return;
    host.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'idea-card big';

    const type = document.createElement('div');
    type.className = 'idea-type';
    type.textContent = item.type === 'theorem' ? '定理' : '算法';

    const title = document.createElement('h3');
    title.className = 'idea-title';
    title.textContent = item.title;

    const meta = document.createElement('div');
    meta.className = 'idea-meta';
    meta.textContent = item.category || '';

    const stmt = document.createElement('p');
    stmt.className = 'idea-statement';
    stmt.textContent = item.statement || '';

    const intui = document.createElement('p');
    intui.className = 'idea-intuition';
    intui.textContent = item.intuition || '';

    const tags = document.createElement('div');
    tags.className = 'idea-tags';
    (item.tags||[]).forEach(t => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      tags.appendChild(span);
    });

    const refs = document.createElement('div');
    refs.className = 'idea-refs';
    (item.references||[]).forEach(r => {
      const a = document.createElement('a');
      a.href = r.url; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = r.text || r.url;
      refs.appendChild(a);
    });

    card.appendChild(type);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(stmt);
    card.appendChild(intui);
    if ((item.tags||[]).length) card.appendChild(tags);
    if ((item.references||[]).length) card.appendChild(refs);

    host.appendChild(card);
  }

  function renderList(ideas){
    const host = byId('ideas-list');
    if (!host) return;
    host.innerHTML = '';

    ideas.forEach(item => {
      const card = document.createElement('div');
      card.className = 'idea-card';

      const head = document.createElement('div');
      head.className = 'idea-card-head';
      const type = document.createElement('span');
      type.className = 'idea-type small';
      type.textContent = item.type === 'theorem' ? '定理' : '算法';
      const title = document.createElement('h4');
      title.className = 'idea-title small';
      title.textContent = item.title;
      head.appendChild(type);
      head.appendChild(title);

      const stmt = document.createElement('p');
      stmt.className = 'idea-statement small';
      stmt.textContent = item.statement || '';

      const tags = document.createElement('div');
      tags.className = 'idea-tags';
      (item.tags||[]).slice(0,3).forEach(t => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = t;
        tags.appendChild(span);
      });

      card.appendChild(head);
      card.appendChild(stmt);
      if ((item.tags||[]).length) card.appendChild(tags);

      host.appendChild(card);
    });
  }

  async function init(){
    if (!isIdeasPage()) return;
    const ideas = (window.IDEAS_DATA || []).slice();
    if (!ideas.length) return;

    // 优先使用 Actions 生成的每日 JSON；失败则回退静态算法
    let daily = await tryLoadDailyFromJson();
    if (!daily) daily = pickDaily(ideas);
    renderDailyCard(daily);
    renderList(ideas);

    const btn = byId('ideas-next-btn');
    on(btn, 'click', ()=>{
      daily = nextOfSameType(ideas, daily);
      renderDailyCard(daily);
    });
  }

  // 首次加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // PJAX 切换
  document.addEventListener('pjax:success', init);
})();
