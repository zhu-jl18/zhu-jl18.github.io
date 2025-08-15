// 增强版音乐播放器配置文件
// 支持多音乐源、自动降级和智能切换

window.MusicConfig = {
  // 主要播放模式：'vercel', 'github-cdn', 'netease', 'qq', 'migu', 'kugou', 'local'
  mode: 'vercel',
  
  // 音乐源优先级列表（按顺序尝试）
  musicSources: [
    'vercel',      // Vercel CDN（首选）
    'github-cdn',  // GitHub CDN
    'netease',     // 网易云音乐
    'qq',          // QQ音乐
    'migu',        // 咪咕音乐
    'local'        // 本地音乐
  ],
  
  // Vercel CDN 配置
  vercel: {
    baseUrl: 'https://cdn4blog.vercel.app',
    musicPath: 'music',
    fallbackUrls: [
      'https://cdn4blog-git-main-zhu-jl18s-projects.vercel.app',
      'https://cdn4blog-lyb5yw8b7-zhu-jl18s-projects.vercel.app'
    ],
    // 自定义音乐列表（因为 Vercel 没有 API）
    playlist: [
      {
        id: 1,
        title: 'acoustic breeze',
        artist: 'Background Music',
        url: 'https://cdn4blog.vercel.app/music/acoustic%20breeze.mp3',
        duration: 240000
      },
      {
        id: 2,
        title: 'The Sounds of Silence',
        artist: 'Simon & Garfunkel',
        url: 'https://cdn4blog.vercel.app/music/The%20Sounds%20of%20Silence.mp3',
        duration: 204000
      }
    ]
  },
  
  // GitHub CDN 配置
  github: {
    owner: 'zhu-jl18',
    repo: 'cdn4blog',
    musicPath: 'music',
    branch: 'main',
    
    // CDN 优先级
    cdnProviders: [
      {
        name: 'jsdelivr',
        url: 'https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{musicPath}/{filename}'
      },
      {
        name: 'statically',
        url: 'https://cdn.statically.io/gh/{owner}/{repo}/{branch}/{musicPath}/{filename}'
      },
      {
        name: 'raw',
        url: 'https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{musicPath}/{filename}'
      }
    ],
    
    // 缓存配置
    cache: {
      enabled: true,
      ttl: 3600000, // 1小时
      key: 'github-music-cache'
    }
  },
  
  // 网易云音乐配置（不稳定，仅作备用）
  netease: {
    // API 服务器列表（多个备用）
    apiServers: [
      {
        name: 'primary',
        url: 'https://netease-cloud-music-api-sand-six.vercel.app',
        status: 'unknown'
      },
      {
        name: 'backup1',
        url: 'https://music-api-tau-two.vercel.app',
        status: 'unknown'
      },
      {
        name: 'backup2',
        url: 'https://netease-music-api-theta.vercel.app',
        status: 'unknown'
      }
    ],
    
    // 歌单列表
    playlists: [
      {
        id: '2558923436',
        name: '我的歌单',
        priority: 1
      },
      {
        id: '60198',
        name: '轻音乐',
        priority: 2
      },
      {
        id: '3136952023',
        name: '纯音乐',
        priority: 3
      }
    ],
    
    // 请求配置
    request: {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000
    }
  },
  
  // QQ音乐配置
  qq: {
    // 由于版权限制，这里仅提供框架
    enabled: false,
    apiEndpoint: 'https://api.qqmusic.com',
    // 需要官方授权才能使用
  },
  
  // 咪咕音乐配置
  migu: {
    // 中国移动音乐，相对稳定
    enabled: false,
    apiEndpoint: 'https://music.migu.cn',
    // 需要官方授权
  },
  
  // 酷狗音乐配置
  kugou: {
    enabled: false,
    apiEndpoint: 'https://www.kugou.com',
    // 需要官方授权
  },
  
  // 本地音乐配置
  local: {
    enabled: false,
    musicPath: '/music',
    files: []
  },
  
  // 智能降级配置
  fallback: {
    // 当主要源失败时的备用播放列表
    emergencyPlaylist: [
      {
        id: '1',
        title: 'acoustic breeze',
        artist: 'Background Music',
        url: 'https://cdn4blog.vercel.app/music/acoustic%20breeze.mp3',
        duration: 240000
      },
      {
        id: '2',
        title: 'Peaceful Piano',
        artist: 'Relaxing Music',
        url: 'https://cdn4blog.vercel.app/music/Peaceful%20Piano.mp3',
        duration: 180000
      }
    ],
    
    // 源健康检查配置
    healthCheck: {
      enabled: true,
      interval: 300000, // 5分钟检查一次
      timeout: 5000
    }
  },
  
  // 播放器设置
  settings: {
    defaultVolume: 0.25,    // 默认25%音量
    autoPlay: false,       // 自动播放
    loop: true,           // 循环播放
    shuffle: false,       // 随机播放
    showCover: true,      // 显示封面
    showLyrics: false,    // 显示歌词
    crossfade: false,     // 交叉淡入淡出
    crossfadeDuration: 1000, // 淡入淡出时长
    
    // 音质设置
    quality: {
      netease: 'standard',  // standard, higher, exhigh, lossless
      qq: 'standard',
      migu: 'standard'
    },
    
    // 缓存设置
    cache: {
      enabled: true,
      maxItems: 100,       // 最大缓存歌曲数
      ttl: 86400000        // 24小时
    }
  },
  
  // 调试配置
  debug: {
    enabled: false,
    logLevel: 'info',      // debug, info, warn, error
    showNetworkErrors: false
  },
  
  // 特性开关
  features: {
    // 是否启用歌词显示
    lyrics: false,
    // 是否启用频谱分析
    visualizer: false,
    // 是否启用快捷键
    hotkeys: true,
    // 是否启用播放历史
    history: true,
    // 是否启用收藏功能
    favorite: true
  }
};

// 导出配置（供其他脚本使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.MusicConfig;
}