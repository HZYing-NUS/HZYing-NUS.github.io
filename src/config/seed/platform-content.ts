export type LocaleText = {
  zh: string;
  en: string;
};

export type ResourceUsageStatus = 'daily' | 'used' | 'occasional';

export type PlatformResource = {
  slug: string;
  name: LocaleText;
  website: string;
  type: LocaleText;
  stage: LocaleText;
  stages?: LocaleText[];
  category: LocaleText;
  tags: LocaleText[];
  priceType: LocaleText;
  summary: LocaleText;
  reason: LocaleText;
  useCase: LocaleText;
  caution?: LocaleText;
  notFor?: LocaleText;
  usageStatus: ResourceUsageStatus;
  verifiedAt: string;
  featured: boolean;
  allowAiCitation: boolean;
  sortOrder: number;
};

export type PlatformCollectionStep = {
  resourceSlug: string;
  title: LocaleText;
  description: LocaleText;
  relationType?: 'required' | 'alternative';
};

export type PlatformCollection = {
  slug: string;
  title: LocaleText;
  summary: LocaleText;
  content: LocaleText;
  duration: LocaleText;
  audience: LocaleText[];
  prerequisites: LocaleText[];
  deliverables: LocaleText[];
  completionCriteria: LocaleText[];
  verifiedAt: string;
  nextSlug?: string;
  nextTitle?: LocaleText;
  stage: LocaleText;
  category: LocaleText;
  tags: LocaleText[];
  steps: PlatformCollectionStep[];
  featured: boolean;
  allowAiCitation: boolean;
  sortOrder: number;
};

type TextPair = [zh: string, en: string];
type StageKey = keyof typeof stages;
type CategoryKey = keyof typeof categories;
type PriceKey = keyof typeof prices;

type ResourceDraft = {
  slug: string;
  name: string;
  website: string;
  type: TextPair;
  stage: StageKey;
  stages?: StageKey[];
  category: CategoryKey;
  tags: TextPair[];
  price: PriceKey;
  summary: TextPair;
  reason: TextPair;
  useCase: TextPair;
  caution?: TextPair;
  notFor?: TextPair;
  usage?: ResourceUsageStatus;
  featured?: boolean;
};

const verifiedAt = '2026-07-24';
const t = ([zh, en]: TextPair): LocaleText => ({ zh, en });

const stages = {
  discover: t(['发现需求', 'Discover demand']),
  validate: t(['验证想法', 'Validate the idea']),
  design: t(['设计原型', 'Design and prototype']),
  develop: t(['开发搭建', 'Build the product']),
  launch: t(['部署上线', 'Launch']),
  optimize: t(['分析优化', 'Measure and optimize']),
  operate: t(['运营增长', 'Operate and grow']),
};

export const platformStageOrder = Object.values(stages);

const categories = {
  community: t(['社区与公开构建', 'Community and building in public']),
  intelligence: t(['市场与竞品情报', 'Market and competitor intelligence']),
  news: t(['行业与技术动态', 'Industry and technology news']),
  directory: t(['产品与生态目录', 'Product and ecosystem directories']),
  marketplace: t(['软件与商业机会市场', 'Software and business marketplaces']),
  model: t(['AI 模型评测', 'AI model evaluation']),
  prototype: t(['AI 建站与原型', 'AI builders and prototypes']),
  assistant: t(['AI 助手与 Agent', 'AI assistants and agents']),
  inspiration: t(['设计灵感与参考', 'Design inspiration']),
  assets: t(['视觉素材', 'Visual assets']),
  template: t(['SaaS 模板', 'SaaS templates']),
  component: t(['前端组件', 'Frontend components']),
  database: t(['数据库与管理', 'Databases and management']),
  developer: t(['开发者工具', 'Developer tools']),
  deployment: t(['部署与托管', 'Deployment and hosting']),
  domain: t(['域名服务', 'Domain services']),
  analytics: t(['数据与行为分析', 'Analytics and behavior']),
  performance: t(['性能与 SEO', 'Performance and SEO']),
  support: t(['客服与社区运营', 'Support and community operations']),
};

const prices = {
  free: t(['免费', 'Free']),
  freemium: t(['免费增值', 'Freemium']),
  paid: t(['付费', 'Paid']),
  openSource: t(['开源', 'Open source']),
  marketplace: t(['按项目或商品付费', 'Pay per project or item']),
};

function defineResource(
  draft: ResourceDraft,
  sortOrder: number
): PlatformResource {
  return {
    slug: draft.slug,
    name: { zh: draft.name, en: draft.name },
    website: draft.website,
    type: t(draft.type),
    stage: stages[draft.stage],
    stages: (draft.stages || [draft.stage]).map((stage) => stages[stage]),
    category: categories[draft.category],
    tags: draft.tags.map(t),
    priceType: prices[draft.price],
    summary: t(draft.summary),
    reason: t(draft.reason),
    useCase: t(draft.useCase),
    caution: draft.caution ? t(draft.caution) : undefined,
    notFor: draft.notFor ? t(draft.notFor) : undefined,
    usageStatus: draft.usage || 'used',
    verifiedAt,
    featured: draft.featured || false,
    allowAiCitation: true,
    sortOrder,
  };
}

