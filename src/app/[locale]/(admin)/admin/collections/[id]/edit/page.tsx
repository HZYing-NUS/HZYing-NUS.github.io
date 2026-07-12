import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getCollectionForm, getCollectionValues } from '@/shared/forms/collection';
import { getCollectionById, getCollectionResourceIds, getCollectionTagIds, updateCollection } from '@/shared/models/collection';
import { getResources } from '@/shared/models/resource';
import { getCategories, getStages, getTags } from '@/shared/models/resource-taxonomy';
import { Crumb } from '@/shared/types/blocks/common';

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission({ code: PERMISSIONS.POSTS_WRITE, redirectUrl: '/admin/no-permission', locale });

  const [item, t, stages, categories, tags, resources, tagIds, resourceIds] = await Promise.all([
    getCollectionById(id), getTranslations('admin.sidebar'), getStages(), getCategories(), getTags(), getResources({ limit: 200 }), getCollectionTagIds(id), getCollectionResourceIds(id),
  ]);
  if (!item) notFound();

  const crumbs: Crumb[] = [{ title: t('dashboard'), url: '/admin' }, { title: locale === 'zh' ? '专题' : 'Collections', url: '/admin/collections' }, { title: locale === 'zh' ? '编辑专题' : 'Edit collection', is_active: true }];
  const form = getCollectionForm({
    locale, values: item, stages, categories, tags, resources, tagIds, resourceIds,
    submit: {
      button: { title: locale === 'zh' ? '保存变更' : 'Save changes' },
      handler: async (formData: FormData) => {
        'use server';
        const { values, tagIds, resourceIds } = getCollectionValues(formData);
        await updateCollection(id, values, tagIds, resourceIds);
        redirect(`/${locale}/admin/collections`);
      },
    },
  });

  return <><Header crumbs={crumbs} /><Main><MainHeader title={locale === 'zh' ? '编辑专题' : 'Edit collection'} /><FormCard form={form} /></Main></>;
}
