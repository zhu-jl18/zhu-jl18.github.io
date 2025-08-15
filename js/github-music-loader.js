// GitHub音乐仓库自动抓取脚本
class GitHubMusicLoader {
  constructor(owner, repo, musicPath = 'music') {
    this.owner = owner;
    this.repo = repo;
    this.musicPath = musicPath;
    this.apiBase = 'https://api.github.com';
    this.rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/main`;
  }
  
  // 获取GitHub仓库中的音乐文件
  async loadMusicFromGitHub() {
    try {
      console.log(`正在从GitHub仓库加载音乐: ${this.owner}/${this.repo}/${this.musicPath}`);
      
      // 获取music文件夹内容
      const response = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.musicPath}`
      );
      
      if (!response.ok) {
        throw new Error(`GitHub API请求失败: ${response.status}`);
      }
      
      const files = await response.json();
      console.log(`找到 ${files.length} 个文件`);
      
      // 过滤音频文件
      const audioFiles = files.filter(file => 
        file.type === 'file' && 
        /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)
      );
      
      if (audioFiles.length === 0) {
        throw new Error('未找到音频文件');
      }
      
      console.log(`找到 ${audioFiles.length} 个音频文件`);
      
      // 生成播放列表
      const playlist = audioFiles.map((file, index) => {
        const fileName = file.name;
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        
        // 智能解析文件名 (支持 "艺术家 - 歌曲名" 格式)
        let title, artist;
        if (nameWithoutExt.includes(' - ')) {
          [artist, title] = nameWithoutExt.split(' - ', 2);
        } else {
          title = nameWithoutExt;
          artist = 'Unknown Artist';
        }
        
        return {
          id: String(index + 1),
          title: title.trim(),
          artist: artist.trim(),
          album: 'GitHub Music Collection',
          duration: 180000, // 默认3分钟，实际会在加载时更新
          url: `${this.rawBase}/${this.musicPath}/${encodeURIComponent(fileName)}`,
          cover: null
        };
      });
      
      return playlist;
      
    } catch (error) {
      console.error('从GitHub加载音乐失败:', error);
      throw error;
    }
  }
  
  // 递归获取子文件夹中的音乐（如果有分类）
  async loadMusicRecursively(path = this.musicPath) {
    try {
      const response = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${path}`
      );
      
      if (!response.ok) {
        throw new Error(`无法访问路径: ${path}`);
      }
      
      const items = await response.json();
      let allFiles = [];
      
      for (const item of items) {
        if (item.type === 'file' && /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(item.name)) {
          // 音频文件
          const pathParts = path.split('/');
          const category = pathParts.length > 1 ? pathParts[pathParts.length - 1] : 'Default';
          
          const fileName = item.name;
          const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
          
          let title, artist;
          if (nameWithoutExt.includes(' - ')) {
            [artist, title] = nameWithoutExt.split(' - ', 2);
          } else {
            title = nameWithoutExt;
            artist = 'Unknown Artist';
          }
          
          allFiles.push({
            id: String(allFiles.length + 1),
            title: title.trim(),
            artist: artist.trim(),
            album: category,
            duration: 180000,
            url: `${this.rawBase}/${path}/${encodeURIComponent(fileName)}`,
            cover: null,
            category: category
          });
          
        } else if (item.type === 'dir') {
          // 递归处理子文件夹
          console.log(`扫描子文件夹: ${item.path}`);
          const subFiles = await this.loadMusicRecursively(item.path);
          allFiles = allFiles.concat(subFiles);
        }
      }
      
      return allFiles;
      
    } catch (error) {
      console.error(`扫描路径 ${path} 失败:`, error);
      return [];
    }
  }
}

// 使用示例：
// const musicLoader = new GitHubMusicLoader('your-username', 'your-music-repo');
// const playlist = await musicLoader.loadMusicFromGitHub();