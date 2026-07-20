'use client';

import { useCallback, useEffect, useState } from 'react';

export function CommunityEmailAdmin({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const result = await fetch('/api/admin/community/emails').then((response) =>
      response.json()
    );
    if (result.code === 0) setRows(result.data || []);
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const retry = async (id: string) => {
    const result = await fetch(`/api/admin/community/emails/${id}/retry`, {
      method: 'POST',
    }).then((response) => response.json());
    setMessage(
      result.code === 0
        ? zh
          ? '发送任务已重新入队。'
          : 'Delivery queued for retry.'
        : result.message
    );
    if (result.code === 0) await load();
  };
  return (
    <div className="space-y-4">
      {message && <p className="text-sm">{message}</p>}
      {rows.map((row) => (
        <div key={row.delivery.id} className="rounded-xl border p-4">
          <p className="font-medium">
            {row.delivery.emailType} · {row.delivery.status}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {row.name} · {row.email}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {row.delivery.idempotencyKey}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {zh ? '尝试次数' : 'Attempts'}: {row.delivery.attemptCount}
            {row.maxAttempts ? ` / ${row.maxAttempts}` : ''}
          </p>
          {row.delivery.providerMessageId && (
            <p className="text-muted-foreground mt-1 text-xs">
              Provider ID: {row.delivery.providerMessageId}
            </p>
          )}
          {row.delivery.error && (
            <p className="text-destructive mt-2 text-sm whitespace-pre-wrap">
              {row.delivery.error}
            </p>
          )}
          {row.delivery.status === 'failed' && (
            <button
              className="mt-3 rounded-lg border px-3 py-2 text-sm"
              onClick={() => void retry(row.delivery.id)}
            >
              {zh ? '重新发送' : 'Retry'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
