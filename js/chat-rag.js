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
    try {
      return JSON.parse(localStorage.getItem(CFG_KEY)) || {
        // 聚合API配置
        useAggregatedAPI: true,
        aggregatedBase: 'https://ai-proxy.bhznjns.qzz.io',
        aggregatedKey: '',

        // 直连API配置
        chatBase: 'https://api.openai.com',
        chatKey: '',
        chatModel: 'deepseek-r1',

        embedBase: 'https://api.openai.com',
        embedKey: '',
        embedModel: 'text-embedding-3-small',

        // 其他设置
        streamResponse: true
      };
    } catch(e){
      return {
        useAggregatedAPI: true,
        aggregatedBase: 'https://ai-proxy.bhznjns.qzz.io',
        aggregatedKey: '',
        chatBase: 'https://api.openai.com',
        chatKey: '',
        chatModel: 'deepseek-r1',
        embedBase: 'https://api.openai.com',
        embedKey: '',
        embedModel: 'text-embedding-3-small',
        streamResponse: true
      };
    }
  }
  function saveCfg(cfg){ localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }

  function getEmbeddingConfig(){
    const cfg = loadCfg();

    if (cfg.useAggregatedAPI) {
      // 使用聚合API
      return {
        url: new URL('/v1/embeddings', cfg.aggregatedBase).toString(),
        model: cfg.embedModel,
        apiKey: cfg.aggregatedKey
      };
    } else {
      // 使用直连API
      if (cfg.embedModel && cfg.embedModel.includes('::')){
        const [endpoint, model] = cfg.embedModel.split('::');
        return { url: endpoint, model, apiKey: cfg.embedKey };
      }
      return {
        url: new URL('/v1/embeddings', cfg.embedBase).toString(),
        model: cfg.embedModel,
        apiKey: cfg.embedKey
      };
    }
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
        <div class="config-section">
          <label><input type="checkbox" name="useAggregated" checked> 使用聚合API</label>
          <label>聚合API地址 <input type="text" name="aggregatedBase" placeholder="https://ai-proxy.bhznjns.qzz.io"></label>
          <label>聚合API Key <input type="password" name="aggregatedKey" placeholder="聚合API密钥"></label>
        </div>
        <div class="config-section">
          <label>对话模型 <input type="text" name="chatModel" placeholder="deepseek-r1"></label>
          <label>嵌入模型 <input type="text" name="embedModel" placeholder="text-embedding-3-small"></label>
          <label><input type="checkbox" name="streamResponse" checked> 流式响应</label>
        </div>
        <div class="config-section">
          <small>高级选项（直连API）</small>
          <label>对话API <input type="text" name="chatBase" placeholder="https://api.openai.com"></label>
          <label>对话Key <input type="password" name="chatKey" placeholder="对话API密钥"></label>
          <label>嵌入API <input type="text" name="embedBase" placeholder="https://api.openai.com"></label>
          <label>嵌入Key <input type="password" name="embedKey" placeholder="嵌入API密钥"></label>
        </div>
        <button class="save">保存配置</button>
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

    // 填充表单
    form.querySelector('[name=useAggregated]').checked = cfg.useAggregatedAPI;
    form.querySelector('[name=aggregatedBase]').value = cfg.aggregatedBase;
    form.querySelector('[name=aggregatedKey]').value = cfg.aggregatedKey;
    form.querySelector('[name=chatModel]').value = cfg.chatModel;
    form.querySelector('[name=embedModel]').value = cfg.embedModel;
    form.querySelector('[name=streamResponse]').checked = cfg.streamResponse;
    form.querySelector('[name=chatBase]').value = cfg.chatBase;
    form.querySelector('[name=chatKey]').value = cfg.chatKey;
    form.querySelector('[name=embedBase]').value = cfg.embedBase;
    form.querySelector('[name=embedKey]').value = cfg.embedKey;

    form.querySelector('.save').addEventListener('click', ()=>{
      const next = {
        useAggregatedAPI: form.querySelector('[name=useAggregated]').checked,
        aggregatedBase: form.querySelector('[name=aggregatedBase]').value.trim() || 'https://ai-proxy.bhznjns.qzz.io',
        aggregatedKey: form.querySelector('[name=aggregatedKey]').value.trim(),
        chatModel: form.querySelector('[name=chatModel]').value.trim() || 'deepseek-r1',
        embedModel: form.querySelector('[name=embedModel]').value.trim() || 'text-embedding-3-small',
        streamResponse: form.querySelector('[name=streamResponse]').checked,
        chatBase: form.querySelector('[name=chatBase]').value.trim() || 'https://api.openai.com',
        chatKey: form.querySelector('[name=chatKey]').value.trim(),
        embedBase: form.querySelector('[name=embedBase]').value.trim() || 'https://api.openai.com',
        embedKey: form.querySelector('[name=embedKey]').value.trim()
      };
      saveCfg(next);
      alert('配置已保存（仅存于本机）');
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
    const embedCfg = getEmbeddingConfig();

    if (!embedCfg.apiKey) {
      throw new Error('请在设置中填入API Key');
    }

    const resp = await fetch(embedCfg.url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${embedCfg.apiKey}` },
      body: JSON.stringify({ model: embedCfg.model, input: text })
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
    const sendBtn = drawer.querySelector('.chat-input button');
    const q = input.value.trim();

    if (!q || STATE.busy) return;

    // 禁用输入和按钮
    STATE.busy = true;
    input.disabled = true;
    sendBtn.disabled = true;
    input.value = '';

    const body = drawer.querySelector('.chat-body');
    body.insertAdjacentHTML('beforeend', `<div class="msg user">${escapeHtml(q)}</div>`);

    // 添加加载消息
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'msg loading';
    loadingMsg.innerHTML = '正在思考...';
    body.appendChild(loadingMsg);
    body.scrollTop = body.scrollHeight;

    try{
      await ensureIndex();
      const qv = await embed(q);
      const ctx = pickTopK(qv, 6);
      const contextText = ctx.map((c,i)=>`[${i+1}] ${c.title} — ${c.url}\n${c.text}`).join('\n\n');
      const sys = '你是本博客的智能助手。请用Markdown格式回答，包括适当的标题、段落、列表等。回答要简洁明了，分段清晰。对于技术概念，先给出标准定义，再结合博客内容补充。若上下文无相关信息就说不确定。';
      const prompt = `上下文:\n${contextText}\n\n问题: ${q}\n\n请用Markdown格式直接回答，适当分段，不要说"根据上下文"等过程描述。`;

      // 移除加载消息
      loadingMsg.remove();

      // 创建回答消息容器
      const answerMsg = document.createElement('div');
      answerMsg.className = 'msg bot';
      const answerContent = document.createElement('div');
      answerContent.className = 'answer-content';
      answerMsg.appendChild(answerContent);
      body.appendChild(answerMsg);

      const cfg = loadCfg();
      let fullAnswer = '';

      if (cfg.streamResponse) {
        // 流式响应
        fullAnswer = await chatComplete(sys, prompt, (chunk) => {
          fullAnswer += chunk;
          answerContent.innerHTML = simpleMarkdownToHtml(fullAnswer);
          body.scrollTop = body.scrollHeight;
        });
      } else {
        // 非流式响应
        fullAnswer = await chatComplete(sys, prompt);
        answerContent.innerHTML = simpleMarkdownToHtml(fullAnswer);
      }

      // 添加引用
      const cites = ctx.map((c,i)=>`[${i+1}] <a href="${c.url}">${escapeHtml(c.title)}</a>`).join(' ');
      const citesDiv = document.createElement('div');
      citesDiv.className = 'cites';
      citesDiv.innerHTML = cites;
      answerMsg.appendChild(citesDiv);

      body.scrollTop = body.scrollHeight;
    }catch(e){
      console.error(e);
      loadingMsg.remove();
      body.insertAdjacentHTML('beforeend', `<div class="msg err">${escapeHtml(e.message||String(e))}</div>`);
    }finally{
      STATE.busy = false;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  async function chatComplete(system, user, onChunk = null){
    const cfg = loadCfg();

    // 确定使用哪个API配置
    let apiUrl, apiKey;
    if (cfg.useAggregatedAPI) {
      if (!cfg.aggregatedKey) throw new Error('请在设置中填入聚合API Key');
      apiUrl = new URL('/v1/chat/completions', cfg.aggregatedBase).toString();
      apiKey = cfg.aggregatedKey;
    } else {
      if (!cfg.chatKey) throw new Error('请在设置中填入对话API Key');
      apiUrl = new URL('/v1/chat/completions', cfg.chatBase).toString();
      apiKey = cfg.chatKey;
    }

    const useStream = cfg.streamResponse && onChunk;

    const resp = await fetch(apiUrl, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${apiKey}` },
      body: JSON.stringify({
        model: cfg.chatModel,
        messages:[{role:'system', content: system},{role:'user', content: user}],
        temperature: 0.2,
        stream: useStream
      })
    });

    if (!resp.ok) throw new Error('对话失败：' + await resp.text());

    if (useStream) {
      return await handleStreamResponse(resp, onChunk);
    } else {
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || '';
    }
  }

  async function handleStreamResponse(response, onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return fullContent;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

  function simpleMarkdownToHtml(md) {
    if (!md) return '';

    // 简单的Markdown转HTML，避免复杂的正则表达式
    let html = escapeHtml(md);

    // 标题
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // 粗体和斜体
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 简单的段落处理：双换行分段
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // 包装段落
    if (html && !html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol')) {
      html = '<p>' + html + '</p>';
    }

    // 清理空段落
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><br><\/p>/g, '');

    return html;
  }

  // Initialize after DOM ready
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ensureUI);
  else ensureUI();

})();

