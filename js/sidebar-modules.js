// 侧边栏装饰模块功能
document.addEventListener('DOMContentLoaded', function() {
  
  // ========================================
  // 时钟功能
  // ========================================
  function updateClock() {
    const now = new Date();
    const clockElement = document.getElementById('left-clock');
    
    if (clockElement) {
      const timeElement = clockElement.querySelector('.time');
      const dateElement = clockElement.querySelector('.date');
      const weekElement = clockElement.querySelector('.week');
      
      // 格式化时间
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      // 格式化日期
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      
      // 星期
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const weekday = weekdays[now.getDay()];
      
      // 更新显示
      timeElement.textContent = `${hours}:${minutes}:${seconds}`;
      dateElement.textContent = `${year}年${month}月${date}日`;
      weekElement.textContent = `星期${weekday}`;
    }
  }
  
  // 每秒更新时钟
  updateClock();
  setInterval(updateClock, 1000);
  
  // ========================================
  // 天气功能
  // ========================================
  function updateWeather() {
    const weatherElement = document.getElementById('left-weather');
    
    if (!weatherElement) return;
    
    // 模拟天气数据（实际使用时需要替换为真实的天气API）
    const mockWeatherData = {
      temperature: '22°C',
      description: '晴朗',
      location: '北京'
    };
    
    // 更新天气显示
    weatherElement.innerHTML = `
      <div class="weather-info">
        <div class="temperature">${mockWeatherData.temperature}</div>
        <div class="description">${mockWeatherData.description}</div>
        <div class="location">${mockWeatherData.location}</div>
      </div>
    `;
    
    // 注意：要获取真实天气数据，需要：
    // 1. 注册天气API服务（如和风天气、OpenWeatherMap等）
    // 2. 获取用户位置（需要用户授权）
    // 3. 调用API获取天气数据
    // 4. 定期更新天气信息
  }
  
  // 更新天气（每30分钟更新一次）
  updateWeather();
  setInterval(updateWeather, 30 * 60 * 1000);
  
  // ========================================
  // 音乐播放器功能
  // ========================================
  class MusicPlayer {
    constructor() {
      this.currentTrack = 0;
      this.isPlaying = false;
      this.volume = window.MusicConfig ? window.MusicConfig.defaultVolume : 0.5;
      
      // 从配置文件获取歌单ID
      this.playlistId = window.MusicConfig ? window.MusicConfig.playlistId : '60198';
      this.playlist = [];
      this.isLoading = true;
      
      this.audio = new Audio();
      this.audio.volume = this.volume;
      
      this.initEventListeners();
      this.loadPlaylist();
    }
    
    // 加载古典音乐播放列表
    async loadPlaylist() {
      try {
        this.updateLoadingStatus('正在加载古典音乐...');
        
        // 直接使用古典音乐列表，无需API调用
        this.loadClassicalPlaylist();
        
      } catch (error) {
        console.log('加载播放列表失败:', error);
        this.loadFallbackPlaylist();
      }
    }
    
    // 加载古典音乐列表
    loadClassicalPlaylist() {
      // 优雅的古典音乐列表
      this.playlist = [
        {
          id: '1',
          title: 'Air Prelude',
          artist: 'Bach',
          album: 'Classical Collection',
          duration: 180000,
          url: 'https://www.bensound.com/bensound-music/bensound-airprelude.mp3'
        },
        {
          id: '2',
          title: 'Acoustic Breeze',
          artist: 'Bensound',
          album: 'Relaxing Music',
          duration: 240000,
          url: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3'
        },
        {
          id: '3',
          title: 'A New Beginning',
          artist: 'Bensound',
          album: 'Inspirational',
          duration: 200000,
          url: 'https://www.bensound.com/bensound-music/bensound-anewbeginning.mp3'
        },
        {
          id: '4',
          title: 'Beautiful Morning',
          artist: 'Bensound',
          album: 'Morning Music',
          duration: 220000,
          url: 'https://www.bensound.com/bensound-music/bensound-beautifulmorning.mp3'
        },
        {
          id: '5',
          title: 'Creative Minds',
          artist: 'Bensound',
          album: 'Creative Collection',
          duration: 190000,
          url: 'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3'
        },
        {
          id: '6',
          title: 'Dreams',
          artist: 'Bensound',
          album: 'Dream Collection',
          duration: 210000,
          url: 'https://www.bensound.com/bensound-music/bensound-dreams.mp3'
        },
        {
          id: '7',
          title: 'Energy',
          artist: 'Bensound',
          album: 'Energy Collection',
          duration: 180000,
          url: 'https://www.bensound.com/bensound-music/bensound-energy.mp3'
        },
        {
          id: '8',
          title: 'Funky Element',
          artist: 'Bensound',
          album: 'Funky Collection',
          duration: 200000,
          url: 'https://www.bensound.com/bensound-music/bensound-funkyelement.mp3'
        }
      ];
      
      this.updateDisplay();
      this.updateLoadingStatus('古典音乐加载完成');
    }
    
    // 备用歌单（精选轻音乐）
    loadFallbackPlaylist() {
      // 使用配置文件中的备用歌单
      if (window.MusicConfig && window.MusicConfig.fallbackPlaylist) {
        this.playlist = window.MusicConfig.fallbackPlaylist;
      } else {
        // 默认备用歌单
        this.playlist = [
          {
            id: '1824045033',
            title: 'River Flows In You',
            artist: 'Yiruma',
            album: 'First Love',
            duration: 180000,
            url: 'https://music.163.com/song/media/outer/url?id=1824045033.mp3'
          },
          {
            id: '1824045034',
            title: 'Kiss The Rain',
            artist: 'Yiruma',
            album: 'First Love',
            duration: 240000,
            url: 'https://music.163.com/song/media/outer/url?id=1824045034.mp3'
          },
          {
            id: '1824045035',
            title: 'May Be',
            artist: 'Yiruma',
            album: 'First Love',
            duration: 200000,
            url: 'https://music.163.com/song/media/outer/url?id=1824045035.mp3'
          }
        ];
      }
      
      this.updateDisplay();
      this.updateLoadingStatus('使用备用歌单');
    }
    
    // 更新加载状态
    updateLoadingStatus(message) {
      const songTitle = document.querySelector('.song-title');
      const songArtist = document.querySelector('.song-artist');
      
      if (songTitle) {
        songTitle.textContent = message;
      }
      if (songArtist) {
        songArtist.textContent = this.isLoading ? '请稍候...' : '';
      }
    }
    
    initEventListeners() {
      // 播放/暂停按钮
      const playBtn = document.getElementById('left-music-play');
      if (playBtn) {
        playBtn.addEventListener('click', () => this.togglePlay());
      }
      
      // 上一首按钮
      const prevBtn = document.getElementById('left-music-prev');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => this.prevTrack());
      }
      
      // 下一首按钮
      const nextBtn = document.getElementById('left-music-next');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => this.nextTrack());
      }
      
             // 音量控制
       const volumeDisplay = document.getElementById('left-music-volume-display');
       const volumeDownBtn = document.getElementById('left-music-volume-down');
       const volumeUpBtn = document.getElementById('left-music-volume-up');
       
       if (volumeDownBtn) {
         volumeDownBtn.addEventListener('click', () => {
           this.volume = Math.max(0, this.volume - 0.1);
           this.audio.volume = this.volume;
           if (volumeDisplay) {
             volumeDisplay.textContent = Math.round(this.volume * 100) + '%';
           }
         });
       }
       
       if (volumeUpBtn) {
         volumeUpBtn.addEventListener('click', () => {
           this.volume = Math.min(1, this.volume + 0.1);
           this.audio.volume = this.volume;
           if (volumeDisplay) {
             volumeDisplay.textContent = Math.round(this.volume * 100) + '%';
           }
         });
       }
      
      // 音频事件
      this.audio.addEventListener('ended', () => this.nextTrack());
      this.audio.addEventListener('timeupdate', () => this.updateProgress());
      this.audio.addEventListener('loadedmetadata', () => this.updateTotalTime());
      
      // 添加调试事件
      this.audio.addEventListener('error', (e) => {
        console.error('音频加载错误:', e);
        console.error('错误详情:', this.audio.error);
      });
      
      this.audio.addEventListener('loadstart', () => {
        console.log('开始加载音频');
      });
      
      this.audio.addEventListener('canplay', () => {
        console.log('音频可以播放');
      });
      
      this.audio.addEventListener('canplaythrough', () => {
        console.log('音频可以完整播放');
      });
    }
    
    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    }
    
    play() {
      if (this.playlist.length === 0) return;
      
      const track = this.playlist[this.currentTrack];
      console.log('尝试播放古典音乐:', track.title, track.url);
      
      this.audio.src = track.url;
      this.audio.load(); // 强制加载
      
      const playPromise = this.audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('古典音乐播放成功:', track.title);
          this.isPlaying = true;
          this.updatePlayButton();
        }).catch(error => {
          console.log('播放失败，尝试下一首:', error);
          // 尝试下一首
          this.nextTrack();
        });
      }
    }
    
    pause() {
      this.audio.pause();
      this.isPlaying = false;
      this.updatePlayButton();
    }
    
    prevTrack() {
      this.currentTrack = (this.currentTrack - 1 + this.playlist.length) % this.playlist.length;
      this.loadTrack();
    }
    
    nextTrack() {
      this.currentTrack = (this.currentTrack + 1) % this.playlist.length;
      this.loadTrack();
    }
    
    loadTrack() {
      this.updateDisplay();
      if (this.isPlaying) {
        this.play();
      }
    }
    
    updateDisplay() {
      const songTitle = document.querySelector('.song-title');
      const songArtist = document.querySelector('.song-artist');
      
      if (songTitle && songArtist && this.playlist.length > 0) {
        const track = this.playlist[this.currentTrack];
        songTitle.textContent = track.title;
        songArtist.textContent = track.artist;
        this.isLoading = false;
      }
    }
    
    updatePlayButton() {
      const playBtn = document.getElementById('left-music-play');
      if (playBtn) {
        const icon = playBtn.querySelector('i');
        if (icon) {
          icon.className = this.isPlaying ? 'fa fa-pause' : 'fa fa-play';
        }
      }
    }
    
    updateProgress() {
      const progressFill = document.getElementById('left-music-progress-fill');
      const currentTime = document.getElementById('left-music-current-time');
      
      if (progressFill && currentTime) {
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        progressFill.style.width = progress + '%';
        currentTime.textContent = this.formatTime(this.audio.currentTime);
      }
    }
    
    updateTotalTime() {
      const totalTime = document.getElementById('left-music-total-time');
      if (totalTime) {
        totalTime.textContent = this.formatTime(this.audio.duration);
      }
    }
    
    formatTime(seconds) {
      if (isNaN(seconds)) return '0:00';
      
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    }
  }
  
  // 初始化音乐播放器
  new MusicPlayer();
  
  // ========================================
  // 工具函数
  // ========================================
  
  // 获取用户位置（用于天气功能）
  function getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          console.log('位置获取成功:', position.coords);
          // 这里可以使用位置信息调用天气API
        },
        function(error) {
          console.log('位置获取失败:', error);
        }
      );
    }
  }
  
  // 可选：获取用户位置
  // getUserLocation();
  
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
