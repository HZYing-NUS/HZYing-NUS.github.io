import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getResourceForm, getResourceValues } from '@/shared/forms/resource';
import { getResourceById, getResourceTagIds, updateResource } from '@/shared/models/resource';
import { getCategories, getStages, getTags } from '@/shared/models/resource-taxonomy';
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

  const t = await getTranslations('admin.sidebar');
  const [stages, categories, tags, tagIds] = await Promise.all([
    getStages(),
    getCategories(),
    getTags(),
    getResourceTagIds(id),
  ]);
  const crumbs: Crumb[] = [
    { title: t('dashboard'), url: '/admin' },
    { title: t('resources'), url: '/admin/resources' },
    { title: locale === 'zh' ? '编辑资源' : 'Edit resource', is_active: true },
  ];

  const form = getResourceForm({
    locale,
    values: resource,
    stages,
    categories,
    tags,
    tagIds,
    submit: {
      button: {
        title: locale === 'zh' ? '保存变更' : 'Save changes',
      },
      handler: async (formData: FormData) => {
        'use server';

        await requirePermission({ code: PERMISSIONS.POSTS_WRITE, redirectUrl: '/admin/no-permission', locale });
        const { values, tagIds } = getResourceValues(formData);
        await updateResource(id, values, tagIds);
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