const resourceDrafts: ResourceDraft[] = [
  {
    slug: 'reddit',
    name: 'Reddit',
    website: 'https://www.reddit.com',
    type: ['社区平台', 'Community platform'],
    stage: 'discover',
    category: 'community',
    price: 'freemium',
    featured: true,
    tags: [
      ['需求发现', 'Demand discovery'],
      ['社区讨论', 'Community'],
      ['公开构建', 'Building in public'],
    ],
    summary: [
      '由大量主题社区组成的讨论平台，适合观察真实抱怨、工作流和细分人群语言。',
      'A network of topic communities for observing real complaints, workflows, and the language used by niche audiences.',
    ],
    reason: [
      '讨论通常比榜单更接近真实问题，能够看到用户为什么不满意现有方案。',
      'Discussions often reveal real problems more clearly than rankings and show why users dislike existing solutions.',
    ],
    useCase: [
      '搜索目标用户所在 Subreddit，记录重复出现的问题、替代方案和付费意愿信号。',
      'Search relevant subreddits and record recurring problems, alternatives, and willingness-to-pay signals.',
    ],
    caution: [
      '不要只看高赞帖子；同时检查评论、发布时间和社区规则。',
      'Do not rely only on highly upvoted posts; inspect comments, dates, and community rules.',
    ],
  },
  {
    slug: 'x',
    name: 'X',
    website: 'https://x.com',
    type: ['社交网络', 'Social network'],
    stage: 'discover',
    stages: ['discover', 'operate'],
    category: 'community',
    price: 'freemium',
    featured: true,
    tags: [
      ['公开构建', 'Building in public'],
      ['行业动态', 'Industry news'],
      ['个人品牌', 'Personal brand'],
    ],
    summary: [
      '实时社交与信息网络，可追踪开发者、创业者、产品发布和行业讨论。',
      'A real-time social network for following builders, founders, launches, and industry conversations.',
    ],
    reason: [
      '适合同时完成信息输入、建立同行关系和持续发布产品进度。',
      'Useful for combining information discovery, peer relationships, and ongoing product updates.',
    ],
    useCase: [
      '建立垂直领域关注列表，发布开发日志，并观察同行的发布节奏和用户反馈。',
      'Build focused lists, publish development logs, and observe how peers launch and receive feedback.',
    ],
    caution: [
      '时间线噪声较高，应使用列表和关键词主动筛选。',
      'The timeline is noisy, so use lists and keywords to filter intentionally.',
    ],
  },
  {
    slug: 'github',
    name: 'GitHub',
    website: 'https://github.com',
    type: ['代码托管与协作平台', 'Code hosting and collaboration platform'],
    stage: 'discover',
    stages: ['discover', 'develop', 'operate'],
    category: 'community',
    price: 'freemium',
    featured: true,
    tags: [
      ['开源项目', 'Open source'],
      ['代码托管', 'Code hosting'],
      ['竞品研究', 'Competitor research'],
    ],
    summary: [
      '代码托管和开发协作平台，也可用于发现开源项目、技术趋势与真实实现方式。',
      'A code hosting and collaboration platform that also reveals open-source projects, technical trends, and real implementations.',
    ],
    reason: [
      '不仅保存代码，还能通过 Stars、Issues、Pull Requests 和提交记录判断项目活跃度。',
      'Beyond hosting code, stars, issues, pull requests, and commits help judge project activity.',
    ],
    useCase: [
      '寻找可复用项目、研究竞品技术路线、管理自己的产品仓库并公开进度。',
      'Find reusable projects, study competitor approaches, manage product repositories, and build in public.',
    ],
  },
  {
    slug: 'product-hunt',
    name: 'Product Hunt',
    website: 'https://www.producthunt.com',
    type: ['产品发布与发现平台', 'Product launch and discovery platform'],
    stage: 'discover',
    stages: ['discover', 'operate'],
    category: 'community',
    price: 'free',
    featured: true,
    tags: [
      ['新品发现', 'Product discovery'],
      ['产品发布', 'Product launch'],
      ['用户反馈', 'Feedback'],
    ],
    summary: [
      '每天展示新产品和排行榜的平台，可观察新品定位、文案、视觉和早期反馈。',
      'A daily product launch platform for observing positioning, copy, visuals, and early feedback.',
    ],
    reason: [
      '适合快速扫描正在被验证的产品方向，也能作为未来发布渠道。',
      'Good for scanning product directions being tested and for planning a future launch channel.',
    ],
    useCase: [
      '按分类查看每日新品，拆解高票产品的标题、卖点、定价和评论。',
      'Browse daily launches by category and analyze headlines, value propositions, pricing, and comments.',
    ],
    caution: [
      '票数代表发布当天的传播效果，不等于长期需求或收入。',
      'Upvotes measure launch-day attention, not necessarily durable demand or revenue.',
    ],
  },
  {
    slug: 'hacker-news',
    name: 'Hacker News',
    website: 'https://news.ycombinator.com',
    type: ['科技社区与新闻聚合', 'Technology community and news aggregator'],
    stage: 'discover',
    category: 'news',
    price: 'free',
    featured: true,
    tags: [
      ['创业讨论', 'Startup discussion'],
      ['技术趋势', 'Technology trends'],
      ['Show HN', 'Show HN'],
    ],
    summary: [
      'Y Combinator 运营的技术与创业社区，聚合文章、项目展示、问答和招聘信息。',
      'Y Combinator’s technology and startup community for articles, project demos, questions, and jobs.',
    ],
    reason: [
      '评论区经常包含资深开发者和创业者对新技术与产品的直接判断。',
      'Comments often contain direct assessments from experienced developers and founders.',
    ],
    useCase: [
      '阅读首页与 Show HN，观察新产品如何描述问题，以及技术人群如何质疑方案。',
      'Read the front page and Show HN to see how products frame problems and how technical audiences challenge them.',
    ],
    usage: 'daily',
  },
  {
    slug: 'indie-hackers',
    name: 'Indie Hackers',
    website: 'https://www.indiehackers.com',
    type: ['独立开发者社区', 'Indie founder community'],
    stage: 'discover',
    stages: ['discover', 'operate'],
    category: 'community',
    price: 'free',
    tags: [
      ['独立开发', 'Indie hacking'],
      ['收入复盘', 'Revenue stories'],
      ['公开构建', 'Building in public'],
    ],
    summary: [
      '独立开发者分享产品策略、收入数据、失败经验和增长过程的社区。',
      'A community where indie founders share product strategy, revenue, failures, and growth journeys.',
    ],
    reason: [
      '能看到小团队和个人开发者更贴近现实约束的决策过程。',
      'Shows decision-making under the practical constraints faced by solo builders and small teams.',
    ],
    useCase: [
      '研究相似产品的获客、定价和收入路径，并发布自己的阶段进度。',
      'Study acquisition, pricing, and revenue paths for similar products and share progress.',
    ],
  },
  {
    slug: 'techcrunch',
    name: 'TechCrunch',
    website: 'https://techcrunch.com',
    type: ['科技媒体', 'Technology publication'],
    stage: 'discover',
    category: 'news',
    price: 'freemium',
    usage: 'daily',
    tags: [
      ['创业新闻', 'Startup news'],
      ['融资', 'Funding'],
      ['科技趋势', 'Technology trends'],
    ],
    summary: [
      '关注科技公司、创业项目、融资与产品动态的新闻媒体。',
      'A publication covering technology companies, startups, funding, and product news.',
    ],
    reason: [
      '适合了解资本、平台和头部公司的方向变化，补充社区视角。',
      'Useful for tracking shifts among investors, platforms, and major companies beyond community discussion.',
    ],
    useCase: [
      '每天快速浏览重点新闻，再对与当前产品有关的公司和赛道深入跟踪。',
      'Scan major stories daily, then investigate companies and sectors relevant to the current product.',
    ],
  },
  {
    slug: 'the-hacker-news',
    name: 'The Hacker News',
    website: 'https://thehackernews.com',
    type: ['网络安全媒体', 'Cybersecurity publication'],
    stage: 'discover',
    stages: ['discover', 'operate'],
    category: 'news',
    price: 'free',
    usage: 'daily',
    tags: [
      ['网络安全', 'Cybersecurity'],
      ['漏洞', 'Vulnerabilities'],
      ['数据泄露', 'Data breaches'],
    ],
    summary: [
      '提供网络安全新闻、漏洞、威胁情报和数据泄露分析的专业媒体。',
      'A cybersecurity publication covering vulnerabilities, threat intelligence, and data breaches.',
    ],
    reason: [
      '建站和运营都涉及账号、依赖和用户数据，安全事件需要持续关注。',
      'Building and operating a product involves accounts, dependencies, and user data, so security news matters.',
    ],
    useCase: [
      '关注与你所用框架、云服务和认证系统有关的重大漏洞与攻击方式。',
      'Track major vulnerabilities affecting the frameworks, cloud services, and authentication systems you use.',
    ],
  },
  {
    slug: 'github-trending',
    name: 'GitHub Trending',
    website: 'https://github.com/trending',
    type: ['开源趋势榜单', 'Open-source trend ranking'],
    stage: 'discover',
    category: 'news',
    price: 'free',
    usage: 'daily',
    tags: [
      ['开源趋势', 'Open-source trends'],
      ['热门仓库', 'Trending repositories'],
      ['技术选型', 'Technology selection'],
    ],
    summary: [
      '展示 GitHub 社区当前关注度快速上升的仓库和开发者。',
      'Shows repositories and developers gaining attention across GitHub.',
    ],
    reason: [
      '适合发现新框架、Agent 工具、组件库和可复用的产品实现。',
      'Useful for discovering new frameworks, agent tools, component libraries, and reusable implementations.',
    ],
    useCase: [
      '按日或周查看趋势仓库，筛选与你当前阶段相关且仍在活跃维护的项目。',
      'Review daily or weekly trends and filter for actively maintained projects relevant to the current stage.',
    ],
    caution: [
      '短期 Star 增长不代表生产可用，需要继续检查文档、Issues 和维护频率。',
      'Short-term star growth does not prove production readiness; inspect docs, issues, and maintenance activity.',
    ],
  },
  {
    slug: 'skills-sh',
    name: 'Skills.sh',
    website: 'https://www.skills.sh',
    type: ['Agent Skill 目录', 'Agent skill directory'],
    stage: 'discover',
    stages: ['discover', 'develop'],
    category: 'directory',
    price: 'free',
    usage: 'daily',
    featured: true,
    tags: [
      ['Agent Skill', 'Agent skills'],
      ['AI 编程', 'AI coding'],
      ['排行榜', 'Ranking'],
    ],
    summary: [
      '用于发现和安装 AI Agent Skills 的目录与趋势榜单。',
      'A directory and leaderboard for discovering and installing skills for AI agents.',
    ],
    reason: [
      '能快速看到 Agent 生态正在沉淀哪些可复用工作流和专业能力。',
      'Reveals which reusable workflows and specialist capabilities are emerging in the agent ecosystem.',
    ],
    useCase: [
      '按趋势浏览 Skill，核对来源仓库后安装到 Codex、Claude Code 等工作流。',
      'Browse trending skills, verify the source repository, then install them into Codex or Claude Code workflows.',
    ],
    caution: [
      'Skill 会执行指令或调用工具，安装前必须阅读来源和权限范围。',
      'Skills can execute instructions or call tools, so review their source and permissions before installing.',
    ],
  },
  {
    slug: 'mcp-market',
    name: 'MCP Market',
    website: 'https://mcpmarket.com',
    type: ['MCP 与 Agent 工具目录', 'MCP and agent tool directory'],
    stage: 'discover',
    stages: ['discover', 'develop'],
    category: 'directory',
    price: 'free',
    usage: 'daily',
    featured: true,
    tags: [
      ['MCP Server', 'MCP servers'],
      ['Agent 工具', 'Agent tools'],
      ['生态目录', 'Ecosystem directory'],
    ],
    summary: [
      '收录 MCP Servers、Agent Skills、客户端和 Agent 工具的生态目录。',
      'An ecosystem directory of MCP servers, agent skills, clients, and agent tools.',
    ],
    reason: [
      '适合判断某项外部能力是否已有标准化连接方式，不必从零集成。',
      'Helps determine whether an external capability already has a standard integration path.',
    ],
    useCase: [
      '查找数据库、设计、浏览器或开发工具的 MCP Server，再回到官方仓库核验。',
      'Find MCP servers for databases, design, browsers, or developer tools, then verify them at the official repository.',
    ],
    caution: [
      '目录收录不等于安全背书，应检查维护者、代码和授权范围。',
      'Directory inclusion is not a security endorsement; inspect maintainers, code, and requested access.',
    ],
  },
  {
    slug: 'toolify',
    name: 'Toolify',
    website: 'https://www.toolify.ai',
    type: ['AI 工具目录与榜单', 'AI tool directory and rankings'],
    stage: 'discover',
    category: 'directory',
    price: 'freemium',
    usage: 'daily',
    tags: [
      ['AI 工具', 'AI tools'],
      ['流量榜单', 'Traffic rankings'],
      ['竞品发现', 'Competitor discovery'],
    ],
    summary: [
      '大型 AI 工具目录，提供分类、新品、流量和热门榜单。',
      'A large AI tool directory with categories, new releases, traffic data, and rankings.',
    ],
    reason: [
      '可以快速判断一个 AI 产品方向里已有多少工具、哪些获得了流量。',
      'Quickly shows how crowded an AI product category is and which tools have attracted traffic.',
    ],
    useCase: [
      '搜索目标任务，整理主要竞品、分类方式和排名靠前产品的定位。',
      'Search a target task and map leading competitors, category structure, and product positioning.',
    ],
  },
  {
    slug: 'theres-an-ai-for-that',
    name: "There's An AI For That",
    website: 'https://theresanaiforthat.com',
    type: ['AI 工具搜索与目录', 'AI tool search and directory'],
    stage: 'discover',
    category: 'directory',
    price: 'freemium',
    usage: 'daily',
    tags: [
      ['AI 工具', 'AI tools'],
      ['任务搜索', 'Task search'],
      ['竞品发现', 'Competitor discovery'],
    ],
    summary: [
      '按照具体任务和使用场景寻找 AI 工具的搜索型目录。',
      'A search-oriented directory for finding AI tools by task and use case.',
    ],
    reason: [
      '从用户任务出发的搜索方式，适合验证某个问题是否已经有大量解决方案。',
      'Its task-first search helps test whether a problem already has many existing solutions.',
    ],
    useCase: [
      '输入用户会说的任务描述，对比返回工具的卖点、定价和覆盖范围。',
      'Enter the task in the user’s own words and compare product claims, pricing, and scope.',
    ],
  },
  {
    slug: 'similarweb',
    name: 'Similarweb',
    website: 'https://www.similarweb.com',
    type: ['网站流量与市场情报', 'Website traffic and market intelligence'],
    stage: 'discover',
    stages: ['discover', 'optimize'],
    category: 'intelligence',
    price: 'freemium',
    usage: 'daily',
    featured: true,
    tags: [
      ['网站流量', 'Website traffic'],
      ['竞品分析', 'Competitor analysis'],
      ['来源渠道', 'Traffic sources'],
    ],
    summary: [
      '提供网站流量估算、访问来源、受众和竞争格局分析。',
      'Provides estimates for website traffic, acquisition sources, audience, and competitive landscape.',
    ],
    reason: [
      '能用外部数据补充主观判断，识别竞品是否真的有持续流量。',
      'Adds external data to subjective research and helps identify whether competitors have sustained traffic.',
    ],
    useCase: [
      '比较多个竞品的流量规模、主要国家、搜索关键词和推荐来源。',
      'Compare competitors by traffic scale, countries, search keywords, and referral sources.',
    ],
    caution: [
      '数据是估算值，小网站误差可能较大，应结合其他证据。',
      'Figures are estimates and may be inaccurate for small sites, so combine them with other evidence.',
    ],
  },
  {
    slug: 'seo-box-referring',
    name: 'SEO Box Referring',
    website: 'https://seo.box',
    type: ['网站推荐来源分析', 'Website referral analysis'],
    stage: 'discover',
    stages: ['discover', 'optimize'],
    category: 'intelligence',
    price: 'freemium',
    tags: [
      ['外链来源', 'Referrals'],
      ['竞品分析', 'Competitor analysis'],
      ['SEO', 'SEO'],
    ],
    summary: [
      '用于查看网站推荐来源和外链线索的 SEO 情报工具。',
      'An SEO intelligence tool for inspecting referral sources and backlink signals.',
    ],
    reason: [
      '可以反推竞品在哪里被推荐、合作或收录，为分发策略提供线索。',
      'Can reveal where competitors are recommended, partnered, or listed, creating distribution clues.',
    ],
    useCase: [
      '输入竞品域名，整理高价值推荐站点，再逐个判断是否值得投稿或合作。',
      'Enter a competitor domain, collect valuable referring sites, and assess outreach opportunities.',
    ],
    caution: [
      '你提供的 `/referring` 链接当前展示特定域名报告，因此正式入口使用产品首页。',
      'The supplied `/referring` URL displays a specific domain report, so the resource links to the product homepage.',
    ],
  },
  {
    slug: 'appsumo',
    name: 'AppSumo',
    website: 'https://appsumo.com',
    type: ['软件优惠市场', 'Software deals marketplace'],
    stage: 'discover',
    category: 'marketplace',
    price: 'marketplace',
    tags: [
      ['软件交易', 'Software deals'],
      ['终身套餐', 'Lifetime deals'],
      ['产品发现', 'Product discovery'],
    ],
    summary: [
      '面向创业者的软件优惠与终身套餐市场，覆盖营销、效率和内容工具。',
      'A marketplace for software deals and lifetime offers across marketing, productivity, and content tools.',
    ],
    reason: [
      '既可发现新工具，也能观察小型 SaaS 如何包装功能、定价和获取早期客户。',
      'Useful for finding tools and studying how small SaaS products package features, pricing, and early acquisition.',
    ],
    useCase: [
      '研究同类产品的评价、承诺和用户不满，寻找可改进的产品机会。',
      'Study reviews, promises, and complaints around similar products to identify improvement opportunities.',
    ],
    caution: [
      '低价或终身套餐不代表产品会长期维护，应检查更新记录和退款条款。',
      'A low price or lifetime deal does not guarantee long-term maintenance; check updates and refund terms.',
    ],
  },
  {
    slug: 'trustmrr',
    name: 'TrustMRR',
    website: 'https://trustmrr.co',
    type: ['创业收入数据库', 'Startup revenue database'],
    stage: 'discover',
    category: 'marketplace',
    price: 'freemium',
    featured: true,
    tags: [
      ['收入验证', 'Verified revenue'],
      ['产品收购', 'Acquisitions'],
      ['SaaS 研究', 'SaaS research'],
    ],
    summary: [
      '展示经过平台验证的创业项目收入，用于观察不同产品类型的公开收入信号。',
      'A database of platform-verified startup revenue for observing public revenue signals across product categories.',
    ],
    reason: [
      '比产品榜单更接近商业结果，但只能证明被收录项目的收入，不能代表整个市场。',
      'Closer to business outcomes than a product directory, but it only verifies listed startups and does not represent the whole market.',
    ],
    useCase: [
      '按产品类型查看已验证收入案例，记录商业模式、收入区间和可进一步核查的同类产品。',
      'Browse verified revenue examples by product type and record business models, revenue ranges, and comparable products for further research.',
    ],
    caution: [
      '已验证收入不等于业务健康，也不能证明你的想法会成功；成本、留存和渠道仍需单独核查。',
      'Verified revenue does not prove business health or guarantee your idea will work; costs, retention, and acquisition still require separate checks.',
    ],
  },
  {
    slug: 'fiverr',
    name: 'Fiverr',
    website: 'https://www.fiverr.com',
    type: ['自由职业服务市场', 'Freelance services marketplace'],
    stage: 'discover',
    stages: ['discover', 'develop'],
    category: 'marketplace',
    price: 'marketplace',
    tags: [
      ['外包服务', 'Freelance services'],
      ['需求研究', 'Demand research'],
      ['产品交付', 'Product delivery'],
    ],
    summary: [
      '购买设计、开发、营销等专业服务的全球自由职业市场。',
      'A global marketplace for buying professional design, development, marketing, and other services.',
    ],
    reason: [
      '热门服务、套餐和评价可以反映客户愿意为哪些明确结果付费。',
      'Popular services, packages, and reviews reveal which concrete outcomes customers pay for.',
    ],
    useCase: [
      '研究高销量服务的交付物和差评，寻找可以产品化或用 AI 改进的流程。',
      'Study high-selling services and negative reviews to find workflows that can be productized or improved with AI.',
    ],
    caution: [
      '它是服务市场，不是产品收购平台；交付质量取决于具体服务商。',
      'It is a services marketplace, not a product acquisition platform, and quality depends on the seller.',
    ],
  },
  {
    slug: 'artificial-analysis',
    name: 'Artificial Analysis',
    website: 'https://artificialanalysis.ai',
    type: ['AI 模型与 API 独立评测', 'Independent AI model and API benchmarks'],
    stage: 'discover',
    stages: ['discover', 'develop'],
    category: 'model',
    price: 'free',
    usage: 'daily',
    featured: true,
    tags: [
      ['模型评测', 'Model benchmarks'],
      ['API 价格', 'API pricing'],
      ['速度与延迟', 'Speed and latency'],
    ],
    summary: [
      '独立比较 AI 模型和 API 服务商的质量、价格、速度与延迟。',
      'Independent comparisons of AI models and API providers across quality, price, speed, and latency.',
    ],
    reason: [
      '模型选择不能只看宣传，它提供了统一指标和可比较的成本数据。',
      'Model selection should not rely on marketing; this provides comparable metrics and cost data.',
    ],
    useCase: [
      '根据任务质量、输出速度和预算筛选候选模型，再进行自己的真实任务测试。',
      'Shortlist models by quality, speed, and budget, then test them on your own real tasks.',
    ],
    caution: [
      '榜单无法覆盖你的完整业务场景，最终选择仍需真实请求验证。',
      'Benchmarks cannot cover the full product context; validate with real requests before choosing.',
    ],
  },
  {
    slug: 'arena-ai',
    name: 'Arena AI',
    website: 'https://arena.ai',
    type: [
      '社区模型对战与排行榜',
      'Community model comparison and leaderboard',
    ],
    stage: 'discover',
    stages: ['discover', 'develop'],
    category: 'model',
    price: 'free',
    usage: 'daily',
    tags: [
      ['模型对战', 'Model arena'],
      ['社区投票', 'Community voting'],
      ['排行榜', 'Leaderboard'],
    ],
    summary: [
      '让用户匿名对比多个模型输出并投票，形成语言、图像和代码模型排行榜。',
      'Lets users compare anonymous model outputs and vote, producing leaderboards for language, image, and code models.',
    ],
    reason: [
      '补充传统基准测试，能观察普通用户在真实对话中更偏好哪些输出。',
      'Complements benchmarks by showing which outputs users prefer in real conversations.',
    ],
    useCase: [
      '用同一提示词盲测候选模型，并查看与你任务接近的细分排行榜。',
      'Blind-test candidate models with the same prompt and inspect relevant category leaderboards.',
    ],
  },
  {
    slug: 'airtable',
    name: 'Airtable',
    website: 'https://www.airtable.com',
    type: [
      '无代码数据库与工作流平台',
      'No-code database and workflow platform',
    ],
    stage: 'validate',
    stages: ['validate', 'operate'],
    category: 'prototype',
    price: 'freemium',
    tags: [
      ['无代码', 'No-code'],
      ['数据管理', 'Data management'],
      ['工作流', 'Workflows'],
    ],
    summary: [
      '把结构化数据、协作界面、自动化和 AI 工作流组合在一起的平台。',
      'A platform combining structured data, collaborative interfaces, automation, and AI workflows.',
    ],
    reason: [
      '在正式开发后台前，可以快速搭建数据表、运营流程和人工服务原型。',
      'Before building a full backend, it can quickly model data, operations, and human-assisted service prototypes.',
    ],
    useCase: [
      '用表格模拟产品数据结构，配合表单和自动化验证实际工作流。',
      'Model product data in tables and validate workflows with forms and automations.',
    ],
    caution: [
      '适合验证和内部流程，不一定适合作为高并发产品的长期数据库。',
      'Good for validation and internal workflows, but not always a long-term high-scale product database.',
    ],
  },
  {
    slug: 'bolt',
    name: 'Bolt',
    website: 'https://bolt.new',
    type: ['AI 网站与应用生成器', 'AI website and app builder'],
    stage: 'validate',
    stages: ['validate', 'design', 'develop'],
    category: 'prototype',
    price: 'freemium',
    featured: true,
    tags: [
      ['Vibe Coding', 'Vibe coding'],
      ['网页生成', 'Website generation'],
      ['MVP', 'MVP'],
    ],
    summary: [
      '通过自然语言创建、运行和迭代网站、应用与原型的 AI Builder。',
      'An AI builder for creating, running, and iterating websites, apps, and prototypes from natural language.',
    ],
    reason: [
      '适合把文字想法迅速变成可点击页面，用真实反馈代替长期空想。',
      'Turns a written idea into a clickable product quickly so feedback can replace speculation.',
    ],
    useCase: [
      '先制作核心流程和落地页，发给目标用户测试理解度和操作路径。',
      'Build the core flow and landing page, then test comprehension and interaction with target users.',
    ],
    caution: [
      '生成结果仍需检查代码质量、权限、安全和后续可维护性。',
      'Generated output still requires checks for code quality, permissions, security, and maintainability.',
    ],
  },
  {
    slug: 'lovable',
    name: 'Lovable',
    website: 'https://lovable.dev',
    type: ['AI 全栈应用生成器', 'AI full-stack app builder'],
    stage: 'validate',
    stages: ['validate', 'design', 'develop'],
    category: 'prototype',
    price: 'freemium',
    featured: true,
    tags: [
      ['Vibe Coding', 'Vibe coding'],
      ['全栈应用', 'Full-stack apps'],
      ['GitHub 同步', 'GitHub sync'],
    ],
    summary: [
      '通过对话生成网站和全栈 Web 应用，并支持 GitHub 同步与部署。',
      'Builds websites and full-stack web apps through chat, with GitHub sync and deployment.',
    ],
    reason: [
      '适合快速验证带数据和交互的产品，而不只是静态落地页。',
      'Useful for validating products with data and interaction rather than only static landing pages.',
    ],
    useCase: [
      '生成注册、表单、数据展示等关键流程，再导出到 GitHub 继续开发。',
      'Generate critical flows such as signup, forms, and data views, then continue development in GitHub.',
    ],
  },
  {
    slug: 'coze',
    name: 'Coze',
    website: 'https://www.coze.com',
    type: [
      'AI Agent 与智能办公平台',
      'AI agent and intelligent workspace platform',
    ],
    stage: 'validate',
    stages: ['validate', 'develop'],
    category: 'assistant',
    price: 'freemium',
    tags: [
      ['AI Agent', 'AI agents'],
      ['工作流', 'Workflows'],
      ['智能办公', 'AI productivity'],
    ],
    summary: [
      '用于搭建 AI Agent、内容和办公工作流的综合平台，也提供网页开发与设计能力。',
      'A platform for AI agents, content, and productivity workflows, with web development and design capabilities.',
    ],
    reason: [
      '如果产品核心是 Agent 或自动化流程，可先验证任务闭环再开发独立网站。',
      'If the core product is an agent or automation workflow, validate the task loop before building a standalone site.',
    ],
    useCase: [
      '搭建一个可执行核心任务的 Agent，邀请少量用户测试输入、输出与失败点。',
      'Build an agent that performs the core task and test inputs, outputs, and failure modes with a small group.',
    ],
    caution: [
      '它不是单纯的低代码建站器，应归入 Agent 原型而不是网页模板。',
      'It is not simply a low-code website builder and belongs under agent prototyping rather than templates.',
    ],
  },
  {
    slug: 'design-lab',
    name: 'Design Lab',
    website: 'https://design-lab-yanliu.vercel.app',
    type: ['设计风格实验室', 'Design style laboratory'],
    stage: 'design',
    category: 'inspiration',
    price: 'free',
    featured: true,
    tags: [
      ['设计风格', 'Design styles'],
      ['Prompt 模板', 'Prompt templates'],
      ['Vibe Coding', 'Vibe coding'],
    ],
    summary: [
      '以一致示例展示数十种设计语言，并提供可用于 AI 前端开发的提示词模板。',
      'Shows dozens of design languages through a consistent example and provides prompts for AI-assisted frontend work.',
    ],
    reason: [
      '把抽象风格名称变成可比较的视觉结果，减少“我不知道怎么描述风格”的问题。',
      'Turns abstract style names into comparable visuals and helps articulate a design direction.',
    ],
    useCase: [
      '先筛选适合产品定位的风格，再把对应 Prompt 交给 AI 生成页面。',
      'Choose a style that fits the product positioning, then use its prompt with an AI builder.',
    ],
    caution: [
      '风格卡片是方向参考，不能替代品牌、内容层级和真实使用场景设计。',
      'Style cards provide direction but do not replace brand, content hierarchy, or product-context design.',
    ],
  },
  {
    slug: 'one-page-love',
    name: 'One Page Love',
    website: 'https://onepagelove.com',
    type: [
      '单页网站灵感与模板库',
      'One-page website inspiration and templates',
    ],
    stage: 'design',
    category: 'inspiration',
    price: 'freemium',
    tags: [
      ['落地页', 'Landing pages'],
      ['网页灵感', 'Web inspiration'],
      ['模板', 'Templates'],
    ],
    summary: [
      '精选单页网站、落地页、模板和相关设计资源。',
      'A curated gallery of one-page websites, landing pages, templates, and related resources.',
    ],
    reason: [
      '适合研究一页内如何安排价值主张、社会证明、功能和转化入口。',
      'Useful for studying how value propositions, proof, features, and conversion points fit on one page.',
    ],
    useCase: [
      '按行业寻找案例，分别记录首屏、内容顺序和 CTA，而不是直接照搬视觉。',
      'Find examples by industry and record hero structure, content order, and calls to action rather than copying visuals.',
    ],
  },
  {
    slug: 'stitch',
    name: 'Stitch',
    website: 'https://stitch.withgoogle.com',
    type: ['AI UI 设计工具', 'AI UI design tool'],
    stage: 'design',
    stages: ['validate', 'design'],
    category: 'prototype',
    price: 'freemium',
    featured: true,
    tags: [
      ['UI 生成', 'UI generation'],
      ['原型设计', 'Prototyping'],
      ['移动端与网页', 'Mobile and web'],
    ],
    summary: [
      'Google 的 AI 界面设计工具，用于快速生成移动端和 Web 应用 UI。',
      'Google’s AI UI design tool for quickly generating mobile and web application interfaces.',
    ],
    reason: [
      '适合在写完整代码前快速比较界面方向和核心页面布局。',
      'Useful for comparing interface directions and key-screen layouts before writing full code.',
    ],
    useCase: [
      '输入产品目标和页面要求，生成多版界面，再选定一版交给开发工具实现。',
      'Describe the product and screen requirements, generate variants, then hand the chosen direction to development.',
    ],
  },
  {
    slug: 'pen-dev',
    name: 'Pen.dev',
    website: 'https://www.pen.dev',
    type: ['代码连接型设计画布', 'Code-connected design canvas'],
    stage: 'design',
    stages: ['design', 'develop'],
    category: 'prototype',
    price: 'freemium',
    tags: [
      ['设计画布', 'Design canvas'],
      ['IDE', 'IDE'],
      ['设计转代码', 'Design to code'],
    ],
    summary: [
      '把设计画布带入开发者 IDE，强调设计结果直接进入代码。',
      'Brings a design canvas into the developer’s IDE so designs can land directly in code.',
    ],
    reason: [
      '减少设计文件与实际实现之间的脱节，适合 AI 编程工作流。',
      'Reduces the gap between design files and implementation, especially in AI coding workflows.',
    ],
    useCase: [
      '在开发环境中调整界面结构和视觉，再把修改直接落到项目代码。',
      'Adjust layout and visuals within the development workflow and apply changes to project code.',
    ],
  },
  {
    slug: 'motionsites',
    name: 'MotionSites',
    website: 'https://motionsites.ai',
    type: ['AI 网站设计 Prompt 库', 'AI website design prompt library'],
    stage: 'design',
    category: 'inspiration',
    price: 'freemium',
    tags: [
      ['网站 Prompt', 'Website prompts'],
      ['动效设计', 'Motion design'],
      ['Lovable', 'Lovable'],
      ['Bolt', 'Bolt'],
    ],
    summary: [
      '为 Lovable、Bolt、Cursor 和 Claude 提供网站、区块和背景设计 Prompt。',
      'Provides prompts for websites, sections, and backgrounds for Lovable, Bolt, Cursor, and Claude.',
    ],
    reason: [
      '适合解决 AI 能写出页面但视觉表达普通的问题。',
      'Helps when an AI builder can make the page but the visual direction remains generic.',
    ],
    useCase: [
      '选择接近目标风格的页面或区块 Prompt，改写品牌和内容后再生成。',
      'Choose a page or section prompt close to the desired direction, then adapt it to the brand and content.',
    ],
  },
  {
    slug: 'themeforest',
    name: 'ThemeForest',
    website: 'https://themeforest.net',
    type: ['网站主题与模板市场', 'Website theme and template marketplace'],
    stage: 'design',
    stages: ['design', 'develop'],
    category: 'marketplace',
    price: 'marketplace',
    tags: [
      ['网站主题', 'Website themes'],
      ['网页模板', 'Web templates'],
      ['电商模板', 'Ecommerce templates'],
    ],
    summary: [
      '销售网站主题、网页模板、电商模板和后台模板的数字资源市场。',
      'A marketplace for website themes, web templates, ecommerce templates, and admin interfaces.',
    ],
    reason: [
      '可用来研究成熟页面结构，也能在时间有限时购买可改造的基础设计。',
      'Useful for studying mature page structures or buying a base design when time is limited.',
    ],
    useCase: [
      '按技术栈和行业筛选，检查更新频率、评价和授权后购买或拆解。',
      'Filter by stack and industry, then review updates, ratings, and licensing before buying or analyzing.',
    ],
    caution: [
      '模板可能包含过时依赖或强绑定插件，购买前必须核查技术栈。',
      'Templates may contain outdated dependencies or plugin lock-in, so inspect the stack before purchase.',
    ],
  },
  {
    slug: 'iconfont',
    name: 'Iconfont',
    website: 'https://www.iconfont.cn',
    type: ['矢量图标库', 'Vector icon library'],
    stage: 'design',
    category: 'assets',
    price: 'free',
    tags: [
      ['图标', 'Icons'],
      ['SVG', 'SVG'],
      ['中文资源', 'Chinese resource'],
    ],
    summary: [
      '阿里巴巴推出的矢量图标库，支持搜索、下载、在线项目和格式转换。',
      'Alibaba’s vector icon library with search, downloads, online projects, and format conversion.',
    ],
    reason: [
      '中文关键词覆盖较好，适合补充国内业务和特定场景图标。',
      'Strong Chinese keyword coverage makes it useful for local products and specific use cases.',
    ],
    useCase: [
      '搜索同一视觉风格的图标并建立项目，统一导出 SVG 或字体。',
      'Find icons in a consistent style, organize them into a project, and export SVGs or fonts.',
    ],
    caution: [
      '不同图标可能使用不同授权，商用前查看作者和许可说明。',
      'Icons may carry different licenses; check author and licensing terms before commercial use.',
    ],
  },
  {
    slug: 'font-awesome',
    name: 'Font Awesome',
    website: 'https://fontawesome.com',
    type: ['图标库与工具包', 'Icon library and toolkit'],
    stage: 'design',
    stages: ['design', 'develop'],
    category: 'assets',
    price: 'freemium',
    tags: [
      ['图标', 'Icons'],
      ['前端开发', 'Frontend development'],
      ['开源', 'Open source'],
    ],
    summary: [
      '广泛使用的图标库与前端工具包，提供免费开源和付费图标。',
      'A widely used icon library and frontend toolkit with open-source and paid icons.',
    ],
    reason: [
      '生态成熟、接入方式稳定，适合需要快速实现常见功能图标的项目。',
      'A mature ecosystem and stable integrations make it reliable for common interface icons.',
    ],
    useCase: [
      '通过官方组件或 SVG 引入常用图标，并统一尺寸和视觉样式。',
      'Use official components or SVGs and keep size and style consistent across the interface.',
    ],
  },
  {
    slug: 'iconify',
    name: 'Iconify',
    website: 'https://iconify.design',
    type: ['开源图标集合框架', 'Open-source icon framework'],
    stage: 'design',
    stages: ['design', 'develop'],
    category: 'assets',
    price: 'openSource',
    featured: true,
    tags: [
      ['图标集合', 'Icon sets'],
      ['SVG', 'SVG'],
      ['开源', 'Open source'],
    ],
    summary: [
      '通过统一框架访问大量流行开源图标集合。',
      'A unified framework for accessing many popular open-source icon sets.',
    ],
    reason: [
      '可以在一个接口中比较不同图标集，并适配 React 等前端技术。',
      'Lets you compare many icon sets through one interface and use them in React and other stacks.',
    ],
    useCase: [
      '选定一个主图标集后统一使用，少量特殊图标再从其他集合补充。',
      'Choose one primary icon set for consistency and add only occasional exceptions from others.',
    ],
    caution: [
      'Iconify 本身开源，但具体图标集许可不同，需要单独核对。',
      'Iconify is open source, but each included icon set has its own license.',
    ],
  },
  {
    slug: 'lorem-picsum',
    name: 'Lorem Picsum',
    website: 'https://picsum.photos',
    type: ['占位图片服务', 'Placeholder image service'],
    stage: 'design',
    stages: ['design', 'develop'],
    category: 'assets',
    price: 'free',
    tags: [
      ['占位图', 'Placeholder images'],
      ['图片 API', 'Image API'],
      ['原型', 'Prototyping'],
    ],
    summary: [
      '通过简单 URL 返回指定尺寸随机照片的占位图服务。',
      'A placeholder image service that returns random photos at requested dimensions through simple URLs.',
    ],
    reason: [
      '开发原型时不需要先准备完整素材，就能检查真实图片比例下的布局。',
      'Lets prototypes use realistic image proportions before final assets are ready.',
    ],
    useCase: [
      '在卡片、列表和 Hero 中用固定尺寸 URL 测试裁切、加载和响应式布局。',
      'Use fixed-size URLs in cards, lists, and heroes to test cropping, loading, and responsive layout.',
    ],
    notFor: [
      '不适合作为正式产品图片来源，随机图片不可控。',
      'Not suitable as final product imagery because random results are not controlled.',
    ],
  },
  {
    slug: 'unsplash',
    name: 'Unsplash',
    website: 'https://unsplash.com',
    type: ['免费图片素材库', 'Free stock photo library'],
    stage: 'design',
    category: 'assets',
    price: 'freemium',
    featured: true,
    tags: [
      ['免费图片', 'Free photos'],
      ['商用素材', 'Commercial assets'],
      ['摄影', 'Photography'],
    ],
    summary: [
      '提供高质量摄影图片下载与搜索的视觉素材平台。',
      'A visual asset platform for searching and downloading high-quality photography.',
    ],
    reason: [
      '适合快速为文章、落地页和社交内容找到具有真实感的图片。',
      'Useful for quickly finding authentic imagery for articles, landing pages, and social content.',
    ],
    useCase: [
      '按具体场景而不是抽象概念搜索，下载后统一裁切和压缩。',
      'Search by concrete scenes rather than abstract ideas, then crop and compress consistently.',
    ],
    caution: [
      '虽然允许广泛使用，仍应阅读最新许可并避免暗示人物或品牌背书。',
      'Review the current license and avoid implying endorsement by depicted people or brands.',
    ],
  },
  {
    slug: 'pexels',
    name: 'Pexels',
    website: 'https://www.pexels.com',
    type: ['免费图片与视频素材库', 'Free photo and video library'],
    stage: 'design',
    category: 'assets',
    price: 'free',
    tags: [
      ['免费图片', 'Free photos'],
      ['免费视频', 'Free videos'],
      ['商用素材', 'Commercial assets'],
    ],
    summary: [
      '提供可免费使用的摄影图片和视频素材。',
      'A library of free-to-use stock photos and videos.',
    ],
    reason: [
      '在 Unsplash 之外补充视频和更多生活化素材，适合内容与落地页制作。',
      'Adds video and more lifestyle-oriented assets beyond Unsplash for content and landing pages.',
    ],
    useCase: [
      '为产品页面或内容寻找照片和短视频，并在上线前进行压缩与格式转换。',
      'Find photos or short videos for product pages and content, then optimize formats before launch.',
    ],
  },
  {
    slug: 'monica',
    name: 'Monica',
    website: 'https://monica.im',
    type: ['全能 AI 助手', 'All-in-one AI assistant'],
    stage: 'develop',
    stages: ['discover', 'design', 'develop', 'operate'],
    category: 'assistant',
    price: 'freemium',
    tags: [
      ['AI 助手', 'AI assistant'],
      ['模型聚合', 'Model aggregation'],
      ['浏览器扩展', 'Browser extension'],
    ],
    summary: [
      '聚合多种模型，提供聊天、搜索、写作、翻译、总结、代码和多媒体生成。',
      'An all-in-one assistant combining multiple models for chat, search, writing, translation, coding, and media generation.',
    ],
    reason: [
      '适合作为跨网页和日常工作的通用 AI 辅助入口。',
      'Useful as a general AI layer across webpages and everyday work.',
    ],
    useCase: [
      '快速总结资料、改写文案、翻译内容或在浏览网页时直接提问。',
      'Summarize research, rewrite copy, translate content, or ask questions directly while browsing.',
    ],
    caution: [
      '它不是低代码建站平台，应作为通用助手而不是 MVP Builder。',
      'It is not a low-code website builder and should be treated as a general assistant.',
    ],
  },
  {
    slug: 'shipany-template-two',
    name: 'ShipAny Template Two',
    website: 'https://two.shipany.site',
    type: ['Next.js AI SaaS 模板', 'Next.js AI SaaS boilerplate'],
    stage: 'develop',
    category: 'template',
    price: 'paid',
    featured: true,
    tags: [
      ['Next.js', 'Next.js'],
      ['AI SaaS', 'AI SaaS'],
      ['支付与鉴权', 'Payments and auth'],
    ],
    summary: [
      '用于快速搭建 AI SaaS 的 Next.js 模板，包含常见页面、组件和基础能力。',
      'A Next.js boilerplate for rapidly building AI SaaS products with common pages, components, and foundations.',
    ],
    reason: [
      'WebTools 当前基于该模板改造，能减少鉴权、支付、多语言和后台的重复开发。',
      'WebTools is built from this template, reducing repeated work on auth, payments, i18n, and admin.',
    ],
    useCase: [
      '需要完整产品底座时，以模板为起点删除无关能力，再实现自己的业务。',
      'Use it as a full product foundation, remove irrelevant template features, then implement the real business.',
    ],
    caution: [
      '模板已有功能不等于产品需要，必须按需求删减而不是全部保留。',
      'Existing template features do not automatically belong in the product; remove what the requirements do not need.',
    ],
  },
  {
    slug: 'mksaas',
    name: 'MkSaaS',
    website: 'https://mksaas.com',
    type: ['Next.js SaaS 模板', 'Next.js SaaS boilerplate'],
    stage: 'develop',
    category: 'template',
    price: 'paid',
    tags: [
      ['Next.js', 'Next.js'],
      ['SaaS 模板', 'SaaS boilerplate'],
      ['AI SaaS', 'AI SaaS'],
    ],
    summary: [
      '集成鉴权、支付、多语言、博客、文档、后台和 SEO 的 Next.js SaaS 模板。',
      'A Next.js SaaS boilerplate with auth, payments, i18n, blog, docs, dashboard, and SEO.',
    ],
    reason: [
      '可与现有模板对比功能覆盖、代码结构和交付方式，帮助选择底座。',
      'Useful for comparing foundation coverage, code structure, and delivery model when choosing a starter.',
    ],
    useCase: [
      '新项目立项时对照自己的功能清单，判断购买模板还是从现有项目复用。',
      'Compare the product requirements against the template when deciding whether to buy or reuse an existing foundation.',
    ],
  },
  {
    slug: 'aceternity-ui',
    name: 'Aceternity UI',
    website: 'https://ui.aceternity.com',
    type: ['React 动效组件与模板', 'React motion components and templates'],
    stage: 'develop',
    stages: ['design', 'develop'],
    category: 'component',
    price: 'freemium',
    featured: true,
    tags: [
      ['React', 'React'],
      ['Tailwind CSS', 'Tailwind CSS'],
      ['Framer Motion', 'Framer Motion'],
    ],
    summary: [
      '提供可复制的 React、Next.js、Tailwind CSS 和 Framer Motion 动效组件与模板。',
      'Copy-paste React, Next.js, Tailwind CSS, and Framer Motion components and templates.',
    ],
    reason: [
      '适合快速实现具有明确视觉效果的 Hero、背景、卡片和营销区块。',
      'Useful for quickly implementing visually distinctive heroes, backgrounds, cards, and marketing sections.',
    ],
    useCase: [
      '先确认组件的依赖和可访问性，再复制到项目中按品牌系统重写。',
      'Check dependencies and accessibility, then copy the component and adapt it to the brand system.',
    ],
  },
  {
    slug: 'magic-ui-pro',
    name: 'Magic UI Pro',
    website: 'https://pro.magicui.design',
    type: ['付费落地页模板与区块', 'Paid landing page templates and sections'],
    stage: 'develop',
    stages: ['design', 'develop'],
    category: 'template',
    price: 'paid',
    tags: [
      ['Next.js', 'Next.js'],
      ['落地页模板', 'Landing page templates'],
      ['营销区块', 'Marketing sections'],
    ],
    summary: [
      '提供基于 Next.js、TypeScript、Tailwind、shadcn 和 Motion 的付费模板与区块。',
      'Paid templates and sections built with Next.js, TypeScript, Tailwind, shadcn, and Motion.',
    ],
    reason: [
      '适合需要快速完成高质量营销页面，同时保留可编辑源码的场景。',
      'Useful for shipping polished marketing pages quickly while keeping editable source code.',
    ],
    useCase: [
      '选择接近业务类型的模板，保留结构，全面替换内容、品牌和交互。',
      'Choose a template close to the business type, keep the structure, and replace content, brand, and interactions.',
    ],
  },
  {
    slug: '21st-dev',
    name: '21st.dev',
    website: 'https://21st.dev/community/components',
    type: ['社区 React 组件库', 'Community React component library'],
    stage: 'develop',
    category: 'component',
    price: 'freemium',
    featured: true,
    tags: [
      ['React', 'React'],
      ['Next.js', 'Next.js'],
      ['社区组件', 'Community components'],
    ],
    summary: [
      '由设计师和开发者发布的 React、Next.js UI 组件社区，覆盖营销和产品界面。',
      'A community library of React and Next.js components for marketing and product interfaces.',
    ],
    reason: [
      '组件数量大、场景细，适合寻找某个明确区块的实现起点。',
      'Its breadth and detailed categories make it useful for finding a starting point for a specific section.',
    ],
    useCase: [
      '按区块类型筛选，检查源码与依赖后复制，再统一成项目自己的设计系统。',
      'Filter by section type, inspect source and dependencies, then adapt it to the project design system.',
    ],
    caution: [
      '社区组件质量不一致，必须检查响应式、无障碍和依赖体积。',
      'Community component quality varies; inspect responsiveness, accessibility, and dependency weight.',
    ],
  },
  {
    slug: 'magic-ui',
    name: 'Magic UI',
    website: 'https://magicui.design',
    type: ['开源动效组件库', 'Open-source animated component library'],
    stage: 'develop',
    stages: ['design', 'develop'],
    category: 'component',
    price: 'openSource',
    tags: [
      ['React', 'React'],
      ['Tailwind CSS', 'Tailwind CSS'],
      ['动效组件', 'Animated components'],
    ],
    summary: [
      '面向设计工程师的开源 React 动效组件和效果库，可配合 shadcn/ui。',
      'An open-source React animation and effects library for design engineers, designed to complement shadcn/ui.',
    ],
    reason: [
      '适合为重要营销节点增加有控制的动效，而不必从零写动画。',
      'Useful for adding controlled motion to important marketing moments without writing every animation from scratch.',
    ],
    useCase: [
      '挑选一两个高价值动效用于首屏或社会证明，避免全页堆叠。',
      'Use one or two high-value effects in the hero or proof sections rather than animating everything.',
    ],
  },
  {
    slug: 'animate-ui',
    name: 'Animate UI',
    website: 'https://animate-ui.com/docs',
    type: ['动画化 UI 组件库', 'Animated UI component library'],
    stage: 'develop',
    category: 'component',
    price: 'openSource',
    tags: [
      ['React', 'React'],
      ['动画组件', 'Animated components'],
      ['无障碍', 'Accessibility'],
    ],
    summary: [
      '提供动画化组件、基础原语和图标的 React 组件文档。',
      'Documentation and components for animated React UI, primitives, and icons.',
    ],
    reason: [
      '适合在保持组件语义的前提下，为交互补充过渡和状态反馈。',
      'Helps add transitions and state feedback while retaining component semantics.',
    ],
    useCase: [
      '用于菜单、对话框、切换和状态变化，优先选择能提升理解的动画。',
      'Use it for menus, dialogs, toggles, and state changes where motion improves comprehension.',
    ],
  },
  {
    slug: 'react-bits',
    name: 'React Bits',
    website: 'https://www.reactbits.dev/text-animations/split-text',
    type: ['React 动效代码片段库', 'React animation snippet library'],
    stage: 'develop',
    stages: ['design', 'develop'],
    category: 'component',
    price: 'openSource',
    tags: [
      ['React', 'React'],
      ['文字动画', 'Text animations'],
      ['视觉效果', 'Visual effects'],
    ],
    summary: [
      '提供文字、背景、光标和交互动效的 React 代码片段与展示。',
      'A React snippet library for text, background, cursor, and interactive visual effects.',
    ],
    reason: [
      '适合快速试验有辨识度的局部效果，例如 Split Text 进入动画。',
      'Useful for quickly trying distinctive local effects such as split-text entrances.',
    ],
    useCase: [
      '只在品牌标题或关键展示区使用，并检查性能、移动端和减少动画偏好。',
      'Use sparingly for brand headlines or showcases and test performance, mobile behavior, and reduced-motion preferences.',
    ],
  },
  {
    slug: 'supabase',
    name: 'Supabase',
    website: 'https://supabase.com',
    type: ['Postgres 后端开发平台', 'Postgres backend development platform'],
    stage: 'develop',
    category: 'database',
    price: 'freemium',
    featured: true,
    tags: [
      ['PostgreSQL', 'PostgreSQL'],
      ['鉴权', 'Auth'],
      ['存储', 'Storage'],
      ['实时数据', 'Realtime'],
    ],
    summary: [
      '提供 Postgres、鉴权、数据 API、边缘函数、实时能力、存储和向量功能。',
      'A platform combining Postgres, auth, data APIs, edge functions, realtime, storage, and vectors.',
    ],
    reason: [
      '适合希望用一个平台快速获得完整后端能力的产品。',
      'Useful when a product needs a broad set of backend capabilities from one platform.',
    ],
    useCase: [
      '创建数据库并用 RLS 保护数据，再逐步接入鉴权、存储和实时功能。',
      'Create the database, secure it with RLS, then add auth, storage, and realtime capabilities.',
    ],
    caution: [
      '必须正确设计 Row Level Security；默认配置不应被当作安全完成。',
      'Row Level Security must be designed correctly; default setup is not the end of security work.',
    ],
  },
  {
    slug: 'neon',
    name: 'Neon',
    website: 'https://neon.com',
    type: ['Serverless Postgres 后端', 'Serverless Postgres backend'],
    stage: 'develop',
    category: 'database',
    price: 'freemium',
    featured: true,
    tags: [
      ['PostgreSQL', 'PostgreSQL'],
      ['Serverless', 'Serverless'],
      ['数据库分支', 'Database branching'],
    ],
    summary: [
      '为应用和 Agent 提供可扩缩、可分支的 Serverless Postgres 后端。',
      'A serverless, branchable Postgres backend designed for applications and agents.',
    ],
    reason: [
      '与 Vercel、Drizzle 和预览环境配合顺畅，适合标准 Next.js 项目。',
      'Works well with Vercel, Drizzle, and preview environments for standard Next.js projects.',
    ],
    useCase: [
      '为开发、预览和生产创建隔离连接，使用迁移管理数据库结构。',
      'Use isolated development, preview, and production connections and manage schema through migrations.',
    ],
  },
  {
    slug: 'tableplus',
    name: 'TablePlus',
    website: 'https://tableplus.com',
    type: ['桌面数据库管理工具', 'Desktop database management client'],
    stage: 'develop',
    category: 'database',
    price: 'freemium',
    tags: [
      ['数据库客户端', 'Database client'],
      ['PostgreSQL', 'PostgreSQL'],
      ['SQL', 'SQL'],
    ],
    summary: [
      '支持 PostgreSQL、MySQL、SQLite 等数据库的原生桌面图形化管理工具。',
      'A native desktop client for PostgreSQL, MySQL, SQLite, and other databases.',
    ],
    reason: [
      '比命令行更直观地查看表结构、数据和查询结果，适合日常排查。',
      'Makes schemas, rows, and query results easier to inspect than the command line during everyday debugging.',
    ],
    useCase: [
      '连接开发或只读数据库，查看数据、执行查询和核对迁移结果。',
      'Connect to development or read-only databases to inspect data, run queries, and verify migrations.',
    ],
    caution: [
      '连接生产库时应使用最小权限，修改或删除前先确认目标环境。',
      'Use least-privilege access for production and verify the target environment before edits or deletes.',
    ],
  },
  {
    slug: 'tavily',
    name: 'Tavily',
    website: 'https://www.tavily.com',
    type: ['面向 AI 的搜索 API', 'Search API for AI applications'],
    stage: 'develop',
    category: 'developer',
    price: 'freemium',
    featured: true,
    tags: [
      ['联网搜索', 'Web search'],
      ['AI Agent', 'AI agents'],
      ['API', 'API'],
    ],
    summary: [
      '为 AI 应用和 Agent 提供网页搜索、抓取与研究能力的 API。',
      'An API for web search, extraction, and research designed for AI applications and agents.',
    ],
    reason: [
      '适合让站内 AI 在用户主动开启后获取最新外部信息。',
      'Useful for giving an in-product AI access to current external information when the user enables it.',
    ],
    useCase: [
      '在服务端调用搜索 API，控制查询、来源、结果数量和进入模型的上下文。',
      'Call the search API server-side and control queries, sources, result count, and model context.',
    ],
    caution: [
      '搜索结果是不可信外部内容，需要来源引用、注入防护和成本控制。',
      'Search results are untrusted external content and require citations, prompt-injection defenses, and cost controls.',
    ],
  },
  {
    slug: 'crontab-guru',
    name: 'Crontab.guru',
    website: 'https://crontab.guru',
    type: ['Cron 表达式编辑与解释工具', 'Cron expression editor and explainer'],
    stage: 'develop',
    category: 'developer',
    price: 'free',
    tags: [
      ['Cron', 'Cron'],
      ['定时任务', 'Scheduled jobs'],
      ['开发辅助', 'Developer utility'],
    ],
    summary: [
      '用于生成和解释 Crontab 定时表达式的轻量工具。',
      'A lightweight editor for generating and explaining crontab schedule expressions.',
    ],
    reason: [
      '定时表达式容易写错，用自然语言解释可以降低运行时间配置错误。',
      'Cron expressions are easy to misread; plain-language explanations reduce scheduling mistakes.',
    ],
    useCase: [
      '配置清理、同步或邮件任务前粘贴表达式，确认实际触发时间。',
      'Paste a schedule before configuring cleanup, sync, or email jobs and confirm when it will run.',
    ],
  },
  {
    slug: 'vercel',
    name: 'Vercel',
    website: 'https://vercel.com',
    type: ['前端云与部署平台', 'Frontend cloud and deployment platform'],
    stage: 'launch',
    stages: ['develop', 'launch'],
    category: 'deployment',
    price: 'freemium',
    featured: true,
    tags: [
      ['部署', 'Deployment'],
      ['Next.js', 'Next.js'],
      ['预览环境', 'Preview environments'],
    ],
    summary: [
      '面向 Web 应用和 Agent 的云平台，支持 Git 集成、预览环境和生产部署。',
      'A cloud platform for web applications and agents with Git integration, previews, and production deployments.',
    ],
    reason: [
      'Next.js 集成成熟，可把每次代码变更转为可验证预览，再安全上线。',
      'Mature Next.js integration turns each code change into a verifiable preview before production.',
    ],
    useCase: [
      '连接 GitHub 仓库，配置环境变量、域名和监控后部署生产版本。',
      'Connect a GitHub repository, configure environment variables, domains, and monitoring, then deploy.',
    ],
    caution: [
      '预览和生产环境变量必须分离，敏感变量不能暴露为前端公开变量。',
      'Separate preview and production variables and never expose secrets as public frontend variables.',
    ],
  },
  {
    slug: 'instant-domain-search',
    name: 'Instant Domain Search',
    website: 'https://instantdomainsearch.com',
    type: ['即时域名搜索工具', 'Instant domain search tool'],
    stage: 'launch',
    category: 'domain',
    price: 'freemium',
    featured: true,
    tags: [
      ['域名搜索', 'Domain search'],
      ['域名生成', 'Domain generation'],
      ['价格比较', 'Registrar comparison'],
    ],
    summary: [
      '输入时即时检查大量域名后缀的可用性，并比较注册商价格。',
      'Checks domain availability across many extensions as you type and compares registrar prices.',
    ],
    reason: [
      '适合在命名阶段快速扩展候选，而不是逐个去注册商搜索。',
      'Useful for expanding naming options quickly instead of searching registrars one by one.',
    ],
    useCase: [
      '输入核心关键词，组合短词和后缀，建立候选清单后再做商标与历史检查。',
      'Enter core keywords, combine short terms and extensions, then check trademarks and domain history.',
    ],
  },
  {
    slug: 'query-domains',
    name: 'Query.Domains',
    website: 'https://query.domains',
    type: ['批量域名可用性检查', 'Bulk domain availability checker'],
    stage: 'launch',
    category: 'domain',
    price: 'freemium',
    tags: [
      ['批量域名', 'Bulk domains'],
      ['WHOIS', 'WHOIS'],
      ['域名 API', 'Domain API'],
    ],
    summary: [
      '支持大量后缀、批量查询、WHOIS 信息和 API 的域名可用性检查工具。',
      'A domain availability checker with many TLDs, bulk lookup, WHOIS details, and API access.',
    ],
    reason: [
      '当候选关键词较多时，批量查询比逐个搜索更高效。',
      'Bulk lookup is more efficient when evaluating many keywords or naming variations.',
    ],
    useCase: [
      '一次检查多个名称和后缀，再按价格、历史和品牌一致性缩小范围。',
      'Check many names and extensions at once, then narrow by price, history, and brand fit.',
    ],
  },
  {
    slug: 'namecheap',
    name: 'Namecheap',
    website: 'https://www.namecheap.com',
    type: ['域名注册商', 'Domain registrar'],
    stage: 'launch',
    category: 'domain',
    price: 'paid',
    featured: true,
    tags: [
      ['域名购买', 'Domain registration'],
      ['DNS', 'DNS'],
      ['域名管理', 'Domain management'],
    ],
    summary: [
      '提供域名注册、转移、DNS、托管和邮箱等服务的注册商。',
      'A registrar offering domains, transfers, DNS, hosting, and email services.',
    ],
    reason: [
      '域名搜索完成后，需要在稳定注册商处完成购买和长期管理。',
      'After discovery, a reliable registrar is needed for purchase and long-term management.',
    ],
    useCase: [
      '购买域名，开启自动续费与安全保护，再配置 Vercel 和邮件 DNS。',
      'Register the domain, enable renewal and security protections, then configure Vercel and email DNS.',
    ],
    caution: [
      '首年优惠与续费价格可能不同，购买前查看长期成本。',
      'First-year promotions may differ from renewal pricing; check long-term cost.',
    ],
  },
  {
    slug: 'spaceship',
    name: 'Spaceship',
    website: 'https://www.spaceship.com',
    type: ['域名、托管与邮箱平台', 'Domains, hosting, and email platform'],
    stage: 'launch',
    category: 'domain',
    price: 'paid',
    tags: [
      ['域名搜索', 'Domain search'],
      ['域名购买', 'Domain registration'],
      ['托管', 'Hosting'],
    ],
    summary: [
      '提供域名搜索与购买、托管、邮箱及其他线上基础服务的平台。',
      'A platform for domain search and registration, hosting, email, and related online infrastructure.',
    ],
    reason: [
      '可以在同一平台完成域名搜索、购买和基础服务管理。',
      'Combines domain discovery, registration, and basic online services in one platform.',
    ],
    useCase: [
      '比较域名价格与后缀后购买，并根据需要配置 DNS、邮箱或托管。',
      'Compare domain pricing and extensions, register the choice, then configure DNS, email, or hosting.',
    ],
  },
  {
    slug: 'plausible',
    name: 'Plausible',
    website: 'https://plausible.io',
    type: ['隐私友好网站分析', 'Privacy-friendly web analytics'],
    stage: 'optimize',
    category: 'analytics',
    price: 'paid',
    featured: true,
    tags: [
      ['网站分析', 'Web analytics'],
      ['隐私友好', 'Privacy friendly'],
      ['无 Cookie', 'Cookieless'],
    ],
    summary: [
      '轻量、开源、隐私友好的 Google Analytics 替代方案，强调清晰的网站指标。',
      'A lightweight, open-source, privacy-friendly Google Analytics alternative focused on clear metrics.',
    ],
    reason: [
      '界面简单，适合快速回答流量从哪里来、哪些页面有效等核心问题。',
      'A simple interface for answering where traffic comes from and which pages perform.',
    ],
    useCase: [
      '上线后跟踪访问来源、落地页、目标事件和来自 AI 工具的推荐流量。',
      'Track acquisition sources, landing pages, goals, and referrals from AI tools after launch.',
    ],
  },
  {
    slug: 'google-analytics',
    name: 'Google Analytics',
    website: 'https://developers.google.com/analytics?hl=en',
    type: ['网站与营销分析平台', 'Web and marketing analytics platform'],
    stage: 'optimize',
    category: 'analytics',
    price: 'free',
    featured: true,
    tags: [
      ['GA4', 'GA4'],
      ['事件分析', 'Event analytics'],
      ['营销归因', 'Marketing attribution'],
    ],
    summary: [
      'Google 的网站和应用分析平台，用于事件、用户、渠道与营销效果分析。',
      'Google’s analytics platform for events, users, channels, and marketing performance.',
    ],
    reason: [
      '生态完整且与广告、搜索等服务连接紧密，适合更复杂的分析需求。',
      'A broad ecosystem and strong integrations with advertising and search support complex measurement needs.',
    ],
    useCase: [
      '规划核心事件与转化，再通过 GA4 检查用户路径、来源和留存信号。',
      'Define core events and conversions, then inspect user paths, acquisition, and retention signals.',
    ],
    caution: [
      '配置复杂且涉及隐私合规，不应在没有测量计划时堆积事件。',
      'Configuration is complex and privacy-sensitive; do not collect events without a measurement plan.',
    ],
  },
  {
    slug: 'openpanel',
    name: 'OpenPanel',
    website: 'https://openpanel.dev',
    type: ['开源产品与网站分析', 'Open-source product and web analytics'],
    stage: 'optimize',
    category: 'analytics',
    price: 'freemium',
    tags: [
      ['产品分析', 'Product analytics'],
      ['网站分析', 'Web analytics'],
      ['开源', 'Open source'],
    ],
    summary: [
      '结合产品分析与轻量网站分析的开源平台，定位为 Mixpanel 和 Plausible 的替代方案。',
      'An open-source platform combining product and web analytics as an alternative to Mixpanel and Plausible.',
    ],
    reason: [
      '适合同时关注营销页面和登录后产品行为，又希望保持较简单的界面。',
      'Useful when both marketing-site and in-product behavior matter but the interface should remain approachable.',
    ],
    useCase: [
      '跟踪访问、注册、核心功能完成和付费等事件，建立基础漏斗。',
      'Track visits, signup, core-action completion, and payment events to build a basic funnel.',
    ],
  },
  {
    slug: 'microsoft-clarity',
    name: 'Microsoft Clarity',
    website: 'https://clarity.microsoft.com',
    type: ['用户行为分析工具', 'User behavior analytics tool'],
    stage: 'optimize',
    category: 'analytics',
    price: 'free',
    featured: true,
    tags: [
      ['热力图', 'Heatmaps'],
      ['会话回放', 'Session recordings'],
      ['用户行为', 'User behavior'],
    ],
    summary: [
      '免费的用户行为分析工具，提供热力图、会话回放和交互问题信号。',
      'A free behavior analytics tool with heatmaps, session recordings, and interaction signals.',
    ],
    reason: [
      '数字指标告诉你哪里流失，回放和热力图帮助理解用户为什么卡住。',
      'Metrics show where users leave; recordings and heatmaps help explain why.',
    ],
    useCase: [
      '检查关键页面的点击、滚动和迷惑行为，再结合数据决定修改顺序。',
      'Inspect clicks, scrolling, and confusing behavior on key pages, then prioritize changes with quantitative data.',
    ],
    caution: [
      '必须配置隐私遮罩，避免记录输入框和用户敏感信息。',
      'Configure privacy masking so inputs and sensitive user information are not recorded.',
    ],
  },
  {
    slug: 'pagespeed-insights',
    name: 'PageSpeed Insights',
    website: 'https://pagespeed.web.dev',
    type: ['网页性能检测工具', 'Web performance testing tool'],
    stage: 'optimize',
    category: 'performance',
    price: 'free',
    featured: true,
    tags: [
      ['Core Web Vitals', 'Core Web Vitals'],
      ['性能优化', 'Performance optimization'],
      ['Lighthouse', 'Lighthouse'],
    ],
    summary: [
      '基于真实用户数据和 Lighthouse 实验室测试分析网页性能。',
      'Analyzes web performance using field data and Lighthouse lab tests.',
    ],
    reason: [
      '能定位加载、交互和布局稳定性问题，并给出可执行诊断。',
      'Identifies loading, interaction, and layout stability issues with actionable diagnostics.',
    ],
    useCase: [
      '上线前后测试主要页面，优先修复 Core Web Vitals 和最大资源问题。',
      'Test major pages before and after launch and prioritize Core Web Vitals and the largest bottlenecks.',
    ],
    caution: [
      '单次分数会波动，应结合真实用户数据和多次测试判断。',
      'A single score can fluctuate; use field data and repeated tests.',
    ],
  },
  {
    slug: 'aitdk',
    name: 'AITDK',
    website: 'https://aitdk.com',
    type: ['AI SEO 工具集', 'AI SEO toolkit'],
    stage: 'optimize',
    category: 'performance',
    price: 'freemium',
    tags: [
      ['SEO', 'SEO'],
      ['标题生成', 'Title generation'],
      ['关键词', 'Keywords'],
    ],
    summary: [
      '提供网站 SEO 分析以及标题、描述、关键词、FAQ 等生成工具。',
      'A toolkit for site SEO analysis and generating titles, descriptions, keywords, FAQs, and related content.',
    ],
    reason: [
      '适合快速检查基础 SEO，并为页面元信息生成初稿。',
      'Useful for checking basic SEO and drafting page metadata.',
    ],
    useCase: [
      '分析页面后生成标题与描述候选，再根据真实搜索意图人工编辑。',
      'Analyze a page, generate title and description options, then edit them around real search intent.',
    ],
    caution: [
      '生成内容只能作为初稿，不能替代关键词研究和页面实际价值。',
      'Generated copy is only a draft and cannot replace keyword research or real page value.',
    ],
  },
  {
    slug: 'crisp',
    name: 'Crisp',
    website: 'https://crisp.chat/en',
    type: ['在线客服与消息平台', 'Customer messaging and support platform'],
    stage: 'operate',
    category: 'support',
    price: 'freemium',
    featured: true,
    tags: [
      ['在线客服', 'Live chat'],
      ['用户支持', 'Customer support'],
      ['共享收件箱', 'Shared inbox'],
    ],
    summary: [
      '为网站提供实时聊天、共享收件箱和客户支持能力的平台。',
      'A platform for live website chat, shared inboxes, and customer support.',
    ],
    reason: [
      '让早期用户能在遇到问题时直接联系开发者，形成高质量反馈渠道。',
      'Gives early users a direct path to the builder when they encounter problems.',
    ],
    useCase: [
      '在关键页面嵌入聊天入口，设置离线消息并记录常见问题。',
      'Add chat to key pages, configure offline messages, and capture recurring questions.',
    ],
    caution: [
      '正式资源使用公开官网链接，不使用需要登录的 `/settings` 后台地址。',
      'The resource links to the public site rather than the authenticated `/settings` dashboard.',
    ],
  },
  {
    slug: 'discord',
    name: 'Discord',
    website: 'https://discord.com',
    type: ['社区与群组沟通平台', 'Community and group communication platform'],
    stage: 'operate',
    category: 'support',
    price: 'freemium',
    featured: true,
    tags: [
      ['海外社区', 'Global community'],
      ['私域运营', 'Owned community'],
      ['用户交流', 'User communication'],
    ],
    summary: [
      '支持文字、语音、直播和机器人扩展的群组沟通与社区平台。',
      'A community platform with text, voice, streaming, and bot integrations.',
    ],
    reason: [
      '适合建立海外用户社区，让支持、反馈和用户互助沉淀在同一空间。',
      'Useful for building an international user community where support, feedback, and peer help accumulate.',
    ],
    useCase: [
      '建立公告、反馈、帮助和闲聊频道，并通过规则控制社区边界。',
      'Create announcement, feedback, help, and social channels with clear community rules.',
    ],
    caution: [
      '社区需要持续运营；用户规模不足时不要建立过多空频道。',
      'Communities require ongoing operation; avoid many empty channels before there is enough activity.',
    ],
  },
];

