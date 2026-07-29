import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { SubmissionForm } from '@/shared/blocks/submission/submission-form';
import { getMetadata } from '@/shared/lib/seo';
import { getSignUser } from '@/shared/models/user';

export const generateMetadata = getMetadata({
  title: '投稿建议',
  description: '推荐资源、文章和专题，或提交纠错与补充信息。',
  canonicalUrl: '/submit',
});

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === 'zh';
  const user = await getSignUser();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <section className="text-center">
        <p className="text-muted-foreground text-sm font-medium tracking-[0.3em] uppercase">
          Contribute
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {isZh ? '投稿建议' : 'Submit a suggestion'}
        </h1>
        <p className="text-muted-foreground mt-6 text-lg">
          {isZh
            ? '推荐资源、文章和专题，或反馈失效链接、分类问题与需要补充的信息。'
            : 'Recommend resources, articles, and collections, or report broken links, categorization issues, and missing details.'}
        </p>
      </section>
      {user ? (
        <SubmissionForm locale={locale} />
      ) : (
        <section className="bg-muted/30 mt-10 rounded-3xl border p-8 text-center">
          <h2 className="text-xl font-semibold">
            {isZh ? '登录后即可投稿或提交修改建议' : 'Sign in to contribute'}
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            {isZh
              ? '登录账户后，你可以推荐内容、反馈失效链接或补充纠错；登录完成后会返回本页。'
              : 'After signing in, you can recommend content, report broken links, or suggest corrections, then return to this page.'}
          </p>
          <Link
            href={`/${locale}/sign-in?callbackUrl=${encodeURIComponent('/submit')}`}
            className="bg-primary text-primary-foreground mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-medium"
          >
            {isZh ? '登录并继续' : 'Sign in and continue'}
          </Link>
        </section>
      )}
    </main>
  );
}
