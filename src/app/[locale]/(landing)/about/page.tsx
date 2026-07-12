import type { ReactNode } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

import { legacyProfileContent } from '@/config/seed/legacy-content';
import { getMetadata } from '@/shared/lib/seo';
import { getPublishedProfile } from '@/shared/models/profile';

export const generateMetadata = getMetadata({
  title: '关于我',
  description: '梓颖的个人介绍、教育背景、工作与创业经历、作品项目、论文、奖项和联系方式。',
  canonicalUrl: '/about',
});

type LegacyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is LegacyRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function pickText(value: unknown, locale: string) {
  if (typeof value === 'string') return value.trim();
  if (isRecord(value)) {
    const zh = typeof value.zh === 'string' ? value.zh.trim() : '';
    const en = typeof value.en === 'string' ? value.en.trim() : '';
    return locale === 'en' ? en || zh : zh || en;
  }
  return '';
}

function pickImages(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function splitParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-20">
      <div className="mb-8 max-w-3xl">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
        {description ? <p className="text-muted-foreground mt-4 leading-7">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ProofImages({ images, label }: { images: string[]; label: string }) {
  if (!images.length) return null;

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((src, index) => (
        <Link
          key={`${src}-${index}`}
          href={src}
          target="_blank"
          className="group relative block overflow-hidden rounded-2xl border bg-muted"
        >
          <Image
            src={src}
            alt={`${label} ${index + 1}`}
            width={360}
            height={240}
            className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </Link>
      ))}
    </div>
  );
}