export const platformResources = resourceDrafts.map(defineResource);

const collectionStep = (
  resourceSlug: string,
  title: TextPair,
  description: TextPair,
  relationType: 'required' | 'alternative' = 'required'
): PlatformCollectionStep => ({
  resourceSlug,
  title: t(title),
  description: t(description),
  relationType,
});

export const retiredPlatformCollectionSlugs = [
  'daily-information-radar',
  'buy-analyze-rebuild',
  'idea-to-testable-mvp',
  'ai-saas-foundation',
  'post-launch-data-loop',
  'ai-capability-ecosystem',
];

export const platformCollections: PlatformCollection[] = [
  {
    slug: 'find-a-product-problem',
    title: t([
      '找到一个值得验证的产品问题',
      'Find a product problem worth validating',
    ]),
    summary: t([
      '从真实讨论和现有产品中提取重复问题，先形成证据，再决定做什么。',
      'Extract recurring problems from real discussions and existing products before deciding what to build.',
    ]),
    content: t([
      '这条路线不负责帮你想一个听起来新奇的点子。它只做一件事：把零散观察整理成可以继续验证的问题。\n\n不要把单条抱怨、榜单热度或工具数量当成需求证明。先保留用户原话和使用场景，再寻找重复模式。',
      'This guide does not invent a clever idea for you. It turns scattered observations into a problem that is specific enough to validate.\n\nDo not treat one complaint, launch-day attention, or the number of existing tools as proof of demand. Keep the user language and context, then look for repeated patterns.',
    ]),
    duration: t(['约 90 分钟', 'About 90 minutes']),
    audience: [
      t([
        '有模糊方向，但说不清用户具体痛点的人',
        'People with a broad direction but no specific user pain',
      ]),
      t([
        '准备做第一个 Web 产品的独立开发者',
        'Independent builders preparing a first web product',
      ]),
    ],
    prerequisites: [
      t(['一个大致人群或使用场景', 'A rough audience or usage scenario']),
      t([
        '3～5 个用户可能使用的搜索词',
        'Three to five phrases the audience might use',
      ]),
    ],
    deliverables: [
      t([
        '至少 10 条带上下文的用户原话',
        'At least 10 user quotes with context',
      ]),
      t([
        '3 个可描述清楚的重复问题',
        'Three clearly described recurring problems',
      ]),
      t(['一份现有替代方案清单', 'A list of current alternatives']),
    ],
    completionCriteria: [
      t([
        '每个问题都写清楚了谁在什么场景下遇到什么阻力',
        'Each problem states who encounters what friction and in which context',
      ]),
      t([
        '每个问题至少有两条独立观察支持',
        'Each problem has at least two independent observations',
      ]),
      t([
        '你能说出现有替代方案为什么仍让用户不满意',
        'You can explain why current alternatives still frustrate users',
      ]),
    ],
    verifiedAt,
    nextSlug: 'validate-product-idea',
    nextTitle: t([
      '验证一个产品想法有没有人需要',
      'Validate whether people need the product idea',
    ]),
    stage: stages.discover,
    category: categories.community,
    tags: [
      t(['问题发现', 'Problem discovery']),
      t(['用户研究', 'User research']),
      t(['竞品扫描', 'Competitor scan']),
    ],
    steps: [
      collectionStep(
        'reddit',
        ['收集用户原话', 'Collect the words users use'],
        [
          '动作：在目标人群所在的 Subreddit 搜索核心词，查看帖子、评论、发布时间和讨论背景。\n产出：至少 10 条原话，分别记录用户、场景、问题和当前做法。\n通过标准：素材来自至少 3 个独立讨论，不只来自一篇高赞帖子。\n避免：把情绪强烈的一次抱怨直接当成普遍需求。',
          'Action: Search relevant subreddits, then inspect posts, comments, dates, and discussion context.\nOutput: At least 10 quotes recording the user, context, problem, and current workaround.\nPass: The evidence comes from at least three independent discussions, not one popular post.\nAvoid: Treating one emotional complaint as a common need.',
        ]
      ),
      collectionStep(
        'product-hunt',
        ['找到用户正在尝试的产品', 'Find products users are already trying'],
        [
          '动作：按任务词和分类寻找相近产品，阅读定位、功能、定价和评论。\n产出：5 个现有产品及其主要承诺、目标用户和评论中的问题。\n通过标准：能够区分产品解决的问题与它宣传的功能。\n避免：把发布当天票数当成长期需求或收入。',
          'Action: Search by task and category, then review positioning, features, pricing, and comments.\nOutput: Five existing products with their promise, audience, and problems mentioned in comments.\nPass: You can separate the user problem from the features being marketed.\nAvoid: Treating launch-day upvotes as durable demand or revenue.',
        ]
      ),
      collectionStep(
        'theres-an-ai-for-that',
        [
          '用任务语言检查 AI 替代方案',
          'Check AI alternatives using task language',
        ],
        [
          '动作：用用户原话中的任务描述搜索，而不是只搜你设想的产品名称。\n产出：相近工具的卖点、覆盖范围和未解决环节。\n通过标准：能判断市场是完全空白、已有零散工具，还是已经非常拥挤。\n避免：把没有搜到结果理解为没有需求。',
          'Action: Search with the task language found in user quotes, not only your imagined product name.\nOutput: Comparable tools, their claims, scope, and unresolved parts.\nPass: You can describe whether the space is empty, fragmented, or crowded.\nAvoid: Interpreting no search result as proof that no demand exists.',
        ]
      ),
      collectionStep(
        'toolify',
        ['交叉检查工具密度和定位', 'Cross-check tool density and positioning'],
        [
          '动作：用 Toolify 的分类、榜单和工具页面补充检查主要竞品。\n产出：补充遗漏产品，并标记常见定位和差异点。\n通过标准：新增信息能够改变或加强前一步的判断。\n避免：为了凑数量重复记录同质工具。',
          'Action: Use Toolify categories, rankings, and tool pages to cross-check major competitors.\nOutput: Add missed products and mark common positioning and differences.\nPass: The new evidence changes or strengthens the previous conclusion.\nAvoid: Listing many near-identical tools only to increase the count.',
        ],
        'alternative'
      ),
    ],
    featured: true,
    allowAiCitation: true,
    sortOrder: 1,
  },
  {
    slug: 'validate-product-idea',
    title: t([
      '验证一个产品想法有没有人需要',
      'Validate whether people need the product idea',
    ]),
    summary: t([
      '用问题证据、现有选择、流量和收入信号做一轮案头验证，决定继续、调整还是停止。',
      'Use problem evidence, alternatives, traffic, and revenue signals to decide whether to continue, adjust, or stop.',
    ]),
    content: t([
      '案头研究不能证明用户一定会付费，但能快速暴露最危险的假设。你的目标不是收集支持自己的材料，而是主动寻找能否定这个方向的证据。\n\n最终只做五类结论之一：继续验证、缩小人群、改变问题、降低 MVP，或暂时停止。',
      'Desk research cannot prove that users will pay, but it can expose the most dangerous assumption quickly. Do not collect only supportive evidence. Look for evidence that could disprove the direction.\n\nEnd with one of five decisions: continue validating, narrow the audience, change the problem, reduce the MVP, or stop for now.',
    ]),
    duration: t(['约 2 小时', 'About 2 hours']),
    audience: [
      t([
        '已经有一个明确问题和初步解决思路的人',
        'People with a defined problem and an initial solution idea',
      ]),
      t([
        '准备投入开发时间前做风险检查的人',
        'Builders checking risk before investing development time',
      ]),
    ],
    prerequisites: [
      t(['一句话问题陈述', 'A one-sentence problem statement']),
      t(['目标用户和使用场景', 'A target user and usage context']),
      t(['最小解决方案草图', 'A rough minimum solution']),
    ],
    deliverables: [
      t([
        '最危险假设和反证条件',
        'The riskiest assumption and disconfirming condition',
      ]),
      t([
        '竞品、流量与收入证据表',
        'An evidence table for competitors, traffic, and revenue',
      ]),
      t([
        '继续、调整或停止的明确结论',
        'A clear continue, adjust, or stop decision',
      ]),
    ],
    completionCriteria: [
      t([
        '至少有两类独立证据支持或反对这个方向',
        'At least two independent evidence types support or challenge the direction',
      ]),
      t([
        '流量估算、榜单和收入案例都没有被当成单独证明',
        'Traffic estimates, rankings, and revenue examples are not treated as standalone proof',
      ]),
      t([
        '已经写出下一轮必须向真实用户验证的问题',
        'The next question to test with real users is written down',
      ]),
    ],
    verifiedAt,
    nextSlug: 'build-testable-prototype',
    nextTitle: t([
      '把想法做成可测试的产品原型',
      'Turn the idea into a testable product prototype',
    ]),
    stage: stages.validate,
    category: categories.intelligence,
    tags: [
      t(['需求验证', 'Demand validation']),
      t(['最危险假设', 'Riskiest assumption']),
      t(['决策证据', 'Decision evidence']),
    ],
    steps: [
      collectionStep(
        'reddit',
        [
          '重新检查问题是否持续出现',
          'Recheck whether the problem keeps appearing',
        ],
        [
          '动作：围绕明确问题重新搜索讨论，主动寻找相反观点和满意的现有做法。\n产出：支持证据、反对证据和仍未知的问题。\n通过标准：能够说明什么证据会让你放弃或修改想法。\n避免：只保存支持自己判断的帖子。',
          'Action: Search the defined problem again and deliberately look for opposing views and satisfactory workarounds.\nOutput: Supporting evidence, opposing evidence, and remaining unknowns.\nPass: You can state what evidence would make you change or abandon the idea.\nAvoid: Saving only posts that support your current belief.',
        ]
      ),
      collectionStep(
        'product-hunt',
        ['拆解用户已经可以选择什么', 'Map what users can already choose'],
        [
          '动作：选择 3～5 个最相近产品，比较目标用户、核心承诺、价格和评论。\n产出：竞品对比表，以及用户为什么可能切换或不切换。\n通过标准：差异来自用户结果或使用方式，不只是功能名称不同。\n避免：只看首页文案，不看评论和实际产品范围。',
          'Action: Compare three to five close products by audience, promise, price, and comments.\nOutput: A competitor table and reasons users may or may not switch.\nPass: The difference is about user outcomes or workflow, not renamed features.\nAvoid: Reading only homepage copy without checking comments and product scope.',
        ]
      ),
      collectionStep(
        'similarweb',
        [
          '检查成熟竞品是否有持续访问',
          'Check whether established competitors attract sustained visits',
        ],
        [
          '动作：比较可获得数据的成熟竞品，查看流量规模、主要国家和来源变化。\n产出：3 个竞品的流量估算和来源线索。\n通过标准：结论明确写着“估算”，并与社区、搜索或收入证据一起使用。\n避免：用小网站的单月估算值做确定性判断。',
          'Action: Compare established competitors with available data, including estimated visits, countries, and acquisition sources.\nOutput: Traffic estimates and source clues for three competitors.\nPass: The conclusion labels figures as estimates and combines them with community, search, or revenue evidence.\nAvoid: Making a definite decision from one month of estimates for a small site.',
        ]
      ),
      collectionStep(
        'trustmrr',
        ['寻找公开收入信号', 'Look for public revenue signals'],
        [
          '动作：按产品类型查看已验证收入项目，寻找相近商业模式。\n产出：可比收入案例、收费方式和需要继续核查的差异。\n通过标准：只把被收录项目当作案例，不把数据库缺席当成没有收入。\n避免：把收入等同于利润、留存或长期健康。',
          'Action: Browse platform-verified revenue examples by product type and look for comparable business models.\nOutput: Comparable revenue cases, pricing models, and differences that still need checking.\nPass: Listed startups are treated as examples, while absence from the database is not treated as no revenue.\nAvoid: Equating revenue with profit, retention, or long-term health.',
        ],
        'alternative'
      ),
    ],
    featured: true,
    allowAiCitation: true,
    sortOrder: 2,
  },
  {
    slug: 'build-testable-prototype',
    title: t([
      '把想法做成可测试的产品原型',
      'Turn the idea into a testable product prototype',
    ]),
    summary: t([
      '只实现最关键的用户路径，让目标用户可以理解、点击并暴露问题。',
      'Build only the critical user path so target users can understand it, use it, and reveal problems.',
    ]),
    content: t([
      '原型的任务不是看起来像完整产品，而是验证用户能否理解价值并完成核心动作。先固定一个核心任务，再决定页面和工具。\n\n如果静态页面已经能验证理解度，就不要提前加入登录、数据库或支付。只有测试必须保存数据时，才选择全栈方案。',
      'A prototype does not need to look like a finished product. It needs to test whether users understand the value and can complete the core action. Fix one core task before choosing screens and tools.\n\nIf a static flow can test comprehension, do not add authentication, databases, or payments early. Choose a full-stack path only when the test must save data.',
    ]),
    duration: t(['半天到 1 天', 'Half a day to one day']),
    audience: [
      t([
        '已经完成问题验证，准备让用户实际操作的人',
        'People ready to let users interact after initial problem validation',
      ]),
      t([
        '容易在第一个版本加入过多功能的人',
        'Builders who tend to add too many features to the first version',
      ]),
    ],
    prerequisites: [
      t([
        '一个核心用户和一个核心任务',
        'One primary user and one primary task',
      ]),
      t(['明确不做的功能清单', 'A list of features that will not be built']),
      t([
        '准备邀请测试的 3 名目标用户',
        'Three target users you can invite to test',
      ]),
    ],
    deliverables: [
      t(['核心流程和页面顺序', 'A core flow and screen order']),
      t([
        '一个可通过链接访问的可点击原型',
        'A clickable prototype accessible by link',
      ]),
      t([
        '首轮测试问题与观察记录表',
        'A first-round test script and observation sheet',
      ]),
    ],
    completionCriteria: [
      t([
        '用户不需要口头教学就能说出产品解决什么问题',
        'Users can explain the problem being solved without verbal coaching',
      ]),
      t([
        '核心任务从开始到结果可以完整走通',
        'The core task works from start to outcome',
      ]),
      t([
        '已经记录至少 3 名目标用户的卡点和误解',
        'Friction and misunderstandings from at least three target users are recorded',
      ]),
    ],
    verifiedAt,
    stage: stages.design,
    category: categories.prototype,
    tags: [
      t(['快速原型', 'Rapid prototype']),
      t(['用户测试', 'User testing']),
      t(['MVP 降级', 'MVP reduction']),
    ],
    steps: [
      collectionStep(
        'design-lab',
        [
          '先选一种与定位一致的设计语言',
          'Choose one design language that fits the positioning',
        ],
        [
          '动作：比较少量风格，选择一种能支持产品语气和目标用户的方向。\n产出：一个设计方向和可交给 AI 的风格提示。\n通过标准：能说明选择如何服务内容层级，而不只是“看起来好看”。\n避免：混合多种风格，或让视觉掩盖核心任务。',
          'Action: Compare a small set of styles and choose one that fits the product voice and audience.\nOutput: One design direction and a style prompt for an AI builder.\nPass: You can explain how the choice supports content hierarchy, not only that it looks good.\nAvoid: Mixing multiple styles or letting visuals hide the core task.',
        ]
      ),
      collectionStep(
        'one-page-love',
        ['拆出页面顺序和转化入口', 'Study page order and conversion points'],
        [
          '动作：选择 3 个同类单页案例，只记录首屏信息、内容顺序、证明方式和 CTA。\n产出：适合你的页面结构草图。\n通过标准：每个区块都服务理解、信任或行动中的一个目标。\n避免：直接复制配色、图片或品牌表达。',
          'Action: Select three comparable one-page examples and record only hero information, content order, proof, and calls to action.\nOutput: A page-structure sketch for your product.\nPass: Every section serves comprehension, trust, or action.\nAvoid: Copying colors, imagery, or brand expression directly.',
        ]
      ),
      collectionStep(
        'stitch',
        [
          '比较核心页面的界面方案',
          'Compare interface options for the core screens',
        ],
        [
          '动作：输入目标用户、核心任务、必要页面和约束，生成并比较多个方案。\n产出：选定的核心页面和关键状态。\n通过标准：页面顺序支持用户完成任务，并包含空状态、错误状态或结果状态中的必要部分。\n避免：只根据单张界面美观度选择。',
          'Action: Describe the user, core task, required screens, and constraints, then compare multiple generated directions.\nOutput: Selected core screens and required states.\nPass: The sequence supports task completion and includes the necessary empty, error, or result state.\nAvoid: Choosing based only on one attractive screen.',
        ]
      ),
      collectionStep(
        'bolt',
        ['实现最小可点击流程', 'Build the smallest clickable flow'],
        [
          '动作：只实现核心输入、处理和结果，把非必要功能写进“不做清单”。\n产出：可访问链接和一条可走通的核心路径。\n通过标准：目标用户可以独立完成任务，测试过程中不需要开发者代操作。\n避免：在验证前加入完整账号、支付、后台和复杂权限。',
          'Action: Build only the essential input, processing, and result, while keeping nonessential features on the not-building list.\nOutput: An accessible link and one complete core path.\nPass: A target user can complete the task without the builder operating the product.\nAvoid: Adding full accounts, payments, admin, or complex permissions before validation.',
        ]
      ),
      collectionStep(
        'lovable',
        [
          '需要保存数据时改用全栈原型',
          'Use a full-stack prototype only when data must persist',
        ],
        [
          '动作：只有测试必须注册、提交表单或查看已保存数据时，才建立对应流程。\n产出：包含必要数据交互的最小版本。\n通过标准：每个新增数据功能都直接影响当前测试问题。\n避免：因为工具支持全栈，就把模板能力全部加入产品。',
          'Action: Add signup, forms, or saved data only when the test genuinely requires them.\nOutput: A minimum version with the required data interaction.\nPass: Every added data feature directly supports the current test question.\nAvoid: Adding every full-stack capability simply because the tool supports it.',
        ],
        'alternative'
      ),
    ],
    featured: true,
    allowAiCitation: true,
    sortOrder: 3,
  },
];

