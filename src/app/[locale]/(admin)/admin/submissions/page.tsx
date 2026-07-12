import { revalidatePath } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { submission } from '@/config/db/schema';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { getSubmissions, getSubmissionsCount, updateSubmissionReview, convertResourceSubmission } from '@/shared/models/submission';
import { Crumb } from '@/shared/types/blocks/common';

export default async function AdminSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status } = await searchParams;
  setRequestLocale(locale);
  await requirePermission({ code: PERMISSIONS.POSTS_WRITE, redirectUrl: '/admin/no-permission', locale });

  const [t, submissions, total] = await Promise.all([
    getTranslations('admin.sidebar'),
    getSubmissions({ status }),
    getSubmissionsCount(status),
  ]);
  const crumbs: Crumb[] = [{ title: t('dashboard'), url: '/admin' }, { title: locale === 'zh' ? '投稿建议' : 'Submissions', is_active: true }];
  const isZh = locale === 'zh';

  async function review(formData: FormData) {
    'use server';
    await updateSubmissionReview({
      id: String(formData.get('id')),
      status: String(formData.get('status')) as 'pending' | 'accepted' | 'rejected' | 'archived',
      adminNote: String(formData.get('adminNote') || '').trim() || null,
    });
    revalidatePath(`/${locale}/admin/submissions`);
  }

  async function convert(formData: FormData) {
    'use server';
    await convertResourceSubmission(String(formData.get('id')));
    revalidatePath(`/${locale}/admin/submissions`);
    revalidatePath(`/${locale}/admin/resources`);
  }

  return (
    <><Header crumbs={crumbs} /><Main><MainHeader title={isZh ? `投稿建议 (${total})` : `Submissions (${total})`} />
      <div className="space-y-5">
        {(submissions as (typeof submission.$inferSelect)[]).map((item) => <article key={item.id} className="rounded-xl border p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{item.type} · {item.status} · {item.createdAt.toLocaleString()}</p><h2 className="mt-1 text-lg font-semibold">{item.title}</h2>{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary">{item.url}</a> : null}</div>{item.convertedContentId ? <span className="rounded-full bg-muted px-3 py-1 text-xs">{isZh ? '已转为资源草稿' : 'Converted to resource draft'}</span> : null}</div>{item.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.description}</p> : null}{item.suggestedTags ? <p className="mt-3 text-xs text-muted-foreground">{isZh ? '建议标签：' : 'Suggested tags: '}{item.suggestedTags}</p> : null}
          <form action={review} className="mt-5 grid gap-3 border-t pt-4 md:grid-cols-[160px_1fr_auto]"><input type="hidden" name="id" value={item.id} /><select name="status" defaultValue={item.status} className="rounded-lg border bg-background px-3 py-2 text-sm"><option value="pending">pending</option><option value="accepted">accepted</option><option value="rejected">rejected</option><option value="archived">archived</option></select><input name="adminNote" defaultValue={item.adminNote || ''} placeholder={isZh ? '管理员备注' : 'Admin note'} className="rounded-lg border bg-background px-3 py-2 text-sm" /><button className="rounded-lg border px-4 py-2 text-sm font-medium">{isZh ? '保存审核' : 'Save review'}</button></form>
          {item.type === 'resource' && !item.convertedContentId ? <form action={convert} className="mt-3"><input type="hidden" name="id" value={item.id} /><button className="text-primary text-sm font-medium">{isZh ? '转为资源草稿' : 'Convert to resource draft'}</button></form> : null}
        </article>)}
        {!submissions.length ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{isZh ? '暂无投稿建议。' : 'No submissions yet.'}</div> : null}
      </div>
    </Main></>
  );
}
