import { setRequestLocale } from 'next-intl/server';

import { ResourceAssistant } from '@/shared/blocks/resource-assistant/resource-assistant';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({ title: '资源助手', description: '基于站内资源、专题与关于我的 AI Web SaaS 建站助手。', canonicalUrl: '/assistant' });

export default async function AssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === 'zh';
  return <main className="mx-auto max-w-4xl px-6 py-16 md:py-24"><section className="text-center"><p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">Resource Assistant</p><h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{isZh ? 'AI Web SaaS 建站资源助手' : 'AI Web SaaS Resource Assistant'}</h1><p className="text-muted-foreground mt-6 text-lg">{isZh ? '只根据站内已发布且允许引用的内容提供建议，并展示来源链接。' : 'Answers only from published, citable site content and always shows source links.'}</p></section><ResourceAssistant locale={locale} /></main>;
}
