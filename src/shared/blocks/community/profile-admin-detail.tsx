'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';

type ProfileDetail = {
  profile: {
    id: string;
    username: string;
    displayName: string;
    moderationStatus: string;
    isHidden: boolean;
    hiddenReason: string | null;
    currentPublishedRevisionId: string | null;
    pendingRevisionId: string | null;
  };
  account: { name: string; email: string };
  revisions: Array<{
    id: string;
    version: number;
    displayName: string;
    headline: string | null;
    websiteUrl: string | null;
    socialLinks: unknown;
    works: unknown;
    focusAreas: unknown;
    moderationStatus: string;
    moderationReviewId: string | null;
    submittedAt: string | null;
    publishedAt: string | null;
  }>;
};

function getSafeHttpsUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function CommunityAdminProfileDetail({
  profileId,
  isZh,
}: {
  profileId: string;
  isZh: boolean;
}) {
  const [row, setRow] = useState<ProfileDetail | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const payload = await fetch(
      `/api/admin/community/profiles/${profileId}`
    ).then((response) => response.json());
    if (payload.code !== 0) throw new Error(payload.message);
    setRow(payload.data);
  }, [profileId]);

  useEffect(() => {
    void load().catch((error) => toast.error(error.message));
  }, [load]);

  async function setVisibility(action: 'hide' | 'restore') {
    if (action === 'hide' && !note.trim()) {
      toast.error(isZh ? '隐藏主页需要填写原因。' : 'Enter a hide reason.');
      return;
    }
    setBusy(true);
    try {
      const payload = await fetch(
        `/api/admin/community/profiles/${profileId}/visibility`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, note }),
        }
      ).then((response) => response.json());
      if (payload.code !== 0) throw new Error(payload.message);
      toast.success(
        isZh ? '主页可见性已更新。' : 'Profile visibility updated.'
      );
      setNote('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'REQUEST_FAILED');
    } finally {
      setBusy(false);
    }
  }

  if (!row) {
    return (
      <main className="text-muted-foreground p-8 text-sm">
        {isZh ? '正在加载……' : 'Loading...'}
      </main>
    );
  }

  const activeRevision =
    row.revisions.find(
      (revision) => revision.id === row.profile.pendingRevisionId
    ) ||
    row.revisions.find(
      (revision) => revision.id === row.profile.currentPublishedRevisionId
    ) ||
    row.revisions[0];
  const websiteUrl = getSafeHttpsUrl(activeRevision?.websiteUrl);
  const socialLinks = Array.isArray(activeRevision?.socialLinks)
    ? (activeRevision.socialLinks as Array<{ label?: string; url?: string }>)
        .map((link) => ({
          label: link.label,
          url: getSafeHttpsUrl(link.url),
        }))
        .filter((link): link is { label: string | undefined; url: string } =>
          Boolean(link.url)
        )
    : [];
  const works = Array.isArray(activeRevision?.works)
    ? (
        activeRevision.works as Array<{
          title?: string;
          description?: string;
          url?: string;
        }>
      ).map((work) => ({
        title: work.title,
        description: work.description,
        url: getSafeHttpsUrl(work.url),
      }))
    : [];
  const focusAreas = Array.isArray(activeRevision?.focusAreas)
    ? activeRevision.focusAreas.map(String).filter(Boolean)
    : [];

  return (
    <main className="p-6 md:p-8">
      <Link
        href="/admin/community/profiles"
        className="text-muted-foreground text-sm"
      >
        {isZh ? '返回作者主页列表' : 'Back to creator profiles'}
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{row.profile.displayName}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            @{row.profile.username} · {row.account.name} · {row.account.email}
          </p>
        </div>
        <div className="flex gap-2">
          {row.profile.isHidden ? (
            <Badge variant="destructive">{isZh ? '已隐藏' : 'Hidden'}</Badge>
          ) : null}
          <Badge variant="outline">{row.profile.moderationStatus}</Badge>
        </div>
      </div>

      <section className="mt-8 grid gap-5 rounded-xl border p-5">
        <div className="flex flex-wrap gap-3">
          {row.profile.currentPublishedRevisionId ? (
            <Link
              href={`/u/${row.profile.username}`}
              target="_blank"
              className="text-primary text-sm font-medium"
            >
              {isZh ? '查看公开主页' : 'View public profile'}
            </Link>
          ) : null}
          {activeRevision?.moderationReviewId ? (
            <Link
              href={`/admin/community/moderation?review=${activeRevision.moderationReviewId}`}
              className="text-primary text-sm font-medium"
            >
              {isZh ? '打开审核队列' : 'Open moderation queue'}
            </Link>
          ) : null}
        </div>
        {activeRevision ? (
          <div className="grid gap-3 text-sm">
            <p>
              {isZh ? '当前检查版本' : 'Revision'}：v{activeRevision.version} ·{' '}
              {activeRevision.moderationStatus}
            </p>
            {activeRevision.headline ? <p>{activeRevision.headline}</p> : null}
            {focusAreas.length ? (
              <p>
                {isZh ? '关注方向' : 'Focus areas'}：{focusAreas.join(' · ')}
              </p>
            ) : null}
            {works.length ? (
              <div>
                <h2 className="font-semibold">{isZh ? '作品' : 'Works'}</h2>
                <div className="mt-2 grid gap-2">
                  {works.map((work, index) => (
                    <div
                      key={`${work.title}-${index}`}
                      className="rounded-lg border p-3"
                    >
                      <p>
                        {work.title || (isZh ? '未命名作品' : 'Untitled work')}
                      </p>
                      {work.description ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {work.description}
                        </p>
                      ) : null}
                      {work.url ? (
                        <a
                          href={work.url}
                          target="_blank"
                          rel="ugc nofollow noopener noreferrer"
                          className="text-primary mt-2 inline-block"
                        >
                          {isZh ? '检查作品链接' : 'Inspect work link'}：
                          {work.url}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <h2 className="font-semibold">
                {isZh ? '外部链接检查' : 'External link inspection'}
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                {isZh
                  ? '这些链接来自用户内容。请在审核时检查目标网站。'
                  : 'These links are user-generated. Inspect their destinations during review.'}
              </p>
              <div className="mt-3 flex flex-col items-start gap-2">
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="ugc nofollow noopener noreferrer"
                    className="text-primary"
                  >
                    {isZh ? '个人网站' : 'Personal website'}：{websiteUrl}
                  </a>
                ) : null}
                {socialLinks.map((link, index) => (
                  <a
                    key={`${link.url}-${index}`}
                    href={link.url}
                    target="_blank"
                    rel="ugc nofollow noopener noreferrer"
                    className="text-primary"
                  >
                    {link.label || (isZh ? '社交链接' : 'Social link')}：
                    {link.url}
                  </a>
                ))}
                {!websiteUrl && socialLinks.length === 0 ? (
                  <p className="text-muted-foreground">
                    {isZh ? '这个版本没有外部链接。' : 'No external links.'}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-4 rounded-xl border p-5">
        <h2 className="font-semibold">
          {isZh ? '主页可见性' : 'Profile visibility'}
        </h2>
        {row.profile.hiddenReason ? (
          <p className="text-muted-foreground text-sm">
            {isZh ? '当前隐藏原因' : 'Current hide reason'}：
            {row.profile.hiddenReason}
          </p>
        ) : null}
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={isZh ? '管理员处理说明' : 'Administrative note'}
        />
        <div className="flex gap-3">
          {row.profile.isHidden ? (
            <Button
              disabled={busy}
              onClick={() => void setVisibility('restore')}
            >
              {isZh ? '恢复公开' : 'Restore'}
            </Button>
          ) : (
            <Button
              disabled={busy}
              variant="destructive"
              onClick={() => void setVisibility('hide')}
            >
              {isZh ? '隐藏主页' : 'Hide profile'}
            </Button>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border p-5">
        <h2 className="font-semibold">
          {isZh ? '版本记录' : 'Revision history'}
        </h2>
        <div className="mt-4 space-y-3">
          {row.revisions.map((revision) => (
            <div
              key={revision.id}
              className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg p-3 text-sm"
            >
              <span>
                v{revision.version} · {revision.displayName}
              </span>
              <Badge variant="outline">{revision.moderationStatus}</Badge>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
