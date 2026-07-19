import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getResourceForm, getResourceValues } from '@/shared/forms/resource';
import {
  getResourceById,
  getResourceStageIds,
  getResourceTagIds,
  updateResource,
} from '@/shared/models/resource';
import {
  getCategories,
  getStages,
  getTags,
} from '@/shared/models/resource-taxonomy';
import { Crumb } from '@/shared/types/blocks/common';

export default async function EditResourcePage({
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

  const resource = await getResourceById(id);
  if (!resource) {
    notFound();
  }

  const [stages, categories, tags, tagIds, stageIds] = await Promise.all([
    getStages(),
    getCategories(),
    getTags(),
    getResourceTagIds(id),
    getResourceStageIds(id),
  ]);
  const crumbs: Crumb[] = [
    { title: locale === 'zh' ? '后台' : 'Dashboard', url: '/admin' },
    { title: locale === 'zh' ? '资源' : 'Resources', url: '/admin/resources' },
    { title: locale === 'zh' ? '编辑资源' : 'Edit resource', is_active: true },
  ];

  const form = getResourceForm({
    locale,
    values: resource,
    stages,
    categories,
    tags,
    tagIds,
    stageIds,
    submit: {
      button: {
        title: locale === 'zh' ? '保存变更' : 'Save changes',
      },
      handler: async (formData: FormData) => {
        'use server';

        await requirePermission({
          code: PERMISSIONS.POSTS_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });
        const { values, tagIds, stageIds } = getResourceValues(formData);
        await updateResource(id, values, tagIds, stageIds);
        redirect(`/${locale}/admin/resources`);
      },
    },
  });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={locale === 'zh' ? '编辑资源' : 'Edit resource'} />
        <FormCard form={form} />
      </Main>
    </>
  );
}
