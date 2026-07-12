import { Form } from '@/shared/types/blocks/form';
import { category, resource, stage, tag } from '@/config/db/schema';

const resourceTypes = [
  'reference_site',
  'tool',
  'chrome_extension',
  'skill',
  'mcp',
  'starter',
  'component_library',
  'ui_template',
  'model_ranking',
  'infrastructure',
];

const priceTypes = ['free', 'freemium', 'paid', 'open_source', 'unknown'];
const statuses = ['draft', 'published', 'archived'];

type ResourceValues = typeof resource.$inferSelect;

export function getResourceForm({
  locale,
  values,
  stages,
  categories,
  tags,
  tagIds = [],
  submit,
}: {
  locale: string;
  values?: ResourceValues;
  stages: (typeof stage.$inferSelect)[];
  categories: (typeof category.$inferSelect)[];
  tags: (typeof tag.$inferSelect)[];
  tagIds?: string[];
  submit: Form['submit'];
}): Form {
  const isZh = locale === 'zh';

  return {
    fields: [
      {
        name: 'nameZh',
        title: isZh ? '中文名称' : 'Chinese name',
        type: 'text',
        value: values?.nameZh,
        validation: { required: true },
      },
      {
        name: 'nameEn',
        title: isZh ? '英文名称' : 'English name',
        type: 'text',
        value: values?.nameEn,
      },
      {
        name: 'slug',
        title: 'Slug',
        type: 'text',
        value: values?.slug,
        validation: { required: true },
        tip: isZh ? '使用小写英文、数字和连字符。' : 'Use lowercase letters, numbers, and hyphens.',
      },
      {
        name: 'websiteUrl',
        title: isZh ? '官网链接' : 'Website URL',
        type: 'url',
        value: values?.websiteUrl,
        validation: { required: true },
      },
      {
        name: 'resourceType',
        title: isZh ? '资源类型' : 'Resource type',
        type: 'select',
        value: values?.resourceType || 'tool',
        options: resourceTypes.map((value) => ({ title: value, value })),
      },
      {
        name: 'stageId',
        title: isZh ? '使用阶段' : 'Stage',
        type: 'select',
        value: values?.stageId || '',
        options: [
          { title: isZh ? '未设置' : 'Not set', value: '' },
          ...stages.map((item) => ({
            title: isZh ? item.nameZh : item.nameEn || item.nameZh,
            value: item.id,
          })),
        ],
      },
      {
        name: 'categoryId',
        title: isZh ? '分类' : 'Category',
        type: 'select',
        value: values?.categoryId || '',
        options: [
          { title: isZh ? '未设置' : 'Not set', value: '' },
          ...categories.map((item) => ({
            title: isZh ? item.nameZh : item.nameEn || item.nameZh,
            value: item.id,
          })),
        ],
      },
      {
        name: 'tags',
        title: isZh ? '标签' : 'Tags',
        type: 'checkbox',
        value: tagIds,
        options: tags.map((item) => ({
          title: isZh ? item.nameZh : item.nameEn || item.nameZh,
          value: item.id,
        })),
      },
      {
        name: 'pricingType',
        title: isZh ? '价格类型' : 'Price type',
        type: 'select',
        value: values?.pricingType || 'unknown',
        options: priceTypes.map((value) => ({ title: value, value })),
      },
      {
        name: 'summaryZh',
        title: isZh ? '中文简介' : 'Chinese summary',
        type: 'textarea',
        value: values?.summaryZh,
      },
      {
        name: 'summaryEn',
        title: isZh ? '英文简介' : 'English summary',
        type: 'textarea',
        value: values?.summaryEn,
      },
      {
        name: 'reasonZh',
        title: isZh ? '中文推荐理由' : 'Chinese recommendation reason',
        type: 'textarea',
        value: values?.reasonZh,
      },
      {
        name: 'reasonEn',
        title: isZh ? '英文推荐理由' : 'English recommendation reason',
        type: 'textarea',
        value: values?.reasonEn,
      },
      {
        name: 'useCaseZh',
        title: isZh ? '中文使用场景' : 'Chinese use case',
        type: 'textarea',
        value: values?.useCaseZh,
      },
      {
        name: 'useCaseEn',
        title: isZh ? '英文使用场景' : 'English use case',
        type: 'textarea',
        value: values?.useCaseEn,
      },
      {
        name: 'iconUrl',
        title: isZh ? '图标' : 'Icon',
        type: 'upload_image',
        value: values?.iconUrl,
      },
      {
        name: 'screenshotUrl',
        title: isZh ? '截图' : 'Screenshot',
        type: 'upload_image',
        value: values?.screenshotUrl,
      },
      {
        name: 'status',
        title: isZh ? '发布状态' : 'Status',
        type: 'select',
        value: values?.status || 'draft',
        options: statuses.map((value) => ({ title: value, value })),
      },
      {
        name: 'sortOrder',
        title: isZh ? '排序' : 'Sort order',
        type: 'number',
        value: values?.sortOrder || 0,
      },
      {
        name: 'featured',
        title: isZh ? '设为精选' : 'Featured',
        type: 'switch',
        value: values?.featured || false,
      },
      {
        name: 'allowAiCitation',
        title: isZh ? '允许 AI 引用' : 'Allow AI citation',
        type: 'switch',
        value: values?.allowAiCitation ?? true,
      },
    ],
    submit,
  };
}

export function getResourceValues(formData: FormData) {
  const required = ['nameZh', 'slug', 'websiteUrl'] as const;
  for (const field of required) {
    if (!String(formData.get(field) || '').trim()) {
      throw new Error(`${field} is required`);
    }
  }

  const getText = (name: string) => String(formData.get(name) || '').trim();
  const getNullableText = (name: string) => getText(name) || null;
  const sortOrder = Number(formData.get('sortOrder') || 0);

  const rawTags = String(formData.get('tags') || '[]');
  let tagIds: string[];
  try {
    const parsed = JSON.parse(rawTags);
    tagIds = Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')
      ? Array.from(new Set(parsed))
      : [];
  } catch {
    throw new Error('Invalid resource tags');
  }

  return {
    values: {
      nameZh: getText('nameZh'),
      nameEn: getNullableText('nameEn'),
      slug: getText('slug').toLowerCase(),
      websiteUrl: getText('websiteUrl'),
      resourceType: getText('resourceType') || 'tool',
      stageId: getNullableText('stageId'),
      categoryId: getNullableText('categoryId'),
      pricingType: getText('pricingType') || 'unknown',
      summaryZh: getNullableText('summaryZh'),
      summaryEn: getNullableText('summaryEn'),
      reasonZh: getNullableText('reasonZh'),
      reasonEn: getNullableText('reasonEn'),
      useCaseZh: getNullableText('useCaseZh'),
      useCaseEn: getNullableText('useCaseEn'),
      iconUrl: getNullableText('iconUrl'),
      screenshotUrl: getNullableText('screenshotUrl'),
      status: getText('status') || 'draft',
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      featured: formData.get('featured') === 'on',
      allowAiCitation: formData.get('allowAiCitation') === 'on',
    },
    tagIds,
  };
}
