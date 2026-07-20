export type ProjectMemoryCandidate = {
  category:
    | 'decision'
    | 'completed'
    | 'current_issue'
    | 'next_step'
    | 'conclusion'
    | 'fixed';
  type: 'fixed' | 'progress' | 'related';
  content: string;
  importance: number;
  replaceCategory: boolean;
  sourceRole: 'user' | 'assistant';
};

export type MemoryCandidateIdentity = {
  userId: string;
  scopeId: string;
  content: string;
};

const sensitivePattern =
  /(?:身份证|护照|银行卡|信用卡|密码|密钥|token|api\s*key|手机号|电话|邮箱|住址|地址|生日|出生日期|病史|疾病|健康|性取向|宗教|政治|收入|资产|password|secret|access\s*token|phone|email|address|birthday|date of birth|health|medical|sexual orientation|passport|credit card|bank account|social security|ssn|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b1[3-9]\d{9}\b|\bsk-[A-Za-z0-9_-]{8,}\b)/iu;

function sentences(text: string) {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[。！？!?；;])|\n+/u)
    .map((item) => item.replace(/^[-*\d.、\s]+/u, '').trim())
    .filter((item) => item.length >= 4 && item.length <= 240);
}

function firstMatch(text: string, pattern: RegExp) {
  return sentences(text).find((sentence) => pattern.test(sentence));
}

function candidate(
  category: ProjectMemoryCandidate['category'],
  type: ProjectMemoryCandidate['type'],
  label: string,
  content: string | undefined,
  importance: number,
  replaceCategory = false,
  sourceRole: ProjectMemoryCandidate['sourceRole'] = 'assistant'
): ProjectMemoryCandidate | undefined {
  if (!content || sensitivePattern.test(content)) return undefined;
  return {
    category,
    type,
    content: `[${label}] ${content}`,
    importance,
    replaceCategory,
    sourceRole,
  };
}

export function extractProjectMemoryCandidates(
  question: string,
  answer: string
) {
  const candidates = [
    candidate(
      'decision',
      'fixed',
      '已确认决策',
      firstMatch(
        question,
        /(?:(?:我|我们)(?:已经|已)?(?:决定|确认)|(?:我|我们)采用|已确认(?:采用)?|confirmed|we (?:have )?(?:decided|confirmed)|i (?:have )?(?:decided|confirmed))/iu
      ),
      3,
      false,
      'user'
    ),
    candidate(
      'completed',
      'progress',
      '已完成事项',
      firstMatch(answer, /(?:已完成|已经完成|已实现|已修复|已通过|构建通过)/u),
      2,
      false,
      'assistant'
    ),
    candidate(
      'current_issue',
      'progress',
      '当前问题',
      firstMatch(
        question,
        /(?:问题|报错|错误|失败|阻塞|无法|不能|未完成|problem|error|failed|blocked|cannot|can't|not completed)/iu
      ),
      2,
      true,
      'user'
    ),
    candidate(
      'next_step',
      'progress',
      '下一步',
      firstMatch(
        answer,
        /(?:下一步|接下来|后续需要|待办|需要继续|next step|next action|follow-up|todo)/iu
      ),
      2,
      true,
      'assistant'
    ),
    candidate(
      'conclusion',
      'related',
      '重要结论',
      firstMatch(
        answer,
        /(?:结论|根因|原因是|验证结果|需确认|未验证|conclusion|root cause|because|verification|unverified|needs confirmation)/iu
      ),
      2,
      false,
      'assistant'
    ),
    candidate(
      'fixed',
      'fixed',
      '固定背景',
      firstMatch(
        question,
        /(?:项目(?:名称|目标|定位|技术栈)是|我们使用|本项目使用|project (?:name|goal|positioning|stack) is|we use|this project uses)/iu
      ),
      3,
      false,
      'user'
    ),
  ].filter((item): item is ProjectMemoryCandidate => Boolean(item));

  return candidates.filter(
    (item, index) =>
      candidates.findIndex(
        (candidate) =>
          normalizeMemoryContent(
            candidate.content.replace(/^\[[^\]]+\]\s*/u, '')
          ) ===
          normalizeMemoryContent(item.content.replace(/^\[[^\]]+\]\s*/u, ''))
      ) === index
  );
}

export function extractGlobalMemoryCandidates(message: string) {
  if (sensitivePattern.test(message)) return [];
  const matches = [
    message.match(
      /(?:以后|今后)?(?:请)?(?:叫我|称呼我为)\s*[「“"]?([^，。！？!?”」"\n]{1,20})/u
    ),
    message.match(
      /(?:我(?:一直)?(?:喜欢|偏好)|我的偏好是)\s*([^。！？!?\n]{2,100})/u
    ),
    message.match(
      /(?:以后|今后|后续)(?:请)?(?:一直)?(?:都|保持|使用|用|请)(?!叫我|称呼我)\s*([^。！？!?\n]{2,100})/u
    ),
    message.match(
      /(?:我的长期背景是|我的长期职业是|长期来说我是)\s*([^，。！？!?\n]{2,60})/u
    ),
    message.match(/(?:call me|please call me)\s+([^,.!?\n]{1,30})/iu),
    message.match(
      /(?:i (?:always )?(?:prefer|like)|my preference is)\s+([^.!?\n]{2,100})/iu
    ),
    message.match(
      /(?:my long-term background is|my long-term role is)\s+([^,.!?\n]{2,60})/iu
    ),
  ];
  const labels = [
    '称呼偏好',
    '长期偏好',
    '长期偏好',
    '长期背景',
    '称呼偏好',
    '长期偏好',
    '长期背景',
  ];
  const negatedPreference =
    /(?:以后|今后|后续).*?(?:不要|不再)\s*([^。！？!?\n]{2,100})/u
      .exec(message)?.[1]
      ?.trim();

  const candidates = matches
    .map((match, index) => {
      const value = match?.[1]?.trim();
      return value && !sensitivePattern.test(value)
        ? `[${labels[index]}] ${value}`
        : undefined;
    })
    .filter((item): item is string => Boolean(item))
    .filter((item, index, items) => items.indexOf(item) === index);
  if (negatedPreference && !sensitivePattern.test(negatedPreference)) {
    candidates.push(`[长期偏好] 不要${negatedPreference}`);
  }
  return candidates.filter(
    (item, index, items) => items.indexOf(item) === index
  );
}

export function normalizeMemoryContent(content: string) {
  return content
    .toLowerCase()
    .replace(/[\s，。！？；：、,.!?;:'"“”‘’「」【】()[\]{}]/gu, '');
}

export function createMemoryDedupeKey({
  userId,
  scopeId,
  content,
}: MemoryCandidateIdentity) {
  const normalized = normalizeMemoryContent(content);
  let hash = 2166136261;
  for (const character of `${userId}\0${scopeId}\0${normalized}`) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 16777619);
  }
  return `${scopeId}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
