import { setRequestLocale } from 'next-intl/server';

import { checkPageAccess, PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getCollections,
  getCollectionsCount,
  getCollectionTableColumns,
} from '@/shared/models/collection';
import { Button, Crumb } from '@/shared/types/blocks/common';
import { Table } from '@/shared/types/blocks/table';

export default async function AdminCollectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number; q?: string }>;
}) {
  const { locale } = await params;
  const { page: pageParam, pageSize, q = '' } = await searchParams;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.POSTS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const page = Number(pageParam) || 1;
  const limit = Number(pageSize) || 30;
  const canWrite = await checkPageAccess({
    codes: [PERMISSIONS.POSTS_WRITE],
    locale,
  });
  const [rows, total, columns] = await Promise.all([
    getCollections({ page, limit, query: q }),
    getCollectionsCount({ query: q }),
    getCollectionTableColumns(locale, canWrite),
  ]);
  const crumbs: Crumb[] = [
    { title: locale === 'zh' ? '后台' : 'Dashboard', url: '/admin' },
    { title: locale === 'zh' ? '专题' : 'Collections', is_active: true },
  ];
  const actions: Button[] = canWrite
    ? [
        {
          title: locale === 'zh' ? '新增专题' : 'Add collection',
          icon: 'RiAddLine',
          url: '/admin/collections/add',
        },
      ]
    : [];
  const table: Table = {
    title: locale === 'zh' ? '专题' : 'Collections',
    columns,
    data: rows,
    pagination: { page, limit, total },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={locale === 'zh' ? '专题' : 'Collections'}
          actions={actions}
        />
        <TableCard table={table} />
      </Main>
    </>
  );
}
