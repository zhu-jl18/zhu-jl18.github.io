(function(){
  // 全局只读数据：每日优美观点数据集（定理/算法 50/50）
  // 字段：id, type(theorem|algorithm), title, category, statement, intuition, references, tags
  window.IDEAS_DATA = [
    // 定理类
    {
      id: 'pigeonhole-principle',
      type: 'theorem',
      title: '抽屉原理',
      category: '组合',
      statement: '若将 n+1 个物品放入 n 个抽屉，则至少有一个抽屉包含不少于 2 个物品。',
      intuition: '有限容量下的“挤压效应”。很多反直觉的存在性结论，通过“必有一格超载”得到。',
      references: [
        { text: '维基百科', url: 'https://zh.wikipedia.org/zh-cn/%E6%8A%BD%E5%B1%89%E5%8E%9F%E7%90%86' }
      ],
      tags: ['组合','存在性']
    },
    {
      id: 'euler-formula-planar-graphs',
      type: 'theorem',
      title: '平面图的欧拉公式',
      category: '图论',
      statement: '对连通平面图，有 V - E + F = 2，其中 V 顶点数、E 边数、F 面数。',
      intuition: '从一个面拓展到整体的“守恒量”。增加一条边会改变面/连通性，但整体式子保持不变。',
      references: [
        { text: '维基百科', url: 'https://zh.wikipedia.org/zh-cn/%E6%AD%90%E6%8B%89%E5%85%AC%E5%BC%8F' }
      ],
      tags: ['图论','拓扑']
    },
    {
      id: 'fermats-little-theorem',
      type: 'theorem',
      title: '费马小定理',
      category: '数论',
      statement: '若 p 为素数且 gcd(a,p)=1，则有 a^(p-1) ≡ 1 (mod p)。',
      intuition: '在模素数环上的乘法群是循环群，元素的阶整齐地整除 p-1。',
      references: [
        { text: '维基百科', url: 'https://zh.wikipedia.org/zh-cn/%E8%B4%B9%E9%A9%AC%E5%B0%8F%E5%AE%9A%E7%90%86' }
      ],
      tags: ['数论','同余']
    },
    {
      id: 'inclusion-exclusion',
      type: 'theorem',
      title: '容斥原理',
      category: '组合',
      statement: '有限集合并集的规模可由各子集规模与交集规模相间加减得到。',
      intuition: '先加总，后减去重复，再加回被多减的部分，以此类推。',
      references: [
        { text: '维基百科', url: 'https://zh.wikipedia.org/zh-cn/%E5%AE%B9%E6%96%A5%E5%8E%9F%E7%90%86' }
      ],
      tags: ['计数','交并']
    },
    {
      id: 'invariants-monovariants',
      type: 'theorem',
      title: '不变量与单调不变量',
      category: '解题技巧',
      statement: '在序列操作或博弈中，若存在保持不变或单调变化的量，可用于证明不可能或保证终止。',
      intuition: '抓住“不会变/只会朝一个方向变”的量，复杂过程立刻可控。',
      references: [
        { text: 'OI-Wiki', url: 'https://oi-wiki.org/misc/invariant/' }
      ],
      tags: ['不变量','博弈']
    },
    {
      id: 'cauchy-schwarz',
      type: 'theorem',
      title: '柯西-施瓦茨不等式',
      category: '不等式',
      statement: '内积空间中有 |⟨x,y⟩| ≤ ||x||·||y||，等号当且仅当二者线性相关。',
      intuition: '向量投影长度不超过向量范数；“夹角”的几何直觉。',
      references: [
        { text: '维基百科', url: 'https://zh.wikipedia.org/zh-cn/%E6%9F%AF%E8%A5%BF%EF%BC%8D%E6%96%BD%E7%93%A6%E8%8C%A8%E4%B8%8D%E7%AD%89%E5%BC%8F' }
      ],
      tags: ['线性代数','不等式']
    },

    // 算法类
    {
      id: 'bfs',
      type: 'algorithm',
      title: '广度优先搜索（BFS）',
      category: '图论',
      statement: '逐层扩展结点，可在无权图上求最短路，或判断连通性。',
      intuition: '像水波一样从起点向外一圈圈扩散。',
      references: [
        { text: 'CLRS', url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/' }
      ],
      tags: ['最短路','遍历']
    },
    {
      id: 'dijkstra',
      type: 'algorithm',
      title: 'Dijkstra 算法',
      category: '图论',
      statement: '在非负权图上用贪心 + 堆维护，求单源最短路。',
      intuition: '每次确定离起点最近的“未确定点”，不断松弛扩展。',
      references: [
        { text: 'CP-Algorithms', url: 'https://cp-algorithms.com/graph/dijkstra.html' }
      ],
      tags: ['最短路','贪心']
    },
    {
      id: 'union-find',
      type: 'algorithm',
      title: '并查集（DSU/Union-Find）',
      category: '数据结构',
      statement: '支持合并和查询连通块；路径压缩 + 按秩合并几乎是常数复杂度。',
      intuition: '像森林一样管理集合代表；查找时把节点“挂高”。',
      references: [
        { text: 'OI-Wiki', url: 'https://oi-wiki.org/ds/dsu/' }
      ],
      tags: ['连通性','数据结构']
    },
    {
      id: 'kmp',
      type: 'algorithm',
      title: 'KMP 字符串匹配',
      category: '字符串',
      statement: '预处理失配函数（前缀函数），避免重复比较，实现 O(n+m) 匹配。',
      intuition: '失配后不用退回文本指针；模式串自己告诉你“能跳多远”。',
      references: [
        { text: 'CP-Algorithms', url: 'https://cp-algorithms.com/string/prefix-function.html' }
      ],
      tags: ['字符串','匹配']
    },
    {
      id: 'quickselect',
      type: 'algorithm',
      title: 'Quickselect（第 k 小）',
      category: '选择',
      statement: '基于快速排序分区思想，平均线性期望时间找第 k 小元素。',
      intuition: '每次只在包含答案的一半继续找，就像“二分”但按值域划分。',
      references: [
        { text: '维基百科', url: 'https://zh.wikipedia.org/zh-cn/Quickselect' }
      ],
      tags: ['选择','分治']
    },
    {
      id: 'graham-scan',
      type: 'algorithm',
      title: 'Graham 扫描（凸包）',
      category: '计算几何',
      statement: '按极角排序并用栈维护右拐/左拐，线性对数时间求平面点集凸包。',
      intuition: '绕着点云“缝一圈皮筋”，不合“凸”的折返就弹掉。',
      references: [
        { text: 'CP-Algorithms', url: 'https://cp-algorithms.com/geometry/grahams-scan-convex-hull.html' }
      ],
      tags: ['凸包','几何']
    }
  ];
})();
