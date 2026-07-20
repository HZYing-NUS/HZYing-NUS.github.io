'use client';

import { useState } from 'react';

const reportReasons = [
  'spam_scam',
  'harassment_hate',
  'illegal_dangerous',
  'privacy_exposure',
  'sexual_content',
  'impersonation',
  'other',
] as const;

export function CommunityProfileReportButton({
  profileId,
  locale,
}: {
  profileId: string;
  locale: string;
}) {
  const zh = locale === 'zh';
  const [open, setOpen] = useState(false);
  const [reasonType, setReasonType] = useState('spam_scam');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const result = await fetch('/api/community/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        objectType: 'profile',
        objectId: profileId,
        reasonType,
        description,
      }),
    }).then((response) => response.json());
    setMessage(
      result.code === 0
        ? zh
          ? '举报已提交，平台管理员将进行处理。'
          : 'Report submitted for administrator review.'
        : result.message
    );
    if (result.code === 0) setOpen(false);
    setBusy(false);
  };
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        {zh ? '举报此资料' : 'Report this profile'}
      </button>
      {open && (
        <div className="mt-3 grid max-w-md gap-3 rounded-xl border p-4">
          <select
            value={reasonType}
            onChange={(event) => setReasonType(event.target.value)}
            className="rounded-lg border bg-transparent p-2 text-sm"
          >
            {reportReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            placeholder={
              zh ? '补充说明（可选）' : 'Additional details (optional)'
            }
            className="min-h-24 rounded-lg border bg-transparent p-3 text-sm"
          />
          <button
            disabled={busy}
            type="button"
            onClick={() => void submit()}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm"
          >
            {zh ? '提交举报' : 'Submit report'}
          </button>
        </div>
      )}
      {message && <p className="mt-2 text-xs">{message}</p>}
    </div>
  );
}
