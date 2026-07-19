import { notFound, redirect } from 'next/navigation';

import { checkPageAccess, PERMISSIONS, requirePermission } from '@/core/rbac';
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
  deleteResourceTaxonomyItem,
  getCategories,
  getResourceTaxonomyItem,
  getResourceTaxonomyPath,
  getResourceTaxonomyReferences,
  getResourceTaxonomyTableColumns,
  getStages,
  getTags,
  ResourceTaxonomyKind,
  updateResourceTaxonomyItem,
} from '@/shared/models/resource-taxonomy';
import { Button, Crumb } from '@/shared/types/blocks/common';
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

  const [items, canWrite] = await Promise.all([
    getResourceTaxonomyItems(kind),
    checkPageAccess({ codes: [PERMISSIONS.POSTS_WRITE], locale }),
  ]);
  const title = getResourceTaxonomyTitle(kind, locale);
  const path = getResourceTaxonomyPath(kind);
  const crumbs: Crumb[] = [
    { title: locale === 'zh' ? '后台' : 'Dashboard', url: '/admin' },
    { title, is_active: true },
  ];
  const actions: Button[] = canWrite
    ? [
        {
          title: locale === 'zh' ? `新增${title}` : `Add ${title.slice(0, -1)}`,
          icon: 'RiAddLine',
          url: `${path}/add`,
        },
      ]
    : [];
  const table: Table = {
    title,
    columns: getResourceTaxonomyTableColumns(locale, kind, canWrite),
    data: items,
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={title} actions={actions} />
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

  const title = getResourceTaxonomyTitle(kind, locale);
  const path = getResourceTaxonomyPath(kind);
  const crumbs: Crumb[] = [
    { title: locale === 'zh' ? '后台' : 'Dashboard', url: '/admin' },
    { title, url: path },
    {
      title: locale === 'zh' ? `新增${title}` : `Add ${title.slice(0, -1)}`,
      is_active: true,
    },
  ];
  const form = getResourceTaxonomyForm({
    locale,
    kind,
    submit: {
      button: { title: locale === 'zh' ? '创建' : 'Create' },
      handler: async (formData: FormData) => {
        'use server';

        await requirePermission({
          code: PERMISSIONS.POSTS_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });
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
        <MainHeader
          title={locale === 'zh' ? `新增${title}` : `Add ${title.slice(0, -1)}`}
        />
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

  const title = getResourceTaxonomyTitle(kind, locale);
  const path = getResourceTaxonomyPath(kind);
  const crumbs: Crumb[] = [
    { title: locale === 'zh' ? '后台' : 'Dashboard', url: '/admin' },
    { title, url: path },
    {
      title: locale === 'zh' ? `编辑${title}` : `Edit ${title.slice(0, -1)}`,
      is_active: true,
    },
  ];
  const form = getResourceTaxonomyForm({
    locale,
    kind,
    values: item,
    submit: {
      button: { title: locale === 'zh' ? '保存变更' : 'Save changes' },
      handler: async (formData: FormData) => {
        'use server';

        await requirePermission({
          code: PERMISSIONS.POSTS_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });
        await updateResourceTaxonomyItem(
          kind,
          id,
          getResourceTaxonomyValues(formData, kind)
        );
        redirect(`/${locale}${path}`);
      },
    },
  });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={
            locale === 'zh' ? `编辑${title}` : `Edit ${title.slice(0, -1)}`
          }
        />
        <FormCard form={form} />
      </Main>
    </>
  );
}

export async function ResourceTaxonomyDeletePage({
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

  const [item, references] = await Promise.all([
    getResourceTaxonomyItem(kind, id),
    getResourceTaxonomyReferences(kind, id),
  ]);
  if (!item) notFound();

  const title = getResourceTaxonomyTitle(kind, locale);
  const path = getResourceTaxonomyPath(kind);
  const isZh = locale === 'zh';
  const actionTitle = isZh ? `删除${title}` : `Delete ${title.slice(0, -1)}`;
  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Dashboard', url: '/admin' },
    { title, url: path },
    { title: actionTitle, is_active: true },
  ];

  const form = getResourceTaxonomyForm({
    locale,
    kind,
    values: item,
    submit: {
      button: {
        title: isZh ? '确认永久删除' : 'Delete permanently',
        variant: 'destructive',
        icon: 'RiDeleteBinLine',
      },
      handler: async () => {
        'use server';

        await requirePermission({
          code: PERMISSIONS.POSTS_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });
        await deleteResourceTaxonomyItem(kind, id);
        return {
          status: 'success',
          message: isZh ? '已永久删除。' : 'Deleted permanently.',
          redirect_url: path,
        };
      },
    },
  });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={actionTitle} />
        {references > 0 ? (
          <FormCard
            title={isZh ? '当前无法删除' : 'Cannot delete this item'}
            description={
              isZh
                ? `该项仍被 ${references} 个资源、专题或文章引用。请先移除这些关联，再进行删除。`
                : `This item is still referenced by ${references} resources, collections, or posts. Remove those links before deleting it.`
            }
            form={{ fields: [] }}
          />
        ) : (
          <FormCard
            title={
              isZh
                ? `永久删除“${item.nameZh}”`
                : `Permanently delete “${item.nameEn || item.nameZh}”`
            }
            description={
              isZh ? '此操作不可撤销。' : 'This action cannot be undone.'
            }
            form={form}
          />
        )}
      </Main>
    </>
  );
}

async function getResourceTaxonomyItems(kind: ResourceTaxonomyKind) {
  if (kind === 'stage') return getStages();
  if (kind === 'category') return getCategories();
  return getTags();
}
