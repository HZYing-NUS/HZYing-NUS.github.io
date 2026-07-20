'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FilePenLine, Plus, RefreshCw, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

type ArticleRow = {
  article: {
    id: string;
    slug: string;
    status: string;
    sourceLocale: string;
    updatedAt: string;
    firstPublishedAt: string | null;
    allowComments: boolean;
    allowReplies: boolean;
    restoreDeadlineAt: string | null;
  };
  revision: {
    titleZh: string | null;
    titleEn: string | null;
    summaryZh: string | null;
    summaryEn: string | null;
    contentZh: string | null;
    contentEn: string | null;
    coverImageUrl: string | null;
    categorySlug: string | null;
    tags: unknown;
    sourceLocale: string;
    translationError: string | null;
    reviewReason: string | null;
    moderationReviewId: string | null;
  } | null;
};

type ArticleForm = {
  sourceLocale: 'zh' | 'en';
  title: string;
  summary: string;
  content: string;
  coverImageUrl: string;
  categorySlug: string;
  tags: string;
  slug: string;
};

const emptyForm: ArticleForm = {
  sourceLocale: 'zh',
  title: '',
  summary: '',
  content: '',
  coverImageUrl: '',
  categorySlug: '',
  tags: '',
  slug: '',
};

const filters = [
  'all',
  'draft',
  'translating',
  'translation_failed',
  'pending_review',
  'changes_requested',
  'rejected',
  'published',
  'deleted',
] as const;

function statusMatches(status: string, filter: (typeof filters)[number]) {
  if (filter === 'all') return true;
  if (filter === 'draft')
    return status === 'draft' || status === 'revision_draft';
  if (filter === 'pending_review')
    return status === 'pending_review' || status === 'revision_pending_review';
  if (filter === 'deleted') return status === 'deleted_by_author';
  return status === filter;
}

function editable(status: string) {
  return [
    'draft',
    'translation_failed',
    'changes_requested',
    'rejected',
    'revision_draft',
  ].includes(status);
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok || payload.code !== 0)
    throw new Error(payload.message || 'REQUEST_FAILED');
  return payload.data as T;
}

