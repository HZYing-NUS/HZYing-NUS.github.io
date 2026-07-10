// 这是网站主页的全部文字内容。
// 改文字时只动引号 "" 或反引号 `` 里的部分，其它符号（逗号、花括号、方括号）不要动。
//
// 双语字段说明：
//   - 出现 { zh: "...", en: "..." } 的字段是「双语字段」，分别填中文和英文版
//   - 如果只想写中文，可以把 en 那行整行删掉；切换到英文时会自动回退显示中文
//   - URL / 邮箱 / 图片路径 这些不分语言，写一份就行
//
// 关于「证明图片」字段：
//   - 是一个数组，里面是图片路径的列表（jpg / png / pdf 都行）
//   - 配了图片，前端就会在条目右下角出现「查看证书」按钮，点击弹窗放大看
//   - 没图片就写空数组 [] 或整行删掉，按钮就不显示
//   - 把图片塞进 图片/奖项/ 或 图片/项目/ 文件夹，文件名和这里写的一致即可
//   - 多张证书会自动支持左右翻页

window.内容 = {
  // 不分语言（URL / 路径）
  头像图片: "图片/头像.jpeg",
  邮箱: "huangziying622@gmail.com",
  GitHub: "https://github.com/HZYing-NUS",
  微信二维码图片: "图片/微信二维码.png",
  公众号二维码图片: "图片/公众号二维码.png",

  // 顶部
  名字: {
    zh: "黄梓颖",
    en: "Ziying Huang",
  },
  一句话标签: {
    zh: "出海产品创造者 · 用系统思维做产品 · 杭州/南京",
    en: "Going-Global Product Creator · Building Products with Systems Thinking · Hangzhou/Nanjing",
  },
  身份说明: {
    zh: "我是黄梓颖，一个用 AI 编程做海外 Web 产品的系统科学创业者。",
    en: "I’m Ziying Huang, a systems science founder building global web products with AI-assisted coding.",
  },

  // 自我介绍：反引号支持多行；段落之间空一行就会自然分段
  自我介绍: {
    zh: `
👋 我是黄梓颖 (Ziying Huang)

欢迎来到我的数字主页。我是一名具备实战商业经验的 AI 开发者与独立创造者。从传统跨境供应链到前沿的 AI Web 产品开发，我始终对「用技术解决真实需求并走向全球」充满热情。目前的目标是使用 AI 打造一家「一人公司」。

🎓 梦的起点：系统思维与技术狂热的交汇

我的学术脉络跨越了上海理工大学（管理科学专业）与新加坡国立大学的学习经历。管理科学的学科背景为我建立了扎实的运筹统筹能力和数据分析基础，让我习惯以系统化、全局的视角去拆解商业链路；而在新加坡国立大学的求学时光，则进一步拓宽了我的视野，并彻底激活了我对前沿技术的狂热。

我深信自己骨子里是一名纯粹的「极客」——对新技术充满纯粹的好奇，渴望探究事物运转的本质，并极度沉迷于用极客工具构建属于自己的系统。

🚢 走向旷野：从校园到全球贸易的实战

毕业之际，我选择了直接迈向真实的商业世界。2025 年下半年，我先独立操盘了一个私域电商项目（累计 GMV 接近 22 万人民币），把从选品、内容运营到成交转化的整条链路自己跑通；紧接着在 2025 年底，于杭州和义乌这两大核心商贸枢纽创办了自己的外贸公司，把战场从私域线上搬到了线下供应链。

在此期间，我跑通了从前端采购、团队协作、跨国资金结算到仓储物流交付的全链路商业闭环（外贸阶段累计 GMV 接近 60 万人民币）。这段从 0 到 1 的实战经历，极大锤炼了我的执行力与商业敏锐度，也让我深刻理解了全球化贸易中真实的客户痛点与效率瓶颈。

2026 年初，这段线下供应链的实战告一段落，沉淀下来的商业嗅觉与跨境经验，正成为我下一阶段全身心投入 AI 出海的底层燃料。

💻 现在的我：用 AI 赋能，构建出海 Web 产品

目前，我的核心主线是利用 AI 编程独立开发 Web 产品并向全球市场发布（出海）。

结合此前的出海商业嗅觉，我正深度践行「Vibe Coding」。依托 Cursor、Claude Code 等极客开发环境，并结合 n8n、Python 以及 GPT-4o 模型，我搭建了高效的自动化工作流，致力于开发下一代数字服务（例如构建独立的 AI Agent 系统）。我正在将全栈 AI 赋能与跨境商业经验深度融合，创造出具有全球视野的创新数字产品。

🛠 我的技能树与特质

技术与工具驱动：重度自动化与工具爱好者。习惯使用 Obsidian 构建个人知识库，熟练运用各种 AI 智能体框架来提升开发效率与内容生产力。

全球化商业嗅觉：熟悉出海生态，能够敏锐捕捉海外市场趋势（常驻 Toolify 等 Web 数据分析工具）。在实操中积累了丰富的跨国协作与去中心化支付网络应用经验。

破局与跨界能力：极强的自我驱动力与创业精神。从「重度依赖线下供应链的外贸业务」跨越到「纯数字化的 AI 软件开发」，我习惯在不确定性中快速学习、试错迭代，并始终以交付结果为导向。
    `,
    en: `
👋 I'm Ziying Huang (黄梓颖)

Welcome to my digital home. I'm an AI developer and indie maker with hands-on commercial experience — from traditional cross-border supply chains to AI-powered web products. I'm driven by one idea: using technology to solve real needs and take them global. My current goal is to build a one-person company powered by AI.

🎓 Where it began: systems thinking meets a hacker's curiosity

My academic path runs through the University of Shanghai for Science and Technology (Management Science) and the National University of Singapore. Management Science gave me a solid foundation in operations and data analysis, and trained me to break down business pipelines with a systems-level view. My time at NUS broadened that lens further and fully unleashed my obsession with frontier technology.

At my core, I'm a hacker — endlessly curious about how things work, and addicted to building my own systems with the sharpest tools available.

🚢 Into the wild: from campus to global trade

Right after graduation, I went straight into the real commercial world. In the second half of 2025, I first solo-operated a private-domain e-commerce project (cumulative GMV approaching ¥220K RMB), running sourcing, content operations, and conversion end-to-end on my own. Right after that, in late 2025, I founded my own cross-border trade company across Hangzhou and Yiwu — two of the most important trading hubs in China — moving the battleground from private-domain online to offline supply chains.

Along the way, I ran the full commercial loop end-to-end: sourcing, team coordination, cross-border settlement, warehousing, and logistics (cumulative GMV approaching ¥600K RMB during the trade phase). That zero-to-one experience sharpened my execution and commercial instincts, and gave me a deep first-hand understanding of customer pain points and efficiency bottlenecks in global trade.

In early 2026, this offline supply-chain chapter wrapped, and the commercial instincts and cross-border lessons it left behind are exactly the fuel for what I'm pouring myself into next: shipping AI products to global markets.

💻 Where I am now: shipping global web products with AI

My main focus today is building web products independently with AI-assisted development and shipping them to global markets.

Combining what I've learned from going global commercially, I'm deep into "Vibe Coding" — building with Cursor, Claude Code, n8n, Python, and GPT-4o to wire up high-leverage automation workflows for the next generation of digital services (think standalone AI Agent systems). I'm fusing full-stack AI capabilities with cross-border commercial experience to ship innovative digital products with a global mindset.

🛠 My toolkit and how I work

Tooling-first builder: heavy on automation. I use Obsidian as my second brain and lean on a range of AI agent frameworks to compound my output across engineering and content.

Global commercial instinct: at home in the going-global ecosystem, with a sharp eye on overseas market trends (Toolify and similar analytics tools are part of my daily rotation). Hands-on experience with cross-border collaboration and decentralized payment networks.

Cross-domain operator: high self-drive and a founder's mindset. Going from offline-heavy cross-border trade to fully digital AI software, I've learned to move fast through uncertainty, iterate through trial and error, and stay relentlessly outcome-driven.
    `,
  },

  // 微信号文字：可选，会显示在二维码下方
  微信号文字: {
    zh: "TheodoreGniy",
    en: "TheodoreGniy",
  },

  // 公众号文字：可选，会显示在公众号二维码下方
  公众号文字: {
    zh: "模方",
    en: "Mold Square",
  },

  // 教育背景
  教育列表: [
    {
      时间: { zh: "2021.09 — 2025.06", en: "Sep 2021 — Jun 2025" },
      学校: { zh: "上海理工大学", en: "University of Shanghai for Science and Technology" },
      学位: { zh: "管理学学士 · 管理科学", en: "B.Mgt. in Management Science" },
      描述: {
        zh: "核心课程：人工智能基础、深度学习、系统建模与仿真、管理信息系统、运筹学等（多门核心课程成绩 90+）。毕业论文《基于演化博弈论的科创共同体联合攻关策略研究》获评 95 分，系内排名第一。",
        en: "Core courses: AI Foundations, Deep Learning, Systems Modeling & Simulation, MIS, Operations Research (90+ in most). Thesis on evolutionary-game-based collaborative R&D strategies scored 95, ranked first in the department.",
      },
      证明图片: [
        "图片/教育/上理工-毕业证书.png",
        "图片/教育/上理工-学位证书.png",
      ],
    },
    {
      时间: { zh: "2024.07 — 2025.06", en: "Jul 2024 — Jun 2025" },
      学校: { zh: "新加坡国立大学（NUS）", en: "National University of Singapore (NUS)" },
      学位: { zh: "交换项目（完成两个模块）", en: "Exchange Programme (two modules completed)" },
      描述: {
        zh: "在交换期间完成两个核心模块：软件分析与设计、Web 应用开发。获 NUS-ISS 颁发的「数字解决方案开发（设计）」与「数字解决方案开发（Web 应用）」证书。",
        en: "Completed two core modules during the exchange: Software Analysis & Design, and Web Application Development. Earned NUS-ISS certificates in Digital Solutions Development (Design) and (Web Application).",
      },
      证明图片: [
        "图片/教育/NUS-数字解决方案开发-设计.png",
        "图片/教育/NUS-数字解决方案开发-Web应用.png",
      ],
    },
  ],

  // 作品 / 项目
  作品列表: [
    {
      时间: { zh: "2024.04 — 2025.05", en: "Apr 2024 — May 2025" },
      标题: { zh: "数字转型引领变革——企业数字化赋能商业项目", en: "Digital Transformation: Enabling Enterprise Through Digitalization" },
      角色: { zh: "项目负责人", en: "Project Lead" },
      描述: {
        zh: "上海市级大学生创新创业训练计划，作为项目负责人获批市级立项。基于上海某银行客户数据做探索性分析，定位偿债能力与还贷意愿的关键特征；独立构建并交叉验证多种分类模型，最终设计名为「CNNCombine」的集成模型（4 层 1D-CNN + 最大池化 + 全局平均池化 + Dropout），实现了更优的特征提取与风险分割。项目顺利结题验收。",
        en: "Shanghai-level Innovation & Entrepreneurship Training Program, secured municipal-level approval as principal investigator. Conducted EDA on a Shanghai bank's customer data to surface key signals of repayment willingness and ability. Built and cross-validated multiple classifiers, ultimately designing the CNNCombine ensemble (4-layer 1D-CNN + max & global-average pooling + Dropout) for sharper risk segmentation.",
      },
      链接: "",
      证明图片: ["图片/项目/银行信用评分-市级结题.png"],
    },
    {
      时间: { zh: "2023.09 — 2024.06", en: "Sep 2023 — Jun 2024" },
      标题: { zh: "基于合作博弈的科创共同体联合攻关绩效评价研究", en: "Cooperative-Game-Based Performance Evaluation for R&D Consortia" },
      角色: { zh: "项目核心成员", en: "Core Team Member" },
      描述: {
        zh: "校级创新训练项目，作为团队负责人 / 第一作者获批校级立项。针对现有模型忽略「情绪状态影响」的研究空白，引入 RDEU（等级依赖期望效用）函数量化情绪因素，构建政府、企业、高校院所三方演化博弈模型；通过仿真分析揭示了适度监管的阈值效应，提出政府奖惩机制优化对策。",
        en: "University-level Innovation Training Program, secured project approval as team lead / first author. Filled a gap where prior work ignored emotional dynamics by introducing a Rank-Dependent Expected Utility function into a tripartite evolutionary game (government / firms / academia). Simulations revealed threshold effects in regulation.",
      },
      链接: "",
      证明图片: ["图片/项目/科创共同体-校级结题.png"],
    },
  ],

  // 论文（按发表时间倒序）
  论文列表: [
    {
      时间: { zh: "2025", en: "2025" },
      标题: {
        zh: "情绪状态对政府与科创主体策略选择的影响研究",
        en: "Studies on the Impact of Emotional States on Government Strategic Choices and the Subjects of Scientific and Technological Innovation",
      },
      期刊: { zh: "Operations Research and Fuzziology", en: "Operations Research and Fuzziology" },
      作者: { zh: "第一作者", en: "First Author" },
      描述: {
        zh: "以科创领域联合攻关决策为研究对象，探索情绪对策略选择的影响。基于等级依赖效用（RDEU）理论，构建政府与科创主体之间的演化博弈模型，将监管与合作策略中的情绪因素通过 RDEU 函数量化。仿真结果表明：情绪波动不仅影响决策稳定性，还会导致策略选择的动态变化——乐观情绪可能引发「过度合作」与资源浪费，悲观情绪则抑制合作意愿；政府监管力度与创新激励之间存在阈值效应，适度监管促进创新，超过阈值后的过度监管反而会抑制合作。",
        en: "Studied the impact of emotional states on collaborative R&D decisions. Built an evolutionary game model between government and innovation subjects based on Rank-Dependent Expected Utility (RDEU) theory, quantifying emotion-driven shifts in regulation and cooperation strategies. Simulations revealed that emotional volatility drives dynamic strategy shifts — optimism can trigger over-cooperation and resource waste; pessimism suppresses cooperation; and a threshold effect exists between regulatory intensity and innovation incentives, where moderate oversight encourages innovation while excessive oversight suppresses it.",
      },
      链接: "https://www.hanspub.org/journal/paperinformation?paperid=110711",
      证明图片: ["图片/论文/OperationsResearch发表.png"],
    },
    {
      时间: { zh: "2024", en: "2024" },
      标题: {
        zh: "政府引导机制下科创共同体联合攻关三方演化博弈及仿真分析",
        en: "Tripartite Evolutionary Game and Simulation Analysis of Science and Innovation Community Joint Research under the Government's Guiding Mechanism",
      },
      期刊: { zh: "Pure Mathematics", en: "Pure Mathematics" },
      作者: { zh: "第一作者 · 国家自然科学基金支持", en: "First Author · Supported by NSFC" },
      描述: {
        zh: "针对科创共同体缺乏系统性合作方案、激励政策互通性不足、绩效评价缺乏连续性等问题，基于效用理论构建科创企业、高校研究院所与政府的三方演化博弈模型，分析各方策略选择的演化稳定性。研究表明：政府增强奖惩力度可促进各方积极参与，但过度奖励会影响监管职责履行；要保障合作在演化稳定的市场环境下进行，政府需设定合理奖惩机制，使各方奖惩之和大于单独创新收益；监管力度较弱时，各方倾向于不参与合作。仿真验证了模型有效性，并为政府优化奖惩机制提供了可行对策。",
        en: "Addressed gaps in systemic cooperation, incentive interoperability, and continuous evaluation in innovation consortia. Built a tripartite evolutionary game model among innovative enterprises, universities/research institutes, and government, analyzing evolutionary stability of strategy choices. Findings: stronger reward-punishment mechanisms encourage participation, but excessive rewards undermine regulatory duty; the sum of all parties' incentives must exceed individual innovation gains to ensure stable cooperation; under weak regulation, parties tend not to cooperate. Simulations validated the model and informed government incentive design.",
      },
      链接: "https://www.hanspub.org/journal/paperinformation?paperid=83863",
      证明图片: ["图片/论文/PureMathematics发表.png"],
    },
  ],

  // 工作 / 创业经历
  经历列表: [
    {
      时间: { zh: "2025.11 — 2026.04", en: "Nov 2025 — Apr 2026" },
      公司: { zh: "杭州维艺塔国际贸易有限公司 · 杭州 / 义乌", en: "Hangzhou Vita International Trade Co., Ltd. · Hangzhou / Yiwu" },
      职位: { zh: "创始人", en: "Founder" },
      描述: {
        zh: "于杭州、义乌两大商贸枢纽创办外贸公司，独立跑通从前端采购、团队协作、跨国资金结算到仓储物流交付的全链路商业闭环。期间累计 GMV 接近 60 万人民币，深入理解了跨境贸易中的客户痛点与效率瓶颈。",
        en: "Founded a cross-border trade company across Hangzhou and Yiwu, running the full commercial loop end-to-end — sourcing, team coordination, cross-border settlement, warehousing, and logistics. Cumulative GMV approaching ¥600K RMB during the period, with first-hand insight into customer pain points and efficiency bottlenecks in global trade.",
      },
      链接: "",
      证明图片: [],
    },
    {
      时间: { zh: "2025.09 — 2025.11", en: "Sep 2025 — Nov 2025" },
      公司: { zh: "独立私域电商工作室", en: "Independent Private-Domain E-commerce Studio" },
      职位: { zh: "创始人 / 操盘手", en: "Founder / Operator" },
      描述: {
        zh: "独立操盘私域电商项目，从选品、内容运营到成交转化全链路自负责。期间累计 GMV 接近 22 万人民币，验证了私域流量的关键转化节点与可复用的运营 SOP。",
        en: "Solo-operated a private-domain e-commerce project end-to-end — sourcing, content operations, and conversion. Cumulative GMV approaching ¥220K RMB, validating key conversion levers and reusable operating playbooks for private-domain traffic.",
      },
      链接: "",
      证明图片: [],
    },
    {
      时间: { zh: "2023.12 — 2024.06", en: "Dec 2023 — Jun 2024" },
      公司: { zh: "中国商飞试飞中心", en: "COMAC Flight Test Center" },
      职位: { zh: "测试工程部 · 综合管理实习生", en: "Operations Intern, Test Engineering" },
      描述: {
        zh: "在测试工程部综合管理岗实习，负责档案整理、归档与信息记录的全流程，建立起对部门业务运转细节的整体感知；与行政团队协作，将 SQCDP 管理框架落地到日常运营中，并参与制度梳理，对大型央企的管理思路与运行机制有了第一手观察。",
        en: "Operations intern in the Test Engineering department. Owned end-to-end records management — sorting, archiving, and information logging — and built a hands-on understanding of how the department actually runs. Worked with the administrative team to apply the SQCDP framework to daily operations, and observed how a large state-owned enterprise structures its management and processes from the inside.",
      },
      链接: "",
      证明图片: ["图片/经历/中国商飞-实习证明.png"],
    },
  ],

  // 奖项 · 三类：学术与专业竞赛 / 专业认证 / 奖学金与荣誉
  // 顺序按重要度从高到低
  奖项列表: [
    // ===== 学术与专业竞赛 =====
    {
      类别: { zh: "学术与专业竞赛", en: "Competitions" },
      时间: { zh: "2024.06", en: "Jun 2024" },
      标题: { zh: "上海市大学生金融智能工程应用创新大赛", en: "Shanghai Collegiate Financial Intelligence Engineering Innovation Competition" },
      标签: { zh: "教育部 A 类", en: "MOE Class A" },
      等级: { zh: "上海市特等奖 · 该赛道唯一捧杯奖 · 团队负责人", en: "Shanghai Grand Prize · Sole Trophy Award in Track · Team Leader" },
      证明图片: ["图片/奖项/金融智能工程-上海市特等奖.png"],
    },
    {
      类别: { zh: "学术与专业竞赛", en: "Competitions" },
      时间: { zh: "2024.04", en: "Apr 2024" },
      标题: { zh: "第十四届全国大学生市场调查与分析大赛", en: "14th National Market Survey & Analysis Competition" },
      标签: { zh: "教育部 A 类", en: "MOE Class A" },
      等级: { zh: "上海市一等奖 · 团队负责人", en: "Shanghai 1st Prize · Team Leader" },
      证明图片: ["图片/奖项/市场调查与分析大赛-上海市一等奖.png"],
    },
    {
      类别: { zh: "学术与专业竞赛", en: "Competitions" },
      时间: { zh: "2023.12", en: "Dec 2023" },
      标题: { zh: "第十五届全国大学生数学竞赛（非数学 A 类）", en: "15th National College Mathematics Competition" },
      标签: { zh: "教育部 A 类", en: "MOE Class A" },
      等级: { zh: "全国三等奖 · 个人竞赛", en: "National 3rd Prize · Individual" },
      证明图片: ["图片/奖项/大学生数学竞赛-全国三等奖.png"],
    },
    {
      类别: { zh: "学术与专业竞赛", en: "Competitions" },
      时间: { zh: "2023.11", en: "Nov 2023" },
      标题: { zh: "2023 年全国大学生数学建模竞赛", en: "2023 China Undergraduate Mathematical Contest in Modeling" },
      标签: { zh: "教育部 A 类", en: "MOE Class A" },
      等级: { zh: "上海市三等奖 · 团队核心成员", en: "Shanghai 3rd Prize · Core Team Member" },
      证明图片: ["图片/奖项/数学建模竞赛-上海市三等奖.png"],
    },
    {
      类别: { zh: "学术与专业竞赛", en: "Competitions" },
      时间: { zh: "2023.10", en: "Oct 2023" },
      标题: { zh: "2023 年全国高校商业精英挑战赛国际贸易竞赛（国际贸易业务模拟赛道）", en: "2023 National Business Elite Challenge — International Trade (Business Simulation Track)" },
      标签: { zh: "教育部 A 类", en: "MOE Class A" },
      等级: { zh: "全国二等奖 · 上海市一等奖 · 团队核心成员", en: "National 2nd Prize · Shanghai 1st Prize · Core Team Member" },
      证明图片: [
        "图片/奖项/商业精英挑战赛-国际贸易-全国二等奖.png",
        "图片/奖项/商业精英挑战赛-国际贸易-上海市一等奖.png",
      ],
    },
    {
      类别: { zh: "学术与专业竞赛", en: "Competitions" },
      时间: { zh: "2022.12", en: "Dec 2022" },
      标题: { zh: "首届全国大学生大数据分析技术技能大赛（Python 数据分析）", en: "1st National Big Data Analysis Skills Contest (Python)" },
      标签: { zh: "教育部 A 类", en: "MOE Class A" },
      等级: { zh: "上海市三等奖 · 个人竞赛", en: "Shanghai 3rd Prize · Individual" },
      证明图片: ["图片/奖项/大数据分析竞赛-上海市三等奖.png"],
    },

    // ===== 专业认证 =====
    {
      类别: { zh: "专业认证", en: "Certifications" },
      时间: { zh: "2024.05", en: "May 2024" },
      标题: { zh: "华为 HarmonyOS 应用开发者高级认证", en: "Huawei HarmonyOS Application Developer (Senior)" },
      等级: { zh: "高级认证", en: "Senior Certification" },
      证明图片: ["图片/奖项/HarmonyOS-高级认证.png"],
    },
    {
      类别: { zh: "专业认证", en: "Certifications" },
      时间: { zh: "2022.12", en: "Dec 2022" },
      标题: { zh: "北京大数据协会 · 数据分析师", en: "Beijing Big Data Association — Data Analyst" },
      等级: { zh: "初级认证（基础知识 + 专业能力）", en: "Junior Certification" },
      证明图片: ["图片/奖项/北京大数据协会-数据分析师初级.png"],
    },
    {
      类别: { zh: "专业认证", en: "Certifications" },
      时间: { zh: "2022.10", en: "Oct 2022" },
      标题: { zh: "复旦大学「赋能青年人才」国际胜任力培训项目（第三期）", en: "Fudan Youth Empowerment — Global Competence Program (Cohort III)" },
      等级: { zh: "结业证书", en: "Completion Certificate" },
      证明图片: ["图片/奖项/复旦大学-国际胜任力培训.png"],
    },

    // ===== 奖学金与荣誉 =====
    {
      类别: { zh: "奖学金与荣誉", en: "Scholarships & Honors" },
      时间: { zh: "2023 — 2024 学年", en: "2023 — 2024" },
      标题: { zh: "上海理工大学「优秀学生」称号", en: "USST Outstanding Student" },
      等级: { zh: "校级荣誉称号", en: "University Honor" },
      证明图片: ["图片/奖项/上理工-优秀学生-2023-2024.png"],
    },
    {
      类别: { zh: "奖学金与荣誉", en: "Scholarships & Honors" },
      时间: { zh: "2024 — 2025 学年", en: "2024 — 2025" },
      标题: { zh: "学习优秀二等奖学金", en: "Academic Excellence Scholarship — 2nd Class" },
      等级: { zh: "校级奖学金", en: "University Scholarship" },
      证明图片: ["图片/奖项/上理工-学习优秀二等奖学金-2024-2025.png"],
    },
    {
      类别: { zh: "奖学金与荣誉", en: "Scholarships & Honors" },
      时间: { zh: "2023 — 2024 学年", en: "2023 — 2024" },
      标题: { zh: "学习优秀三等奖学金", en: "Academic Excellence Scholarship — 3rd Class" },
      等级: { zh: "校级奖学金", en: "University Scholarship" },
      证明图片: ["图片/奖项/上理工-学习优秀三等奖学金-2023-2024.png"],
    },
    {
      类别: { zh: "奖学金与荣誉", en: "Scholarships & Honors" },
      时间: { zh: "2022 — 2023 学年", en: "2022 — 2023" },
      标题: { zh: "社会工作专项奖学金", en: "Social Service Scholarship" },
      等级: { zh: "校级奖学金", en: "University Scholarship" },
      证明图片: ["图片/奖项/上理工-社会工作专项奖学金-2022-2023.png"],
    },
    {
      类别: { zh: "奖学金与荣誉", en: "Scholarships & Honors" },
      时间: { zh: "大学期间", en: "University Years" },
      标题: { zh: "上海市疫情防控青年志愿者 · 管理学院「优秀志愿者」", en: "Shanghai Youth Volunteer (COVID-19) · College Outstanding Volunteer" },
      等级: { zh: "市级 · 校级荣誉", en: "Municipal & College Honor" },
      证明图片: [
        "图片/奖项/疫情防控-青年志愿者.png",
        "图片/奖项/管理学院-优秀志愿者.png",
      ],
    },
  ],
};
