import { category, collection, resource, stage, tag } from '@/config/db/schema';
import { Form } from '@/shared/types/blocks/form';

type CollectionValues = typeof collection.$inferSelect;

export type CollectionStepInput = {
  existing?: boolean;
  resourceId: string;
  stepTitleZh: string | null;
  stepTitleEn: string | null;
  stepDescriptionZh: string | null;
  stepDescriptionEn: string | null;
  relationType: 'required' | 'alternative';
};

export function getCollectionForm({
  locale,
  values,
  stages,
  categories,
  tags,
  resources,
  tagIds = [],
  collectionSteps = [],
  submit,
}: {
  locale: string;
  values?: CollectionValues;
  stages: (typeof stage.$inferSelect)[];
  categories: (typeof category.$inferSelect)[];
  tags: (typeof tag.$inferSelect)[];
  resources: (typeof resource.$inferSelect)[];
  tagIds?: string[];
  collectionSteps?: CollectionStepInput[];
  submit: Form['submit'];
}): Form {
  const isZh = locale === 'zh';

  return {
    fields: [
      {
        name: 'titleZh',
        title: isZh ? '中文标题' : 'Chinese title',
        type: 'text',
        value: values?.titleZh,
        validation: { required: true },
      },
      {
        name: 'titleEn',
        title: isZh ? '英文标题' : 'English title',
        type: 'text',
        value: values?.titleEn,
      },
      {
        name: 'slug',
        title: 'Slug',
        type: 'text',
        value: values?.slug,
        validation: { required: true },
        tip: isZh
          ? '使用小写英文、数字和连字符。'
          : 'Use lowercase letters, numbers, and hyphens.',
      },
      {
        name: 'summaryZh',
        title: isZh ? '中文摘要' : 'Chinese summary',
        type: 'textarea',
        value: values?.summaryZh,
      },
      {
        name: 'summaryEn',
        title: isZh ? '英文摘要' : 'English summary',
        type: 'textarea',
        value: values?.summaryEn,
      },
      {
        name: 'contentZh',
        title: isZh ? '中文正文' : 'Chinese content',
        type: 'textarea',
        value: values?.contentZh,
      },
      {
        name: 'contentEn',
        title: isZh ? '英文正文' : 'English content',
        type: 'textarea',
        value: values?.contentEn,
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
        name: 'collectionSteps',
        title: isZh ? '执行步骤' : 'Execution steps',
        type: 'collection_steps',
        value: JSON.stringify(
          collectionSteps.map((step) => ({
            ...step,
          }))
        ),
        options: resources.map((item) => ({
          title: isZh ? item.nameZh : item.nameEn || item.nameZh,
          value: item.id,
        })),
        metadata: { locale },
        tip: isZh
          ? '每个步骤选择一个资源；可使用上下按钮调整执行顺序。'
          : 'Select one resource per step and use the arrow buttons to change the order.',
      },
      {
        name: 'status',
        title: isZh ? '发布状态' : 'Status',
        type: 'select',
        value: values?.status || 'draft',
        options: ['draft', 'published', 'archived'].map((value) => ({
          title: value,
          value,
        })),
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

function readSwitch(formData: FormData, name: string) {
  const value = formData.get(name);
  return value === 'true' || value === 'on';
}

function readCollectionSteps(
  formData: FormData,
  status: string,
  existingResourceIds: ReadonlySet<string>
): CollectionStepInput[] {
  const raw = String(formData.get('collectionSteps') || '[]');
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid collectionSteps');
  }

  if (!Array.isArray(parsed)) throw new Error('Invalid collectionSteps');

  const nullable = (value: unknown) => {
    if (typeof value !== 'string') return null;
    return value.trim() || null;
  };

  const steps: CollectionStepInput[] = parsed.map((item) => {
    if (!item || typeof item !== 'object')
      throw new Error('Invalid collectionSteps');

    const step = item as Record<string, unknown>;
    const resourceId =
      typeof step.resourceId === 'string' ? step.resourceId.trim() : '';
    if (
      step.relationType !== 'required' &&
      step.relationType !== 'alternative'
    ) {
      throw new Error('Invalid collection step relation type');
    }

    if (!resourceId) throw new Error('Each collection step needs a resource');

    const stepDescriptionZh = nullable(step.stepDescriptionZh);
    const stepDescriptionEn = nullable(step.stepDescriptionEn);
    const existing = existingResourceIds.has(resourceId);
    if (!existing && !stepDescriptionZh && !stepDescriptionEn) {
      throw new Error('Each collection step needs a description');
    }

    const relationType: CollectionStepInput['relationType'] = step.relationType;

    return {
      existing,
      resourceId,
      stepTitleZh: nullable(step.stepTitleZh),
      stepTitleEn: nullable(step.stepTitleEn),
      stepDescriptionZh,
      stepDescriptionEn,
      relationType,
    };
  });

  if (status === 'published' && steps.length === 0) {
    throw new Error('Published collections need at least one step');
  }

  return steps;
}

function readIds(formData: FormData, name: string) {
  const raw = String(formData.get(name) || '[]');
  try {
    const parsed = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      !parsed.every((value) => typeof value === 'string')
    ) {
      throw new Error();
    }
    return Array.from(new Set(parsed));
  } catch {
    throw new Error(`Invalid ${name}`);
  }
}

export function getCollectionValues(
  formData: FormData,
  existingResourceIds: ReadonlySet<string> = new Set()
) {
  const titleZh = String(formData.get('titleZh') || '').trim();
  const slug = String(formData.get('slug') || '')
    .trim()
    .toLowerCase();
  if (!titleZh || !slug) throw new Error('titleZh and slug are required');

  const getText = (name: string) => String(formData.get(name) || '').trim();
  const nullable = (name: string) => getText(name) || null;
  const sortOrder = Number(formData.get('sortOrder') || 0);
  const status = getText('status') || 'draft';

  return {
    values: {
      titleZh,
      titleEn: nullable('titleEn'),
      slug,
      summaryZh: nullable('summaryZh'),
      summaryEn: nullable('summaryEn'),
      contentZh: nullable('contentZh'),
      contentEn: nullable('contentEn'),
      stageId: nullable('stageId'),
      categoryId: nullable('categoryId'),
      status,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      featured: readSwitch(formData, 'featured'),
      allowAiCitation: readSwitch(formData, 'allowAiCitation'),
    },
    tagIds: readIds(formData, 'tags'),
    collectionSteps: readCollectionSteps(formData, status, existingResourceIds),
  };
}
