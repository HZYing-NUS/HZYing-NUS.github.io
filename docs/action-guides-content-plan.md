# Action guides 内容规划

## 一、结论

Action guides 不应该是“把几个相关工具放在一起”，而应该是“帮助一个明确用户完成一个明确任务”。Resources 负责回答“这个工具是什么、什么时候用”，Action guides 负责回答“我现在该按什么顺序做、每一步产出什么、做到什么程度算完成”。

首批专题应围绕 WebTools 的核心用户：已经会使用 AI 编程工具，但还没有独立跑通完整 Web 产品流程的初级用户。优先覆盖从想法到上线的主路径，再补充上线后的分析、客服和增长任务。

## 二、Resources 现状

截至 2026 年 7 月 24 日，线上 Resources 共有 63 个资源、7 个建站阶段、19 个分类。

### 建站阶段

1. 发现需求。
2. 验证想法。
3. 设计原型。
4. 开发搭建。
5. 部署上线。
6. 分析优化。
7. 运营增长。

### 资源分类

1. 社区与公开构建：Reddit、X、GitHub、Product Hunt、Indie Hackers。
2. 行业与技术动态：Hacker News、TechCrunch、The Hacker News、GitHub Trending。
3. 产品与生态目录：Skills.sh、MCP Market、Toolify、There's An AI For That。
4. 市场与竞品情报：Similarweb、SEO Box Referring。
5. 软件与商业机会市场：AppSumo、TrustMRR、Fiverr、ThemeForest。
6. AI 模型评测：Artificial Analysis、Arena AI。
7. AI 建站与原型：Airtable、Bolt、Lovable、Stitch、Pen.dev。
8. AI 助手与 Agent：Coze、Monica。
9. 设计灵感与参考：Design Lab、One Page Love、MotionSites。
10. 视觉素材：Iconfont、Font Awesome、Iconify、Lorem Picsum、Unsplash、Pexels。
11. SaaS 模板：ShipAny Template Two、MkSaaS、Magic UI Pro。
12. 前端组件：Aceternity UI、21st.dev、Magic UI、Animate UI、React Bits。
13. 数据库与管理：Supabase、Neon、TablePlus。
14. 开发者工具：Tavily、Crontab.guru。
15. 部署与托管：Vercel。
16. 域名服务：Instant Domain Search、Query.Domains、Namecheap、Spaceship。
17. 数据与行为分析：Plausible、Google Analytics、OpenPanel、Microsoft Clarity。
18. 性能与 SEO：PageSpeed Insights、AITDK。
19. 客服与社区运营：Crisp、Discord。

## 三、Action guides 的编写原则

### 1. 标题写用户目标，不写工具类别

推荐：“验证一个产品想法有没有人需要”。

不推荐：“市场与竞品研究工具合集”。

### 2. 一个专题只解决一个任务

专题应能在一次连续行动中完成，建议包含 3～7 个步骤。任务过大时拆成多个专题，例如“把产品上线”与“配置上线后的数据分析”应该分开。

### 3. 每一步都必须产生交付物

步骤不能只写“浏览 Reddit”或“使用 Similarweb”，而要写成可验证动作，例如：“记录 10 条重复抱怨，并按问题、现有替代方案、付费信号整理成表格”。

### 4. 工具是步骤中的选择，不是专题主体

先写用户要完成的动作，再关联最合适的资源。存在替代工具时，明确写出选择条件，不要求用户把同类工具全部使用一遍。

### 5. 开头说明适用人群与前置条件

用户进入专题后应立即知道：这个专题适合谁、开始前需要准备什么、预计需要多久、最终会得到什么。

### 6. 结尾提供完成标准和下一步

完成标准必须可以自检。专题结束后只推荐一个主要下一步，避免再次把选择压力交给用户。

### 7. 中英文同步发布

中文和英文版本应表达同一任务、步骤和完成标准，不做逐字硬翻译。涉及工具界面名称时保留其官方英文名称。

## 四、统一内容模板

每个 Action guide 使用以下结构：

1. 任务标题：以动词开头，描述用户要完成的结果。
2. 一句话说明：说明为什么现在要做这件事。
3. 适合谁：列出 1～3 个具体使用场景。
4. 前置条件：用户开始前必须拥有的信息、账号或材料。
5. 预计用时：给出真实的时间范围。
6. 最终交付物：明确列出完成后获得的文件、页面、数据或决策。
7. 执行步骤：每步包含“动作、推荐资源、替代资源、产出、通过标准、常见错误”。
8. 总完成标准：用户如何判断整个任务已经完成。
9. 下一步：链接到下一条最相关的 Action guide。
10. 最近核验时间：标记步骤和工具最后一次检查日期。

单个步骤建议采用以下写法：

