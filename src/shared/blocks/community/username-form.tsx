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
    <div className="bg-card space-y-4 rounded-2xl border p-5">
      <div>
        <h2 className="font-semibold">{isZh ? '主页地址' : 'Profile URL'}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {isZh
            ? '用户名会显示在主页地址中。每 90 天最多修改一次，旧地址会永久重定向到新地址。'
            : 'Your username appears in the profile URL. It can be changed once every 90 days, and old URLs permanently redirect.'}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="border-input bg-background flex min-w-0 flex-1 items-center rounded-md border">
          <span className="text-muted-foreground hidden border-r px-3 text-sm sm:block">
            /u/
          </span>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>
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
