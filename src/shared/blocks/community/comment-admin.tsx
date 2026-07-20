'use client';

import { useCallback, useEffect, useState } from 'react';

export function CommunityCommentAdmin({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [rows, setRows] = useState<any>({ comments: [], reports: [] });
  const load = useCallback(async () => {
    const result = await fetch('/api/admin/community/comments').then(
      (response) => response.json()
    );
    if (result.code === 0) setRows(result.data);
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const action = async (id: string, value: string) => {
    await fetch(`/api/admin/community/comments/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: value }),
    });
    await load();
  };
  const reportAction = async (id: string, value: 'resolve' | 'dismiss') => {
    const note = window.prompt(
      zh ? '处理说明（可选）' : 'Resolution note (optional)'
    );
    await fetch(`/api/admin/community/comments/reports/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: value, note }),
    });
    await load();
  };
  const profileAction = async (id: string, value: 'hide' | 'restore') => {
    const note = window.prompt(
      zh ? '治理说明（可选）' : 'Governance note (optional)'
    );
    await fetch(`/api/admin/community/profiles/${id}/visibility`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: value, note }),
    });
    await load();
  };
  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        {zh
          ? `待处理举报：${rows.reports.length}`
          : `Pending reports: ${rows.reports.length}`}
      </p>
      <section>
        <h2 className="text-xl font-semibold">{zh ? '举报处理' : 'Reports'}</h2>
        <div className="mt-3 space-y-3">
          {rows.reports.map((report: any) => (
            <div key={report.id} className="rounded-xl border p-4">
              <p className="font-medium">
                {report.objectType} · {report.reasonType} · {report.status}
              </p>
              {report.description && (
                <p className="text-muted-foreground mt-2 text-sm">
                  {report.description}
                </p>
              )}
              {['pending', 'reviewing'].includes(report.status) && (
                <div className="mt-3 flex gap-3 text-sm">
                  <button
                    onClick={() => void reportAction(report.id, 'resolve')}
                  >
                    {zh ? '确认违规并隐藏' : 'Resolve and hide'}
                  </button>
                  <button
                    onClick={() => void reportAction(report.id, 'dismiss')}
                  >
                    {zh ? '驳回举报' : 'Dismiss'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <div className="space-y-3">
        {rows.comments.map((row: any) => (
          <div key={row.comment.id} className="rounded-xl border p-4">
            <p className="text-sm font-medium">
              @{row.username || row.comment.userId} · /{row.articleSlug}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{row.comment.content}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              {row.comment.status}
            </p>
            <div className="mt-3 flex gap-3 text-sm">
              {['published', 'reported'].includes(row.comment.status) && (
                <button onClick={() => void action(row.comment.id, 'hide')}>
                  {zh ? '管理员隐藏' : 'Hide'}
                </button>
              )}
              {row.comment.status === 'hidden' && (
                <button onClick={() => void action(row.comment.id, 'restore')}>
                  {zh ? '重新审核并恢复' : 'Re-moderate and restore'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <section className="space-y-6 border-t pt-8">
        <h2 className="text-xl font-semibold">
          {zh
            ? '隐私与互动治理（只读）'
            : 'Privacy and interaction governance (read-only)'}
        </h2>
        <GovernanceGroup
          title={zh ? '隐私设置' : 'Privacy settings'}
          rows={rows.governance?.privacy || []}
          renderAction={(row) => (
            <button
              onClick={() =>
                void profileAction(
                  row.profileId,
                  row.isHidden ? 'restore' : 'hide'
                )
              }
              className="mt-2 text-xs underline"
            >
              {row.isHidden
                ? zh
                  ? '恢复资料'
                  : 'Restore profile'
                : zh
                  ? '隐藏资料'
                  : 'Hide profile'}
            </button>
          )}
        />
        <GovernanceGroup
          title={zh ? '全部关注关系' : 'All follow relationships'}
          rows={rows.governance?.relationships || []}
        />
        <GovernanceGroup
          title={zh ? '私密内容夹' : 'Private lists'}
          rows={rows.governance?.privateLists || []}
        />
        <GovernanceGroup
          title={zh ? '全部点赞' : 'All likes'}
          rows={rows.governance?.likes || []}
        />
        <GovernanceGroup
          title={zh ? '全部收藏' : 'All bookmarks'}
          rows={rows.governance?.bookmarks || []}
        />
      </section>
    </div>
  );
}

function GovernanceGroup({
  title,
  rows,
  renderAction,
}: {
  title: string;
  rows: any[];
  renderAction?: (row: any) => React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-medium">{title}</h3>
      <div className="mt-2 max-h-72 space-y-2 overflow-auto">
        {rows.map((row, index) => (
          <div key={`${title}-${index}`} className="bg-muted rounded-lg p-3">
            <pre className="overflow-auto text-xs">
              {JSON.stringify(row, null, 2)}
            </pre>
            {renderAction?.(row)}
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-muted-foreground text-sm">No records.</p>
        )}
      </div>
    </div>
  );
}
