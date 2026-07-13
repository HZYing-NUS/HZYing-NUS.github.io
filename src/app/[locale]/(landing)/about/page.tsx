import Image from 'next/image';
import Link from 'next/link';
import { Github, Mail, MapPin, ExternalLink } from 'lucide-react';

import { AboutSectionNav } from './about-section-nav';
import { CertificateViewer } from './certificate-viewer';
import { legacyProfileContent } from '@/config/seed/legacy-content';
import { getPublishedProfile } from '@/shared/models/profile';

type ContentRecord = Record<string, unknown>;

type DatedRecord = ContentRecord & {
  __originalIndex: number;
  __sortTimestamp: number | null;
};

function pickText(value: unknown, locale: string): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const localized = locale === 'zh' ? record.zh : record.en;
    if (typeof localized === 'string') return localized;
    if (typeof record.zh === 'string') return record.zh;
    if (typeof record.en === 'string') return record.en;
  }
  return '';
}

function pickImages(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function pickRecordText(record: ContentRecord, locale: string, ...keys: string[]): string {
  for (const key of keys) {
    const value = pickText(record[key], locale);
    if (value) return value;
  }
  return '';
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parseStartTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;

  const normalized = value
    .replace(/[–—]/g, '-')
    .replace(/年/g, '.')
    .replace(/月/g, '')
    .trim();
  const firstSegment = normalized.split(/\s+-\s+|\s+to\s+/i)[0]?.trim() ?? '';
  const numericMatch = firstSegment.match(/(\d{4})(?:\D+(\d{1,2}))?/);

  if (numericMatch) {
    const year = Number(numericMatch[1]);
    const month = Number(numericMatch[2] ?? 1) - 1;
    return Date.UTC(year, Math.max(0, Math.min(11, month)), 1);
  }

  const parsed = Date.parse(firstSegment);
  return Number.isNaN(parsed) ? null : parsed;
}

function sortByTime(items: ContentRecord[], locale: string): ContentRecord[] {
  const sorted: DatedRecord[] = items.map((item, index) => ({
    ...item,
    __originalIndex: index,
    __sortTimestamp: parseStartTimestamp(pickText(item['时间'], locale)),
  }));

  sorted.sort((left, right) => {
    if (left.__sortTimestamp === null && right.__sortTimestamp === null) {
      return left.__originalIndex - right.__originalIndex;
    }
    if (left.__sortTimestamp === null) return 1;
    if (right.__sortTimestamp === null) return -1;
    return right.__sortTimestamp - left.__sortTimestamp || left.__originalIndex - right.__originalIndex;
  });

  return sorted.map(({ __originalIndex, __sortTimestamp, ...item }) => item);
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24 border-t border-border/70 py-14 sm:py-20" id={id}>
      <div className="mb-9 grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      <div className="sm:ml-[13rem]">{children}</div>
    </section>
  );
}

