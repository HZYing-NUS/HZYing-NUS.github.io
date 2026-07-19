import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import {
  getCollectionForm,
  getCollectionValues,
} from '@/shared/forms/collection';
import {
  getCollectionById,
  getCollectionSteps,
  getCollectionTagIds,
  updateCollection,
} from '@/shared/models/collection';
import { getResourcesForCollectionEditor } from '@/shared/models/resource';
import {
  getCategories,
  getStages,
  getTags,
} from '@/shared/models/resource-taxonomy';
import { Crumb } from '@/shared/types/blocks/common';

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission({
    code: PERMISSIONS.POSTS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const [item, stages, categories, tags, resources, tagIds, collectionSteps] =
    await Promise.all([
      getCollectionById(id),
      getStages(),
      getCategories(),
      getTags(),
      getResourcesForCollectionEditor(),
      getCollectionTagIds(id),
      getCollectionSteps(id),
    ]);
  if (!item) notFound();

  const crumbs: Crumb[] = [
    { title: locale === 'zh' ? '后台' : 'Dashboard', url: '/admin' },
    {
      title: locale === 'zh' ? '专题' : 'Collections',
      url: '/admin/collections',
    },
    {
      title: locale === 'zh' ? '编辑专题' : 'Edit collection',
      is_active: true,
    },
  ];
  const form = getCollectionForm({
    locale,
    values: item,
    stages,
    categories,
    tags,
    resources,
    tagIds,
    collectionSteps,
    submit: {
      button: { title: locale === 'zh' ? '保存变更' : 'Save changes' },
      handler: async (formData: FormData) => {
        'use server';
        await requirePermission({
          code: PERMISSIONS.POSTS_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });
        const {
          values,
          tagIds,
          collectionSteps: nextCollectionSteps,
        } = getCollectionValues(
          formData,
          new Set(collectionSteps.map((step) => step.resourceId))
        );
        await updateCollection(id, values, tagIds, nextCollectionSteps);
        redirect(`/${locale}/admin/collections`);
      },
    },
  });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={locale === 'zh' ? '编辑专题' : 'Edit collection'} />
        <FormCard form={form} />
      </Main>
    </>
  );
}
