import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getResourceForm, getResourceValues } from '@/shared/forms/resource';
import { getUuid } from '@/shared/lib/hash';
import { createResource } from '@/shared/models/resource';
import { getCategories, getStages, getTags } from '@/shared/models/resource-taxonomy';
import { Crumb } from '@/shared/types/blocks/common';

export default async function AddResourcePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.POSTS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.sidebar');
  const [stages, categories, tags] = await Promise.all([
    getStages(),
    getCategories(),
    getTags(),
  ]);
  const crumbs: Crumb[] = [
    { title: t('dashboard'), url: '/admin' },
    { title: t('resources'), url: '/admin/resources' },
    { title: locale === 'zh' ? '新增资源' : 'Add resource', is_active: true },
  ];

  const form = getResourceForm({
    locale,
    stages,
    categories,
    tags,
    submit: {
      button: {
        title: locale === 'zh' ? '创建资源' : 'Create resource',
      },
      handler: async (formData: FormData) => {
        'use server';

        const { values, tagIds } = getResourceValues(formData);
        await createResource({ id: getUuid(), ...values }, tagIds);
        redirect(`/${locale}/admin/resources`);
      },
    },
  });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={locale === 'zh' ? '新增资源' : 'Add resource'} />
        <FormCard form={form} />
      </Main>
    </>
  );
}
