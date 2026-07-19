import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import {
  archiveCollection,
  deleteCollection,
  getCollectionById,
} from '@/shared/models/collection';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function DeleteCollectionPage({
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

  const item = await getCollectionById(id);
  if (!item) notFound();

  const isZh = locale === 'zh';
  const isPublished = item.status === 'published';
  const title = isPublished
    ? isZh
      ? '归档专题'
      : 'Archive collection'
    : isZh
      ? '永久删除专题'
      : 'Delete collection permanently';
  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Dashboard', url: '/admin' },
    { title: isZh ? '专题' : 'Collections', url: '/admin/collections' },
    { title, is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'title',
        title: isZh ? '专题标题' : 'Collection title',
        type: 'text',
        value: isZh ? item.titleZh : item.titleEn || item.titleZh,
        attributes: { disabled: true },
      },
    ],
    submit: {
      button: {
        title: isPublished
          ? isZh
            ? '确认归档'
            : 'Archive collection'
          : isZh
            ? '确认永久删除'
            : 'Delete permanently',
        variant: 'destructive',
        icon: isPublished ? 'RiArchiveLine' : 'RiDeleteBinLine',
      },
      handler: async () => {
        'use server';

        await requirePermission({
          code: PERMISSIONS.POSTS_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });
        if (isPublished) {
          await archiveCollection(id);
        } else {
          await deleteCollection(id);
        }
        return {
          status: 'success',
          message: isPublished
            ? isZh
              ? '专题已归档。'
              : 'Collection archived.'
            : isZh
              ? '专题已永久删除。'
              : 'Collection deleted permanently.',
          redirect_url: '/admin/collections',
        };
      },
    },
  };

  const unsupportedStatus = item.status !== 'draft' && item.status !== 'published';

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={title} />
        {unsupportedStatus ? (
          <FormCard
            title={isZh ? '无需操作' : 'No action available'}
            description={isZh ? '该专题已经归档。' : 'This collection is already archived.'}
            form={{ fields: [] }}
          />
        ) : (
          <FormCard
            title={isZh ? `“${item.titleZh}”` : `“${item.titleEn || item.titleZh}”`}
            description={
              isPublished
                ? isZh
                  ? '归档后，该专题将不再公开展示，但数据仍会保留。'
                  : 'Archiving removes this collection from public pages while preserving its data.'
                : isZh
                  ? '草稿将被永久删除，此操作不可撤销。'
                  : 'This draft will be permanently deleted. This action cannot be undone.'
            }
            form={form}
          />
        )}
      </Main>
    </>
  );
}
