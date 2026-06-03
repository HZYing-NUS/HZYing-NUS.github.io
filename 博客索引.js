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
    文件名: "2026-ai-奇怪小念头产品机会",
    语言: "zh",
    标题: "AI 时代，最值钱的不是大想法，是这些奇怪小念头",
    日期: "2026-06-03",
    摘要: "AI 降低了小产品的试错成本，让电子供奉台、内耗翻译器、互动小说这类奇怪小念头，有机会从玩笑长成产品。",
    外链: "",
  },
  {
    文件名: "2026-ai-small-weird-ideas-product-opportunities",
    语言: "en",
    标题: "In the AI Era, the Most Valuable Things Are Not Big Ideas, but Weird Little Thoughts",
    日期: "2026-06-03",
    摘要: "AI lowers the cost of testing small products, giving strange little ideas like digital rituals, overthinking translators, and interactive stories a chance to become real products.",
    外链: "",
  },
  {
    文件名: "2026-ai-编程效率三件套",
    语言: "zh",
    标题: "一个做产品的人，我给 Claude Code 配了专家团、项目经理和纪律委员",
    日期: "2026-06-02",
    摘要: "AI 是乘数，不是加数。gstack、GSD 和 Superpowers 组成专家团、项目经理和纪律委员，让 AI 编程从兴奋感走向秩序感。",
    外链: "",
  },
  {
    文件名: "2026-ai-programming-productivity-stack",
    语言: "en",
    标题: "As a Product Builder, I Gave Claude Code an Expert Panel, a Project Manager, and a Discipline Officer",
    日期: "2026-06-02",
    摘要: "AI is a multiplier, not an addend. gstack, GSD, and Superpowers work as an expert team, a project manager, and a discipline officer for AI programming.",
    外链: "",
  },
  {
    文件名: "2026-ai-聊天机器人到智能体",
    语言: "zh",
    标题: "为什么同样是 AI，有的只会聊天，有的能替你干活？",
    日期: "2026-05-31",
    摘要: "用日历、会议纪要和邮件的例子，讲清聊天机器人、工作流和 Agent 的区别：关键不在工具多少，而是谁决定下一步。",
    外链: "",
  },
  {
    文件名: "2026-ai-chatbot-to-agent",
    语言: "en",
    标题: "Why Can Some AI Only Chat, While Others Can Actually Do Work for You?",
    日期: "2026-05-31",
    摘要: "Using calendars, meeting notes, and email as examples, this piece explains the difference between chatbots, workflows, and Agents: the key is not how many tools exist, but who decides the next step.",
    外链: "",
  },
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
