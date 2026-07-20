'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link, useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

type Row = {
  article: {
    slug: string;
    featured: boolean;
    featuredReason: string | null;
    featuredAt: string | null;
    currentPublishedRevisionId: string | null;
  };
  revision: {
    sourceLocale: 'zh' | 'en';
    titleZh: string | null;
    titleEn: string | null;
    summaryZh: string | null;
    summaryEn: string | null;
    contentZh: string | null;
    contentEn: string | null;
    coverImageUrl: string | null;
    categorySlug: string | null;
    tags: unknown;
    reviewStatus: string;
  };
};

export function CommunityAdminArticleReview({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations('community.admin');
  const router = useRouter();
  const [row, setRow] = useState<Row | null>(null);
  const [translation, setTranslation] = useState({
    title: '',
    summary: '',
    content: '',
  });
  const [format, setFormat] = useState({
    coverImageUrl: '',
    categorySlug: '',
    tags: '',
  });
  const [reason, setReason] = useState('');
  const [slug, setSlug] = useState('');
  const [featuredReason, setFeaturedReason] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const payload = await fetch(
      `/api/admin/community/articles/${articleId}`
    ).then((response) => response.json());
    if (payload.code !== 0) throw new Error(payload.message);
    const next = payload.data as Row;
    setRow(next);
    setSlug(next.article.slug);
    setFeaturedReason(next.article.featuredReason || '');
    const zh = next.revision.sourceLocale === 'zh';
    setTranslation({
      title: (zh ? next.revision.titleEn : next.revision.titleZh) || '',
      summary: (zh ? next.revision.summaryEn : next.revision.summaryZh) || '',
      content: (zh ? next.revision.contentEn : next.revision.contentZh) || '',
    });
    setFormat({
      coverImageUrl: next.revision.coverImageUrl || '',
      categorySlug: next.revision.categorySlug || '',
      tags: Array.isArray(next.revision.tags)
        ? next.revision.tags.join(', ')
        : '',
    });
  }, [articleId]);
  useEffect(() => {
    void load().catch((error) => toast.error(error.message));
  }, [load]);
  async function request(url: string, body: unknown, method = 'POST') {
    setBusy(true);
    try {
      const payload = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).then((response) => response.json());
      if (payload.code !== 0) {
        const translatedErrors: Record<string, string> = {
          ARTICLE_FEATURED_REASON_REQUIRED: t('errors.featuredReasonRequired'),
          ARTICLE_FEATURED_VALUE_INVALID: t('errors.featuredValueInvalid'),
          ARTICLE_NOT_FOUND: t('errors.notFound'),
          ARTICLE_NOT_PENDING_REVIEW: t('errors.notPendingReview'),
          ARTICLE_NOT_PUBLISHED: t('errors.notPublished'),
          ARTICLE_SLUG_REQUIRED: t('errors.slugRequired'),
          ARTICLE_SLUG_UNAVAILABLE: t('errors.slugUnavailable'),
        };
        throw new Error(translatedErrors[payload.message] || payload.message);
      }
      toast.success(t('saved'));
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('failed'));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (
      await request(
        `/api/admin/community/articles/${articleId}/translation`,
        {
          ...translation,
          ...format,
          tags: format.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
        'PUT'
      )
    )
      await load();
  }
  async function review(action: string) {
    if (action === 'changes_requested' && !reason.trim())
      return toast.error(t('reasonRequired'));
    if (
      await request(`/api/admin/community/articles/${articleId}/review`, {
        action,
        reason: reason.trim() || null,
      })
    ) {
      router.push('/admin/community/articles');
      router.refresh();
    }
  }
  async function saveSlug() {
    if (
      await request(
        `/api/admin/community/articles/${articleId}/slug`,
        { slug },
        'PUT'
      )
    )
      await load();
  }
  async function setFeatured(featured: boolean) {
    if (featured && !featuredReason.trim())
      return toast.error(t('featuredReasonRequired'));
    if (
      await request(
        `/api/admin/community/articles/${articleId}/featured`,
        { featured, reason: featuredReason.trim() || null },
        'PUT'
      )
    )
      await load();
  }
  if (!row) return <main className="p-8">{t('loading')}</main>;
  const zh = row.revision.sourceLocale === 'zh';
  const source = {
    title: zh ? row.revision.titleZh : row.revision.titleEn,
    summary: zh ? row.revision.summaryZh : row.revision.summaryEn,
    content: zh ? row.revision.contentZh : row.revision.contentEn,
  };
  const pendingReview = row.revision.reviewStatus === 'pending_review';
  return (
    <main className="p-6 md:p-8">
      <Button variant="ghost" asChild>
        <Link href="/admin/community/articles">{t('back')}</Link>
      </Button>
      <h1 className="mt-5 text-2xl font-semibold">{t('reviewTitle')}</h1>
      <p className="text-muted-foreground mt-1">/{row.article.slug}</p>
      <section className="mt-6 grid gap-5 rounded-xl border p-5 lg:grid-cols-2">
        <div>
          <Field label={t('slug')}>
            <div className="flex gap-2">
              <Input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={busy || !slug.trim() || slug === row.article.slug}
                onClick={() => void saveSlug()}
              >
                {t('saveSlug')}
              </Button>
            </div>
          </Field>
          {row.article.currentPublishedRevisionId ? (
            <p className="text-muted-foreground mt-2 text-xs">
              {t('publishedSlugHint')}
            </p>
          ) : null}
        </div>
        <div>
          <Field label={t('featuredReason')}>
            <Textarea
              rows={2}
              value={featuredReason}
              onChange={(event) => setFeaturedReason(event.target.value)}
            />
          </Field>
          <div className="mt-3 flex items-center gap-3">
            {row.article.featured ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void setFeatured(false)}
              >
                {t('unfeature')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={busy || !row.article.currentPublishedRevisionId}
                onClick={() => void setFeatured(true)}
              >
                {t('feature')}
              </Button>
            )}
            {row.article.featuredAt ? (
              <span className="text-muted-foreground text-xs">
                {new Date(row.article.featuredAt).toLocaleString()}
              </span>
            ) : null}
          </div>
        </div>
      </section>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="bg-muted/20 space-y-5 rounded-xl border p-5">
          <h2 className="font-semibold">{t('source')}</h2>
          <Read label={t('fields.title')} value={source.title} />
          <Read label={t('fields.summary')} value={source.summary} />
          <Read label={t('fields.content')} value={source.content} pre />
        </section>
        <section className="space-y-5 rounded-xl border p-5">
          <h2 className="font-semibold">{t('translation')}</h2>
          <Field label={t('fields.title')}>
            <Input
              value={translation.title}
              onChange={(e) =>
                setTranslation({ ...translation, title: e.target.value })
              }
            />
          </Field>
          <Field label={t('fields.summary')}>
            <Textarea
              rows={4}
              value={translation.summary}
              onChange={(e) =>
                setTranslation({ ...translation, summary: e.target.value })
              }
            />
          </Field>
          <Field label={t('fields.content')}>
            <Textarea
              className="min-h-[28rem] font-mono"
              value={translation.content}
              onChange={(e) =>
                setTranslation({ ...translation, content: e.target.value })
              }
            />
          </Field>
          <Field label={t('fields.cover')}>
            <Input
              value={format.coverImageUrl}
              onChange={(e) =>
                setFormat({ ...format, coverImageUrl: e.target.value })
              }
            />
          </Field>
          <Field label={t('fields.category')}>
            <Input
              value={format.categorySlug}
              onChange={(e) =>
                setFormat({ ...format, categorySlug: e.target.value })
              }
            />
          </Field>
          <Field label={t('fields.tags')}>
            <Input
              value={format.tags}
              onChange={(e) => setFormat({ ...format, tags: e.target.value })}
            />
          </Field>
          <Button disabled={busy || !pendingReview} onClick={() => void save()}>
            {t('saveTranslation')}
          </Button>
        </section>
      </div>
      <section className="mt-6 rounded-xl border p-5">
        <Field label={t('reason')}>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            disabled={busy || !pendingReview}
            onClick={() => void review('approve')}
          >
            {t('approve')}
          </Button>
          <Button
            disabled={busy || !pendingReview}
            variant="secondary"
            onClick={() => void review('changes_requested')}
          >
            {t('changes')}
          </Button>
          <Button
            disabled={busy || !pendingReview}
            variant="destructive"
            onClick={() => void review('rejected')}
          >
            {t('reject')}
          </Button>
          <Button
            disabled={busy || !pendingReview}
            variant="outline"
            onClick={() => void review('archived')}
          >
            {t('archive')}
          </Button>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Read({
  label,
  value,
  pre,
}: {
  label: string;
  value: string | null;
  pre?: boolean;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <div
        className={
          pre
            ? 'mt-2 font-mono text-sm whitespace-pre-wrap'
            : 'mt-2 text-sm whitespace-pre-wrap'
        }
      >
        {value || '-'}
      </div>
    </div>
  );
}
