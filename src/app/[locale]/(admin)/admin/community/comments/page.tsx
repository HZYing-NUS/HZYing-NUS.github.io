import { setRequestLocale } from 'next-intl/server';

import { CommunityCommentAdmin } from '@/shared/blocks/community/comment-admin';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div>
      <h1 className="text-3xl font-semibold">
        {locale === 'zh' ? '社区评论治理' : 'Community comment governance'}
      </h1>
      <div className="mt-8">
        <CommunityCommentAdmin locale={locale} />
      </div>
    </div>
  );
}
