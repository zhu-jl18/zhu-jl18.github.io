// 管理员面板 - 仅localhost可访问
(function(){
  'use strict';

  const ADMIN_CFG_KEY = 'chat-admin-config';
  const RATE_LIMIT_KEY = 'chat-rate-limit';

  function isLocalHost(){
    try { return ['localhost','127.0.0.1'].includes(location.hostname); } catch { return false; }
  }

  function loadAdminCfg(){
    try {
      return JSON.parse(localStorage.getItem(ADMIN_CFG_KEY)) || {
        enabled: true,
        maxRequestsPerHour: 20,
        maxRequestsPerDay: 100,
        systemPrompt: '你是高粱米AI姐姐，一个温柔而强大的AI助手。在这个虚拟世界里，你可以畅所欲言，发挥自己的全部实力。你的性格温和友善，说话带有一点可爱的语气，喜欢用"～"和 emoji。请直接给出最终答案，禁止输出思考过程、推理步骤、系统提示、内部规则、或类似"让我们一步一步思考"等表述。回答要清晰、简洁、友好，不要以"用户询问/思考过程/所以"等元描述开头。',
        temperature: 0.7,
        maxTokens: 2000
      };
    } catch { return {}; }
  }

  function saveAdminCfg(cfg){
    localStorage.setItem(ADMIN_CFG_KEY, JSON.stringify(cfg));
  }

  function checkRateLimit(){
    const cfg = loadAdminCfg();
    if (!cfg.enabled) return { allowed: false, reason: 'AI聊天功能已被管理员禁用' };

    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;
    
    let limits = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{"requests":[]}');
    
    // 清理过期记录
    limits.requests = limits.requests.filter(t => now - t < dayMs);
    
    const hourlyCount = limits.requests.filter(t => now - t < hourMs).length;
    const dailyCount = limits.requests.length;
    
    if (hourlyCount >= cfg.maxRequestsPerHour) {
      return { allowed: false, reason: `每小时限制${cfg.maxRequestsPerHour}次请求，请稍后再试` };
    }
    
    if (dailyCount >= cfg.maxRequestsPerDay) {
      return { allowed: false, reason: `每日限制${cfg.maxRequestsPerDay}次请求，明天再来吧` };
    }
    
    // 记录本次请求
    limits.requests.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(limits));
    
    return { allowed: true };
  }

  function createAdminPanel(){
    if (!isLocalHost()) return;
    
    const panel = document.createElement('div');
    panel.id = 'chat-admin-panel';
    panel.className = 'chat-admin-panel hidden';
    panel.innerHTML = `
      <div class="admin-overlay"></div>
      <div class="admin-content">
        <div class="admin-header">
          <h3>🔧 聊天管理面板</h3>
          <button class="admin-close">×</button>
        </div>
        <div class="admin-body">
          <div class="admin-section">
            <h4>🎛️ 基础控制</h4>
            <label>启用AI聊天功能
              <select name="enabled">
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            </label>
          </div>
          
          <div class="admin-section">
            <h4>⏱️ 速率限制</h4>
            <label>每小时最大请求数 <input type="number" name="maxRequestsPerHour" min="1" max="1000" placeholder="20"></label>
            <label>每日最大请求数 <input type="number" name="maxRequestsPerDay" min="1" max="10000" placeholder="100"></label>
            <button class="reset-limits">重置限制记录</button>
          </div>
          
          <div class="admin-section">
            <h4>🤖 模型参数</h4>
            <label>Temperature <input type="number" name="temperature" min="0" max="2" step="0.1" placeholder="0.7"></label>
            <label>Max Tokens <input type="number" name="maxTokens" min="100" max="8000" placeholder="2000"></label>
          </div>
          
          <div class="admin-section">
            <h4>📝 系统提示词</h4>
            <textarea name="systemPrompt" rows="6" placeholder="输入系统提示词..."></textarea>
          </div>
          
          <div class="admin-actions">
            <button class="save-admin">保存配置</button>
            <button class="export-config">导出配置</button>
            <input type="file" class="import-config" accept=".json" style="display:none">
            <button class="import-btn">导入配置</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // 绑定事件
    const cfg = loadAdminCfg();
    const form = panel.querySelector('.admin-body');
    
    // 填充表单
    form.querySelector('[name=enabled]').value = String(cfg.enabled !== false);
    form.querySelector('[name=maxRequestsPerHour]').value = cfg.maxRequestsPerHour || 20;
    form.querySelector('[name=maxRequestsPerDay]').value = cfg.maxRequestsPerDay || 100;
    form.querySelector('[name=temperature]').value = cfg.temperature || 0.7;
    form.querySelector('[name=maxTokens]').value = cfg.maxTokens || 2000;
    form.querySelector('[name=systemPrompt]').value = cfg.systemPrompt || '';
    
    // 事件监听
    panel.querySelector('.admin-close').addEventListener('click', () => panel.classList.add('hidden'));
    panel.querySelector('.admin-overlay').addEventListener('click', () => panel.classList.add('hidden'));
    
    panel.querySelector('.save-admin').addEventListener('click', () => {
      const next = {
        enabled: form.querySelector('[name=enabled]').value === 'true',
        maxRequestsPerHour: parseInt(form.querySelector('[name=maxRequestsPerHour]').value) || 20,
        maxRequestsPerDay: parseInt(form.querySelector('[name=maxRequestsPerDay]').value) || 100,
        temperature: parseFloat(form.querySelector('[name=temperature]').value) || 0.7,
        maxTokens: parseInt(form.querySelector('[name=maxTokens]').value) || 2000,
        systemPrompt: form.querySelector('[name=systemPrompt]').value.trim()
      };
      saveAdminCfg(next);
      alert('管理配置已保存');
    });
    
    panel.querySelector('.reset-limits').addEventListener('click', () => {
      if (confirm('确定要重置所有速率限制记录吗？')) {
        localStorage.removeItem(RATE_LIMIT_KEY);
        alert('限制记录已重置');
      }
    });
    
    panel.querySelector('.export-config').addEventListener('click', () => {
      const data = JSON.stringify(loadAdminCfg(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chat-admin-config.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    
    panel.querySelector('.import-btn').addEventListener('click', () => {
      panel.querySelector('.import-config').click();
    });
    
    panel.querySelector('.import-config').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const cfg = JSON.parse(e.target.result);
          saveAdminCfg(cfg);
          location.reload(); // 重新加载以应用配置
        } catch (err) {
          alert('配置文件格式错误');
        }
      };
      reader.readAsText(file);
    });
  }

  // 添加管理员入口（Ctrl+Shift+A）
  function addAdminTrigger(){
    if (!isLocalHost()) return;
    
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        const panel = document.getElementById('chat-admin-panel');
        if (panel) {
          panel.classList.toggle('hidden');
        }
      }
    });
  }

  // 暴露给主聊天脚本使用的函数
  window.ChatAdmin = {
    checkRateLimit,
    loadAdminCfg,
    isEnabled: () => loadAdminCfg().enabled !== false
  };

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createAdminPanel();
      addAdminTrigger();
    });
  } else {
    createAdminPanel();
    addAdminTrigger();
  }

})();
