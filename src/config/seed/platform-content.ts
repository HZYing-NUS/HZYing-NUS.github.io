export type LocaleText = {
  zh: string;
  en: string;
};

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
  featured: boolean;
  allowAiCitation: boolean;
};

export type PlatformCollection = {
  slug: string;
  title: LocaleText;
  summary: LocaleText;
  stage: LocaleText;
  category: LocaleText;
  tags: LocaleText[];
  resourceSlugs: string[];
  featured: boolean;
  allowAiCitation: boolean;
};

export function pickLocaleText(value: LocaleText, locale: string) {
  return locale === 'en' ? value.en || value.zh : value.zh || value.en;
}

export const platformResources: PlatformResource[] = [
  {
    slug: 'shipany-next',
    name: { zh: 'ShipAny Next', en: 'ShipAny Next' },
    website: 'https://shipany.ai/zh',
    type: { zh: 'Starter 开发模板', en: 'Starter template' },
    stage: { zh: '全栈开发', en: 'Full-stack development' },
    category: { zh: '开发底座', en: 'Development foundation' },
    tags: [
      { zh: 'Next.js', en: 'Next.js' },
      { zh: '鉴权', en: 'Auth' },
      { zh: '后台', en: 'Admin' },
    ],
    priceType: { zh: '付费', en: 'Paid' },
    summary: {
      zh: '面向 AI 产品快速上线的 Next.js starter，内置多语言、鉴权、数据库、支付和后台能力。',
      en: 'A Next.js starter for shipping AI products with i18n, auth, database, payment, and admin foundations.',
    },
    reason: {
      zh: '适合作为本项目底座，减少重复实现登录、数据库、后台和部署配置的时间。',
      en: 'A good base for this project because it avoids rebuilding auth, database, admin, and deployment plumbing.',
    },
    useCase: {
      zh: '从静态个人站升级为可登录、可管理、可搜索的 AI Web SaaS 内容平台。',
      en: 'Upgrade a static personal site into a login-enabled, manageable, searchable AI Web SaaS content platform.',
    },
    featured: true,
    allowAiCitation: true,
  },
  {
    slug: 'vercel',
    name: { zh: 'Vercel', en: 'Vercel' },
    website: 'https://vercel.com',
    type: { zh: '部署服务商', en: 'Deployment provider' },
    stage: { zh: '部署上线', en: 'Deployment' },
    category: { zh: '基础设施', en: 'Infrastructure' },
    tags: [
      { zh: 'Next.js', en: 'Next.js' },
      { zh: '部署', en: 'Deploy' },
      { zh: '预览环境', en: 'Preview' },
    ],
    priceType: { zh: 'Freemium', en: 'Freemium' },
    summary: {
      zh: 'Next.js 项目的主流部署平台，支持 GitHub 导入、预览环境、环境变量和生产部署。',
      en: 'A mainstream deployment platform for Next.js with GitHub import, previews, environment variables, and production deploys.',
    },
    reason: {
      zh: '符合 V1 部署策略，能让 ShipAny 项目用标准 Next.js 流程上线。',
      en: 'Matches the V1 deployment plan and keeps the ShipAny project on the standard Next.js deployment path.',
    },
    useCase: {
      zh: '导入私有 GitHub 仓库，配置 Neon、Google OAuth 和 AI 服务环境变量后部署。',
      en: 'Import the private GitHub repo, configure Neon, Google OAuth, AI service variables, then deploy.',
    },
    featured: true,
    allowAiCitation: true,
  },
  {
    slug: 'neon',
    name: { zh: 'Neon', en: 'Neon' },
    website: 'https://neon.com',
    type: { zh: '数据库服务商', en: 'Database provider' },
    stage: { zh: '后端开发', en: 'Backend development' },
    category: { zh: '基础设施', en: 'Infrastructure' },
    tags: [
      { zh: 'PostgreSQL', en: 'PostgreSQL' },
      { zh: 'Drizzle', en: 'Drizzle' },
      { zh: '数据库迁移', en: 'Migrations' },
    ],
    priceType: { zh: 'Freemium', en: 'Freemium' },
    summary: {
      zh: 'Serverless PostgreSQL 服务，适合搭配 Vercel 和 Drizzle 承载内容平台数据。',
      en: 'Serverless PostgreSQL that pairs well with Vercel and Drizzle for content-platform data.',
    },
    reason: {
      zh: 'SPEC 已确定 V1 使用 Neon PostgreSQL，资源、专题、文章和投稿都围绕它建模。',
      en: 'The SPEC chooses Neon PostgreSQL for V1, with resources, collections, articles, and submissions modeled around it.',
    },
    useCase: {
      zh: '保存资源库、专题、文章 Markdown、投稿建议、标签分类和 AI 引用开关。',
      en: 'Store resources, collections, article Markdown, submissions, tags, categories, and AI citation flags.',
    },
    featured: true,
    allowAiCitation: true,
  },
  {
    slug: 'claude-code',
    name: { zh: 'Claude Code', en: 'Claude Code' },
    website: 'https://claude.ai/code',
    type: { zh: 'AI 编程工具', en: 'AI coding tool' },
    stage: { zh: '前端开发', en: 'Frontend development' },
    stages: [
      { zh: '前端开发', en: 'Frontend development' },
      { zh: '后端开发', en: 'Backend development' },
      { zh: '部署上线', en: 'Deployment' },
    ],
    category: { zh: '开发效率', en: 'Development productivity' },
    tags: [
      { zh: 'AI 编程', en: 'AI coding' },
      { zh: 'Agent', en: 'Agent' },
      { zh: '终端', en: 'Terminal' },
    ],
    priceType: { zh: '付费', en: 'Paid' },
    summary: {
      zh: '在终端、IDE 和网页中协作修改代码的 AI 编程工具，适合长期维护全栈项目。',
      en: 'An AI coding tool for terminal, IDE, and web workflows, useful for maintaining full-stack projects.',
    },
    reason: {
      zh: '适合作为一人公司开发工作流核心，能把需求拆解、代码修改、验证和运维串起来。',
      en: 'A strong core for a one-person company workflow because it connects scoping, edits, verification, and operations.',
    },
    useCase: {
      zh: '迭代 ShipAny 项目、迁移旧站内容、审查 PR、维护部署和生成内容运营素材。',
      en: 'Iterate the ShipAny project, migrate legacy content, review PRs, maintain deployment, and create operating assets.',
    },
    featured: true,
    allowAiCitation: true,
  },
  {
    slug: 'shadcn-ui',
    name: { zh: 'shadcn/ui', en: 'shadcn/ui' },
    website: 'https://ui.shadcn.com',
    type: { zh: 'SaaS 组件库', en: 'SaaS component library' },
    stage: { zh: 'UI 设计', en: 'UI design' },
    category: { zh: '界面组件', en: 'UI components' },
    tags: [
      { zh: '组件库', en: 'Components' },
      { zh: 'Tailwind', en: 'Tailwind' },
      { zh: 'React', en: 'React' },
    ],
    priceType: { zh: '开源', en: 'Open source' },
    summary: {
      zh: '基于 Radix UI 和 Tailwind 的组件体系，适合搭建后台、表单、筛选和内容管理界面。',
      en: 'A Radix UI and Tailwind based component system for dashboards, forms, filters, and content management.',
    },
    reason: {
      zh: 'ShipAny 已采用相近组件体系，继续沿用能保持界面一致并降低实现成本。',
      en: 'ShipAny already uses a similar component style, so keeping it preserves visual consistency and reduces build cost.',
    },
    useCase: {
      zh: '资源筛选器、投稿表单、后台内容编辑、标签分类管理和搜索结果列表。',
      en: 'Resource filters, submission forms, admin editors, taxonomy management, and search result lists.',
    },
    featured: false,
    allowAiCitation: true,
  },
  {
    slug: 'aichuhai',
    name: { zh: 'AI 出海', en: 'AI Chuhai' },
    website: 'https://aichuhai.dev/',
    type: { zh: '参考网站', en: 'Reference site' },
    stage: { zh: '需求发现', en: 'Demand discovery' },
    category: { zh: '内容平台参考', en: 'Content platform reference' },
    tags: [
      { zh: '出海', en: 'Going global' },
      { zh: '资源目录', en: 'Resource directory' },
      { zh: '参考站', en: 'Reference' },
    ],
    priceType: { zh: '免费', en: 'Free' },
    summary: {
      zh: '面向 AI 出海的信息与资源平台，可作为信息架构和内容组织参考。',
      en: 'An AI going-global information and resource platform useful as an IA and content-organization reference.',
    },
    reason: {
      zh: 'SPEC 明确参考其组织方式，但本项目不复刻，而是聚焦 AI Web SaaS 建站流程。',
      en: 'The SPEC references its organization style, while this project narrows the focus to the AI Web SaaS building workflow.',
    },
    useCase: {
      zh: '对照资源分类、专题入口、内容密度和中文出海用户的信息需求。',
      en: 'Compare resource categories, collection entry points, content density, and the needs of Chinese builders going global.',
    },
    featured: false,
    allowAiCitation: true,
  },
  {
    slug: 'toolify',
    name: { zh: 'Toolify', en: 'Toolify' },
    website: 'https://www.toolify.ai/',
    type: { zh: 'AI 工具榜单', en: 'AI tool directory' },
    stage: { zh: '需求发现', en: 'Demand discovery' },
    category: { zh: '市场观察', en: 'Market intelligence' },
    tags: [
      { zh: 'AI 工具', en: 'AI tools' },
      { zh: '榜单', en: 'Ranking' },
      { zh: '竞品发现', en: 'Competitor discovery' },
    ],
    priceType: { zh: 'Freemium', en: 'Freemium' },
    summary: {
      zh: 'AI 工具目录和榜单，可用于发现新品类、竞品、关键词和海外需求信号。',
      en: 'An AI tool directory and ranking site for discovering categories, competitors, keywords, and demand signals.',
    },
    reason: {
      zh: '适合在产品立项前扫描已有工具密度，避免只凭直觉判断机会。',
      en: 'Useful before picking an idea because it reveals tool density instead of relying only on intuition.',
    },
    useCase: {
      zh: '搜索某个 AI 产品方向，整理竞品列表、定价方式、流量来源和差异化角度。',
      en: 'Search an AI product direction, then map competitors, pricing, traffic sources, and differentiation angles.',
    },
    featured: false,
    allowAiCitation: true,
  },
  {
    slug: 'aitdk',
    name: { zh: 'AITDK', en: 'AITDK' },
    website: 'https://aitdk.com/',
    type: { zh: 'SEO 工具', en: 'SEO tool' },
    stage: { zh: 'SEO', en: 'SEO' },
    category: { zh: '增长运营', en: 'Growth' },
    tags: [
      { zh: 'SEO', en: 'SEO' },
      { zh: '关键词', en: 'Keywords' },
      { zh: '流量', en: 'Traffic' },
    ],
    priceType: { zh: 'Freemium', en: 'Freemium' },
    summary: {
      zh: '用于查看网站 SEO、关键词和流量线索的工具，可辅助出海产品做内容选题。',
      en: 'A tool for checking site SEO, keywords, and traffic clues, useful for content planning for global products.',
    },
    reason: {
      zh: '能把资源库从“收藏夹”推进到“按搜索需求组织内容”的运营系统。',
      en: 'Moves the resource library from bookmarks toward an operating system organized by search demand.',
    },
    useCase: {
      zh: '分析参考站和竞品站，提取关键词机会，反推专题和文章选题。',
      en: 'Analyze reference and competitor sites, extract keyword opportunities, and derive collections and article topics.',
    },
    featured: false,
    allowAiCitation: true,
  },
  {
    slug: 'namecheap',
    name: { zh: 'Namecheap', en: 'Namecheap' },
    website: 'https://www.namecheap.com/',
    type: { zh: '域名服务商', en: 'Domain provider' },
    stage: { zh: '域名邮箱', en: 'Domain and email' },
    category: { zh: '基础设施', en: 'Infrastructure' },
    tags: [
      { zh: '域名', en: 'Domain' },
      { zh: 'DNS', en: 'DNS' },
      { zh: '出海基础设施', en: 'Global infrastructure' },
    ],
    priceType: { zh: '付费', en: 'Paid' },
    summary: {
      zh: '常用域名注册服务商，适合为 AI Web SaaS 项目购买和管理英文域名。',
      en: 'A common domain registrar for buying and managing English domains for AI Web SaaS projects.',
    },
    reason: {
      zh: '域名是上线闭环中的基础环节，需要和 Vercel、邮箱、OAuth 回调地址一起规划。',
      en: 'Domains are a base part of the launch loop and must be planned with Vercel, email, and OAuth callbacks.',
    },
    useCase: {
      zh: '购买域名，配置 DNS，绑定 Vercel 项目和 Google OAuth 允许域名。',
      en: 'Buy a domain, configure DNS, bind it to Vercel, and set allowed domains for Google OAuth.',
    },
    featured: false,
    allowAiCitation: true,
  },
];

