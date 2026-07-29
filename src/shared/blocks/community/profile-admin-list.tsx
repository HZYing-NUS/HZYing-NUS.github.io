'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

type Row = {
  profile: {
    id: string;
    username: string;
    displayName: string;
    moderationStatus: string;
    isHidden: boolean;
    updatedAt: string;
  };
  account: { name: string; email: string };
};

const statuses = [
  '',
  'draft',
  'pending',
  'moderation_pending',
  'published',
  'pending_admin',
  'blocked',
  'failed',
];

export function CommunityAdminProfileList({
  isZh,
  initialQuery,
}: {
  isZh: boolean;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextQuery: string, nextStatus: string) => {
    setLoading(true);
    try {
      const search = new URLSearchParams();
      if (nextQuery.trim()) search.set('query', nextQuery.trim());
      if (nextStatus) search.set('status', nextStatus);
      const payload = await fetch(
        `/api/admin/community/profiles?${search.toString()}`
      ).then((response) => response.json());
      if (payload.code !== 0) throw new Error(payload.message);
      setRows(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'REQUEST_FAILED');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initialQuery, '');
  }, [initialQuery, load]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    void load(query, status);
  };

  return (
    <main className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold">
        {isZh ? '作者主页管理' : 'Creator profile management'}
      </h1>
      <p className="text-muted-foreground mt-2">
        {isZh
          ? '搜索作者主页，检查审核状态、外部链接，并执行隐藏或恢复。'
          : 'Search creator profiles, inspect moderation and external links, and hide or restore profiles.'}
      </p>
      <form
        onSubmit={search}
        className="mt-8 grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_15rem_auto]"
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            isZh ? '用户名称、邮箱或公开用户名' : 'User, email, or username'
          }
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value || (isZh ? '全部审核状态' : 'All moderation statuses')}
            </option>
          ))}
        </select>
        <Button>{isZh ? '搜索' : 'Search'}</Button>
      </form>
      <div className="mt-6 space-y-3">
        {rows.map(({ profile, account }) => (
          <Link
            key={profile.id}
            href={`/admin/community/profiles/${profile.id}`}
            className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5"
          >
            <div>
              <p className="font-medium">{profile.displayName}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                @{profile.username} · {account.name} · {account.email}
              </p>
            </div>
            <div className="flex gap-2">
              {profile.isHidden ? (
                <Badge variant="destructive">
                  {isZh ? '已隐藏' : 'Hidden'}
                </Badge>
              ) : null}
              <Badge variant="outline">{profile.moderationStatus}</Badge>
            </div>
          </Link>
        ))}
        {!loading && rows.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center">
            {isZh ? '没有匹配的作者主页。' : 'No matching creator profiles.'}
          </div>
        ) : null}
        {loading ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {isZh ? '正在加载……' : 'Loading...'}
          </p>
        ) : null}
      </div>
    </main>
  );
}
