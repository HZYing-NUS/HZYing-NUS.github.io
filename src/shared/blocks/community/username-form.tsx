'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

export function CommunityUsernameForm({
  current,
  isZh,
}: {
  current: string;
  isZh: boolean;
}) {
  const [username, setUsername] = useState(current);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const payload = await fetch('/api/community/me/profile/username', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username }),
      }).then((response) => response.json());
      if (payload.code !== 0) throw new Error(payload.message);
      toast.success(
        isZh
          ? '用户名已更新，旧地址将永久重定向。'
          : 'Username updated. The old URL now redirects permanently.'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'REQUEST_FAILED');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 rounded-xl border p-5">
      <div>
        <h2 className="font-semibold">
          {isZh ? '公开用户名' : 'Public username'}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {isZh
            ? '每 90 天最多修改一次；历史用户名永久保留。'
            : 'Change at most once every 90 days. Previous usernames remain reserved.'}
        </p>
      </div>
      <div className="flex gap-3">
        <Input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <Button
          disabled={busy || username === current}
          onClick={() => void save()}
        >
          {isZh ? '更新' : 'Update'}
        </Button>
      </div>
    </div>
  );
}