function ContentCard({
  item,
  locale,
  titleKey,
  subtitleKey,
  metaKeys,
  descriptionKey = '描述',
}: {
  item: LegacyRecord;
  locale: string;
  titleKey: string;
  subtitleKey?: string;
  metaKeys?: string[];
  descriptionKey?: string;
}) {
  const title = pickText(item[titleKey], locale);
  const subtitle = subtitleKey ? pickText(item[subtitleKey], locale) : '';
  const description = pickText(item[descriptionKey], locale);
  const href = pickText(item.链接, locale);
  const images = pickImages(item.证明图片);
  const metas = (metaKeys || [])
    .map((key) => pickText(item[key], locale))
    .filter(Boolean);

  return (
    <article className="rounded-3xl border bg-background p-6 shadow-sm">
      {metas.length ? (
        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {metas.map((meta) => (
            <span key={meta}>{meta}</span>
          ))}
        </div>
      ) : null}
      <h3 className="mt-3 text-xl font-semibold leading-snug">{title}</h3>
      {subtitle ? <p className="text-primary mt-2 text-sm font-medium">{subtitle}</p> : null}
      {description ? <p className="text-muted-foreground mt-4 text-sm leading-7">{description}</p> : null}
      {href ? (
        <Link href={href} target="_blank" className="text-primary mt-4 inline-flex text-sm font-medium">
          {locale === 'zh' ? '查看链接' : 'Open link'}
        </Link>
      ) : null}
      <ProofImages images={images} label={title} />
    </article>
  );
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === 'zh';
  const profile = (await getPublishedProfile(locale)) || legacyProfileContent;
  const intro = pickText(profile.自我介绍, locale);
  const education = profile.教育列表 as readonly LegacyRecord[];
  const projects = profile.作品列表 as readonly LegacyRecord[];
  const papers = profile.论文列表 as readonly LegacyRecord[];
  const experiences = profile.经历列表 as readonly LegacyRecord[];
  const awards = profile.奖项列表 as readonly LegacyRecord[];
  const groupedAwards = awards.reduce<Record<string, LegacyRecord[]>>((groups, award) => {
    const category = pickText(award.类别, locale) || (isZh ? '其他' : 'Other');
    groups[category] = groups[category] || [];
    groups[category].push(award);
    return groups;
  }, {});

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <section className="grid items-center gap-10 md:grid-cols-[240px_1fr]">
        <div className="relative mx-auto size-48 overflow-hidden rounded-full border bg-muted md:mx-0">
          <Image
            src={legacyProfileContent.头像图片}
            alt={pickText(legacyProfileContent.名字, locale)}
            fill
            className="object-cover"
            sizes="192px"
            priority
          />
        </div>
        <div>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.3em]">
            About
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            {pickText(legacyProfileContent.名字, locale)}
          </h1>
          <p className="text-primary mt-4 text-xl font-medium">
            {pickText(legacyProfileContent.一句话标签, locale)}
          </p>
          <p className="text-muted-foreground mt-4 text-lg leading-8">
            {pickText(legacyProfileContent.身份说明, locale)}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`mailto:${legacyProfileContent.邮箱}`}
              className="bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-medium"
            >
              {legacyProfileContent.邮箱}
            </Link>
            <Link
              href={legacyProfileContent.GitHub}
              target="_blank"
              className="rounded-full border px-5 py-2.5 text-sm font-medium"
            >
              GitHub
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-5 md:grid-cols-4">
        {[
          [education.length, isZh ? '段教育经历' : 'education entries'],
          [projects.length, isZh ? '个作品项目' : 'projects'],
          [papers.length, isZh ? '篇论文' : 'papers'],
          [awards.length, isZh ? '项奖项证书' : 'awards and certificates'],
        ].map(([count, label]) => (
          <div key={label} className="rounded-3xl border p-6 text-center">
            <p className="text-3xl font-semibold">{count}</p>
            <p className="text-muted-foreground mt-2 text-sm">{label}</p>
          </div>
        ))}
      </section>

      <Section
        eyebrow="Profile"
        title={isZh ? '自我介绍' : 'Introduction'}
        description={isZh ? '完整承接原个人网站的双语自我介绍。' : 'Migrated from the original bilingual personal site.'}
      >
        <div className="rounded-3xl border bg-muted/30 p-6 md:p-8">
          <div className="text-muted-foreground space-y-5 leading-8">
            {splitParagraphs(intro).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section eyebrow="Contact" title={isZh ? '联系方式与二维码' : 'Contact and QR codes'}>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border p-6 md:col-span-1">
            <h3 className="text-xl font-semibold">Email / GitHub</h3>
            <div className="text-muted-foreground mt-4 space-y-3 text-sm">
              <p>{legacyProfileContent.邮箱}</p>
              <Link href={legacyProfileContent.GitHub} target="_blank" className="text-primary block break-all">
                {legacyProfileContent.GitHub}
              </Link>
            </div>
          </div>
          {[
            [legacyProfileContent.微信二维码图片, pickText(legacyProfileContent.微信号文字, locale), isZh ? '微信' : 'WeChat'],
            [legacyProfileContent.公众号二维码图片, pickText(legacyProfileContent.公众号文字, locale), isZh ? '公众号' : 'Official account'],
          ].map(([src, label, title]) => (
            <div key={title} className="rounded-3xl border p-6 text-center">
              <div className="mx-auto w-36 overflow-hidden rounded-2xl border bg-muted p-2">
                <Image src={src} alt={title} width={240} height={240} className="w-full" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Education" title={isZh ? '教育背景' : 'Education'}>
        <div className="grid gap-6 lg:grid-cols-2">
          {education.map((item) => (
            <ContentCard
              key={pickText(item.学校, locale)}
              item={item}
              locale={locale}
              titleKey="学校"
              subtitleKey="学位"
              metaKeys={['时间']}
            />
          ))}
        </div>
      </Section>

      <Section eyebrow="Projects" title={isZh ? '作品 / 项目' : 'Projects'}>
        <div className="grid gap-6 lg:grid-cols-2">
          {projects.map((item) => (
            <ContentCard
              key={pickText(item.标题, locale)}
              item={item}
              locale={locale}
              titleKey="标题"
              subtitleKey="角色"
              metaKeys={['时间']}
            />
          ))}
        </div>
      </Section>

      <Section eyebrow="Papers" title={isZh ? '论文' : 'Papers'}>
        <div className="grid gap-6 lg:grid-cols-2">
          {papers.map((item) => (
            <ContentCard
              key={pickText(item.标题, locale)}
              item={item}
              locale={locale}
              titleKey="标题"
              subtitleKey="期刊"
              metaKeys={['时间', '作者']}
            />
          ))}
        </div>
      </Section>

      <Section eyebrow="Experience" title={isZh ? '工作 / 创业经历' : 'Work and founder experience'}>
        <div className="grid gap-6 lg:grid-cols-2">
          {experiences.map((item) => (
            <ContentCard
              key={pickText(item.公司, locale)}
              item={item}
              locale={locale}
              titleKey="公司"
              subtitleKey="职位"
              metaKeys={['时间']}
            />
          ))}
        </div>
      </Section>

      <Section eyebrow="Awards" title={isZh ? '奖项 · 证书 · 荣誉' : 'Awards, certificates, and honors'}>
        <div className="space-y-10">
          {Object.entries(groupedAwards).map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-5 text-2xl font-semibold">{category}</h3>
              <div className="grid gap-5 lg:grid-cols-2">
                {items.map((item) => (
                  <ContentCard
                    key={pickText(item.标题, locale)}
                    item={item}
                    locale={locale}
                    titleKey="标题"
                    subtitleKey="等级"
                    metaKeys={['时间', '标签']}
                    descriptionKey=""
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
