import { setRequestLocale } from 'next-intl/server';

import { CommunityEmailAdmin } from '@/shared/blocks/community/email-admin';

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
        {locale === 'zh' ? '社区邮件发送记录' : 'Community email deliveries'}
      </h1>
      <p className="text-muted-foreground mt-2">
        {locale === 'zh'
          ? '查看幂等记录、Provider message ID、失败原因并安全重试。'
          : 'Review idempotency records, provider message IDs, failures, and safe retries.'}
      </p>
      <div className="mt-8">
        <CommunityEmailAdmin locale={locale} />
      </div>
    </div>
  );
}
