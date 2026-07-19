type SkillReference = {
  id: string;
  keywordsZh: string[];
  keywordsEn: string[];
  contentZh: string;
  contentEn: string;
};

const BUILT_IN_REFERENCES: Record<string, SkillReference> = {
  'b2b-decision-chain': {
    id: 'b2b-decision-chain',
    keywordsZh: ['b2b', '企业', '采购', '决策链', '大客户', '预算审批'],
    keywordsEn: [
      'b2b',
      'enterprise',
      'procurement',
      'buyer',
      'budget',
      'sales',
    ],
    contentZh:
      'B2B 决策链：分别确认使用者、决策者、付费方和阻止者。先验证使用者最近一次真实痛点，再确认业务指标、预算来源、审批门槛以及安全、法务、财务或集成风险。',
    contentEn:
      'B2B decision chain: identify the user, decision-maker, payer, and blocker. Validate the user’s most recent real pain first, then confirm the business metric, budget source, approval threshold, and security, legal, finance, or integration risks.',
  },
  'find-idea': {
    id: 'find-idea',
    keywordsZh: ['没有想法', '找方向', '寻找 idea', '需求', '机会'],
    keywordsEn: [
      'find an idea',
      'no idea',
      'opportunity',
      'problem discovery',
      'demand',
    ],
    contentZh:
      '寻找 idea：从已经发生、重复出现且有人付出时间或金钱的问题开始。收集用户原话、当前替代方案和已付代价，不从技术能力或热门词反推需求。',
    contentEn:
      'Finding an idea: start with problems that already happen repeatedly and cost people time or money. Collect users’ exact language, current alternatives, and existing costs; do not infer demand from a technology or trend.',
  },
  'imitation-6-layers': {
    id: 'imitation-6-layers',
    keywordsZh: ['竞品', '模仿', '复刻', '抄', '拆解'],
    keywordsEn: [
      'competitor',
      'copy',
      'clone',
      'replicate',
      'reverse engineer',
    ],
    contentZh:
      '竞品拆解：分别检查目标用户、触发场景、核心承诺、交付流程、分发方式和商业模式。可以学习结构与验证方式，但不得复制品牌、文案、受保护内容或造成用户混淆。',
    contentEn:
      'Competitor analysis: examine the target user, trigger, core promise, delivery workflow, distribution, and business model separately. Learn from structure and validation methods, but do not copy branding, wording, protected content, or create user confusion.',
  },
  overseas: {
    id: 'overseas',
    keywordsZh: ['出海', '海外', '英文站', '跨境', '国外'],
    keywordsEn: [
      'international',
      'overseas',
      'global',
      'english market',
      'cross-border',
    ],
    contentZh:
      '海外市场：收敛到具体地区、行业、角色、任务和付费场景；重新验证当地用户原话、替代方案、定价习惯、分发渠道、支付税务、隐私合规以及时区支持，不能只翻译国内方案。',
    contentEn:
      'International markets: narrow the idea to a specific region, industry, role, task, and payment situation. Revalidate local user language, alternatives, pricing habits, distribution, payments and tax, privacy compliance, and time-zone support instead of merely translating a domestic product.',
  },
  'price-anxiety': {
    id: 'price-anxiety',
    keywordsZh: ['定价', '价格', '免费', '订阅', '一次性付费', '收费'],
    keywordsEn: [
      'price',
      'pricing',
      'free',
      'subscription',
      'one-time payment',
      'charge',
    ],
    contentZh:
      '定价判断：先确认付费方、购买结果、替代方案成本和预算来源，再选择一次性、按量或订阅。不要用低价掩盖价值不清，也不要把口头意愿当作付款证据。',
    contentEn:
      'Pricing: identify the payer, purchased outcome, alternative cost, and budget source before choosing one-time, usage-based, or subscription pricing. Do not use a low price to hide unclear value or treat stated willingness as payment evidence.',
  },
  'window-alpha': {
    id: 'window-alpha',
    keywordsZh: ['风口', '窗口期', 'alpha', '趋势', '新模型', '新技术'],
    keywordsEn: [
      'window',
      'alpha',
      'trend',
      'new model',
      'new technology',
      'timing',
    ],
    contentZh:
      '窗口期：区分短期渠道或技术红利与长期用户价值。验证窗口能否带来更低获客成本、更强交付能力或独特数据积累，并准备红利消失后的留存理由。',
    contentEn:
      'Market window: separate a temporary channel or technology advantage from durable user value. Test whether the window lowers acquisition cost, improves delivery, or creates unique data, and define why users stay after the advantage disappears.',
  },
};

function normalizeReference(value: unknown): SkillReference | null {
  if (typeof value === 'string') return BUILT_IN_REFERENCES[value] || null;
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<SkillReference>;
  if (!record.id || !record.contentZh || !record.contentEn) return null;
  return {
    id: record.id,
    keywordsZh: record.keywordsZh || [],
    keywordsEn: record.keywordsEn || [],
    contentZh: record.contentZh,
    contentEn: record.contentEn,
  };
}

export function selectSkillReferences({
  references,
  question,
  locale,
}: {
  references: unknown;
  question: string;
  locale: 'zh' | 'en';
}) {
  if (!Array.isArray(references) || !question.trim()) return [];
  const normalizedQuestion = question.toLowerCase();
  return references
    .map(normalizeReference)
    .filter((reference): reference is SkillReference => Boolean(reference))
    .map((reference) => ({
      reference,
      score: (locale === 'en'
        ? reference.keywordsEn
        : reference.keywordsZh
      ).reduce(
        (total, keyword) =>
          total + Number(normalizedQuestion.includes(keyword.toLowerCase())),
        0
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map(({ reference }) => ({
      id: reference.id,
      content: locale === 'en' ? reference.contentEn : reference.contentZh,
    }));
}
