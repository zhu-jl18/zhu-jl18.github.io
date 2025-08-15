// 侧边栏装饰模块功能（简化版）
document.addEventListener('DOMContentLoaded', function() {
  
  // ========================================
  // 模块收缩功能
  // ========================================
  
  // 收缩功能
  function initCollapseFunction() {
    const sidebarModules = document.getElementById('left-sidebar-modules');
    const collapseToggle = document.getElementById('collapse-toggle');
    
    if (!sidebarModules || !collapseToggle) return;
    
    // 从localStorage读取状态，默认展开
    const isCollapsed = localStorage.getItem('leftSidebarCollapsed') === 'true';
    if (isCollapsed) {
      sidebarModules.classList.add('collapsed');
    } else {
      // 如果没有保存过状态，默认展开
      sidebarModules.classList.remove('collapsed');
    }
    
    // 点击收缩按钮
    collapseToggle.addEventListener('click', function() {
      sidebarModules.classList.toggle('collapsed');
      
      // 保存状态到localStorage
      const isNowCollapsed = sidebarModules.classList.contains('collapsed');
      localStorage.setItem('leftSidebarCollapsed', isNowCollapsed);
      
      // 添加点击反馈
      this.style.transform = 'translateY(-50%) scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'translateY(-50%) scale(1)';
      }, 150);
    });
    
    // 鼠标悬停时显示提示
    collapseToggle.addEventListener('mouseenter', function() {
      this.title = sidebarModules.classList.contains('collapsed') ? '展开模块' : '收起模块';
    });
  }
  
  // 初始化收缩功能
  initCollapseFunction();
});