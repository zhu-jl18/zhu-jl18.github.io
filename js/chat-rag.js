/* Client-side RAG chat for Hexo
 - Lazy-loads a prebuilt index at /rag/index.json
 - Simple floating chat button (bottom-right) opens a drawer
 - Retrieves top-k chunks via cosine similarity
 - Uses OpenAI-compatible APIs for embeddings & chat
 - No persistence: session exists only in memory
*/

(function(){
  const CFG_KEY = 'chatcfg.v1';
  const INDEX_URL = '/rag/index.json';
  const STATE = { index:null, dim:0, busy:false, messages:[] };

  function loadCfg(){
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || { base:'https://openai-compatible-api-proxy-for-z-myg0.onrender.com', embedModel:'text-embedding-3-small', chatModel:'GLM-4.5', apiKey:'', embedKey:'' }; } catch(e){ return { base:'https://openai-compatible-api-proxy-for-z-myg0.onrender.com', embedModel:'text-embedding-3-small', chatModel:'GLM-4.5', apiKey:'', embedKey:'' }; }
  }
  function saveCfg(cfg){ localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }

  // Optional: override embedding endpoint (non-OpenAI path)
  function getEmbeddingEndpoint(base){
    const cfg = loadCfg();
    // If user set a full endpoint in embed field like 'FULL_ENDPOINT::MODEL', split
    if (cfg.embedModel && cfg.embedModel.includes('::')){
      const [endpoint, model] = cfg.embedModel.split('::');
      return { url: endpoint, model };
    }
    return { url: new URL('/v1/embeddings', base).toString(), model: cfg.embedModel };
  }

  function ensureUI(){
    if (document.querySelector('#chat-floating-btn')) return;
    const btn = document.createElement('div');
    btn.id = 'chat-floating-btn';
    btn.className = 'chat-floating-btn';
    btn.innerHTML = '<i class="fa fa-comments"></i>';
    btn.addEventListener('click', toggleDrawer);
    document.body.appendChild(btn);

    const drawer = document.createElement('div');
    drawer.id = 'chat-drawer';
    drawer.className = 'chat-drawer';
    drawer.innerHTML = `
      <div class="chat-header">
        <span>Chat (博客内知识库)</span>
        <div class="chat-actions">
          <button class="chat-config-btn" title="设置"><i class="fa fa-gear"></i></button>
          <button class="chat-close-btn" title="关闭">×</button>
        </div>
      </div>
      <div class="chat-body"><div class="chat-welcome">开始提问吧：我会基于本站文章来回答，并附引用哦。</div></div>
      <div class="chat-input">
        <input type="text" placeholder="问点什么...（回车发送）" />
        <button class="send">发送</button>
      </div>
      <div class="chat-config hidden">
        <label>API Base <input type="text" name="base" placeholder="https://openai-compatible-api-proxy-for-z-myg0.onrender.com"></label>
        <label>Chat API Key <input type="password" name="key" placeholder="对话 Key（仅本机）"></label>
        <label>Embed Endpoint or Model <input type="text" name="embed" placeholder="FULL_ENDPOINT::MODEL 或 text-embedding-3-small"></label>
        <label>Embed API Key <input type="password" name="embedkey" placeholder="嵌入 Key（仅本机）"></label>
        <label>Chat Model <input type="text" name="chat" placeholder="GLM-4.5"></label>
        <button class="save">保存</button>
      </div>`;
    document.body.appendChild(drawer);

    drawer.querySelector('.chat-close-btn').addEventListener('click', toggleDrawer);
    drawer.querySelector('.chat-config-btn').addEventListener('click', () => {
      drawer.querySelector('.chat-config').classList.toggle('hidden');
    });
    drawer.querySelector('.chat-input .send').addEventListener('click', onSend);
    drawer.querySelector('.chat-input input').addEventListener('keydown', (e)=>{ if(e.key==='Enter') onSend(); });

    // init config form
    const cfg = loadCfg();
    const form = drawer.querySelector('.chat-config');
    form.querySelector('[name=base]').value = cfg.base;
    form.querySelector('[name=key]').value = cfg.apiKey;
    form.querySelector('[name=embed]').value = cfg.embedModel;
    const embedKeyInput = form.querySelector('[name=embedkey]'); if (embedKeyInput) embedKeyInput.value = cfg.embedKey || '';
    form.querySelector('[name=chat]').value = cfg.chatModel;
    form.querySelector('.save').addEventListener('click', ()=>{
      const next = {
        base: form.querySelector('[name=base]').value.trim() || 'https://openai-compatible-api-proxy-for-z-myg0.onrender.com',
        apiKey: form.querySelector('[name=key]').value.trim(),
        embedModel: form.querySelector('[name=embed]').value.trim() || 'text-embedding-3-small',
        embedKey: (form.querySelector('[name=embedkey]')?.value || '').trim(),
        chatModel: form.querySelector('[name=chat]').value.trim() || 'GLM-4.5'
      };
      saveCfg(next);
      alert('已保存（仅存于本机）');
    });
  }

  function toggleDrawer(){
    document.querySelector('#chat-drawer').classList.toggle('open');
  }

  async function ensureIndex(){
    if (STATE.index) return STATE.index;
    const res = await fetch(INDEX_URL, { cache:'no-store' });
    if (!res.ok) throw new Error(`索引加载失败: [${res.status}] ${INDEX_URL}`);
    const data = await res.json();
    STATE.index = data.items;
    STATE.dim = data.dim;
    return STATE.index;
  }

  async function embed(text){
    const cfg = loadCfg();
    if (!cfg.embedKey && !cfg.apiKey) throw new Error('请在设置中填入嵌入或通用 API Key');
    const { url, model } = getEmbeddingEndpoint(cfg.base);
    const resp = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${cfg.embedKey || cfg.apiKey}` },
      body: JSON.stringify({ model, input: text })
    });
    if (!resp.ok) throw new Error('嵌入失败：' + await resp.text());
    const json = await resp.json();
    return json.data[0].embedding;
  }

  function cosine(a,b){
    let dot=0,na=0,nb=0; for(let i=0;i<a.length;i++){ const x=a[i], y=b[i]; dot+=x*y; na+=x*x; nb+=y*y; } return dot/ (Math.sqrt(na)*Math.sqrt(nb)+1e-8);
  }

  function pickTopK(queryVec, k){
    const scores = STATE.index.map((it, i)=>({ i, score: cosine(queryVec, it.vector) }));
    scores.sort((x,y)=>y.score-x.score);
    // 合并相邻块（简单策略）
    const seen = new Set();
    const out = [];
    for (const s of scores){
      const it = STATE.index[s.i];
      if (seen.has(it.postId)) continue;
      out.push({ ...it, score:s.score });
      seen.add(it.postId);
      if (out.length>=k) break;
    }
    return out;
  }

  async function onSend(){
    const drawer = document.querySelector('#chat-drawer');
    const input = drawer.querySelector('.chat-input input');
    const q = input.value.trim();
    if (!q || STATE.busy) return;
    input.value='';
    const body = drawer.querySelector('.chat-body');
    body.insertAdjacentHTML('beforeend', `<div class="msg user">${escapeHtml(q)}</div>`);

    try{
      STATE.busy = true;
      await ensureIndex();
      const qv = await embed(q);
      const ctx = pickTopK(qv, 6);
      const contextText = ctx.map((c,i)=>`[${i+1}] ${c.title} — ${c.url}\n${c.text}`).join('\n\n');
      const sys = '你是本博客的智能助手。只能使用提供的上下文回答；若上下文没有就说不确定。回答最后列出引用的 [编号] 与链接。';
      const prompt = `上下文如下:\n\n${contextText}\n\n问题:${q}\n请用中文简洁回答。`;
      const ans = await chatComplete(sys, prompt);
      const cites = ctx.map((c,i)=>`[${i+1}] <a href="${c.url}">${escapeHtml(c.title)}</a>`).join(' ');
      body.insertAdjacentHTML('beforeend', `<div class="msg bot">${ans}<div class="cites">${cites}</div></div>`);
      body.scrollTop = body.scrollHeight;
    }catch(e){
      console.error(e);
      body.insertAdjacentHTML('beforeend', `<div class="msg err">${escapeHtml(e.message||String(e))}</div>`);
    }finally{ STATE.busy = false; }
  }

  async function chatComplete(system, user){
    const cfg = loadCfg();
    if (!cfg.apiKey) throw new Error('请在设置中填入 API Key');
    const url = new URL('/v1/chat/completions', cfg.base).toString();
    const resp = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.chatModel,
        messages:[{role:'system', content: system},{role:'user', content: user}],
        temperature: 0.2,
        stream: false  // 强制非流式响应
      })
    });
    if (!resp.ok) throw new Error('对话失败：' + await resp.text());
    const data = await resp.json();
    return escapeHtml(data.choices?.[0]?.message?.content || '');
  }

  function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

  // Initialize after DOM ready
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ensureUI);
  else ensureUI();

})();

