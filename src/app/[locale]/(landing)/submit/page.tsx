import { setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: '投稿建议',
  description: '提交资源推荐、文章建议、专题建议、纠错反馈和补充信息。',
  canonicalUrl: '/submit',
});

const types = ['资源推荐', '文章建议', '专题建议', '纠错反馈', '补充信息'];

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === 'zh';

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <section className="text-center">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">
          Submit
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {isZh ? '投稿建议' : 'Submit a suggestion'}
        </h1>
        <p className="text-muted-foreground mt-6 text-lg">
          {isZh
            ? 'V1 将支持 Google 登录用户提交资源推荐、文章建议、专题建议、纠错反馈和补充信息。'
            : 'V1 will let Google-authenticated users suggest resources, articles, collections, corrections, and supplements.'}
        </p>
      </section>

      <section className="mt-12 rounded-3xl border p-8">
        <h2 className="text-2xl font-semibold">{isZh ? '支持的投稿类型' : 'Supported types'}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {types.map((type) => (
            <div key={type} className="bg-muted rounded-2xl px-4 py-3 text-sm font-medium">
              {type}
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 text-sm">
          {isZh
            ? '投稿表单和后台审核将接入 submission 表；普通用户不能访问后台。'
            : 'The form and admin review flow will connect to the submission table; regular users cannot access the admin dashboard.'}
        </p>
      </section>
    </main>
  );
}
