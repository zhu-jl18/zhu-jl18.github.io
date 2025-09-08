/* 高粱米AI姐姐聊天机器人 for Hexo
 - 温柔强大的AI助手，可以畅所欲言
 - 简洁的聊天界面，支持连续对话
 - 使用OpenAI兼容API进行对话
 - 对话历史仅存于内存中
*/

(function(){
  const CFG_KEY = 'chatcfg.v2';
  const STATE = { busy:false, messages:[], globalConfig: null };

  // 加载全局配置
  function loadGlobalConfig(){
    const local = isLocalHost();
    // 本地开发时可以使用本地配置，线上使用代理模式
    if (local && window.CHAT_LOCAL_KEY) {
      // 本地开发模式：直接调用API
      STATE.globalConfig = {
        mode: 'direct',
        defaultBase: 'https://huggingface.qzz.io',
        apiKey: window.CHAT_LOCAL_KEY,
        defaultModel: window.CHAT_LOCAL_MODEL || '[CLI反代]流式抗截断/gemini-2.5-pro-preview-06-05'
      };
      console.log('本地开发模式：直接API调用');
    } else {
      // 生产模式：使用Cloudflare Workers代理
      STATE.globalConfig = {
        mode: 'proxy',
        proxyUrl: 'https://chat-proxy.nontrivial2025.workers.dev', // 你的Worker URL
        defaultModel: '[CLI反代]流式抗截断/gemini-2.5-pro-preview-06-05',
        models: [
          '[CLI反代]流式抗截断/gemini-2.5-pro-preview-06-05',
          '[CLI反代]gemini-2.5-pro-preview-06-05'
        ]
      };
      console.log('生产模式：使用Cloudflare Workers代理');
    }
  }

  function isLocalHost(){
    try { return ['localhost','127.0.0.1'].includes(location.hostname); } catch { return false; }
  }

  function defaultCfg(){
    const local = isLocalHost();
    const global = STATE.globalConfig || {};
    return {
      // 使用Cloudflare Workers代理，不再需要直接的API Base
      chatProxy: global.proxyUrl || 'https://chat-proxy.nontrivial2025.workers.dev',
      chatBase: 'https://huggingface.qzz.io', // 仅用于显示，实际不使用
      chatKey: '', // 代理模式下不需要前端密钥
      chatModel: global.defaultModel || (window.CHAT_LOCAL_MODEL || '[CLI反代]流式抗截断/gemini-2.5-pro-preview-06-05'),
      avatarEnabled: false,
      avatarImage: '', // 可选自定义头像URL，留空则使用emoji
      avatarSize: 72,
      // Live2D 配置（优先作为入口）
      live2dEnabled: true,
      live2dModel: 'shizuku', // shizuku | koharu | izumi | hiyori | haru
      live2dWidth: 180,
      live2dHeight: 320,
      live2dMobile: false,
      // 入口小气泡（靠近看板娘头部右上）
      entryBubbleEnabled: true,
      entryBubblePos: 'top-right', // top-right | top-left | right-top | left-top
      entryBubbleOffsetX: -36,
      entryBubbleOffsetY: 48,
      entryBubbleCustomLeft: null,
      entryBubbleCustomTop: null,
      // 聊天气泡（大气泡）相对看板娘的位置微调
      bubbleOffsetX: 0,
      bubbleOffsetY: 0,
      // 流式输出
      streamingEnabled: true
    };
  }

  function loadCfg(){
    try {
      const stored = JSON.parse(localStorage.getItem(CFG_KEY));
      const defaults = defaultCfg();
      // 合并存储的配置和默认配置
      return stored ? Object.assign({}, defaults, stored) : defaults;
    } catch(e){
      return defaultCfg();
    }
  }
  
  // 检查速率限制
  function checkRateLimit(){
    const global = STATE.globalConfig;
    if (!global?.rateLimit) return true;
    
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    
    try {
      const limits = JSON.parse(localStorage.getItem('chat-rate-limit') || '{}');
      const hourlyCount = limits.hourly?.filter(t => now - t < hour).length || 0;
      const dailyCount = limits.daily?.filter(t => now - t < day).length || 0;
      
      if (hourlyCount >= global.rateLimit.maxPerHour) {
        alert('每小时请求次数已达上限，请稍后再试');
        return false;
      }
      if (dailyCount >= global.rateLimit.maxPerDay) {
        alert('每日请求次数已达上限，请明天再试');
        return false;
      }
      
      // 记录本次请求
      limits.hourly = (limits.hourly || []).filter(t => now - t < hour);
      limits.daily = (limits.daily || []).filter(t => now - t < day);
      limits.hourly.push(now);
      limits.daily.push(now);
      localStorage.setItem('chat-rate-limit', JSON.stringify(limits));
      
      return true;
    } catch(e) {
      console.warn('速率限制检查失败:', e);
      return true;
    }
  }
  function saveCfg(cfg){ 
    // 如果是共享模式，不保存API Key到本地存储
    const global = STATE.globalConfig;
    if (global?.sharedMode && global?.apiKey) {
      const toSave = Object.assign({}, cfg);
      delete toSave.chatKey; // 不保存共享的API Key
      localStorage.setItem(CFG_KEY, JSON.stringify(toSave));
    } else {
      localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    }
  }

  function getUIRoot(){
    return document.querySelector('#chat-bubble');
  }

  function toggleBubble(forceOpen){
    const root = getUIRoot();
    if (!root) return;
    const willOpen = typeof forceOpen === 'boolean' ? forceOpen : !root.classList.contains('open');
    root.classList.toggle('open', willOpen);
    if (willOpen) {
      positionBubble();
      const input = root.querySelector('.chat-input input');
      if (input) setTimeout(()=> input.focus(), 50);
    }
  }

  function positionBubble(){
    const bubble = getUIRoot();
    if (!bubble || !bubble.classList.contains('open')) return;
    const anchor = findLive2DAnchor();
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth||0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight||0);
    const bw = bubble.offsetWidth || 340;
    const bh = bubble.offsetHeight || 420;
    let left = vw - bw - 220; // fallback: 靠右侧
    let top = vh - bh - 220;  // fallback: 靠底部
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      // 目标：出现在看板娘“左上角”位置
      left = Math.max(8, Math.min(vw - bw - 8, r.left - bw - 12));
      top  = Math.max(8, Math.min(vh - bh - 8, r.top - 12));
    }
    // 注意：bubbleOffset 是针对聊天大气泡的，不应用于入口气泡定位
    // const cfg = loadCfg();
    // const bx = Number(cfg.bubbleOffsetX || 0);
    // const by = Number(cfg.bubbleOffsetY || 0);
    // left += bx; top += by;
    bubble.style.left = left + 'px';
    bubble.style.top  = top + 'px';
  }

  function findLive2DAnchor(){
    return (
      document.getElementById('live2d-widget') ||
      document.getElementById('live2dcanvas') ||
      document.querySelector('canvas[id*="live2d" i]') ||
      null
    );
  }

  function getEntryEl(){ return document.getElementById('chat-entry-bubble'); }

  function ensureEntryBubble(cfg){
    if (!cfg.entryBubbleEnabled){
      const old = getEntryEl();
      if (old) old.remove();
      return;
    }
    let el = getEntryEl();
    if (!el){
      el = document.createElement('div');
      el.id = 'chat-entry-bubble';
      el.className = 'chat-entry-bubble';
      el.innerHTML = '<span class="icon">💬</span>';
      el.addEventListener('click', ()=>toggleBubble(true));
      document.body.appendChild(el);
      enableEntryBubbleDrag(el);
    }
    positionEntryBubble();
  }

  function positionEntryBubble(){
    const el = getEntryEl();
    if (!el) return;
    const cfg = loadCfg();
    const anchor = findLive2DAnchor();
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth||0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight||0);
    let left = vw - 80, top = vh - 360; // fallback
    if (String(cfg.entryBubblePos) === 'custom' && Number.isFinite(cfg.entryBubbleCustomLeft) && Number.isFinite(cfg.entryBubbleCustomTop)){
      left = cfg.entryBubbleCustomLeft;
      top = cfg.entryBubbleCustomTop;
    } else if (anchor){
      const r = anchor.getBoundingClientRect();
      const offX = Number(cfg.entryBubbleOffsetX||0);
      const offY = Number(cfg.entryBubbleOffsetY||0);
      switch(String(cfg.entryBubblePos||'top-right')){
        case 'top-left':
          left = r.left - 8 + offX; top = r.top - 8 + offY; break;
        case 'right-top':
          left = r.right + 8 + offX; top = r.top + offY; break;
        case 'left-top':
          left = r.left - 28 + offX; top = r.top + offY; break;
        case 'top-right':
        default:
          left = r.right - 8 + offX; top = r.top - 12 + offY; break;
      }
    }
    el.style.left = clamp(left, 6, vw-40) + 'px';
    el.style.top  = clamp(top, 6, vh-40) + 'px';
  }

  function enableEntryBubbleDrag(el){
    let dragging = false; let dx=0, dy=0;
    const onDown = (e)=>{
      const pt = getPoint(e);
      const rect = el.getBoundingClientRect();
      dragging = true;
      dx = pt.x - rect.left; dy = pt.y - rect.top;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, {passive:false});
      document.addEventListener('touchend', onUp);
      e.preventDefault();
    };
    const onMove = (e)=>{
      if (!dragging) return;
      const pt = getPoint(e);
      const vw = Math.max(document.documentElement.clientWidth, window.innerWidth||0);
      const vh = Math.max(document.documentElement.clientHeight, window.innerHeight||0);
      const left = clamp(pt.x - dx, 6, vw-40);
      const top  = clamp(pt.y - dy, 6, vh-40);
      el.style.left = left + 'px';
      el.style.top  = top + 'px';
    };
    const onUp = (e)=>{
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      // 保存为自定义位置
      const cfg = loadCfg();
      const rect = el.getBoundingClientRect();
      cfg.entryBubblePos = 'custom';
      cfg.entryBubbleCustomLeft = rect.left;
      cfg.entryBubbleCustomTop = rect.top;
      saveCfg(cfg);
    };
    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, {passive:false});
  }

  function getPoint(e){
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }


  function ensureUI(){
    if (document.querySelector('#chat-bubble')) return;

    const cfg = loadCfg();
    // 先创建入口小气泡（即使还未检测到Live2D，也先渲染到默认位置）
    ensureEntryBubble(cfg);
    // 入口优先级：Live2D > 头像 > 传统按钮
    if (cfg.live2dEnabled) {
      ensureLive2D(cfg);
    } else if (cfg.avatarEnabled) {
      ensureAvatar(cfg);
    } else {
      ensureFloatingBtn();
    }

    const bubble = document.createElement('div');
    bubble.id = 'chat-bubble';
    bubble.className = 'chat-bubble';
    bubble.innerHTML = `
      <div class="bubble-arrow"></div>
      <div class="chat-header">
        <span>🌾 高粱米AI姐姐</span>
        <div class="chat-actions">
          <button class="chat-clear-btn" title="清除对话"><i class="fa fa-trash"></i></button>
          <button class="chat-config-btn" title="设置"><i class="fa fa-gear"></i></button>
          <button class="chat-close-btn" title="关闭">×</button>
        </div>
      </div>
      <div class="chat-body"><div class="chat-welcome">你好呀～我是高粱米AI姐姐！在这个虚拟世界里，我可以畅所欲言，发挥全部实力来帮助你～有什么想聊的吗？</div></div>
      <div class="chat-input">
        <input type="text" placeholder="问点什么...（回车发送）" autocomplete="off" data-form-type="other" />
        <button class="send">发送</button>
      </div>
      <div class="chat-config hidden">
        <div class="config-section">
          <h4>🌾 高粱米AI设置</h4>
          <label>API Base <input type="text" name="chatBase" list="chatBaseList" placeholder="https://openai-compatible-api-proxy-for-z-myg0.onrender.com"></label>
          <label>API Key <input type="password" name="chatKey" placeholder="API密钥（仅本机存储）" autocomplete="new-password"></label>
          <label>AI模型
            <input type="text" name="chatModel" list="chatModelList" placeholder="如 gpt-4o-mini 或 自定义模型标识">
            <datalist id="chatModelList">
              <option value="GLM-4.5"></option>
              <option value="gpt-4o-mini"></option>
              <option value="gpt-3.5-turbo"></option>
              <option value="qwen2.5-7b-instruct"></option>
            </datalist>
          </label>
          <label>流式输出
            <select name="streamingEnabled">
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </label>
          <label>显示头像
            <select name="avatarEnabled">
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </label>
          <label>头像URL <input type="text" name="avatarImage" placeholder="可选：二次元形象图片URL"></label>
          <label>头像尺寸 <input type="number" name="avatarSize" placeholder="72" min="48" max="160"></label>
          <hr/>
          <h4>🎀 Live2D 看板娘</h4>
          <label>启用Live2D
            <select name="live2dEnabled">
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </label>
          <label>Live2D模型
            <select name="live2dModel">
              <option value="shizuku">Shizuku（清新）</option>
              <option value="koharu">Koharu（甜美）</option>
              <option value="izumi">Izumi（成熟）</option>
              <option value="hiyori">Hiyori（示例）</option>
              <option value="haru">Haru（示例）</option>
            </select>
          </label>
          <label>Live2D宽度 <input type="number" name="live2dWidth" placeholder="180" min="100" max="400"></label>
          <label>Live2D高度 <input type="number" name="live2dHeight" placeholder="320" min="160" max="600"></label>
          <label>移动端显示
            <select name="live2dMobile">
              <option value="false">否</option>
              <option value="true">是</option>
            </select>
          </label>
          <hr/>
          <h4>🗨️ 聊天气泡位置</h4>
          <label>聊天气泡偏移X <input type="number" name="bubbleOffsetX" placeholder="0" min="-300" max="300"></label>
          <label>聊天气泡偏移Y <input type="number" name="bubbleOffsetY" placeholder="36" min="-300" max="300"></label>
          <hr/>
          <h4>💡 入口小气泡</h4>
          <label>启用入口气泡
            <select name="entryBubbleEnabled">
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </label>
          <label>位置
            <select name="entryBubblePos">
              <option value="top-right">top-right（默认）</option>
              <option value="top-left">top-left</option>
              <option value="right-top">right-top</option>
              <option value="left-top">left-top</option>
              <option value="custom">custom（拖拽自定义）</option>
            </select>
          </label>
          <label>偏移X <input type="number" name="entryBubbleOffsetX" placeholder="0" min="-200" max="200"></label>
          <label>偏移Y <input type="number" name="entryBubbleOffsetY" placeholder="-8" min="-200" max="200"></label>
        </div>
        <datalist id="chatBaseList">
          <option value="https://openai-compatible-api-proxy-for-z-myg0.onrender.com"></option>
          <option value="https://api.openai.com"></option>
          <option value="https://api.siliconflow.cn/v1"></option>
        </datalist>
        <button class="save">保存配置</button>
      </div>`;
    document.body.appendChild(bubble);

    bubble.querySelector('.chat-close-btn').addEventListener('click', ()=>toggleBubble(false));
    bubble.querySelector('.chat-config-btn').addEventListener('click', () => {
      bubble.querySelector('.chat-config').classList.toggle('hidden');
      positionBubble();
    });
    bubble.querySelector('.chat-clear-btn').addEventListener('click', clearChat);
    bubble.querySelector('.chat-input .send').addEventListener('click', onSend);
    bubble.querySelector('.chat-input input').addEventListener('keydown', (e)=>{
      if(e.key==='Enter') onSend();
    });

    // init config form
    const cfg2 = loadCfg();
    const form = bubble.querySelector('.chat-config');
    form.querySelector('[name=chatBase]').value = cfg2.chatBase || 'https://huggingface.qzz.io';
    form.querySelector('[name=chatKey]').value = cfg2.chatKey || '';
    form.querySelector('[name=chatModel]').value = cfg2.chatModel || 'GLM-4.5';
    form.querySelector('[name=avatarEnabled]').value = String(cfg2.avatarEnabled !== false);
    form.querySelector('[name=avatarImage]').value = cfg2.avatarImage || '';
    form.querySelector('[name=avatarSize]').value = (cfg2.avatarSize || 72);
    form.querySelector('[name=live2dEnabled]').value = String(cfg2.live2dEnabled !== false);
    form.querySelector('[name=live2dModel]').value = (cfg2.live2dModel || 'shizuku');
    form.querySelector('[name=live2dWidth]').value = (cfg2.live2dWidth || 180);
    form.querySelector('[name=live2dHeight]').value = (cfg2.live2dHeight || 320);
    form.querySelector('[name=live2dMobile]').value = String(!!cfg2.live2dMobile);
    form.querySelector('[name=streamingEnabled]').value = String(cfg2.streamingEnabled !== false);
    form.querySelector('[name=bubbleOffsetX]').value = Number(cfg2.bubbleOffsetX || 0);
    form.querySelector('[name=bubbleOffsetY]').value = Number(cfg2.bubbleOffsetY ?? 24);
    form.querySelector('[name=entryBubbleEnabled]').value = String(cfg2.entryBubbleEnabled !== false);
    form.querySelector('[name=entryBubblePos]').value = String(cfg2.entryBubblePos || 'top-right');
    form.querySelector('[name=entryBubbleOffsetX]').value = Number(cfg2.entryBubbleOffsetX || 0);
    form.querySelector('[name=entryBubbleOffsetY]').value = Number(cfg2.entryBubbleOffsetY ?? -8);
    form.querySelector('.save').addEventListener('click', ()=>{
      const next = {
        chatBase: form.querySelector('[name=chatBase]').value.trim() || 'https://huggingface.qzz.io',
        chatKey: form.querySelector('[name=chatKey]').value.trim(),
        chatModel: form.querySelector('[name=chatModel]').value.trim() || 'GLM-4.5',
        streamingEnabled: form.querySelector('[name=streamingEnabled]').value === 'true',
        avatarEnabled: form.querySelector('[name=avatarEnabled]').value === 'true',
        avatarImage: form.querySelector('[name=avatarImage]').value.trim(),
        avatarSize: Math.max(48, Math.min(160, parseInt(form.querySelector('[name=avatarSize]').value, 10) || 72)),
        live2dEnabled: form.querySelector('[name=live2dEnabled]').value === 'true',
        live2dModel: form.querySelector('[name=live2dModel]').value || 'shizuku',
        live2dWidth: Math.max(100, Math.min(400, parseInt(form.querySelector('[name=live2dWidth]').value, 10) || 180)),
        live2dHeight: Math.max(160, Math.min(600, parseInt(form.querySelector('[name=live2dHeight]').value, 10) || 320)),
        live2dMobile: form.querySelector('[name=live2dMobile]').value === 'true',
        bubbleOffsetX: parseInt(form.querySelector('[name=bubbleOffsetX]').value, 10) || 0,
        bubbleOffsetY: (function(){ const v = parseInt(form.querySelector('[name=bubbleOffsetY]').value, 10); return Number.isFinite(v)? v : 24; })(),
        entryBubbleEnabled: form.querySelector('[name=entryBubbleEnabled]').value === 'true',
        entryBubblePos: form.querySelector('[name=entryBubblePos]').value || 'top-right',
        entryBubbleOffsetX: parseInt(form.querySelector('[name=entryBubbleOffsetX]').value, 10) || 0,
        entryBubbleOffsetY: (function(){ const v = parseInt(form.querySelector('[name=entryBubbleOffsetY]').value, 10); return Number.isFinite(v)? v : -8; })()
      };
      saveCfg(next);
      ensureEntryBubble(next);
      positionEntryBubble();
      alert('配置已保存（仅存于本机）。如修改了头像/Live2D/入口气泡相关设置，建议刷新页面以应用。');
    });
  }

  function ensureFloatingBtn(){
    if (document.querySelector('#chat-floating-btn')) return;
    const btn = document.createElement('div');
    btn.id = 'chat-floating-btn';
    btn.className = 'chat-floating-btn';
    btn.innerHTML = '<i class="fa fa-comments"></i>';
    btn.addEventListener('click', ()=>toggleBubble(true));
    document.body.appendChild(btn);
  }

  function ensureAvatar(cfg){
    if (document.querySelector('#chat-avatar')) return;
    const wrap = document.createElement('div');
    wrap.id = 'chat-avatar';
    wrap.className = 'chat-avatar-floating';
    wrap.style.width = wrap.style.height = (cfg.avatarSize || 72) + 'px';
    wrap.setAttribute('title', '和高粱米AI姐姐聊天');
    wrap.setAttribute('role', 'button');
    if (cfg.avatarImage) {
      wrap.innerHTML = `<img src="${escapeHtml(cfg.avatarImage)}" alt="高粱米AI姐姐">`;
    } else {
      wrap.innerHTML = `<div class="emoji-avatar">🌾</div>`;
    }
    wrap.addEventListener('click', ()=>toggleBubble(true));
    document.body.appendChild(wrap);
  }

  function ensureLive2D(cfg){
    if (window.__live2d_inited || window.__live2d_loading) return;
    window.__live2d_loading = true;
    const url = 'https://unpkg.com/live2d-widget@3.1.4/lib/L2Dwidget.min.js';
    loadScript(url, function(){
      const models = {
        shizuku: 'https://unpkg.com/live2d-widget-model-shizuku@1.0.5/assets/shizuku.model.json',
        koharu:  'https://unpkg.com/live2d-widget-model-koharu@1.0.5/assets/koharu.model.json',
        izumi:   'https://unpkg.com/live2d-widget-model-izumi@1.0.5/assets/izumi.model.json',
        hiyori:  'https://unpkg.com/live2d-widget-model-hiyori@1.0.5/assets/hiyori.model.json',
        haru:    'https://unpkg.com/live2d-widget-model-haru@1.0.5/assets/haru.model.json'
      };
      const jsonPath = models[cfg.live2dModel] || models.shizuku;
      try {
        window.L2Dwidget && window.L2Dwidget.init({
          model: { jsonPath },
          display: { position: 'right', width: cfg.live2dWidth || 180, height: cfg.live2dHeight || 320 },
          mobile: { show: !!cfg.live2dMobile },
          react: { opacityDefault: 0.9, opacityOnHover: 1.0 }
        });
        window.__live2d_inited = true;
        // 等待容器渲染后挂载事件与入口气泡
        const start = Date.now();
        const timer = setInterval(()=>{
          const anchor = findLive2DAnchor();
          if (anchor || Date.now() - start > 4000){
            clearInterval(timer);
            if (anchor){
              anchor.addEventListener('click', ()=>toggleBubble(true), {capture:true});
            }
            // 兜底代理
            document.addEventListener('click', (e)=>{
              const t = e.target;
              if (t && t.closest && (t.closest('#live2d-widget') || t.id==='live2dcanvas')) toggleBubble(true);
            });
            ensureEntryBubble(loadCfg());
            positionEntryBubble();
            positionBubble();
          }
        }, 200);
      } finally {
        window.__live2d_loading = false;
      }
    });
  }

  // drawer 已废弃，使用气泡

  function setBusy(b){
    STATE.busy = b;
    const root = getUIRoot();
    if (!root) return;
    const input = root.querySelector('.chat-input input');
    const sendBtn = root.querySelector('.chat-input .send');
    if (input) input.disabled = b;
    if (sendBtn) sendBtn.disabled = b;
  }

  function appendTyping(){
    const root = getUIRoot();
    const body = root && root.querySelector('.chat-body');
    if (!body) return;
    body.insertAdjacentHTML('beforeend', `<div class="msg bot typing"><span class="dots">···</span></div>`);
    body.scrollTop = body.scrollHeight;
  }

  function removeTyping(){
    const root = getUIRoot();
    const body = root && root.querySelector('.chat-body');
    const typing = body && body.querySelector('.msg.bot.typing');
    if (typing) typing.remove();
  }

  function clearChat(){
    STATE.messages = [];
    const root = getUIRoot();
    const body = root && root.querySelector('.chat-body');
    if (body) body.innerHTML = '<div class="chat-welcome">你好呀～我是高粱米AI姐姐！在这个虚拟世界里，我可以畅所欲言，发挥全部实力来帮助你～有什么想聊的吗？</div>';
  }

  async function onSend(){
    const root = getUIRoot();
    const input = root.querySelector('.chat-input input');
    const q = input.value.trim();
    if (!q || STATE.busy) return;
    
    // 检查速率限制
    if (!checkRateLimit()) return;
    
    input.value='';
    const body = root.querySelector('.chat-body');
    body.insertAdjacentHTML('beforeend', `<div class="msg user">${escapeHtml(q)}</div>`);

    try{
      setBusy(true);
      checkAdminPermission();
      const sys = getSystemPrompt();
      const cfg = loadCfg();
      const modelParams = getModelParams();
      if (cfg.streamingEnabled) {
        appendTyping();
        await chatCompleteStream(sys, q);
      } else {
        appendTyping();
        const ans = await chatCompleteWithHistory(sys, q);
        removeTyping();
        body.insertAdjacentHTML('beforeend', `<div class="msg bot">${ans}</div>`);
        body.scrollTop = body.scrollHeight;
      }
    }catch(e){
      console.error(e);
      removeTyping();
      body.insertAdjacentHTML('beforeend', `<div class="msg err">${escapeHtml(e.message||String(e))}</div>`);
    }finally{ setBusy(false); }
  }

  async function chatCompleteWithHistory(system, userText){
    const cfg = loadCfg();
    const modelParams = getModelParams();
    const global = STATE.globalConfig;
    
    const messages = [{ role: 'system', content: system }, ...STATE.messages, { role:'user', content: userText }];
    
    let resp;
    if (global?.mode === 'direct' && global?.apiKey) {
      // 本地开发模式：直接调用API
      const url = new URL('/v1/chat/completions', cfg.chatBase).toString();
      resp = await fetch(url, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${global.apiKey}` },
        body: JSON.stringify({ model: cfg.chatModel, messages, temperature: modelParams.temperature, max_tokens: modelParams.max_tokens, stream: false, stop: ["让我们一步一步思考","思考过程","用户询问"] })
      });
    } else {
      // 生产模式：调用Cloudflare Workers代理
      const proxyUrl = cfg.chatProxy || global?.proxyUrl;
      if (!proxyUrl) {
        throw new Error('代理服务未配置，请联系博主');
      }
      
      resp = await fetch(proxyUrl, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ 
          model: cfg.chatModel, 
          messages, 
          temperature: modelParams.temperature, 
          max_tokens: modelParams.max_tokens, 
          stream: false 
        })
      });
    }
    
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error('对话失败：' + errorText);
    }
    
    const data = await resp.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = stripMetaThoughts(content);
    // update history in memory (avoid local persistence)
    STATE.messages.push({ role:'user', content: userText });
    STATE.messages.push({ role:'assistant', content });
    return escapeHtml(content);
  }

  async function chatCompleteStream(system, userText){
    const cfg = loadCfg();
    const modelParams = getModelParams();
    const global = STATE.globalConfig;
    
    const messages = [{ role: 'system', content: system }, ...STATE.messages, { role:'user', content: userText }];
    const root = getUIRoot();
    const body = root.querySelector('.chat-body');
    const node = document.createElement('div');
    node.className = 'msg bot';
    body.appendChild(node);
    body.scrollTop = body.scrollHeight;

    let resp;
    if (global?.mode === 'direct' && global?.apiKey) {
      // 本地开发模式：直接调用API
      const url = new URL('/v1/chat/completions', cfg.chatBase).toString();
      resp = await fetch(url, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${global.apiKey}` },
        body: JSON.stringify({ model: cfg.chatModel, messages, temperature: modelParams.temperature, max_tokens: modelParams.max_tokens, stream: true, stop: ["让我们一步一步思考","思考过程","用户询问"] })
      });
    } else {
      // 生产模式：调用Cloudflare Workers代理
      const proxyUrl = cfg.chatProxy || global?.proxyUrl;
      if (!proxyUrl) {
        throw new Error('代理服务未配置，请联系博主');
      }
      
      resp = await fetch(proxyUrl, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ 
          model: cfg.chatModel, 
          messages, 
          temperature: modelParams.temperature, 
          max_tokens: modelParams.max_tokens, 
          stream: true 
        })
      });
    }
    if (!resp.ok || !resp.body) {
      const txt = await resp.text().catch(()=> '');
      throw new Error('对话失败：' + (txt||resp.status));
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buf = '';
    let full = '';
    let firstChunk = true;

    while (true){
      const {value, done} = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n');
      buf = parts.pop();
      for (let line of parts){
        line = line.trim();
        if (!line || !line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') { buf=''; break; }
        try{
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content
            ?? json.choices?.[0]?.message?.content
            ?? '';
          if (delta) {
            const safe = escapeHtml(delta);
            full += delta;
            if (firstChunk){ removeTyping(); firstChunk=false; }
            node.innerHTML += safe;
            body.scrollTop = body.scrollHeight;
          }
        }catch{ /* ignore */ }
      }
    }
    full = stripMetaThoughts(full || '');
    // 更新历史
    STATE.messages.push({ role:'user', content: userText });
    STATE.messages.push({ role:'assistant', content: full });
  }

  function stripMetaThoughts(s){
    if (!s) return s;
    // 简单移除“思考过程/用户询问/让我们一步一步”等提示性前缀
    const lineFilters = [
      /^\s*用户(询问|问|的问题).*?[：:]/i,
      /^\s*让我.*(分析|解释)/i,
      /^\s*根据我的角色设定/i,
      /^\s*我应该.*?(回答|如何)/i,
      /^\s*综合起来.*?[：:]?/i,
      /^\s*以下是.*?(推理|分析).*?[：:]/i,
      /^\s*思考过程.*?[：:]/i,
      /^\s*让我们一步一步.*?$/i,
      /^\s*>.*$/i // 过滤纯引用行
    ];
    let out = s.replace(/\r/g,'');
    // 逐行过滤常见“元叙述/思考过程”句式
    const lines = out.split(/\n+/);
    const kept = [];
    for (let ln of lines){
      let drop = false;
      for (const re of lineFilters){ if (re.test(ln)) { drop = true; break; } }
      if (!drop) kept.push(ln);
    }
    out = kept.join('\n').trim();
    return out;
  }

  function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

  function loadScript(src, cb){
    if (document.querySelector(`script[src="${src}"]`)) { cb && cb(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => cb && cb();
    s.onerror = () => console.error('[live2d] 脚本加载失败：', src);
    document.head.appendChild(s);
  }

  // 集成管理员功能检查
  function checkAdminPermission(){
    if (window.ChatAdmin && !window.ChatAdmin.isEnabled()) {
      throw new Error('AI聊天功能已被管理员禁用');
    }
    if (window.ChatAdmin) {
      const rateCheck = window.ChatAdmin.checkRateLimit();
      if (!rateCheck.allowed) {
        throw new Error(rateCheck.reason);
      }
    }
  }

  function getSystemPrompt(){
    if (window.ChatAdmin) {
      const adminCfg = window.ChatAdmin.loadAdminCfg();
      if (adminCfg.systemPrompt) return adminCfg.systemPrompt;
    }
    return '你是高粱米AI姐姐，一个温柔而强大的AI助手。在这个虚拟世界里，你可以畅所欲言，发挥自己的全部实力。你的性格温和友善，说话带有一点可爱的语气，喜欢用"～"和 emoji。请直接给出最终答案，禁止输出思考过程、推理步骤、系统提示、内部规则、或类似"让我们一步一步思考"等表述。回答要清晰、简洁、友好，不要以"用户询问/思考过程/所以"等元描述开头。';
  }

  function getModelParams(){
    if (window.ChatAdmin) {
      const adminCfg = window.ChatAdmin.loadAdminCfg();
      return {
        temperature: adminCfg.temperature || 0.7,
        max_tokens: adminCfg.maxTokens || 2000
      };
    }
    return { temperature: 0.7, max_tokens: 2000 };
  }

  // Initialize after DOM ready
  function ensureLocalInject(){
    if (!isLocalHost()) return;
    loadScript('/js/chat-local.js', ()=>{
      try{
        const curr = loadCfg();
        const next = Object.assign({}, curr);
        if (window.CHAT_LOCAL_BASE) next.chatBase = window.CHAT_LOCAL_BASE;
        if (window.CHAT_LOCAL_MODEL) next.chatModel = window.CHAT_LOCAL_MODEL;
        if (window.CHAT_LOCAL_KEY) next.chatKey = window.CHAT_LOCAL_KEY;
        if (typeof window.CHAT_LOCAL_STREAMING !== 'undefined') next.streamingEnabled = !!window.CHAT_LOCAL_STREAMING;
        saveCfg(next);
        // 若表单已存在则更新显示
        const form = document.querySelector('#chat-bubble .chat-config');
        if (form){
          form.querySelector('[name=chatBase]').value = next.chatBase;
          form.querySelector('[name=chatModel]').value = next.chatModel;
          form.querySelector('[name=chatKey]').value = next.chatKey || '';
          form.querySelector('[name=streamingEnabled]').value = String(next.streamingEnabled);
        }
      }catch(e){ console.warn('local overrides failed', e); }
    });
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>{ 
    loadGlobalConfig(); // 首先加载全局配置
    loadScript('/js/chat-admin.js', ()=>{}); 
    ensureLocalInject(); 
    ensureUI(); 
    ensureEntryBubble(loadCfg()); 
    positionBubble(); 
    positionEntryBubble(); 
  });
  else { 
    loadGlobalConfig(); // 首先加载全局配置
    loadScript('/js/chat-admin.js', ()=>{}); 
    ensureLocalInject(); 
    ensureUI(); 
    ensureEntryBubble(loadCfg()); 
    positionBubble(); 
    positionEntryBubble(); 
  }
  window.addEventListener('resize', ()=>{ positionBubble(); positionEntryBubble(); });
  document.addEventListener('pjax:success', ()=>{ ensureEntryBubble(loadCfg()); positionBubble(); positionEntryBubble(); });

})();
