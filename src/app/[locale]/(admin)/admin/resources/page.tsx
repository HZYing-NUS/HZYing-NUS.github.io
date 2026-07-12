import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import { getResourceTableColumns, getResources, getResourcesCount } from '@/shared/models/resource';
import { Crumb } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

export default async function AdminResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number; q?: string }>;
}) {
  const { locale } = await params;
  const { page: pageNum, pageSize, q = '' } = await searchParams;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.POSTS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.sidebar');
  const page = Number(pageNum) || 1;
  const limit = Number(pageSize) || 30;
  const [resources, total] = await Promise.all([
    getResources({ page, limit, query: q }),
    getResourcesCount({ query: q }),
  ]);

  const crumbs: Crumb[] = [
    { title: t('dashboard'), url: '/admin' },
    { title: t('resources'), is_active: true },
  ];

  const table: Table = {
    title: t('resources'),
    actions: [
      {
        title: locale === 'zh' ? '新增资源' : 'Add resource',
        icon: 'RiAddLine',
        url: '/admin/resources/add',
      },
    ],
    columns: getResourceTableColumns(locale),
    data: resources,
    pagination: {
      total,
      page,
      limit,
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('resources')} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
