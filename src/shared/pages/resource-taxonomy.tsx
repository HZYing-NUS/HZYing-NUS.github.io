import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { TableCard } from '@/shared/blocks/table';
import {
  getResourceTaxonomyForm,
  getResourceTaxonomyTitle,
  getResourceTaxonomyValues,
} from '@/shared/forms/resource-taxonomy';
import { getUuid } from '@/shared/lib/hash';
import {
  createResourceTaxonomyItem,
  getCategories,
  getResourceTaxonomyItem,
  getResourceTaxonomyPath,
  getResourceTaxonomyTableColumns,
  getStages,
  getTags,
  ResourceTaxonomyKind,
  updateResourceTaxonomyItem,
} from '@/shared/models/resource-taxonomy';
import { Crumb } from '@/shared/types/blocks/common';
import { Table } from '@/shared/types/blocks/table';

export async function ResourceTaxonomyListPage({
  locale,
  kind,
}: {
  locale: string;
  kind: ResourceTaxonomyKind;
}) {
  await requirePermission({
    code: PERMISSIONS.POSTS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const [t, items] = await Promise.all([
    getTranslations('admin.sidebar'),
    getResourceTaxonomyItems(kind),
  ]);
  const title = getResourceTaxonomyTitle(kind, locale);
  const path = getResourceTaxonomyPath(kind);
  const crumbs: Crumb[] = [
    { title: t('dashboard'), url: '/admin' },
    { title, is_active: true },
  ];
  const table: Table = {
    title,
    actions: [
      {
        title: locale === 'zh' ? `新增${title}` : `Add ${title.slice(0, -1)}`,
        icon: 'RiAddLine',
        url: `${path}/add`,
      },
    ],
    columns: getResourceTaxonomyTableColumns(locale, kind),
    data: items,
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={title} />
        <TableCard table={table} />
      </Main>
    </>
  );
}

export async function ResourceTaxonomyAddPage({
  locale,
  kind,
}: {
  locale: string;
  kind: ResourceTaxonomyKind;
}) {
  await requirePermission({
    code: PERMISSIONS.POSTS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.sidebar');
  const title = getResourceTaxonomyTitle(kind, locale);
  const path = getResourceTaxonomyPath(kind);
  const crumbs: Crumb[] = [
    { title: t('dashboard'), url: '/admin' },
    { title, url: path },
    { title: locale === 'zh' ? `新增${title}` : `Add ${title.slice(0, -1)}`, is_active: true },
  ];
  const form = getResourceTaxonomyForm({
    locale,
    kind,
    submit: {
      button: { title: locale === 'zh' ? '创建' : 'Create' },
      handler: async (formData: FormData) => {
        'use server';

        await createResourceTaxonomyItem(kind, {
          id: getUuid(),
          ...getResourceTaxonomyValues(formData, kind),
        });
        redirect(`/${locale}${path}`);
      },
    },
  });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={locale === 'zh' ? `新增${title}` : `Add ${title.slice(0, -1)}`} />
        <FormCard form={form} />
      </Main>
    </>
  );
}

export async function ResourceTaxonomyEditPage({
  locale,
  kind,
  id,
}: {
  locale: string;
  kind: ResourceTaxonomyKind;
  id: string;
}) {
  await requirePermission({
    code: PERMISSIONS.POSTS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const item = await getResourceTaxonomyItem(kind, id);
  if (!item) notFound();

  const t = await getTranslations('admin.sidebar');
  const title = getResourceTaxonomyTitle(kind, locale);
  const path = getResourceTaxonomyPath(kind);
  const crumbs: Crumb[] = [
    { title: t('dashboard'), url: '/admin' },
    { title, url: path },
    { title: locale === 'zh' ? `编辑${title}` : `Edit ${title.slice(0, -1)}`, is_active: true },
  ];
  const form = getResourceTaxonomyForm({
    locale,
    kind,
    values: item,
    submit: {
      button: { title: locale === 'zh' ? '保存变更' : 'Save changes' },
      handler: async (formData: FormData) => {
        'use server';

        await updateResourceTaxonomyItem(kind, id, getResourceTaxonomyValues(formData, kind));
        redirect(`/${locale}${path}`);
      },
    },
  });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={locale === 'zh' ? `编辑${title}` : `Edit ${title.slice(0, -1)}`} />
        <FormCard form={form} />
      </Main>
    </>
  );
}

async function getResourceTaxonomyItems(kind: ResourceTaxonomyKind) {
  if (kind === 'stage') return getStages();
  if (kind === 'category') return getCategories();
  return getTags();
}