export function ArticleAuthorWorkspace() {
  const t = useTranslations('community.author');
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const [selected, setSelected] = useState<ArticleRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ArticleForm>({ ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [moderation, setModeration] = useState<{
    review: { policyDecision: string | null; reason: string | null };
    appeal: { status: string; resultNote: string | null } | null;
  } | null>(null);
  const [appealStatement, setAppealStatement] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setArticles(await api<ArticleRow[]>('/api/community/me/articles'));
    } catch (error) {
      toast.error(
        t(`errors.${error instanceof Error ? error.message : 'REQUEST_FAILED'}`)
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => void load(), [load]);

  const visible = useMemo(
    () =>
      articles.filter(({ article }) => statusMatches(article.status, filter)),
    [articles, filter]
  );

  function open(row?: ArticleRow) {
    setEditorOpen(true);
    setSelected(row || null);
    if (!row?.revision) return setForm({ ...emptyForm });
    setModeration(null);
    if (row.revision.moderationReviewId) {
      void api<{
        review: { policyDecision: string | null; reason: string | null };
        appeal: { status: string; resultNote: string | null } | null;
      }>(`/api/community/me/moderation/${row.revision.moderationReviewId}`)
        .then(setModeration)
        .catch(() => setModeration(null));
    }
    const sourceIsZh = row.revision.sourceLocale === 'zh';
    setForm({
      sourceLocale: sourceIsZh ? 'zh' : 'en',
      title: (sourceIsZh ? row.revision.titleZh : row.revision.titleEn) || '',
      summary:
        (sourceIsZh ? row.revision.summaryZh : row.revision.summaryEn) || '',
      content:
        (sourceIsZh ? row.revision.contentZh : row.revision.contentEn) || '',
      coverImageUrl: row.revision.coverImageUrl || '',
      categorySlug: row.revision.categorySlug || '',
      tags: Array.isArray(row.revision.tags)
        ? row.revision.tags.join(', ')
        : '',
      slug: row.article.slug,
    });
  }

  async function appeal() {
    const reviewId = selected?.revision?.moderationReviewId;
    if (!reviewId || !appealStatement.trim()) return;
    setBusy(true);
    try {
      await api(`/api/community/me/moderation/${reviewId}/appeal`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ statement: appealStatement }),
      });
      toast.success(t('messages.appealed'));
      setModeration(await api(`/api/community/me/moderation/${reviewId}`));
      setAppealStatement('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'REQUEST_FAILED');
    } finally {
      setBusy(false);
    }
  }

  async function save(submit: boolean) {
    setBusy(true);
    try {
      const saved = await api<ArticleRow>(
        selected
          ? `/api/community/me/articles/${selected.article.id}`
          : '/api/community/me/articles',
        {
          method: selected ? 'PUT' : 'POST',
          headers: {
            'content-type': 'application/json',
            'x-request-id': crypto.randomUUID(),
          },
          body: JSON.stringify({
            ...form,
            tags: form.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          }),
        }
      );
      if (submit) {
        await api(`/api/community/me/articles/${saved.article.id}/submit`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': crypto.randomUUID(),
          },
          body: '{}',
        });
        toast.success(t('messages.submitted'));
        setSelected(null);
        setEditorOpen(false);
      } else {
        toast.success(t('messages.saved'));
        setSelected(saved);
      }
      await load();
    } catch (error) {
      const key = error instanceof Error ? error.message : 'REQUEST_FAILED';
      toast.error(t.has(`errors.${key}`) ? t(`errors.${key}`) : key);
    } finally {
      setBusy(false);
    }
  }

  async function updateInteractions(input: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    try {
      await api(
        `/api/community/me/articles/${selected.article.id}/interactions`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        }
      );
      toast.success(t('messages.interactionsSaved'));
      await load();
      setSelected(null);
      setEditorOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'REQUEST_FAILED');
    } finally {
      setBusy(false);
    }
  }

  if (editorOpen) {
    const canEdit = !selected || editable(selected.article.status);
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              setSelected(null);
              setEditorOpen(false);
              setForm({ ...emptyForm });
            }}
          >
            <ArrowLeft /> {t('back')}
          </Button>
          {selected && (
            <Badge variant="outline">
              {t(`status.${selected.article.status}`)}
            </Badge>
          )}
        </div>
        <div className="bg-card rounded-2xl border shadow-sm">
          <div className="border-b px-6 py-5">
            <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
              {t('eyebrow')}
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              {selected ? t('editTitle') : t('newTitle')}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {t('editorHint')}
            </p>
          </div>
          <fieldset
            disabled={!canEdit || busy}
            className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_18rem]"
          >
            <div className="space-y-5">
              <Field label={t('fields.title')}>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <Field label={t('fields.summary')}>
                <Textarea
                  rows={4}
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                />
              </Field>
              <Field label={t('fields.content')} hint={t('markdownHint')}>
                <Textarea
                  className="min-h-[32rem] font-mono leading-6"
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="space-y-5 lg:border-l lg:pl-6">
              <Field label={t('fields.sourceLocale')}>
                <select
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={form.sourceLocale}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sourceLocale: e.target.value as 'zh' | 'en',
                    })
                  }
                >
                  <option value="zh">{t('locales.zh')}</option>
                  <option value="en">{t('locales.en')}</option>
                </select>
              </Field>
              <Field label={t('fields.slug')}>
                <Input
                  value={form.slug}
                  disabled={Boolean(selected?.article.firstPublishedAt)}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </Field>
              <Field label={t('fields.cover')}>
                <Input
                  type="url"
                  value={form.coverImageUrl}
                  onChange={(e) =>
                    setForm({ ...form, coverImageUrl: e.target.value })
                  }
                />
              </Field>
              <Field label={t('fields.category')}>
                <Input
                  value={form.categorySlug}
                  onChange={(e) =>
                    setForm({ ...form, categorySlug: e.target.value })
                  }
                />
              </Field>
              <Field label={t('fields.tags')} hint={t('tagsHint')}>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </Field>
              {selected?.revision?.translationError && (
                <Notice
                  title={t('translationError')}
                  text={selected.revision.translationError}
                />
              )}
              {selected?.revision?.reviewReason && (
                <Notice
                  title={t('reviewReason')}
                  text={selected.revision.reviewReason}
                />
              )}
              {moderation?.review.policyDecision === 'blocked' && (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">{t('blocked')}</p>
                  {moderation.review.reason && (
                    <p className="text-muted-foreground text-xs">
                      {moderation.review.reason}
                    </p>
                  )}
                  {moderation.appeal ? (
                    <Notice
                      title={t('appealStatus')}
                      text={`${moderation.appeal.status}${moderation.appeal.resultNote ? `：${moderation.appeal.resultNote}` : ''}`}
                    />
                  ) : (
                    <>
                      <Textarea
                        value={appealStatement}
                        onChange={(event) =>
                          setAppealStatement(event.target.value)
                        }
                        placeholder={t('appealPlaceholder')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy || !appealStatement.trim()}
                        onClick={() => void appeal()}
                      >
                        {t('submitAppeal')}
                      </Button>
                    </>
                  )}
                </div>
              )}
              {selected?.article.status === 'published' && (
                <div className="space-y-3 rounded-lg border p-3">
                  <label className="flex items-center justify-between gap-3 text-sm">
                    {t('allowComments')}
                    <input
                      type="checkbox"
                      checked={selected.article.allowComments}
                      onChange={(event) =>
                        void updateInteractions({
                          allowComments: event.target.checked,
                          allowReplies: selected.article.allowReplies,
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-sm">
                    {t('allowReplies')}
                    <input
                      type="checkbox"
                      checked={selected.article.allowReplies}
                      onChange={(event) =>
                        void updateInteractions({
                          allowComments: selected.article.allowComments,
                          allowReplies: event.target.checked,
                        })
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() =>
                      void updateInteractions({ action: 'delete' })
                    }
                  >
                    {t('deleteArticle')}
                  </Button>
                </div>
              )}
              {selected?.article.status === 'deleted_by_author' && (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">
                    {t('restoreDeadline', {
                      date: selected.article.restoreDeadlineAt
                        ? new Date(
                            selected.article.restoreDeadlineAt
                          ).toLocaleDateString()
                        : '-',
                    })}
                  </p>
                  <Button
                    type="button"
                    onClick={() =>
                      void updateInteractions({ action: 'restore' })
                    }
                  >
                    {t('restoreArticle')}
                  </Button>
                </div>
              )}
            </div>
          </fieldset>
          {canEdit && (
            <div className="flex flex-wrap justify-end gap-3 border-t px-6 py-4">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void save(false)}
              >
                <FilePenLine />
                {t('save')}
              </Button>
              <Button disabled={busy} onClick={() => void save(true)}>
                <Send />
                {t('submit')}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
            {t('eyebrow')}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('description')}</p>
        </div>
        <Button onClick={() => open()}>
          <Plus />
          {t('new')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={filter === item ? 'default' : 'outline'}
            onClick={() => setFilter(item)}
          >
            {t(`filters.${item}`)}{' '}
            <span className="opacity-60">
              {
                articles.filter(({ article }) =>
                  statusMatches(article.status, item)
                ).length
              }
            </span>
          </Button>
        ))}
      </div>
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-16">
          <RefreshCw className="size-4 animate-spin" />
          {t('loading')}
        </div>
      ) : visible.length ? (
        <div className="grid gap-3">
          {visible.map((row) => {
            const sourceIsZh = row.revision?.sourceLocale === 'zh';
            const title =
              (sourceIsZh ? row.revision?.titleZh : row.revision?.titleEn) ||
              t('untitled');
            return (
              <button
                key={row.article.id}
                onClick={() => open(row)}
                className="group bg-card flex w-full items-center justify-between gap-4 rounded-xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{title}</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    /{row.article.slug} ·{' '}
                    {new Date(row.article.updatedAt).toLocaleDateString()}
                  </p>
                  {row.revision?.reviewReason && (
                    <p className="text-destructive mt-2 line-clamp-1 text-sm">
                      {row.revision.reviewReason}
                    </p>
                  )}
                </div>
                <Badge variant="outline">
                  {t(`status.${row.article.status}`)}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed py-20 text-center">
          <FilePenLine className="text-muted-foreground mx-auto size-8" />
          <p className="mt-4 font-medium">{t('empty')}</p>
          <Button variant="link" asChild>
            <Link href="/settings/community">{t('center')}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs leading-5 whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
}
