// 简单可靠的GitHub音乐播放器
// 适配现有的HTML结构和样式

// 检查是否已经定义
if (typeof SimpleMusicPlayer === 'undefined') {
  class SimpleMusicPlayer {
  constructor() {
    // 基础配置
    this.config = window.MusicConfig || {
      mode: 'vercel',
      vercel: {
        baseUrl: 'https://cdn4blog.vercel.app',
        musicPath: 'music'
      }
    };
    
    // 播放器状态
    this.currentTrack = 0;
    this.isPlaying = false;
    this.playlist = [];
    this.volume = 0.25; // 默认25%音量
    
    // HTML元素（适配现有结构）
    this.songTitle = document.querySelector('.song-title');
    this.songArtist = document.querySelector('.song-artist');
    this.playBtn = document.querySelector('.play-btn');
    this.prevBtn = document.querySelector('.prev-btn');
    this.nextBtn = document.querySelector('.next-btn');
    this.playerToggle = document.getElementById('player-toggle');
    this.musicWidget = document.getElementById('music-player-widget');
    
    // 音量控制元素
    this.volumeBar = document.querySelector('.volume-bar');
    this.volumeFill = document.querySelector('.volume-fill');
    this.volumeHandle = document.querySelector('.volume-handle');
    this.volumeText = document.querySelector('.volume-text');
    this.volumeIcon = document.querySelector('.volume-icon');
    
    // 初始化
    this.init();
  }
  
  async init() {
    console.log('🎵 初始化简单音乐播放器');
    
    try {
      // 初始化音量
      this.initVolume();
      
      // 绑定事件
      this.bindEvents();
      
      // 加载播放列表
      await this.loadPlaylist();
      
      // 更新显示
      this.updateDisplay();
      
      console.log(`✅ 音乐播放器就绪，共 ${this.playlist.length} 首歌曲`);
      
    } catch (error) {
      console.error('❌ 音乐播放器初始化失败:', error);
      this.showError('音乐加载失败');
    }
  }
  
  // 绑定事件
  bindEvents() {
    // 播放控制按钮
    if (this.playBtn) this.playBtn.addEventListener('click', () => this.toggle());
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
    
    // 收缩控制
    if (this.playerToggle && this.musicWidget) {
      this.playerToggle.addEventListener('click', () => this.toggleWidget());
    }
    
    // 音量控制
    if (this.volumeBar) {
      this.volumeBar.addEventListener('click', (e) => this.setVolumeFromClick(e));
      this.volumeBar.addEventListener('mousedown', (e) => this.startVolumeDrag(e));
    }
    
    // 静音切换（点击音量图标）
    if (this.volumeIcon) {
      this.volumeIcon.addEventListener('click', () => this.toggleMute());
    }
  }
  
  // 收缩/展开播放器
  toggleWidget() {
    this.musicWidget.classList.toggle('collapsed');
    const icon = this.playerToggle.querySelector('i');
    if (icon) {
      icon.className = this.musicWidget.classList.contains('collapsed') 
        ? 'fa fa-chevron-right' 
        : 'fa fa-chevron-left';
    }
  }
  
  // 从GitHub或Vercel加载音乐列表
  async loadPlaylist() {
    const { mode } = this.config;
    
    if (mode === 'vercel') {
      // Vercel 模式 - 使用固定的播放列表
      console.log('📡 从Vercel加载音乐列表');
      this.playlist = this.loadVercelPlaylist();
    } else {
      // GitHub 模式
      const { owner, repo, musicPath } = this.config.github;
      console.log(`📡 从GitHub加载: ${owner}/${repo}/${musicPath}`);
      
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${musicPath}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`GitHub API请求失败: ${response.status}`);
      }
      
      const files = await response.json();
      
      // 过滤音频文件
      const audioFiles = files.filter(file => 
        file.type === 'file' && 
        /\.(mp3|wav|ogg|flac|m4a)$/i.test(file.name)
      );
      
      if (audioFiles.length === 0) {
        throw new Error('未找到音频文件');
      }
      
      // 生成播放列表
      this.playlist = audioFiles.map((file, index) => {
        const title = file.name.replace(/\.(mp3|wav|ogg|flac|m4a)$/i, '');
        
        // 智能解析艺术家和标题
        let artist = 'Background Music';
        let songTitle = title;
        
        if (title.includes(' - ')) {
          [artist, songTitle] = title.split(' - ', 2);
        }
        
        return {
          id: index,
          title: songTitle.trim(),
          artist: artist.trim(),
          url: this.buildMusicUrl(file.name)
        };
      });
    }
    
    console.log(`✅ 加载完成，共 ${this.playlist.length} 首歌曲`);
  }
  
  // 加载Vercel播放列表（固定）
  loadVercelPlaylist() {
    const { baseUrl, musicPath } = this.config.vercel;
    const pathPrefix = musicPath ? `${musicPath}/` : '';
    
    return [
      {
        id: 1,
        title: 'acoustic breeze',
        artist: 'Background Music',
        url: `${baseUrl}/${pathPrefix}acoustic%20breeze.mp3`
      },
      {
        id: 2,
        title: 'The Sounds of Silence',
        artist: 'Simon & Garfunkel',
        url: `${baseUrl}/${pathPrefix}The%20Sounds%20of%20Silence.mp3`
      }
    ];
  }
  
  // 构建音乐URL
  buildMusicUrl(filename) {
    const { mode } = this.config;
    
    if (mode === 'vercel') {
      const { baseUrl, musicPath } = this.config.vercel;
      return `${baseUrl}/${musicPath}/${encodeURIComponent(filename)}`;
    } else {
      const { owner, repo, branch, musicPath, cdnType } = this.config.github;
      
      switch (cdnType) {
        case 'jsdelivr':
          return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${musicPath}/${filename}`;
        case 'statically':
          return `https://cdn.statically.io/gh/${owner}/${repo}/${branch}/${musicPath}/${filename}`;
        default:
          return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${musicPath}/${encodeURIComponent(filename)}`;
      }
    }
  }
  
  // 播放音乐
  async play() {
    if (this.playlist.length === 0) return;
    
    const track = this.playlist[this.currentTrack];
    const audioElement = this.getAudioElement();
    
    try {
      console.log(`🎵 播放: ${track.title}`);
      console.log(`🔗 URL: ${track.url}`);
      
      audioElement.src = track.url;
      await audioElement.play();
      
      this.isPlaying = true;
      this.updatePlayButton();
      
    } catch (error) {
      console.error('❌ 播放失败:', error);
      this.showError(`播放失败: ${track.title}`);
      
      // 尝试下一首
      if (this.currentTrack < this.playlist.length - 1) {
        this.next();
      }
    }
  }
  
  // 暂停
  pause() {
    const audioElement = this.getAudioElement();
    audioElement.pause();
    this.isPlaying = false;
    this.updatePlayButton();
  }
  
  // 播放/暂停切换
  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  // 下一首
  next() {
    this.currentTrack = (this.currentTrack + 1) % this.playlist.length;
    this.updateDisplay();
    if (this.isPlaying) {
      this.play();
    }
  }
  
  // 上一首
  prev() {
    this.currentTrack = (this.currentTrack - 1 + this.playlist.length) % this.playlist.length;
    this.updateDisplay();
    if (this.isPlaying) {
      this.play();
    }
  }
  
  // 获取或创建音频元素
  getAudioElement() {
    if (!this.audio) {
      this.audio = document.createElement('audio');
      this.audio.volume = this.volume; // 使用当前音量设置
      
      // 自动播放下一首
      this.audio.addEventListener('ended', () => {
        this.next();
      });
      
      // 错误处理
      this.audio.addEventListener('error', (e) => {
        console.error('音频错误:', e);
        this.next();
      });
    }
    
    return this.audio;
  }
  
  // 更新显示
  updateDisplay() {
    if (this.playlist.length === 0) return;
    
    const track = this.playlist[this.currentTrack];
    
    // 更新歌曲信息
    if (this.songTitle) this.songTitle.textContent = track.title;
    if (this.songArtist) this.songArtist.textContent = track.artist;
  }
  
  // 更新播放按钮
  updatePlayButton() {
    if (this.playBtn) {
      const icon = this.playBtn.querySelector('i');
      if (icon) {
        icon.className = this.isPlaying ? 'fa fa-pause' : 'fa fa-play';
      }
    }
  }
  
  // 显示错误
  showError(message) {
    if (this.songTitle) {
      this.songTitle.textContent = message;
      this.songTitle.style.color = '#ff6b6b';
    }
  }
  
  // 音量控制方法
  setVolume(volume) {
    // 限制音量范围
    volume = Math.max(0, Math.min(1, volume));
    this.volume = volume;
    
    // 更新音频元素音量
    if (this.audio) {
      this.audio.volume = volume;
    }
    
    // 更新UI
    this.updateVolumeDisplay();
    
    // 保存到本地存储
    localStorage.setItem('music-player-volume', volume);
  }
  
  // 更新音量显示
  updateVolumeDisplay() {
    if (!this.volumeBar || !this.volumeFill || !this.volumeHandle || !this.volumeText) return;
    
    const percentage = Math.round(this.volume * 100);
    this.volumeFill.style.width = `${percentage}%`;
    this.volumeHandle.style.left = `${percentage}%`;
    this.volumeText.textContent = `${percentage}%`;
    
    // 更新音量图标
    if (this.volumeIcon) {
      if (this.volume === 0) {
        this.volumeIcon.className = 'volume-icon fa fa-volume-off';
      } else if (this.volume < 0.5) {
        this.volumeIcon.className = 'volume-icon fa fa-volume-down';
      } else {
        this.volumeIcon.className = 'volume-icon fa fa-volume-up';
      }
    }
  }
  
  // 从点击位置设置音量
  setVolumeFromClick(e) {
    if (!this.volumeBar) return;
    
    const rect = this.volumeBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    this.setVolume(percentage);
  }
  
  // 开始拖动音量
  startVolumeDrag(e) {
    e.preventDefault();
    
    const onMouseMove = (e) => {
      if (!this.volumeBar) return;
      const rect = this.volumeBar.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const percentage = x / rect.width;
      this.setVolume(percentage);
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  
  // 切换静音
  toggleMute() {
    if (this.volume > 0) {
      // 保存当前音量
      this.lastVolume = this.volume;
      this.setVolume(0);
    } else {
      // 恢复之前的音量
      this.setVolume(this.lastVolume || 0.25);
    }
  }
  
  // 初始化音量
  initVolume() {
    // 从本地存储恢复音量
    const savedVolume = localStorage.getItem('music-player-volume');
    if (savedVolume !== null) {
      this.setVolume(parseFloat(savedVolume));
    } else {
      // 使用默认音量25%
      this.setVolume(0.25);
    }
  }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 确保不重复初始化
  if (window.simpleMusicPlayer) return;
  
  console.log('🚀 启动简单音乐播放器');
  window.simpleMusicPlayer = new SimpleMusicPlayer();
});

} // 结束if判断