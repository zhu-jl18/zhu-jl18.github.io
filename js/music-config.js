// 音乐播放器配置文件
// 您可以在这里自定义您的网易云歌单

window.MusicConfig = {
  // 丰富音乐播放列表
  // 包含轻音乐、古典音乐等多种风格
  playlistId: 'mixed',
  
  // 使用GitHub CDN的音乐播放列表
  // 格式：https://raw.githubusercontent.com/用户名/仓库名/分支名/文件路径
  fallbackPlaylist: [
    // 轻音乐系列
    {
      id: '1',
      title: 'Acoustic Breeze',
      artist: 'Bensound',
      album: 'Relaxing Music',
      duration: 240000,
      url: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3'
    },
    {
      id: '2',
      title: 'A New Beginning',
      artist: 'Bensound',
      album: 'Inspirational',
      duration: 200000,
      url: 'https://www.bensound.com/bensound-music/bensound-anewbeginning.mp3'
    },
    {
      id: '3',
      title: 'Beautiful Morning',
      artist: 'Bensound',
      album: 'Morning Music',
      duration: 220000,
      url: 'https://www.bensound.com/bensound-music/bensound-beautifulmorning.mp3'
    },
    {
      id: '4',
      title: 'Creative Minds',
      artist: 'Bensound',
      album: 'Creative Collection',
      duration: 190000,
      url: 'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3'
    },
    {
      id: '5',
      title: 'Dreams',
      artist: 'Bensound',
      album: 'Dream Collection',
      duration: 210000,
      url: 'https://www.bensound.com/bensound-music/bensound-dreams.mp3'
    },
    {
      id: '6',
      title: 'Energy',
      artist: 'Bensound',
      album: 'Energy Collection',
      duration: 180000,
      url: 'https://www.bensound.com/bensound-music/bensound-energy.mp3'
    },
    {
      id: '7',
      title: 'Funky Element',
      artist: 'Bensound',
      album: 'Funky Collection',
      duration: 200000,
      url: 'https://www.bensound.com/bensound-music/bensound-funkyelement.mp3'
    },
    {
      id: '8',
      title: 'Happy Rock',
      artist: 'Bensound',
      album: 'Rock Collection',
      duration: 190000,
      url: 'https://www.bensound.com/bensound-music/bensound-happyrock.mp3'
    },
    {
      id: '9',
      title: 'Jazz Comedy',
      artist: 'Bensound',
      album: 'Jazz Collection',
      duration: 200000,
      url: 'https://www.bensound.com/bensound-music/bensound-jazzcomedy.mp3'
    },
    {
      id: '10',
      title: 'Memories',
      artist: 'Bensound',
      album: 'Emotional',
      duration: 220000,
      url: 'https://www.bensound.com/bensound-music/bensound-memories.mp3'
    },
    {
      id: '11',
      title: 'Once in Paris',
      artist: 'Bensound',
      album: 'Paris Collection',
      duration: 180000,
      url: 'https://www.bensound.com/bensound-music/bensound-onceinparis.mp3'
    },
    {
      id: '12',
      title: 'Perception',
      artist: 'Bensound',
      album: 'Electronic',
      duration: 200000,
      url: 'https://www.bensound.com/bensound-music/bensound-perception.mp3'
    },
    {
      id: '13',
      title: 'Summer',
      artist: 'Bensound',
      album: 'Seasonal',
      duration: 190000,
      url: 'https://www.bensound.com/bensound-music/bensound-summer.mp3'
    },
    {
      id: '14',
      title: 'Sweet',
      artist: 'Bensound',
      album: 'Sweet Collection',
      duration: 210000,
      url: 'https://www.bensound.com/bensound-music/bensound-sweet.mp3'
    },
    {
      id: '15',
      title: 'Ukulele',
      artist: 'Bensound',
      album: 'Instrumental',
      duration: 180000,
      url: 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3'
    }
  ],
  
  // 默认音量 (0-1)
  defaultVolume: 0.5,
  
  // 是否自动播放
  autoPlay: false,
  
  // 是否循环播放
  loop: true,
  
  // 是否随机播放
  shuffle: false
};

// 推荐的轻音乐歌单ID
window.RecommendedPlaylists = {
  '轻音乐': '60198',
  '钢琴曲': '60199',
  '纯音乐': '60200',
  '古典音乐': '60201',
  '自然声音': '60202'
};
