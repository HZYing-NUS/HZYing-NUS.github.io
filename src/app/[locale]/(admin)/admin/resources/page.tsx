import { setRequestLocale } from 'next-intl/server';

import { checkPageAccess, PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getResourcesCount,
  getResourcesWithStages,
  getResourceTableColumns,
} from '@/shared/models/resource';
import { getStages } from '@/shared/models/resource-taxonomy';
import { Button, Crumb } from '@/shared/types/blocks/common';
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

  const title = locale === 'zh' ? '资源' : 'Resources';
  const page = Number(pageNum) || 1;
  const limit = Number(pageSize) || 30;
  const [resources, total, canWrite, stages] = await Promise.all([
    getResourcesWithStages({ page, limit, query: q }),
    getResourcesCount({ query: q }),
    checkPageAccess({ codes: [PERMISSIONS.POSTS_WRITE], locale }),
    getStages(),
  ]);

  const crumbs: Crumb[] = [
    { title: locale === 'zh' ? '后台' : 'Dashboard', url: '/admin' },
    { title, is_active: true },
  ];

  const actions: Button[] = canWrite
    ? [
        {
          title: locale === 'zh' ? '新增资源' : 'Add resource',
          icon: 'RiAddLine',
          url: '/admin/resources/add',
        },
      ]
    : [];

  const table: Table = {
    title,
    columns: getResourceTableColumns(locale, canWrite, stages),
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
        <MainHeader title={title} actions={actions} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
