import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { SubmissionForm } from '@/shared/blocks/submission/submission-form';
import { getMetadata } from '@/shared/lib/seo';
import { getSignUser } from '@/shared/models/user';

export const generateMetadata = getMetadata({ title: '投稿建议', description: '推荐资源、文章和专题，或提交纠错与补充信息。', canonicalUrl: '/submit' });

export default async function SubmitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === 'zh';
  const user = await getSignUser();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <section className="text-center"><p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">Contribute</p><h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{isZh ? '投稿建议' : 'Submit a suggestion'}</h1><p className="text-muted-foreground mt-6 text-lg">{isZh ? '推荐资源、文章和专题，或反馈失效链接、分类问题与需要补充的信息。' : 'Recommend resources, articles, and collections, or report broken links, categorization issues, and missing details.'}</p></section>
      {user ? <SubmissionForm locale={locale} /> : <section className="mt-10 rounded-3xl border bg-muted/30 p-8 text-center"><h2 className="text-xl font-semibold">{isZh ? '登录后即可投稿' : 'Sign in to contribute'}</h2><p className="text-muted-foreground mt-3 text-sm">{isZh ? '使用 Google 登录后，你可以提交建议并帮助完善资源库。' : 'Sign in with Google to submit suggestions and help improve the library.'}</p><Link href={`/${locale}/sign-in?callbackUrl=/${locale}/submit`} className="bg-primary text-primary-foreground mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-medium">{isZh ? '去登录' : 'Sign in'}</Link></section>}
    </main>
  );
}
