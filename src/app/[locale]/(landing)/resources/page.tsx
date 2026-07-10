import { setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: '资源库',
  description: 'AI Web SaaS 建站与出海资源库。',
  canonicalUrl: '/resources',
});

const resourceTypes = [
  '参考网站',
  '工具',
  'Chrome 插件',
  'Skill',
  'MCP',
  'Starter',
  'UI 模板',
  '组件库',
  '模型榜单',
  '基础设施',
];

const stages = [
  '需求发现',
  '原型设计',
  '前端开发',
  'AI 模型',
  '部署上线',
  'SEO',
  '运营增长',
];

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === 'zh';

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">
          Resources
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {isZh ? 'AI Web SaaS 出海资源库' : 'AI Web SaaS Resource Library'}
        </h1>
        <p className="text-muted-foreground mt-6 text-lg">
          {isZh
            ? '按建站流程整理参考网站、工具、插件、Skill、MCP、Starter、组件库、模型榜单和服务商。'
            : 'A workflow-based library for websites, tools, plugins, Skills, MCPs, Starters, UI kits, model rankings, and services.'}
        </p>
      </section>

      <section className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border p-6">
          <h2 className="text-xl font-semibold">{isZh ? '资源类型' : 'Resource types'}</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {resourceTypes.map((type) => (
              <span key={type} className="bg-muted rounded-full px-3 py-1 text-sm">
                {type}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border p-6">
          <h2 className="text-xl font-semibold">{isZh ? '使用阶段' : 'Workflow stages'}</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {stages.map((stage) => (
              <span key={stage} className="bg-muted rounded-full px-3 py-1 text-sm">
                {stage}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/40 mt-10 rounded-3xl border p-8">
        <h2 className="text-2xl font-semibold">{isZh ? '迁移状态' : 'Migration status'}</h2>
        <p className="text-muted-foreground mt-3">
          {isZh
            ? '数据库模型已经为资源、专题、投稿、标签、分类、阶段和 AI 引用开关预留。下一步接入后台 CRUD 和第一批资源数据。'
            : 'Database models are prepared for resources, collections, submissions, tags, categories, stages, and AI citation controls. Admin CRUD and initial resources come next.'}
        </p>
      </section>
    </main>
  );
}
