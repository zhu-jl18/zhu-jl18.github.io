// 狄拉克之海量子粒子特效 - PJAX兼容版
// 使用data-pjax属性确保在PJAX跳转后正确执行

// 检查是否已经定义
if (typeof DiracSeaEffect === 'undefined') {
  class DiracSeaEffect {
  constructor() {
    // 检查是否已经初始化
    if (window.diracSeaInstance) {
      return window.diracSeaInstance;
    }
    
    this.enabled = false;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animationId = null;
    this.mouseX = 0;
    this.mouseY = 0;
    
    // 配置参数
    this.config = {
      particleCount: 50,
      particleSize: 2,
      speed: 0.5,
      connectionDistance: 100,
      opacity: 0.5,
      color: '#4ecdc4'
    };
    
    // 检查是否应该启用
    this.checkAutoEnable();
    
    // 暴露控制接口
    window.diracSea = this;
    window.diracSeaInstance = this;
    
    console.log('%c🌊 狄拉克之海特效初始化完成', 'color: #4ecdc4; font-size: 12px;');
  }
  
  // 检查是否自动启用
  checkAutoEnable() {
    const saved = localStorage.getItem('diracSeaEnabled');
    if (saved === 'true') {
      this.enable();
    }
  }
  
  // 启用特效
  enable() {
    if (this.enabled) return;
    
    this.enabled = true;
    this.init();
    localStorage.setItem('diracSeaEnabled', 'true');
    console.log('%c🌊 狄拉克之海特效已启用', 'color: #4ecdc4; font-size: 14px;');
  }
  
  // 禁用特效
  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    localStorage.setItem('diracSeaEnabled', 'false');
    console.log('%c🌊 狄拉克之海特效已禁用', 'color: #ff6b6b; font-size: 14px;');
  }
  
  // 初始化
  init() {
    // 移除旧的画布（如果存在）
    const oldCanvas = document.getElementById('dirac-sea-canvas');
    if (oldCanvas) {
      oldCanvas.remove();
    }
    
    // 创建画布
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'dirac-sea-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      opacity: ${this.config.opacity};
      background: transparent;
    `;
    document.body.appendChild(this.canvas);
    
    // 设置画布大小
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // 获取上下文
    this.ctx = this.canvas.getContext('2d');
    
    // 创建粒子
    this.createParticles();
    
    // 鼠标交互
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    
    // 开始动画
    this.animate();
  }
  
  // 调整画布大小
  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }
  
  // 创建粒子
  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * this.config.speed,
        vy: (Math.random() - 0.5) * this.config.speed,
        size: Math.random() * this.config.particleSize + 1
      });
    }
  }
  
  // 动画循环
  animate() {
    if (!this.enabled) return;
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 更新和绘制粒子
    this.updateParticles();
    this.drawParticles();
    this.drawConnections();
    
    // 继续动画
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  // 更新粒子位置
  updateParticles() {
    this.particles.forEach(particle => {
      // 更新位置
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // 边界检测
      if (particle.x < 0 || particle.x > this.canvas.width) {
        particle.vx = -particle.vx;
      }
      if (particle.y < 0 || particle.y > this.canvas.height) {
        particle.vy = -particle.vy;
      }
      
      // 鼠标交互
      const dx = this.mouseX - particle.x;
      const dy = this.mouseY - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 100) {
        const force = (100 - distance) / 100;
        particle.vx -= (dx / distance) * force * 0.1;
        particle.vy -= (dy / distance) * force * 0.1;
      }
    });
  }
  
  // 绘制粒子
  drawParticles() {
    this.ctx.fillStyle = this.config.color;
    this.particles.forEach(particle => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }
  
  // 绘制连接线
  drawConnections() {
    this.ctx.strokeStyle = this.config.color;
    this.ctx.lineWidth = 0.5;
    
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.config.connectionDistance) {
          this.ctx.globalAlpha = 1 - (distance / this.config.connectionDistance);
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }
    this.ctx.globalAlpha = 1;
  }
  
  // 更新配置
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    if (this.canvas) {
      this.canvas.style.opacity = this.config.opacity;
    }
  }
}

// 添加全局控制函数
window.toggleDiracSea = function() {
  const enabled = localStorage.getItem('diracSeaEnabled') === 'true';
  
  if (enabled) {
    localStorage.setItem('diracSeaEnabled', 'false');
    if (window.diracSea) {
      window.diracSea.disable();
    }
    alert('🌊 狄拉克之海特效已禁用');
  } else {
    localStorage.setItem('diracSeaEnabled', 'true');
    if (!window.diracSea) {
      new DiracSeaEffect();
    } else {
      window.diracSea.enable();
    }
    alert('🌊 狄拉克之海特效已启用');
  }
  
  // 不需要刷新页面，PJAX会处理
};

// 页面加载完成后初始化
// 注意：这个脚本带有data-pjax属性，会在PJAX跳转后重新执行
(function() {
  // 检查是否已经初始化
  if (!window.diracSeaInstance) {
    new DiracSeaEffect();
  }
  
  // 添加控制台命令
  console.log('%c🌊 狄拉克之海特效控制:', 'color: #4ecdc4; font-size: 14px;');
  console.log('%ctoggleDiracSea() - 开启/关闭特效', 'color: #45b7d1; font-size: 12px;');
  console.log('%cdiracSea.enable() - 启用特效', 'color: #45b7d1; font-size: 12px;');
  console.log('%cdiracSea.disable() - 禁用特效', 'color: #45b7d1; font-size: 12px;');
  console.log('%cdiracSea.updateConfig({opacity: 0.3}) - 调整透明度', 'color: #45b7d1; font-size: 12px;');
})();

} // 结束if判断