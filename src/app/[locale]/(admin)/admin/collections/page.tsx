import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import { getCollectionTableColumns, getCollections, getCollectionsCount } from '@/shared/models/collection';
import { Crumb } from '@/shared/types/blocks/common';
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

  await requirePermission({ code: PERMISSIONS.POSTS_READ, redirectUrl: '/admin/no-permission', locale });

  const page = Number(pageParam) || 1;
  const limit = Number(pageSize) || 30;
  const [t, rows, total, columns] = await Promise.all([
    getTranslations('admin.sidebar'),
    getCollections({ page, limit, query: q }),
    getCollectionsCount({ query: q }),
    getCollectionTableColumns(locale),
  ]);
  const crumbs: Crumb[] = [{ title: t('dashboard'), url: '/admin' }, { title: locale === 'zh' ? '专题' : 'Collections', is_active: true }];
  const table: Table = {
    title: locale === 'zh' ? '专题' : 'Collections',
    actions: [{ title: locale === 'zh' ? '新增专题' : 'Add collection', icon: 'RiAddLine', url: '/admin/collections/add' }],
    columns,
    data: rows,
    pagination: { page, limit, total },
  };

  return <><Header crumbs={crumbs} /><Main><MainHeader title={locale === 'zh' ? '专题' : 'Collections'} /><TableCard table={table} /></Main></>;
}
