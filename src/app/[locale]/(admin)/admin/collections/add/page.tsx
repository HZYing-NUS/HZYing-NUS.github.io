import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getCollectionForm, getCollectionValues } from '@/shared/forms/collection';
import { getUuid } from '@/shared/lib/hash';
import { createCollection } from '@/shared/models/collection';
import { getResources } from '@/shared/models/resource';
import { getCategories, getStages, getTags } from '@/shared/models/resource-taxonomy';
import { Crumb } from '@/shared/types/blocks/common';

export default async function AddCollectionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission({ code: PERMISSIONS.POSTS_WRITE, redirectUrl: '/admin/no-permission', locale });

  const [t, stages, categories, tags, resources] = await Promise.all([
    getTranslations('admin.sidebar'), getStages(), getCategories(), getTags(), getResources({ limit: 200 }),
  ]);
  const crumbs: Crumb[] = [{ title: t('dashboard'), url: '/admin' }, { title: locale === 'zh' ? '专题' : 'Collections', url: '/admin/collections' }, { title: locale === 'zh' ? '新增专题' : 'Add collection', is_active: true }];
  const form = getCollectionForm({
    locale, stages, categories, tags, resources,
    submit: {
      button: { title: locale === 'zh' ? '创建专题' : 'Create collection' },
      handler: async (formData: FormData) => {
        'use server';
        await requirePermission({ code: PERMISSIONS.POSTS_WRITE, redirectUrl: '/admin/no-permission', locale });
        const { values, tagIds, resourceIds } = getCollectionValues(formData);
        await createCollection({ id: getUuid(), ...values }, tagIds, resourceIds);
        redirect(`/${locale}/admin/collections`);
      },
    },
  });

  return <><Header crumbs={crumbs} /><Main><MainHeader title={locale === 'zh' ? '新增专题' : 'Add collection'} /><FormCard form={form} /></Main></>;
}
