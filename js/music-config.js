// 音乐播放器配置文件
// 支持GitHub CDN音乐仓库、网易云歌单和本地音乐

window.MusicConfig = {
  // 播放模式：'vercel', 'github-repo', 'github-cdn', 'netease', 'local'
  mode: 'vercel', // 使用 Vercel CDN
  
  // Vercel CDN 配置
  vercel: {
    baseUrl: 'https://cdn4blog.vercel.app', // 确认可访问的 URL
    musicPath: 'music', // 音乐文件路径
    // 备用 Vercel URL
    fallbackUrls: [
      'https://cdn4blog-git-main-zhu-jl18s-projects.vercel.app',
      'https://cdn4blog-lyb5yw8b7-zhu-jl18s-projects.vercel.app'
    ]
  },
  
  // 网易云音乐配置（备用）
  netease: {
    playlistId: '2558923436', // 你的歌单
    backupPlaylists: [
      '2558923436', // 你的歌单
      '60198', // 轻音乐
    ],
    apiServers: [
      'https://netease-cloud-music-api-sand-six.vercel.app',
      'https://music-api-tau-two.vercel.app'
    ]
  },
  
  // Vercel 音乐列表
  vercelPlaylist: [
    {
      id: '1',
      title: 'a lovely girl helps u get joy',
      artist: 'mummy',
      album: 'My Music Collection',
      duration: 0, // 将在加载时自动获取
      url: 'https://cdn4blog.vercel.app/music/a%20lovely%20girl%20helps%20u%20get%20joy.m4a'
    },
    {
      id: '2',
      title: '朱竹清极致淫语',
      artist: '朱竹清',
      album: 'My Music Collection',
      duration: 0, // 将在加载时自动获取
      url: 'https://cdn4blog.vercel.app/music/朱竹清极致淫语.mp3'
    },
    {
      id: '3',
      title: 'acoustic breeze',
      artist: 'Background Music',
      album: 'CDN Music Collection',
      duration: 240000,
      url: 'https://cdn4blog.vercel.app/music/acoustic%20breeze.mp3'
    }

  ],
  
  // GitHub CDN音乐（备用）
  fallbackPlaylist: [
    {
      id: '1',
      title: 'acoustic breeze',
      artist: 'Background Music',
      album: 'CDN Music Collection',
      duration: 240000,
      url: 'https://raw.githubusercontent.com/zhu-jl18/cdn4blog/main/music/acoustic%20breeze.mp3'
    }
  ],
  
  // 播放器设置
  settings: {
    defaultVolume: 0.5,
    autoPlay: false,
    loop: true,
    shuffle: false,
    showCover: true,
    showLyrics: false
  }
};
