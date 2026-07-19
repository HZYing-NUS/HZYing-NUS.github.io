import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import {
  archiveResource,
  deleteResource,
  getPublishedCollectionResourceReferences,
  getResourceById,
  getResourceReferences,
} from '@/shared/models/resource';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function DeleteResourcePage({
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

  const [item, references, publishedCollectionReferences] = await Promise.all([
    getResourceById(id),
    getResourceReferences(id),
    getPublishedCollectionResourceReferences(id),
  ]);
  if (!item) notFound();

  const isZh = locale === 'zh';
  const isPublished = item.status === 'published';
  const title = isPublished
    ? isZh
      ? '归档资源'
      : 'Archive resource'
    : isZh
      ? '永久删除资源'
      : 'Delete resource permanently';
  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Dashboard', url: '/admin' },
    { title: isZh ? '资源' : 'Resources', url: '/admin/resources' },
    { title, is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'name',
        title: isZh ? '资源名称' : 'Resource name',
        type: 'text',
        value: isZh ? item.nameZh : item.nameEn || item.nameZh,
        attributes: { disabled: true },
      },
    ],
    submit: {
      button: {
        title: isPublished
          ? isZh
            ? '确认归档'
            : 'Archive resource'
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
          await archiveResource(id);
        } else {
          await deleteResource(id);
        }
        return {
          status: 'success',
          message: isPublished
            ? isZh
              ? '资源已归档。'
              : 'Resource archived.'
            : isZh
              ? '资源已永久删除。'
              : 'Resource deleted permanently.',
          redirect_url: '/admin/resources',
        };
      },
    },
  };

  const cannotDeleteDraft = item.status === 'draft' && references > 0;
  const cannotArchivePublished =
    item.status === 'published' && publishedCollectionReferences > 0;
  const unsupportedStatus =
    item.status !== 'draft' && item.status !== 'published';

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={title} />
        {cannotArchivePublished ? (
          <FormCard
            title={isZh ? '当前无法归档' : 'Cannot archive this resource'}
            description={
              isZh
                ? `该资源仍被 ${publishedCollectionReferences} 个已发布专题引用。请先在相关专题中替换该资源，或先归档这些专题。`
                : `This resource is still referenced by ${publishedCollectionReferences} published collections. Replace it in those collections or archive the collections first.`
            }
            form={{ fields: [] }}
          />
        ) : cannotDeleteDraft ? (
          <FormCard
            title={isZh ? '当前无法删除' : 'Cannot delete this resource'}
            description={
              isZh
                ? `该资源仍被 ${references} 个专题或文章引用。请先从相关专题或文章中移除它，再永久删除。`
                : `This resource is still referenced by ${references} collections or posts. Remove it from those collections or posts before deleting it.`
            }
            form={{ fields: [] }}
          />
        ) : unsupportedStatus ? (
          <FormCard
            title={isZh ? '无需操作' : 'No action available'}
            description={
              isZh ? '该资源已经归档。' : 'This resource is already archived.'
            }
            form={{ fields: [] }}
          />
        ) : (
          <FormCard
            title={
              isZh ? `“${item.nameZh}”` : `“${item.nameEn || item.nameZh}”`
            }
            description={
              isPublished
                ? isZh
                  ? '归档后，该资源将不再公开展示，但数据仍会保留。'
                  : 'Archiving removes this resource from public pages while preserving its data.'
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