function ProfileRecord({
  item,
  locale,
}: {
  item: ContentRecord;
  locale: string;
}) {
  const title = pickRecordText(item, locale, '标题', '学校', '单位', '项目', '论文标题', '赛事');
  const period = pickText(item['时间'], locale);
  const organization = pickRecordText(item, locale, '单位', '学校', '期刊', '赛事');
  const role = pickRecordText(item, locale, '职位', '学位', '作者身份');
  const description = pickRecordText(item, locale, '描述', '摘要', '职责与成果');
  const link = typeof item['链接'] === 'string' ? item['链接'] : '';
  const images = pickImages(item['证明图片']);

  return (
    <article className="relative grid gap-3 border-b border-border/60 py-7 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8 sm:py-8">
      <div className="flex items-center gap-3 sm:block">
        <span className="hidden size-2 rounded-full bg-primary sm:absolute sm:-left-[1.1rem] sm:top-[2.4rem] sm:block" />
        <p className="shrink-0 text-sm tabular-nums text-muted-foreground">{period}</p>
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold leading-snug text-foreground">{title}</h3>
        {organization || role ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {[organization, role].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {description ? <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{description}</p> : null}
        {link || images.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            {link ? (
              <Link
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                href={link}
                rel="noreferrer"
                target="_blank"
              >
                {locale === 'zh' ? '查看链接' : 'Open link'}
                <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
            {images.length > 0 ? <CertificateViewer images={images} locale={locale} title={title} /> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function AwardRecord({
  item,
  locale,
}: {
  item: ContentRecord;
  locale: string;
}) {
  const title = pickRecordText(item, locale, '标题', '奖项', '赛事');
  const period = pickText(item['时间'], locale);
  const organization = pickRecordText(item, locale, '单位', '主办方', '赛事');
  const level = pickText(item['级别'], locale);
  const rank = pickText(item['名次'], locale);
  const description = pickRecordText(item, locale, '描述', '说明');
  const images = pickImages(item['证明图片']);

  return (
    <article className="grid gap-2 border-b border-border/60 py-5 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
      <p className="text-sm tabular-nums text-muted-foreground">{period}</p>
      <div>
        <h3 className="font-medium leading-snug">{title}</h3>
        {organization ? <p className="mt-1 text-sm text-muted-foreground">{organization}</p> : null}
        {level || rank ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {level ? <span className="border border-border px-2 py-1 text-xs text-muted-foreground">{level}</span> : null}
            {rank ? <span className="border border-border px-2 py-1 text-xs font-medium">{rank}</span> : null}
          </div>
        ) : null}
        {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        {images.length > 0 ? <div className="mt-3"><CertificateViewer images={images} locale={locale} title={title} /></div> : null}
      </div>
    </article>
  );
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await getPublishedProfile(locale);
  const publishedContent = profile.content && typeof profile.content === 'object'
    ? profile.content as ContentRecord
    : {};
  const content = { ...legacyProfileContent, ...publishedContent } as ContentRecord;
  const isChinese = locale === 'zh';

  const avatar = typeof content['头像图片'] === 'string' ? content['头像图片'] : '';
  const email = typeof content['邮箱'] === 'string' ? content['邮箱'] : '';
  const github = typeof content['GitHub'] === 'string' ? content['GitHub'] : '';
  const wechatQr = typeof content['微信二维码图片'] === 'string' ? content['微信二维码图片'] : '';
  const wechatId = pickText(content['微信号文字'], locale);
  const officialQr = typeof content['公众号二维码图片'] === 'string' ? content['公众号二维码图片'] : '';
  const officialName = pickText(content['公众号文字'], locale);
  const bio = pickRecordText(content, locale, '自我介绍', '个人介绍');
  const education = Array.isArray(content['教育列表']) ? sortByTime(content['教育列表'] as ContentRecord[], locale) : [];
  const projects = Array.isArray(content['作品列表']) ? sortByTime(content['作品列表'] as ContentRecord[], locale) : [];
  const papers = Array.isArray(content['论文列表']) ? sortByTime(content['论文列表'] as ContentRecord[], locale) : [];
  const experiences = Array.isArray(content['经历列表']) ? sortByTime(content['经历列表'] as ContentRecord[], locale) : [];
  const awards = Array.isArray(content['奖项列表']) ? content['奖项列表'] as ContentRecord[] : [];

  const awardsByCategory = awards.reduce<Record<string, ContentRecord[]>>((groups, item) => {
    const category = pickText(item['类别'], locale) || (isChinese ? '其他' : 'Other');
    groups[category] ??= [];
    groups[category].push(item);
    return groups;
  }, {});
  const hasContact = Boolean(email || github || wechatQr || officialQr);
  const sectionNavItems = [
    bio ? { id: 'introduction', label: isChinese ? '简介' : 'Introduction' } : null,
    education.length > 0 ? { id: 'education', label: isChinese ? '教育' : 'Education' } : null,
    experiences.length > 0 ? { id: 'experience', label: isChinese ? '经历' : 'Experience' } : null,
    projects.length > 0 ? { id: 'projects', label: isChinese ? '项目' : 'Projects' } : null,
    papers.length > 0 ? { id: 'research', label: isChinese ? '论文' : 'Research' } : null,
    Object.keys(awardsByCategory).length > 0 ? { id: 'recognition', label: isChinese ? '奖项' : 'Recognition' } : null,
    hasContact ? { id: 'contact', label: isChinese ? '联系' : 'Contact' } : null,
  ].filter((item): item is { id: string; label: string } => item !== null);

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 pb-12 pt-12 sm:px-8 sm:pb-20 sm:pt-20">
        <section className="grid gap-9 pb-16 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8 sm:pb-24">
          <div className="flex items-start gap-5 sm:block">
            {avatar ? (
              <Image
                alt={profile.title}
                className="size-20 rounded-full border border-border object-cover sm:size-32"
                height={320}
                priority
                src={avatar}
                width={320}
              />
            ) : null}
            <p className="mt-1 text-sm leading-6 text-muted-foreground sm:mt-5">
              {isChinese ? '杭州，中国' : 'Hangzhou, China'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {isChinese ? '关于我' : 'About me'}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{profile.title}</h1>
            {profile.description ? <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{profile.description}</p> : null}
            <div className="mt-7 flex flex-wrap gap-5">
              {email ? (
                <Link className="inline-flex items-center gap-2 text-sm font-medium hover:underline" href={`mailto:${email}`}>
                  <Mail className="size-4" />
                  {isChinese ? '发送邮件' : 'Email'}
                </Link>
              ) : null}
              {github ? (
                <Link className="inline-flex items-center gap-2 text-sm font-medium hover:underline" href={github} rel="noreferrer" target="_blank">
                  <Github className="size-4" />
                  GitHub
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mb-8 lg:hidden">
          <AboutSectionNav label={isChinese ? '页面导航' : 'On this page'} items={sectionNavItems} />
        </div>

        <div className="lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden lg:block">
            <AboutSectionNav label={isChinese ? '页面导航' : 'On this page'} items={sectionNavItems} />
          </aside>
          <div>
        {bio ? (
          <Section id="introduction" eyebrow={isChinese ? '简介' : 'Introduction'} title={isChinese ? '正在做的事' : 'What I am working on'}>
            <div className="max-w-3xl space-y-5 text-base leading-8 text-muted-foreground">
              {splitParagraphs(bio).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </Section>
        ) : null}

        {education.length > 0 ? (
          <Section id="education" eyebrow={isChinese ? '教育' : 'Education'} title={isChinese ? '读过的书' : 'Academic foundation'}>
            <div className="border-l border-border/70 pl-5 sm:pl-7">
              {education.map((item, index) => <ProfileRecord item={item} key={`${pickText(item['标题'], locale)}-${index}`} locale={locale} />)}
            </div>
          </Section>
        ) : null}

        {experiences.length > 0 ? (
          <Section id="experience" eyebrow={isChinese ? '经历' : 'Experience'} title={isChinese ? '做过的事' : 'Work and practice'}>
            <div className="border-l border-border/70 pl-5 sm:pl-7">
              {experiences.map((item, index) => <ProfileRecord item={item} key={`${pickText(item['标题'], locale)}-${index}`} locale={locale} />)}
            </div>
          </Section>
        ) : null}

        {projects.length > 0 ? (
          <Section id="projects" eyebrow={isChinese ? '项目' : 'Projects'} title={isChinese ? '做出的产品' : 'Products I built'}>
            <div className="border-l border-border/70 pl-5 sm:pl-7">
              {projects.map((item, index) => <ProfileRecord item={item} key={`${pickText(item['标题'], locale)}-${index}`} locale={locale} />)}
            </div>
          </Section>
        ) : null}

        {papers.length > 0 ? (
          <Section id="research" eyebrow={isChinese ? '论文' : 'Research'} title={isChinese ? '写过的论文' : 'Research and writing'}>
            <div className="border-l border-border/70 pl-5 sm:pl-7">
              {papers.map((item, index) => <ProfileRecord item={item} key={`${pickText(item['标题'], locale)}-${index}`} locale={locale} />)}
            </div>
          </Section>
        ) : null}

        {Object.keys(awardsByCategory).length > 0 ? (
          <Section id="recognition" eyebrow={isChinese ? '奖项' : 'Recognition'} title={isChinese ? '获得的认可' : 'Recognition received'}>
            <div className="space-y-10">
              {Object.entries(awardsByCategory).map(([category, records]) => (
                <div key={category}>
                  <h3 className="border-b border-border pb-3 text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">{category}</h3>
                  <div>{sortByTime(records, locale).map((item, index) => <AwardRecord item={item} key={`${pickText(item['标题'], locale)}-${index}`} locale={locale} />)}</div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {hasContact ? (
          <Section id="contact" eyebrow={isChinese ? '联系' : 'Contact'} title={isChinese ? '保持联系' : 'Keep in touch'}>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="space-y-5">
                <p className="max-w-xl text-base leading-8 text-muted-foreground">
                  {isChinese ? '欢迎通过邮件、GitHub 或微信联系我。' : 'Reach me by email, GitHub, or WeChat.'}
                </p>
                <div className="space-y-3 text-sm">
                  {email ? <Link className="flex w-fit items-center gap-2 hover:underline" href={`mailto:${email}`}><Mail className="size-4" />{email}</Link> : null}
                  {github ? <Link className="flex w-fit items-center gap-2 hover:underline" href={github} rel="noreferrer" target="_blank"><Github className="size-4" />{github.replace(/^https?:\/\//, '')}</Link> : null}
                  <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" />{isChinese ? '杭州，中国' : 'Hangzhou, China'}</p>
                </div>
              </div>
              {(wechatQr || officialQr) ? (
                <div className="flex flex-wrap gap-6">
                  {wechatQr ? <QrCode image={wechatQr} label={isChinese ? '微信' : 'WeChat'} value={wechatId} /> : null}
                  {officialQr ? <QrCode image={officialQr} label={isChinese ? '公众号' : 'Official account'} value={officialName} /> : null}
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function QrCode({ image, label, value }: { image: string; label: string; value: string }) {
  return (
    <figure className="w-32">
      <Image alt={label} className="aspect-square w-32 border border-border bg-white p-1" height={256} src={image} width={256} />
      <figcaption className="mt-3 text-center text-sm">
        <span className="block font-medium">{label}</span>
        {value ? <span className="mt-1 block text-xs text-muted-foreground">{value}</span> : null}
      </figcaption>
    </figure>
  );
}
