import Image from 'next/image';
import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import { ExternalLink, Github, Mail, MapPin } from 'lucide-react';

import { envConfigs } from '@/config';
import { legacyProfileContent } from '@/config/seed/legacy-content';
import { getPublishedProfile } from '@/shared/models/profile';

import { AboutSectionNav } from './about-section-nav';
import { CertificateViewer } from './certificate-viewer';

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
    ? value.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0
      )
    : [];
}

function pickRecordText(
  record: ContentRecord,
  locale: string,
  ...keys: string[]
): string {
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
    return (
      right.__sortTimestamp - left.__sortTimestamp ||
      left.__originalIndex - right.__originalIndex
    );
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
    <section
      className="border-border/70 scroll-mt-24 border-t py-14 sm:py-20"
      id={id}
    >
      <div className="mb-9 grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      <div className="sm:ml-[13rem]">{children}</div>
    </section>
  );
}

function ProfileRecord({
  item,
  locale,
  showOrganizationAbovePeriod = false,
  showAuthor = false,
}: {
  item: ContentRecord;
  locale: string;
  showOrganizationAbovePeriod?: boolean;
  showAuthor?: boolean;
}) {
  const title = pickRecordText(
    item,
    locale,
    '标题',
    '学校',
    '单位',
    '项目',
    '论文标题',
    '赛事'
  );
  const period = pickText(item['时间'], locale);
  const organization = pickRecordText(
    item,
    locale,
    '公司',
    '单位',
    '学校',
    '期刊',
    '赛事'
  );
  const role = pickRecordText(item, locale, '职位', '学位', '作者身份');
  const author = pickRecordText(item, locale, '作者');
  const [authorRole, authorSupport] = author.split(' · ');
  const description = pickRecordText(
    item,
    locale,
    '描述',
    '摘要',
    '职责与成果'
  );
  const link = typeof item['链接'] === 'string' ? item['链接'] : '';
  const images = pickImages(item['证明图片']);

  return (
    <article className="border-border/60 relative grid gap-3 border-b py-7 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8 sm:py-8">
      <div className="flex items-center gap-3 sm:block">
        <span className="bg-primary hidden size-2 rounded-full sm:absolute sm:top-[2.4rem] sm:-left-[1.1rem] sm:block" />
        {showOrganizationAbovePeriod && organization ? (
          <p className="text-foreground mb-1 text-sm font-semibold">
            {organization}
          </p>
        ) : null}
        <p className="text-muted-foreground shrink-0 text-sm tabular-nums">
          {period}
        </p>
      </div>
      <div className="min-w-0">
        <h3 className="text-foreground text-lg leading-snug font-semibold">
          {title}
        </h3>
        {showAuthor && author ? (
          <p className="text-muted-foreground mt-1 text-sm">
            {authorRole}
            {authorSupport ? (
              <>
                {' · '}
                <strong className="text-foreground font-semibold">
                  {authorSupport}
                </strong>
              </>
            ) : null}
          </p>
        ) : null}
        {organization || role ? (
          <p className="text-muted-foreground mt-1 text-sm">
            {[showOrganizationAbovePeriod ? undefined : organization, role]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
        {description ? (
          <p className="text-muted-foreground mt-3 text-sm leading-7 whitespace-pre-line">
            {description}
          </p>
        ) : null}
        {link || images.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            {link ? (
              <Link
                className="text-foreground inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                href={link}
                rel="noreferrer"
                target="_blank"
              >
                {locale === 'zh' ? '查看链接' : 'Open link'}
                <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
            {images.length > 0 ? (
              <CertificateViewer
                images={images}
                locale={locale}
                title={title}
              />
            ) : null}
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
  const organization = pickRecordText(item, locale, '单位', '主办方');
  const tag = pickText(item['标签'], locale);
  const level = pickText(item['等级'] ?? item['级别'], locale);
  const rank = pickText(item['名次'], locale);
  const description = pickRecordText(item, locale, '描述', '说明');
  const images = pickImages(item['证明图片']);

  return (
    <article className="border-border/60 grid gap-2 border-b py-5 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
      <p className="text-muted-foreground text-sm tabular-nums">{period}</p>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="leading-snug font-medium">{title}</h3>
          {tag ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/15 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
              <span
                aria-hidden="true"
                className="size-1 rounded-full bg-emerald-600 dark:bg-emerald-300"
              />
              {tag}
            </span>
          ) : null}
        </div>
        {organization ? (
          <p className="text-muted-foreground mt-1 text-sm">{organization}</p>
        ) : null}
        {level || rank ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {level ? (
              <span className="border-border/70 bg-muted/60 text-foreground inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold">
                {level}
              </span>
            ) : null}
            {rank ? (
              <span className="border-border/60 text-muted-foreground inline-flex items-center rounded-full border border-dashed px-2.5 py-1 text-xs font-medium">
                {rank}
              </span>
            ) : null}
          </div>
        ) : null}
        {description ? (
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {description}
          </p>
        ) : null}
        {images.length > 0 ? (
          <div className="mt-3">
            <CertificateViewer images={images} locale={locale} title={title} />
          </div>
        ) : null}
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
  if (envConfigs.community_about_username)
    permanentRedirect(`/${locale}/u/${envConfigs.community_about_username}`);
  const profile = await getPublishedProfile(locale);
  const publishedContent =
    profile.content && typeof profile.content === 'object'
      ? (profile.content as ContentRecord)
      : {};
  const content = {
    ...legacyProfileContent,
    ...publishedContent,
  } as ContentRecord;
  const isChinese = locale === 'zh';

  const avatar =
    typeof content['头像图片'] === 'string' ? content['头像图片'] : '';
  const email = typeof content['邮箱'] === 'string' ? content['邮箱'] : '';
  const github = typeof content['GitHub'] === 'string' ? content['GitHub'] : '';
  const wechatQr =
    typeof content['微信二维码图片'] === 'string'
      ? content['微信二维码图片']
      : '';
  const wechatId = pickText(content['微信号文字'], locale);
  const officialQr =
    typeof content['公众号二维码图片'] === 'string'
      ? content['公众号二维码图片']
      : '';
  const officialName = pickText(content['公众号文字'], locale);
  const bio = pickRecordText(content, locale, '自我介绍', '个人介绍');
  const education = Array.isArray(content['教育列表'])
    ? sortByTime(content['教育列表'] as ContentRecord[], locale)
    : [];
  const projects = Array.isArray(content['作品列表'])
    ? sortByTime(content['作品列表'] as ContentRecord[], locale)
    : [];
  const papers = Array.isArray(content['论文列表'])
    ? sortByTime(content['论文列表'] as ContentRecord[], locale)
    : [];
  const experiences = Array.isArray(content['经历列表'])
    ? sortByTime(content['经历列表'] as ContentRecord[], locale)
    : [];
  const awards = Array.isArray(content['奖项列表'])
    ? (content['奖项列表'] as ContentRecord[])
    : [];

  const awardsByCategory = awards.reduce<Record<string, ContentRecord[]>>(
    (groups, item) => {
      const category =
        pickText(item['类别'], locale) || (isChinese ? '其他' : 'Other');
      groups[category] ??= [];
      groups[category].push(item);
      return groups;
    },
    {}
  );
  const hasContact = Boolean(email || github || wechatQr || officialQr);
  const sectionNavItems = [
    bio
      ? { id: 'introduction', label: isChinese ? '简介' : 'Introduction' }
      : null,
    education.length > 0
      ? { id: 'education', label: isChinese ? '教育' : 'Education' }
      : null,
    experiences.length > 0
      ? { id: 'experience', label: isChinese ? '经历' : 'Experience' }
      : null,
    projects.length > 0
      ? { id: 'projects', label: isChinese ? '项目' : 'Projects' }
      : null,
    papers.length > 0
      ? { id: 'research', label: isChinese ? '论文' : 'Research' }
      : null,
    Object.keys(awardsByCategory).length > 0
      ? { id: 'recognition', label: isChinese ? '奖项' : 'Recognition' }
      : null,
    hasContact
      ? { id: 'contact', label: isChinese ? '联系' : 'Contact' }
      : null,
  ].filter((item): item is { id: string; label: string } => item !== null);

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 pt-12 pb-12 sm:px-8 sm:pt-20 sm:pb-20">
        <section className="grid gap-9 pb-16 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8 sm:pb-24">
          <div className="flex items-start gap-5 sm:block">
            {avatar ? (
              <Image
                alt={
                  profile.title ||
                  (locale === 'zh' ? '黄梓颖的头像' : "Ziying Huang's portrait")
                }
                className="border-border size-20 rounded-full border object-cover sm:size-32"
                height={320}
                priority
                src={avatar}
                width={320}
              />
            ) : null}
            <p className="text-muted-foreground mt-1 text-sm leading-6 sm:mt-5">
              {isChinese ? '南京，中国' : 'Nanjing, China'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
              {isChinese ? '关于我' : 'About me'}
            </p>
            <p className="text-muted-foreground mt-3 text-lg leading-8">
              {isChinese
                ? '我是黄梓颖，一个用系统思维做产品的创业者'
                : 'I am Ziying Huang, an entrepreneur who builds products with systems thinking.'}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
              {profile.title}
            </h1>
            {profile.description ? (
              <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-8">
                {profile.description}
              </p>
            ) : null}
            <div className="mt-7 flex flex-wrap gap-5">
              {email ? (
                <Link
                  className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                  href={`mailto:${email}`}
                >
                  <Mail className="size-4" />
                  {isChinese ? '发送邮件' : 'Email'}
                </Link>
              ) : null}
              {github ? (
                <Link
                  className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                  href={github}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Github className="size-4" />
                  GitHub
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mb-8 lg:hidden">
          <AboutSectionNav
            label={isChinese ? '页面导航' : 'On this page'}
            items={sectionNavItems}
          />
        </div>

        <div className="lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden lg:block">
            <AboutSectionNav
              label={isChinese ? '页面导航' : 'On this page'}
              items={sectionNavItems}
            />
          </aside>
          <div>
            {bio ? (
              <Section
                id="introduction"
                eyebrow={isChinese ? '简介' : 'Introduction'}
                title={isChinese ? '正在做的事' : 'What I am working on'}
              >
                <div className="text-muted-foreground max-w-3xl space-y-5 text-base leading-8">
                  {splitParagraphs(bio).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </Section>
            ) : null}

            {education.length > 0 ? (
              <Section
                id="education"
                eyebrow={isChinese ? '教育' : 'Education'}
                title={isChinese ? '读过的书' : 'Academic foundation'}
              >
                <div className="border-border/70 border-l pl-5 sm:pl-7">
                  {education.map((item, index) => (
                    <ProfileRecord
                      item={item}
                      key={`${pickText(item['标题'], locale)}-${index}`}
                      locale={locale}
                    />
                  ))}
                </div>
              </Section>
            ) : null}

            {experiences.length > 0 ? (
              <Section
                id="experience"
                eyebrow={isChinese ? '经历' : 'Experience'}
                title={isChinese ? '做过的事' : 'Work and practice'}
              >
                <div className="border-border/70 border-l pl-5 sm:pl-7">
                  {experiences.map((item, index) => (
                    <ProfileRecord
                      item={item}
                      key={`${pickText(item['标题'], locale)}-${index}`}
                      locale={locale}
                      showOrganizationAbovePeriod
                    />
                  ))}
                </div>
              </Section>
            ) : null}

            {projects.length > 0 ? (
              <Section
                id="projects"
                eyebrow={isChinese ? '项目' : 'Projects'}
                title={isChinese ? '产品与项目' : 'Products I built'}
              >
                <div className="border-border/70 border-l pl-5 sm:pl-7">
                  {projects.map((item, index) => (
                    <ProfileRecord
                      item={item}
                      key={`${pickText(item['标题'], locale)}-${index}`}
                      locale={locale}
                    />
                  ))}
                </div>
              </Section>
            ) : null}

            {papers.length > 0 ? (
              <Section
                id="research"
                eyebrow={isChinese ? '论文' : 'Research'}
                title={isChinese ? '写过的论文' : 'Research and writing'}
              >
                <div className="border-border/70 border-l pl-5 sm:pl-7">
                  {papers.map((item, index) => (
                    <ProfileRecord
                      item={item}
                      key={`${pickText(item['标题'], locale)}-${index}`}
                      locale={locale}
                      showAuthor
                    />
                  ))}
                </div>
              </Section>
            ) : null}

            {Object.keys(awardsByCategory).length > 0 ? (
              <Section
                id="recognition"
                eyebrow={isChinese ? '奖项' : 'Recognition'}
                title={isChinese ? '获得的认可' : 'Recognition received'}
              >
                <div className="space-y-10">
                  {Object.entries(awardsByCategory).map(
                    ([category, records]) => (
                      <div key={category}>
                        <h3 className="border-border text-muted-foreground border-b pb-3 text-sm font-semibold tracking-[0.1em] uppercase">
                          {category}
                        </h3>
                        <div>
                          {sortByTime(records, locale).map((item, index) => (
                            <AwardRecord
                              item={item}
                              key={`${pickText(item['标题'], locale)}-${index}`}
                              locale={locale}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </Section>
            ) : null}

            {hasContact ? (
              <Section
                id="contact"
                eyebrow={isChinese ? '联系' : 'Contact'}
                title={isChinese ? '保持联系' : 'Keep in touch'}
              >
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div className="space-y-5">
                    <p className="text-muted-foreground max-w-xl text-base leading-8">
                      {isChinese
                        ? '欢迎通过邮件、GitHub 或微信联系我。'
                        : 'Reach me by email, GitHub, or WeChat.'}
                    </p>
                    <div className="space-y-3 text-sm">
                      {email ? (
                        <Link
                          className="flex w-fit items-center gap-2 hover:underline"
                          href={`mailto:${email}`}
                        >
                          <Mail className="size-4" />
                          {email}
                        </Link>
                      ) : null}
                      {github ? (
                        <Link
                          className="flex w-fit items-center gap-2 hover:underline"
                          href={github}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Github className="size-4" />
                          {github.replace(/^https?:\/\//, '')}
                        </Link>
                      ) : null}
                      <p className="text-muted-foreground flex items-center gap-2">
                        <MapPin className="size-4" />
                        {isChinese ? '南京，中国' : 'Nanjing, China'}
                      </p>
                    </div>
                  </div>
                  {wechatQr || officialQr ? (
                    <div className="flex flex-wrap gap-6">
                      {wechatQr ? (
                        <QrCode
                          image={wechatQr}
                          label={isChinese ? '微信' : 'WeChat'}
                          value={wechatId}
                        />
                      ) : null}
                      {officialQr ? (
                        <QrCode
                          image={officialQr}
                          label={isChinese ? '公众号' : 'Official account'}
                          value={officialName}
                        />
                      ) : null}
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

function QrCode({
  image,
  label,
  value,
}: {
  image: string;
  label: string;
  value: string;
}) {
  return (
    <figure className="w-32">
      <Image
        alt={label}
        className="border-border aspect-square w-32 border bg-white p-1"
        height={256}
        src={image}
        width={256}
      />
      <figcaption className="mt-3 text-center text-sm">
        <span className="block font-medium">{label}</span>
        {value ? (
          <span className="text-muted-foreground mt-1 block text-xs">
            {value}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
