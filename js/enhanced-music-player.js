// 增强版多音乐源播放器
// 支持智能降级、多CDN切换、API容错

class EnhancedMusicPlayer {
  constructor() {
    // 基础配置
    this.config = window.MusicConfig || this.getDefaultConfig();
    
    // 播放器状态
    this.currentTrack = 0;
    this.isPlaying = false;
    this.playlist = [];
    this.volume = this.config.settings.defaultVolume;
    this.currentSource = null;
    this.failedSources = new Set();
    
    // 音频元素
    this.audio = null;
    this.audioContext = null;
    this.analyser = null;
    
    // UI 元素
    this.initElements();
    
    // 历史记录
    this.playHistory = [];
    this.favoriteTracks = new Set();
    
    // 初始化
    this.init();
  }
  
  getDefaultConfig() {
    return {
      mode: 'vercel',
      vercel: {
        baseUrl: 'https://cdn4blog.vercel.app',
        musicPath: 'music'
      },
      settings: {
        defaultVolume: 0.25,
        autoPlay: false,
        loop: true
      }
    };
  }
  
  initElements() {
    this.songTitle = document.querySelector('.song-title');
    this.songArtist = document.querySelector('.song-artist');
    this.playBtn = document.querySelector('.play-btn');
    this.prevBtn = document.querySelector('.prev-btn');
    this.nextBtn = document.querySelector('.next-btn');
    this.playerToggle = document.getElementById('player-toggle');
    this.musicWidget = document.getElementById('music-player-widget');
    
    // 音量控制
    this.volumeBar = document.querySelector('.volume-bar');
    this.volumeFill = document.querySelector('.volume-fill');
    this.volumeHandle = document.querySelector('.volume-handle');
    this.volumeText = document.querySelector('.volume-text');
    this.volumeIcon = document.querySelector('.volume-icon');
    
    // 进度条
    this.progressBar = document.querySelector('.progress-bar');
    this.progressFill = document.querySelector('.progress-fill');
    this.progressHandle = document.querySelector('.progress-handle');
    this.timeCurrent = document.querySelector('.time-current');
    this.timeTotal = document.querySelector('.time-total');
  }
  
  async init() {
    console.log('🎵 初始化增强版音乐播放器');
    
    try {
      // 初始化音量
      this.initVolume();
      
      // 绑定事件
      this.bindEvents();
      
      // 加载收藏列表
      this.loadFavorites();
      
      // 开始健康检查
      if (this.config.fallback.healthCheck.enabled) {
        this.startHealthCheck();
      }
      
      // 加载播放列表
      await this.loadPlaylist();
      
      // 更新显示
      this.updateDisplay();
      
      console.log(`✅ 音乐播放器就绪，共 ${this.playlist.length} 首歌曲`);
      
    } catch (error) {
      console.error('❌ 音乐播放器初始化失败:', error);
      this.showError('音乐加载失败，已切换到备用模式');
      
      // 使用紧急播放列表
      this.useEmergencyPlaylist();
    }
  }
  
  bindEvents() {
    // 播放控制
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
    
    // 静音切换
    if (this.volumeIcon) {
      this.volumeIcon.addEventListener('click', () => this.toggleMute());
    }
    
    // 进度条控制
    if (this.progressBar) {
      this.progressBar.addEventListener('click', (e) => this.setProgressFromClick(e));
      this.progressBar.addEventListener('mousedown', (e) => this.startProgressDrag(e));
    }
    
    // 键盘快捷键
    if (this.config.features.hotkeys) {
      document.addEventListener('keydown', (e) => this.handleHotkeys(e));
    }
  }
  
