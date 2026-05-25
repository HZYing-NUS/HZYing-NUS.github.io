// 博客文章索引。
// 新增博客的步骤：
//   1. 把 .md 文件丢进 博客/ 文件夹（建议命名：年份-语义化标题.md）
//   2. 复制下面任意一条 { ... }, 粘贴到最上面（最新的放最上面）
//   3. 把字段填好
//
// 字段说明：
//   - 文件名：不要带 .md 后缀；要和 博客/ 里的文件名完全一致
//   - 语言：填 "zh" 表示中文博客，填 "en" 表示英文博客（决定切换语言时这篇是否显示）
//   - 标题 / 摘要：每篇博客一种语言写一份，因此填字符串就行（不用写双语对象）
//   - 外链：留空字符串 "" 就跳到本站子页读正文；填了网址就直接跳外站

window.博客索引 = [
  {
    文件名: "2026-claude-code-三层秩序",
    语言: "zh",
    标题: "Claude Code 三层秩序：.claude、CLAUDE.md 与 skills",
    日期: "2026-05-16",
    摘要: "`.claude`、`CLAUDE.md`、`skills` 该放全局还是项目根？把三件套放对位置，AI 才是长期搭档而不是一次性工具。",
    外链: "",
  },
  {
    文件名: "2026-claude-code-three-layers",
    语言: "en",
    标题: "The Three Layers of Claude Code: .claude, CLAUDE.md, and skills",
    日期: "2026-05-16",
    摘要: "Should `.claude`, `CLAUDE.md`, and `skills` live globally or in the project root? Putting the trio in the right place is what turns Claude Code from a toy into a long-term partner.",
    外链: "",
  },
  // 占位示例（暂时注释掉，需要时把 // 去掉）
  // {
  //   文件名: "2026-why-i-started-up",
  //   语言: "en",
  //   标题: "Why I started up",
  //   日期: "2026-05-01",
  //   摘要: "On the shift from working for someone to working on your own thing.",
  //   外链: "",
  // },
];
