import { revalidatePath } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { legacyProfileContent } from '@/config/seed/legacy-content';
import { getProfileByLocale, saveProfile } from '@/shared/models/profile';
import { Crumb } from '@/shared/types/blocks/common';

export default async function AdminProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission({ code: PERMISSIONS.POSTS_WRITE, redirectUrl: '/admin/no-permission', locale });
  const [t, profile] = await Promise.all([getTranslations('admin.sidebar'), getProfileByLocale(locale)]);
  const isZh = locale === 'zh';
  const crumbs: Crumb[] = [{ title: t('dashboard'), url: '/admin' }, { title: isZh ? '关于我' : 'Profile', is_active: true }];
  const content = profile?.content || legacyProfileContent;

  async function save(formData: FormData) {
    'use server';
    await requirePermission({ code: PERMISSIONS.POSTS_WRITE, redirectUrl: '/admin/no-permission', locale });
    const raw = String(formData.get('content') || '');
    let parsed: Record<string, unknown>;
    try {
      const value = JSON.parse(raw);
      if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
      parsed = value as Record<string, unknown>;
    } catch {
      throw new Error('Profile content must be a JSON object.');
    }
    await saveProfile({
      locale,
      content: parsed,
      status: String(formData.get('status') || 'draft'),
      allowAiCitation: formData.get('allowAiCitation') === 'on',
    });
    revalidatePath(`/${locale}/about`);
    revalidatePath(`/${locale}/admin/profile`);
  }

  return <><Header crumbs={crumbs} /><Main><MainHeader title={isZh ? '关于我内容' : 'Profile content'} />
    <form action={save} className="max-w-5xl space-y-5 rounded-xl border p-6"><div><label className="text-sm font-medium">{isZh ? '结构化内容 JSON' : 'Structured content JSON'}</label><textarea name="content" defaultValue={JSON.stringify(content, null, 2)} rows={30} className="mt-2 block w-full rounded-lg border bg-background p-3 font-mono text-xs leading-6" /></div><div className="flex flex-wrap items-center gap-5"><label className="text-sm font-medium">{isZh ? '发布状态' : 'Status'}<select name="status" defaultValue={profile?.status || 'published'} className="ml-2 rounded-lg border bg-background px-3 py-2"><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allowAiCitation" defaultChecked={profile?.allowAiCitation ?? true} />{isZh ? '允许 AI 引用' : 'Allow AI citation'}</label><button className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium">{isZh ? '保存内容' : 'Save content'}</button></div></form>
  </Main></>;
}