  async loadPlaylist() {
    const sources = this.config.musicSources;
    let lastError = null;
    
    // 按优先级尝试各个音乐源
    for (const source of sources) {
      // 跳过已失败的源
      if (this.failedSources.has(source)) {
        console.warn(`⚠️ 跳过失败的音乐源: ${source}`);
        continue;
      }
      
      try {
        console.log(`📡 尝试从 ${source} 加载音乐...`);
        
        let playlist = [];
        
        switch (source) {
          case 'vercel':
            playlist = await this.loadVercelPlaylist();
            break;
          case 'github-cdn':
            playlist = await this.loadGithubPlaylist();
            break;
          case 'netease':
            playlist = await this.loadNeteasePlaylist();
            break;
          case 'qq':
          case 'migu':
          case 'kugou':
            // 这些服务需要官方授权，暂时跳过
            throw new Error(`${source} 暂未启用`);
          case 'local':
            playlist = await this.loadLocalPlaylist();
            break;
          default:
            throw new Error(`未知的音乐源: ${source}`);
        }
        
        if (playlist && playlist.length > 0) {
          this.playlist = playlist;
          this.currentSource = source;
          this.failedSources.clear(); // 清除失败记录
          console.log(`✅ 成功从 ${source} 加载 ${playlist.length} 首歌曲`);
          return;
        }
        
      } catch (error) {
        lastError = error;
        console.warn(`❌ ${source} 加载失败:`, error.message);
        
        // 标记为失败源
        this.failedSources.add(source);
        
        // 如果是网络错误，延迟后重试
        if (error.name === 'NetworkError' && sources.indexOf(source) < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // 所有源都失败了
    throw lastError || new Error('所有音乐源都不可用');
  }
  
  async loadVercelPlaylist() {
    const { vercel } = this.config;
    
    // 如果配置了自定义播放列表，直接使用
    if (vercel.playlist && vercel.playlist.length > 0) {
      return vercel.playlist;
    }
    
    // 否则使用默认列表
    return [
      {
        id: 1,
        title: 'acoustic breeze',
        artist: 'Background Music',
        url: `${vercel.baseUrl}/${vercel.musicPath}/acoustic%20breeze.mp3`,
        duration: 240000
      },
      {
        id: 2,
        title: 'The Sounds of Silence',
        artist: 'Simon & Garfunkel',
        url: `${vercel.baseUrl}/${vercel.musicPath}/The%20Sounds%20of%20Silence.mp3`,
        duration: 204000
      }
    ];
  }
  
  async loadGithubPlaylist() {
    const { github } = this.config;
    const { cache } = github;
    
    // 检查缓存
    if (cache.enabled) {
      const cached = this.getCache(cache.key);
      if (cached) {
        console.log('📦 使用缓存的 GitHub 播放列表');
        return cached;
      }
    }
    
    // 尝试各个 CDN
    const files = await this.fetchGithubFiles();
    
    // 转换为播放列表
    const playlist = await this.buildGithubPlaylist(files);
    
    // 缓存结果
    if (cache.enabled) {
      this.setCache(cache.key, playlist, cache.ttl);
    }
    
    return playlist;
  }
  
  async fetchGithubFiles() {
    const { github } = this.config;
    const apiUrl = `https://api.github.com/repos/${github.owner}/${github.repo}/contents/${github.musicPath}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`GitHub API 错误: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async buildGithubPlaylist(files) {
    const { github } = this.config;
    const audioFiles = files.filter(file => 
      file.type === 'file' && /\.(mp3|wav|ogg|flac|m4a)$/i.test(file.name)
    );
    
    return audioFiles.map((file, index) => {
      const title = file.name.replace(/\.(mp3|wav|ogg|flac|m4a)$/i, '');
      let artist = 'Background Music';
      let songTitle = title;
      
      if (title.includes(' - ')) {
        [artist, songTitle] = title.split(' - ', 2);
      }
      
      // 使用最佳 CDN
      const url = this.getBestCdnUrl(file.name);
      
      return {
        id: index,
        title: songTitle.trim(),
        artist: artist.trim(),
        url,
        size: file.size
      };
    });
  }
  
  getBestCdnUrl(filename) {
    const { github } = this.config;
    const { cdnProviders } = github;
    
    // 按优先级尝试 CDN
    for (const cdn of cdnProviders) {
      try {
        const url = cdn.url
          .replace('{owner}', github.owner)
          .replace('{repo}', github.repo)
          .replace('{branch}', github.branch)
          .replace('{musicPath}', github.musicPath)
          .replace('{filename}', filename);
        
        // 快速检查 URL 是否可用
        if (await this.checkUrlAvailability(url)) {
          return url;
        }
      } catch (error) {
        console.warn(`CDN ${cdn.name} 不可用:`, error.message);
      }
    }
    
    // 如果都不可用，返回 raw URL
    return `https://raw.githubusercontent.com/${github.owner}/${github.repo}/${github.branch}/${github.musicPath}/${encodeURIComponent(filename)}`;
  }
  
  async checkUrlAvailability(url) {
    try {
      const response = await fetch(url, { method: 'HEAD', timeout: 3000 });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async loadNeteasePlaylist() {
    const { netease } = this.config;
    const { playlists, apiServers } = netease;
    
    // 尝试各个 API 服务器
    for (const api of apiServers) {
      try {
        console.log(`🔗 尝试网易云 API: ${api.name}`);
        
        // 检查 API 健康状态
        const healthUrl = `${api.url}/health`;
        const healthResponse = await fetch(healthUrl, { timeout: 3000 });
        
        if (!healthResponse.ok) {
          throw new Error(`API 不健康: ${healthResponse.status}`);
        }
        
        // 尝试各个歌单
        for (const playlist of playlists) {
          try {
            const playlistUrl = `${api.url}/playlist/detail?id=${playlist.id}`;
            const response = await fetch(playlistUrl, { timeout: 5000 });
            
            if (!response.ok) {
              throw new Error(`歌单加载失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.code === 200 && data.playlist && data.playlist.tracks) {
              // 转换格式
              const tracks = data.playlist.tracks.map((track, index) => ({
                id: track.id,
                title: track.name,
                artist: track.ar[0].name,
                album: track.al.name,
                duration: track.dt,
                url: `${api.url}/song/url?id=${track.id}&br=${this.getQualityBitrate('netease')}`
              }));
              
              console.log(`✅ 成功加载歌单: ${playlist.name}`);
              return tracks;
            }
            
          } catch (error) {
            console.warn(`歌单 ${playlist.id} 加载失败:`, error.message);
          }
        }
        
      } catch (error) {
        console.warn(`网易云 API ${api.name} 失败:`, error.message);
        
        // 标记 API 为不可用
        api.status = 'down';
      }
    }
    
    throw new Error('所有网易云 API 都不可用');
  }
  
  getQualityBitrate(source) {
    const quality = this.config.settings.quality[source];
    const bitrates = {
      standard: 128000,
      higher: 320000,
      exhigh: 999000,
      lossless: 999000
    };
    return bitrates[quality] || bitrates.standard;
  }
  
  async loadLocalPlaylist() {
    const { local } = this.config;
    
    if (!local.enabled || !local.files.length) {
      throw new Error('本地音乐未配置');
    }
    
    return local.files;
  }
  
  useEmergencyPlaylist() {
    this.playlist = this.config.fallback.emergencyPlaylist;
    this.currentSource = 'emergency';
    this.updateDisplay();
    console.warn('⚠️ 已切换到紧急播放列表');
  }
  
  // 播放控制方法
  async play() {
    if (this.playlist.length === 0) {
      this.showError('播放列表为空');
      return;
    }
    
    const track = this.playlist[this.currentTrack];
    const audio = this.getAudioElement();
    
    try {
      console.log(`🎵 播放: ${track.title} - ${track.artist}`);
      
      // 记录播放历史
      this.addToHistory(track);
      
      // 设置音频源
      audio.src = track.url;
      
      // 等待音频加载
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplay', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
      });
      
      // 播放
      await audio.play();
      this.isPlaying = true;
      this.updatePlayButton();
      
    } catch (error) {
      console.error('❌ 播放失败:', error);
      
      // 尝试下一个音源或下一首歌
      if (await this.tryAlternativeSource(track)) {
        await this.play();
      } else {
        this.next();
      }
    }
  }
  
  async tryAlternativeSource(track) {
    // 如果当前源失败，尝试其他源
    if (this.currentSource !== 'emergency') {
      const currentSourceIndex = this.config.musicSources.indexOf(this.currentSource);
      const remainingSources = this.config.musicSources.slice(currentSourceIndex + 1);
      
      for (const source of remainingSources) {
        if (!this.failedSources.has(source)) {
          try {
            console.log(`🔄 尝试切换到 ${source}`);
            this.currentSource = source;
            await this.loadPlaylist();
            
            // 查找相同的歌曲
            const sameTrack = this.playlist.find(t => 
              t.title === track.title && t.artist === track.artist
            );
            
            if (sameTrack) {
              this.currentTrack = this.playlist.indexOf(sameTrack);
              return true;
            }
          } catch (error) {
            console.warn(`切换到 ${source} 失败:`, error.message);
            this.failedSources.add(source);
          }
        }
      }
    }
    
    return false;
  }
  
  pause() {
    const audio = this.getAudioElement();
    audio.pause();
    this.isPlaying = false;
    this.updatePlayButton();
  }
  
  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  next() {
    if (this.playlist.length === 0) return;
    
    if (this.config.settings.shuffle) {
      this.currentTrack = Math.floor(Math.random() * this.playlist.length);
    } else {
      this.currentTrack = (this.currentTrack + 1) % this.playlist.length;
    }
    
    this.updateDisplay();
    if (this.isPlaying) {
      this.play();
    }
  }
  
  prev() {
    if (this.playlist.length === 0) return;
    
    this.currentTrack = (this.currentTrack - 1 + this.playlist.length) % this.playlist.length;
    this.updateDisplay();
    if (this.isPlaying) {
      this.play();
    }
  }
  
  // 音量控制方法
  initVolume() {
    const saved = localStorage.getItem('music-player-volume');
    if (saved !== null) {
      this.setVolume(parseFloat(saved));
    } else {
      this.setVolume(this.config.settings.defaultVolume);
    }
  }
  
  setVolume(volume) {
    volume = Math.max(0, Math.min(1, volume));
    this.volume = volume;
    
    const audio = this.getAudioElement();
    audio.volume = volume;
    
    this.updateVolumeDisplay();
    localStorage.setItem('music-player-volume', volume);
  }
  
  updateVolumeDisplay() {
    if (!this.volumeBar || !this.volumeFill || !this.volumeHandle || !this.volumeText) return;
    
    const percentage = Math.round(this.volume * 100);
    this.volumeFill.style.width = `${percentage}%`;
    this.volumeHandle.style.left = `${percentage}%`;
    this.volumeText.textContent = `${percentage}%`;
    
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
  
  setVolumeFromClick(e) {
    if (!this.volumeBar) return;
    const rect = this.volumeBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    this.setVolume(percentage);
  }
  
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
  
  toggleMute() {
    if (this.volume > 0) {
      this.lastVolume = this.volume;
      this.setVolume(0);
    } else {
      this.setVolume(this.lastVolume || this.config.settings.defaultVolume);
    }
  }
  
  // 进度控制方法
  setProgressFromClick(e) {
    if (!this.progressBar || !this.audio) return;
    const rect = this.progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    this.audio.currentTime = percentage * this.audio.duration;
  }
  
  startProgressDrag(e) {
    e.preventDefault();
    
    const onMouseMove = (e) => {
      if (!this.progressBar || !this.audio) return;
      const rect = this.progressBar.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const percentage = x / rect.width;
      this.audio.currentTime = percentage * this.audio.duration;
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  
  // 键盘快捷键
  handleHotkeys(e) {
    // 只在非输入元素上响应
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.toggle();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.prev();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.next();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.setVolume(Math.min(1, this.volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.setVolume(Math.max(0, this.volume - 0.1));
        break;
      case 'KeyM':
        e.preventDefault();
        this.toggleMute();
        break;
    }
  }
  
  // UI 更新方法
  updateDisplay() {
    if (this.playlist.length === 0) return;
    
    const track = this.playlist[this.currentTrack];
    if (this.songTitle) this.songTitle.textContent = track.title;
    if (this.songArtist) this.songArtist.textContent = track.artist;
    
    // 更新源指示器
    this.updateSourceIndicator();
  }
  
  updateSourceIndicator() {
    // 可以在这里添加当前音乐源的显示
    console.log(`当前音乐源: ${this.currentSource}`);
  }
  
  updatePlayButton() {
    if (this.playBtn) {
      const icon = this.playBtn.querySelector('i');
      if (icon) {
        icon.className = this.isPlaying ? 'fa fa-pause' : 'fa fa-play';
      }
    }
  }
  
  showError(message) {
    if (this.songTitle) {
      this.songTitle.textContent = message;
      this.songTitle.style.color = '#ff6b6b';
      
      // 3秒后恢复
      setTimeout(() => {
        if (this.playlist.length > 0) {
          const track = this.playlist[this.currentTrack];
          this.songTitle.textContent = track.title;
          this.songTitle.style.color = '';
        }
      }, 3000);
    }
  }
  
  // 获取音频元素
  getAudioElement() {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.volume = this.volume;
      
      // 事件监听
      this.audio.addEventListener('ended', () => {
        if (this.config.settings.loop) {
          this.next();
        }
      });
      
      this.audio.addEventListener('error', (e) => {
        console.error('音频错误:', e);
        this.showError('播放失败，尝试下一首');
        this.next();
      });
      
      this.audio.addEventListener('timeupdate', () => {
        this.updateProgress();
      });
      
      this.audio.addEventListener('loadedmetadata', () => {
        if (this.timeTotal) {
          this.timeTotal.textContent = this.formatTime(this.audio.duration);
        }
      });
    }
    
    return this.audio;
  }
  
  updateProgress() {
    if (!this.audio || !this.progressBar || !this.progressFill || !this.progressHandle) return;
    
    const percentage = (this.audio.currentTime / this.audio.duration) * 100;
    this.progressFill.style.width = `${percentage}%`;
    this.progressHandle.style.left = `${percentage}%`;
    
    if (this.timeCurrent) {
      this.timeCurrent.textContent = this.formatTime(this.audio.currentTime);
    }
  }
  
  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  // 缓存方法
  getCache(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const ttl = this.config.github.cache.ttl;
      
      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch (error) {
      return null;
    }
  }
  
  setCache(key, data, ttl) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('缓存设置失败:', error);
    }
  }
  
  // 历史记录
  addToHistory(track) {
    if (!this.config.features.history) return;
    
    this.playHistory.unshift({
      ...track,
      playedAt: Date.now()
    });
    
    // 限制历史记录数量
    if (this.playHistory.length > 50) {
      this.playHistory = this.playHistory.slice(0, 50);
    }
    
    // 保存到本地存储
    localStorage.setItem('music-player-history', JSON.stringify(this.playHistory));
  }
  
  loadFavorites() {
    if (!this.config.features.favorite) return;
    
    try {
      const saved = localStorage.getItem('music-player-favorites');
      if (saved) {
        this.favoriteTracks = new Set(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('加载收藏列表失败:', error);
    }
  }
  
  toggleFavorite(track) {
    if (!this.config.features.favorite) return;
    
    const trackId = track.id || track.url;
    
    if (this.favoriteTracks.has(trackId)) {
      this.favoriteTracks.delete(trackId);
      console.log(`❌ 取消收藏: ${track.title}`);
    } else {
      this.favoriteTracks.add(trackId);
      console.log(`⭐ 收藏: ${track.title}`);
    }
    
    // 保存到本地存储
    localStorage.setItem('music-player-favorites', JSON.stringify([...this.favoriteTracks]));
  }
  
  // 健康检查
  startHealthCheck() {
    const interval = this.config.fallback.healthCheck.interval;
    
    setInterval(() => {
      this.checkSourcesHealth();
    }, interval);
  }
  
  async checkSourcesHealth() {
    console.log('🔍 执行音乐源健康检查...');
    
    for (const source of this.config.musicSources) {
      try {
        let isHealthy = false;
        
        switch (source) {
          case 'vercel':
            isHealthy = await this.checkVercelHealth();
            break;
          case 'github-cdn':
            isHealthy = await this.checkGithubHealth();
            break;
          case 'netease':
            isHealthy = await this.checkNeteaseHealth();
            break;
        }
        
        if (isHealthy) {
          this.failedSources.delete(source);
          console.log(`✅ ${source} 健康检查通过`);
        } else {
          console.warn(`❌ ${source} 健康检查失败`);
        }
        
      } catch (error) {
        console.warn(`健康检查错误 ${source}:`, error.message);
      }
    }
  }
  
  async checkVercelHealth() {
    const { vercel } = this.config;
    const testUrl = `${vercel.baseUrl}/${vercel.musicPath}/acoustic%20breeze.mp3`;
    
    try {
      const response = await fetch(testUrl, { 
        method: 'HEAD', 
        timeout: this.config.fallback.healthCheck.timeout 
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async checkGithubHealth() {
    const { github } = this.config;
    const apiUrl = `https://api.github.com/repos/${github.owner}/${github.repo}/contents/${github.musicPath}`;
    
    try {
      const response = await fetch(apiUrl, { 
        method: 'HEAD', 
        timeout: this.config.fallback.healthCheck.timeout 
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async checkNeteaseHealth() {
    const { netease } = this.config;
    
    for (const api of netease.apiServers) {
      try {
        const healthUrl = `${api.url}/health`;
        const response = await fetch(healthUrl, { 
          timeout: this.config.fallback.healthCheck.timeout 
        });
        
        if (response.ok) {
          api.status = 'up';
          return true;
        }
      } catch {
        api.status = 'down';
      }
    }
    
    return false;
  }
  
  // 收缩/展开
  toggleWidget() {
    this.musicWidget.classList.toggle('collapsed');
    const icon = this.playerToggle.querySelector('i');
    if (icon) {
      icon.className = this.musicWidget.classList.contains('collapsed') 
        ? 'fa fa-chevron-right' 
        : 'fa fa-chevron-left';
    }
  }
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  if (window.enhancedMusicPlayer) return;
  
  console.log('🚀 启动增强版音乐播放器');
  window.enhancedMusicPlayer = new EnhancedMusicPlayer();
});

// 导出类（供其他脚本使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedMusicPlayer;
}