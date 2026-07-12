import { category, stage, tag } from '@/config/db/schema';
import { ResourceTaxonomyKind } from '@/shared/models/resource-taxonomy';
import { Form } from '@/shared/types/blocks/form';

type ResourceTaxonomyValues =
  | typeof stage.$inferSelect
  | typeof category.$inferSelect
  | typeof tag.$inferSelect;

export function getResourceTaxonomyForm({
  locale,
  kind,
  values,
  submit,
}: {
  locale: string;
  kind: ResourceTaxonomyKind;
  values?: ResourceTaxonomyValues;
  submit: Form['submit'];
}): Form {
  const isZh = locale === 'zh';
  const fields: Form['fields'] = [
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
  ];

  if (kind === 'stage') {
    const stageValues = values as typeof stage.$inferSelect | undefined;
    fields.push({
      name: 'sortOrder',
      title: isZh ? '排序' : 'Sort order',
      type: 'number',
      value: stageValues?.sortOrder || 0,
    });
  }

  return { fields, submit };
}

export function getResourceTaxonomyValues(
  formData: FormData,
  kind: ResourceTaxonomyKind
) {
  const nameZh = String(formData.get('nameZh') || '').trim();
  const slug = String(formData.get('slug') || '').trim().toLowerCase();
  if (!nameZh || !slug) {
    throw new Error('nameZh and slug are required');
  }

  const values = {
    nameZh,
    nameEn: String(formData.get('nameEn') || '').trim() || null,
    slug,
  };

  if (kind !== 'stage') return values;

  const sortOrder = Number(formData.get('sortOrder') || 0);
  return {
    ...values,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

export function getResourceTaxonomyTitle(kind: ResourceTaxonomyKind, locale: string) {
  const isZh = locale === 'zh';
  if (kind === 'stage') return isZh ? '使用阶段' : 'Stages';
  if (kind === 'category') return isZh ? '资源分类' : 'Resource categories';
  return isZh ? '资源标签' : 'Resource tags';
}
