import { getCommunityHttpsUrl } from './profile-content';

type LocalizedValue = { zh?: unknown; en?: unknown };
type LegacyRecord = Record<string, unknown>;

function localized(value: unknown, locale: 'zh' | 'en') {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  const record = value as LocalizedValue;
  const preferred = record[locale];
  const fallback = record[locale === 'zh' ? 'en' : 'zh'];
  return (
    ((typeof preferred === 'string' ? preferred : fallback) as string) || ''
  );
}

function records(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is LegacyRecord =>
        Boolean(item && typeof item === 'object' && !Array.isArray(item))
      )
    : [];
}

function firstText(record: LegacyRecord, locale: 'zh' | 'en', keys: string[]) {
  for (const key of keys) {
    const value = localized(record[key], locale);
    if (value) return value;
  }
  return '';
}

function mapExperience(source: LegacyRecord, locale: 'zh' | 'en') {
  return records(source['教育列表'])
    .concat(records(source['经历列表']))
    .map((item) => ({
      period: localized(item['时间'], locale),
      periodZh: localized(item['时间'], 'zh'),
      periodEn: localized(item['时间'], 'en'),
      title: firstText(item, locale, ['职位', '学位', '标题', '学校', '单位']),
      titleZh: firstText(item, 'zh', ['职位', '学位', '标题', '学校', '单位']),
      titleEn: firstText(item, 'en', ['职位', '学位', '标题', '学校', '单位']),
      organization: firstText(item, locale, ['公司', '单位', '学校']),
      organizationZh: firstText(item, 'zh', ['公司', '单位', '学校']),
      organizationEn: firstText(item, 'en', ['公司', '单位', '学校']),
      description: firstText(item, locale, ['描述', '职责与成果', '摘要']),
      descriptionZh: firstText(item, 'zh', ['描述', '职责与成果', '摘要']),
      descriptionEn: firstText(item, 'en', ['描述', '职责与成果', '摘要']),
    }))
    .filter((item) => item.title || item.organization || item.description);
}

function mapWorks(source: LegacyRecord, locale: 'zh' | 'en') {
  return records(source['作品列表'])
    .concat(records(source['论文列表']))
    .map((item) => {
      const url = getCommunityHttpsUrl(item['链接']);
      return {
        title: firstText(item, locale, ['标题', '项目', '论文标题']),
        description: firstText(item, locale, ['描述', '摘要', '职责与成果']),
        titleZh: firstText(item, 'zh', ['标题', '项目', '论文标题']),
        titleEn: firstText(item, 'en', ['标题', '项目', '论文标题']),
        descriptionZh: firstText(item, 'zh', ['描述', '摘要', '职责与成果']),
        descriptionEn: firstText(item, 'en', ['描述', '摘要', '职责与成果']),
        ...(url ? { url } : {}),
      };
    })
    .filter((item) => item.title || item.description || item.url);
}

export function mapLegacyAboutToCommunityProfile(
  source: LegacyRecord,
  locale: 'zh' | 'en'
) {
  const name = localized(source['名字'], locale);
  const avatarUrl = getCommunityHttpsUrl(source['头像图片']);
  const githubUrl = getCommunityHttpsUrl(source['GitHub']);
  const socialLinks = githubUrl ? [{ label: 'GitHub', url: githubUrl }] : [];

  return {
    displayName: name,
    avatarUrl,
    headline: localized(source['一句话标签'], locale),
    aboutZh: localized(source['自我介绍'], 'zh'),
    aboutEn: localized(source['自我介绍'], 'en'),
    experience: mapExperience(source, locale),
    skills: [],
    works: mapWorks(source, locale),
    focusAreas: [],
    region: '',
    websiteUrl: null,
    socialLinks,
  };
}
