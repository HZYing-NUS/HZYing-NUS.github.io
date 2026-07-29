export type WorkspaceStageKey =
  | 'discover'
  | 'validate'
  | 'design'
  | 'develop'
  | 'launch'
  | 'optimize'
  | 'operate';

export type WorkspaceStage = {
  key: WorkspaceStageKey;
  labelZh: string;
  labelEn: string;
  keywords: string[];
};

export type WorkspaceRecommendationItem = {
  slug: string;
  title: string;
  summary: string;
  href: string;
  meta?: string;
};

export type WorkspaceRecommendations = {
  stageLabel: string | null;
  resources: WorkspaceRecommendationItem[];
  collections: WorkspaceRecommendationItem[];
  articles: WorkspaceRecommendationItem[];
};

export type WorkspaceRecommendationCandidate = {
  featured?: boolean;
  stageValues?: Array<string | null | undefined>;
  searchText?: string;
};

const stages: WorkspaceStage[] = [
  {
    key: 'discover',
    labelZh: '发现需求',
    labelEn: 'Discover demand',
    keywords: [
      '发现需求',
      '需求发现',
      '问题发现',
      '用户研究',
      '市场研究',
      'discover demand',
      'problem discovery',
      'user research',
      'market research',
      'research',
    ],
  },
  {
    key: 'validate',
    labelZh: '验证想法',
    labelEn: 'Validate the idea',
    keywords: [
      '验证想法',
      '需求验证',
      '产品验证',
      '商业验证',
      'validate the idea',
      'idea validation',
      'demand validation',
      'validation',
      'validate',
    ],
  },
  {
    key: 'design',
    labelZh: '设计原型',
    labelEn: 'Design and prototype',
    keywords: [
      '设计原型',
      '产品原型',
      '界面设计',
      '交互设计',
      'design and prototype',
      'product design',
      'prototype',
      'wireframe',
      'design',
    ],
  },
  {
    key: 'develop',
    labelZh: '开发搭建',
    labelEn: 'Build the product',
    keywords: [
      '开发搭建',
      '产品开发',
      '网站开发',
      '编码',
      '最小可行产品',
      'build the product',
      'development',
      'develop',
      'coding',
      'build',
      'mvp',
    ],
  },
  {
    key: 'launch',
    labelZh: '部署上线',
    labelEn: 'Launch',
    keywords: [
      '部署上线',
      '产品上线',
      '网站上线',
      '产品发布',
      'deployment',
      'deploy',
      'release',
      'launch',
    ],
  },
  {
    key: 'optimize',
    labelZh: '分析优化',
    labelEn: 'Measure and optimize',
    keywords: [
      '分析优化',
      '数据分析',
      '性能优化',
      '搜索优化',
      'measure and optimize',
      'analytics',
      'optimization',
      'optimize',
      'performance',
      'seo',
    ],
  },
  {
    key: 'operate',
    labelZh: '运营增长',
    labelEn: 'Operate and grow',
    keywords: [
      '运营增长',
      '用户增长',
      '市场营销',
      '内容运营',
      '获客',
      'operate and grow',
      'acquisition',
      'marketing',
      'growth',
    ],
  },
];

function normalize(value: string) {
  return value.normalize('NFKC').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

export function resolveWorkspaceStageValue(value?: string | null) {
  if (!value?.trim()) return null;
  const normalized = normalize(value);
  return (
    stages.find((stage) =>
      stage.keywords.some((keyword) => normalized.includes(normalize(keyword)))
    ) || null
  );
}

export function resolveWorkspaceStage(
  values: Array<string | null | undefined>
) {
  for (const value of values) {
    const stage = resolveWorkspaceStageValue(value);
    if (stage) return stage;
  }
  return null;
}

export function rankWorkspaceRecommendationCandidates<
  T extends WorkspaceRecommendationCandidate,
>(items: T[], stage: WorkspaceStage | null, limit: number) {
  return items
    .map((item, index) => {
      const exactStageMatch = Boolean(
        stage &&
          item.stageValues?.some(
            (value) => resolveWorkspaceStageValue(value)?.key === stage.key
          )
      );
      const searchText = normalize(item.searchText || '');
      const keywordMatches = stage
        ? stage.keywords.filter((keyword) =>
            searchText.includes(normalize(keyword))
          ).length
        : 0;
      const score =
        (exactStageMatch ? 100 : 0) +
        keywordMatches * 10 +
        (item.featured ? 5 : 0);
      return { item, index, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, Math.max(0, limit))
    .map(({ item }) => item);
}
