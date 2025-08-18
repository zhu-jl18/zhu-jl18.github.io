// 快速切换音乐播放器模式
// 在浏览器控制台运行此脚本即可快速切换

function switchMusicMode(mode) {
  // 获取当前配置
  const config = window.MusicConfig;
  
  if (!config) {
    console.error('❌ 音乐播放器配置未找到');
    return;
  }
  
  // 保存原始模式
  const originalMode = config.mode;
  
  // 切换模式
  config.mode = mode;
  
  console.log(`🎵 音乐播放器模式已切换: ${originalMode} → ${mode}`);
  
  // 根据模式显示提示
  switch(mode) {
    case 'vercel':
      console.log('📡 正在使用 Vercel CDN 模式');
      console.log('📋 播放列表:', config.vercelPlaylist?.map(p => p.title));
      break;
      
    case 'netease':
      console.log('🎶 正在使用网易云音乐模式');
      console.log('📝 歌单 ID:', config.netease.playlistId);
      console.log('🔄 备用歌单:', config.netease.backupPlaylists);
      break;
      
    case 'github-cdn':
      console.log('🐙 正在使用 GitHub CDN 模式');
      break;
      
    default:
      console.log('❓ 未知模式:', mode);
  }
  
  // 重新加载播放列表
  if (window.simpleMusicPlayer && window.simpleMusicPlayer.loadPlaylist) {
    window.simpleMusicPlayer.loadPlaylist().then(() => {
      console.log('✅ 播放列表已重新加载');
    });
  }
}

// 快捷命令
window.musicMode = {
  vercel: () => switchMusicMode('vercel'),
  netease: () => switchMusicMode('netease'),
  github: () => switchMusicMode('github-cdn'),
  
  // 显示当前状态
  status: () => {
    const config = window.MusicConfig;
    console.log('📊 当前播放器状态:');
    console.log('- 模式:', config.mode);
    console.log('- 音量:', config.settings?.defaultVolume);
    console.log('- 自动播放:', config.settings?.autoPlay);
    console.log('- 循环播放:', config.settings?.loop);
  }
};

console.log('🎵 音乐模式切换器已加载！');
console.log('使用方法:');
console.log('- musicMode.vercel()  - 切换到 Vercel 模式');
console.log('- musicMode.netease()  - 切换到网易云音乐模式');
console.log('- musicMode.github()   - 切换到 GitHub 模式');
console.log('- musicMode.status()   - 查看当前状态');