```text
步骤名称：收集真实问题
要做什么：在目标用户所在社区搜索 3～5 个核心关键词，收集重复出现的问题。
推荐资源：Reddit。
替代资源：X、Indie Hackers。
本步产出：至少 10 条用户原话，归纳为 3 个重复问题。
通过标准：每个问题都包含使用场景、现有替代方案和不满意原因。
常见错误：只记录高赞观点，没有检查评论和发布时间。
```

## 五、首批专题规划

### P0：先完成从想法到上线的主路径

| 顺序 | Action guide                   | 用户最终得到什么                         | 可关联的核心 Resources                                   |
| ---- | ------------------------------ | ---------------------------------------- | -------------------------------------------------------- |
| 1    | 找到一个值得验证的产品问题     | 3 个重复问题、用户原话、现有替代方案清单 | Reddit、Product Hunt、Toolify、There's An AI For That    |
| 2    | 验证一个产品想法有没有人需要   | 目标用户、最危险假设、竞品证据、验证结论 | Reddit、Similarweb、Product Hunt、TrustMRR               |
| 3    | 把想法做成可测试的产品原型     | 核心流程、页面结构、可点击原型           | Stitch、Design Lab、One Page Love、Bolt 或 Lovable       |
| 4    | 为 Web 产品选择最小技术方案    | 技术选型表、唯一主模板、数据库和部署方案 | ShipAny Template Two 或 MkSaaS、Supabase 或 Neon、Vercel |
| 5    | 给产品配置数据库和基础数据管理 | 数据表、权限规则、迁移记录、检查方法     | Supabase 或 Neon、TablePlus                              |
| 6    | 购买域名并发布第一个可访问版本 | 可访问域名、生产部署、环境变量检查结果   | Instant Domain Search、Namecheap 或 Spaceship、Vercel    |
| 7    | 完成上线前的性能与 SEO 检查    | 性能报告、标题和描述、待修复清单         | PageSpeed Insights、AITDK                                |

### P1：补齐上线后的反馈闭环

| 顺序 | Action guide                   | 用户最终得到什么                 | 可关联的核心 Resources                           |
| ---- | ------------------------------ | -------------------------------- | ------------------------------------------------ |
| 8    | 配置第一套网站和产品数据分析   | 核心转化、3～5 个事件、基础漏斗  | Plausible 或 Google Analytics、OpenPanel         |
| 9    | 找出用户在关键页面卡住的位置   | 热力图、会话回放观察、改版优先级 | Microsoft Clarity、Plausible 或 Google Analytics |
| 10   | 给网站接入第一套客服反馈入口   | 在线客服、离线消息、问题分类表   | Crisp                                            |
| 11   | 在 Product Hunt 发布第一个版本 | 发布素材、上线清单、评论反馈记录 | Product Hunt、X、Indie Hackers                   |

### P2：根据用户需求逐步扩展

| Action guide                 | 用户最终得到什么                       | 可关联的核心 Resources                      |
| ---------------------------- | -------------------------------------- | ------------------------------------------- |
| 为 AI 功能选择合适的模型     | 质量、速度、价格对比和实测结论         | Artificial Analysis、Arena AI               |
| 给 AI 产品接入联网搜索       | 搜索范围、来源规则、成本边界和测试结果 | Tavily                                      |
| 建立每周竞品与流量观察流程   | 固定观察名单、记录模板和每周结论       | Similarweb、SEO Box Referring、Product Hunt |
| 为产品建立用户社区           | 频道结构、社区规则和运营节奏           | Discord、X                                  |
| 为界面建立一致的视觉素材方案 | 图标、图片来源、尺寸和授权规范         | Iconify、Unsplash、Pexels                   |

## 六、发布优先级

首轮只发布 P0 的前 3 条专题，并邀请真实初级用户照着完成。观察他们在哪一步停下、是否理解交付物、是否需要离开页面自行搜索。根据反馈修订模板后，再继续发布其余专题。

专题优先级按以下权重评估：

1. 用户影响，40％：这个任务是否是初级用户反复卡住的问题。
2. 产品匹配，30％：是否直接支持“把第一个 Web 产品做出来”。
3. 搜索需求，20％：是否对应明确的“如何做”搜索意图。
4. 编写成本，10％：现有 Resources 是否足以组成可靠路径。

## 七、质量检查清单

发布前逐项确认：

1. 标题是否描述了结果，而不是工具或宽泛主题。
2. 是否明确适用人群、前置条件、预计用时和最终交付物。
3. 每一步是否只有一个主要动作。
4. 每一步是否有可检查的产出和通过标准。
5. 推荐工具与替代工具是否写明选择条件。
6. 是否删除了与任务无关的资源，避免为了增加数量而凑步骤。
7. 所有关联资源是否仍可访问，说明是否与当前产品一致。
8. 中英文内容是否同步。
9. 最终完成标准是否能由用户自行判断。
10. 下一步是否只提供一个主要方向。