export function pickLocaleText(value: LocaleText, locale: string) {
  return locale === 'en' ? value.en || value.zh : value.zh || value.en;
}

export function getResourcesBySlugs(slugs: string[]) {
  return slugs
    .map((slug) => platformResources.find((resource) => resource.slug === slug))
    .filter((resource): resource is PlatformResource => Boolean(resource));
}

export function searchPlatformContent(keyword: string, locale: string) {
  const query = keyword.trim().toLowerCase();
  const matchText = (...values: string[]) =>
    !query || values.join(' ').toLowerCase().includes(query);

  const resources = platformResources.filter((resource) =>
    matchText(
      pickLocaleText(resource.name, locale),
      pickLocaleText(resource.type, locale),
      pickLocaleText(resource.stage, locale),
      pickLocaleText(resource.category, locale),
      pickLocaleText(resource.summary, locale),
      pickLocaleText(resource.reason, locale),
      pickLocaleText(resource.useCase, locale),
      ...resource.tags.map((tag) => pickLocaleText(tag, locale))
    )
  );

  const collections = platformCollections.filter((collection) =>
    matchText(
      pickLocaleText(collection.title, locale),
      pickLocaleText(collection.stage, locale),
      pickLocaleText(collection.category, locale),
      pickLocaleText(collection.summary, locale),
      ...collection.tags.map((tag) => pickLocaleText(tag, locale))
    )
  );

  return { resources, collections };
}