export const platformCollections: PlatformCollection[] = [
  {
    slug: 'ai-saas-launch-stack',
    title: {
      zh: '从 0 上线一个 AI SaaS 的基础栈',
      en: 'Base Stack for Launching an AI SaaS from Zero',
    },
    summary: {
      zh: '把 Starter、数据库、部署、域名和 UI 组件串成最小上线链路。',
      en: 'Connect starter, database, deployment, domain, and UI components into a minimal launch path.',
    },
    stage: { zh: '部署上线', en: 'Deployment' },
    category: { zh: '上线清单', en: 'Launch checklist' },
    tags: [
      { zh: 'Vercel', en: 'Vercel' },
      { zh: 'Neon', en: 'Neon' },
      { zh: 'ShipAny', en: 'ShipAny' },
    ],
    resourceSlugs: ['shipany-next', 'neon', 'vercel', 'namecheap', 'shadcn-ui'],
    featured: true,
    allowAiCitation: true,
  },
  {
    slug: 'claude-code-builder-kit',
    title: { zh: 'Claude Code 开发资源', en: 'Claude Code Builder Kit' },
    summary: {
      zh: '围绕 AI 编程、ShipAny 改造和内容平台迭代建立一人开发工作流。',
      en: 'Build a solo development workflow around AI coding, ShipAny customization, and content-platform iteration.',
    },
    stage: { zh: '前端开发', en: 'Frontend development' },
    category: { zh: '开发效率', en: 'Development productivity' },
    tags: [
      { zh: 'AI 编程', en: 'AI coding' },
      { zh: '一人公司', en: 'One-person company' },
    ],
    resourceSlugs: ['claude-code', 'shipany-next', 'shadcn-ui'],
    featured: true,
    allowAiCitation: true,
  },
  {
    slug: 'seo-demand-discovery',
    title: {
      zh: '需求发现与 SEO 工具清单',
      en: 'Demand Discovery and SEO Tool List',
    },
    summary: {
      zh: '用 AI 工具榜单、竞品观察和关键词分析来生成资源库专题与文章选题。',
      en: 'Use AI directories, competitor observation, and keyword analysis to generate collection and article topics.',
    },
    stage: { zh: '需求发现', en: 'Demand discovery' },
    category: { zh: '增长运营', en: 'Growth' },
    tags: [
      { zh: 'SEO', en: 'SEO' },
      { zh: '竞品', en: 'Competitors' },
      { zh: '内容选题', en: 'Content ideas' },
    ],
    resourceSlugs: ['toolify', 'aitdk', 'aichuhai'],
    featured: true,
    allowAiCitation: true,
  },
];

export function getResourcesBySlugs(slugs: string[]) {
  return slugs
    .map((slug) => platformResources.find((resource) => resource.slug === slug))
    .filter((resource): resource is PlatformResource => Boolean(resource));
}

export function searchPlatformContent(keyword: string, locale: string) {
  const query = keyword.trim().toLowerCase();

  const matchText = (...values: string[]) => {
    if (!query) return true;
    return values.join(' ').toLowerCase().includes(query);
  };

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
