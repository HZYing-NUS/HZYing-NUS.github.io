'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type ProfileForm = {
  displayName: string;
  avatarUrl: string;
  headline: string;
  aboutZh: string;
  aboutEn: string;
  experience: string;
  skills: string;
  region: string;
  websiteUrl: string;
  socialLinks: string;
};

const empty: ProfileForm = {
  displayName: '',
  avatarUrl: '',
  headline: '',
  aboutZh: '',
  aboutEn: '',
  experience: '[]',
  skills: '',
  region: '',
  websiteUrl: '',
  socialLinks: '[]',
};

export function CommunityProfileEditor({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('draft');
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [review, setReview] = useState<any>(null);
  const [appeal, setAppeal] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await fetch('/api/community/me/profile').then((response) =>
      response.json()
    );
    if (result.code !== 0) return;
    const row = result.data;
    const source = row.revision || row.profile || {};
    setForm({
      displayName: source.displayName || '',
      avatarUrl: source.avatarUrl || '',
      headline: source.headline || '',
      aboutZh: source.aboutZh || '',
      aboutEn: source.aboutEn || '',
      experience: JSON.stringify(source.experience || [], null, 2),
      skills: Array.isArray(source.skills) ? source.skills.join(', ') : '',
      region: source.region || '',
      websiteUrl: source.websiteUrl || '',
      socialLinks: JSON.stringify(source.socialLinks || [], null, 2),
    });
    setStatus(
      source.moderationStatus || row.profile.moderationStatus || 'draft'
    );
    setReviewId(source.moderationReviewId || null);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    if (!reviewId) return;
    void fetch(`/api/community/me/moderation/${reviewId}`)
      .then((response) => response.json())
      .then((result) => result.code === 0 && setReview(result.data));
  }, [reviewId]);

  const payload = () => ({
    ...form,
    experience: JSON.parse(form.experience || '[]'),
    skills: form.skills
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    socialLinks: JSON.parse(form.socialLinks || '[]'),
  });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await fetch('/api/community/me/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload()),
      }).then((response) => response.json());
      setMessage(
        result.code === 0
          ? zh
            ? '资料草稿已保存。'
            : 'Profile draft saved.'
          : result.message
      );
      if (result.code === 0) await load();
    } catch {
      setMessage(zh ? 'JSON 格式无效。' : 'Invalid JSON format.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    const result = await fetch('/api/community/me/profile', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
      },
      body: '{}',
    }).then((response) => response.json());
    setMessage(
      result.code === 0
        ? zh
          ? '资料已提交审核。'
          : 'Profile submitted for moderation.'
        : result.message
    );
    if (result.code === 0) await load();
    setBusy(false);
  };

  const submitAppeal = async () => {
    if (!reviewId || !appeal.trim()) return;
    const result = await fetch(
      `/api/community/me/moderation/${reviewId}/appeal`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ statement: appeal }),
      }
    ).then((response) => response.json());
    setMessage(
      result.code === 0
        ? zh
          ? '申诉已提交。'
          : 'Appeal submitted.'
        : result.message
    );
    if (result.code === 0) setAppeal('');
  };

  const field = (key: keyof ProfileForm, label: string, multiline = false) => (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      {multiline ? (
        <textarea
          value={form[key]}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          className="min-h-28 rounded-xl border bg-transparent p-3"
        />
      ) : (
        <input
          value={form[key]}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          className="rounded-xl border bg-transparent p-3"
        />
      )}
    </label>
  );

  return (
    <form onSubmit={save} className="grid gap-5">
      <p className="text-muted-foreground text-sm">
        {zh ? '当前状态' : 'Current status'}：{status}
      </p>
      {field('displayName', zh ? '公开名称' : 'Display name')}
      {field('avatarUrl', zh ? '头像 URL' : 'Avatar URL')}
      {field('headline', zh ? '一句话介绍' : 'Headline')}
      {field('aboutZh', '中文 About', true)}
      {field('aboutEn', 'English About', true)}
      {field(
        'experience',
        zh ? '经历 JSON 数组' : 'Experience JSON array',
        true
      )}
      {field('skills', zh ? '技能（逗号分隔）' : 'Skills (comma separated)')}
      {field('region', zh ? '地区' : 'Region')}
      {field('websiteUrl', zh ? '网站 URL' : 'Website URL')}
      {field(
        'socialLinks',
        zh ? '社交链接 JSON 数组' : 'Social links JSON array',
        true
      )}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} className="rounded-lg border px-4 py-2">
          {zh ? '保存草稿' : 'Save draft'}
        </button>
        <button
          disabled={busy}
          type="button"
          onClick={() => void submit()}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2"
        >
          {zh ? '提交审核' : 'Submit for review'}
        </button>
      </div>
      {review?.review && (
        <div className="rounded-xl border p-4 text-sm">
          <p>
            {zh ? '审核结果' : 'Moderation result'}：
            {review.review.policyDecision || review.review.status}
          </p>
          {review.review.reason && (
            <p className="mt-2">{review.review.reason}</p>
          )}
          {review.review.policyDecision === 'blocked' && !review.appeal && (
            <div className="mt-4 grid gap-3">
              <textarea
                value={appeal}
                onChange={(event) => setAppeal(event.target.value)}
                placeholder={
                  zh
                    ? '说明为什么这是误判。'
                    : 'Explain why this is a false positive.'
                }
                className="rounded-lg border bg-transparent p-3"
              />
              <button
                type="button"
                onClick={() => void submitAppeal()}
                className="rounded-lg border px-4 py-2"
              >
                {zh ? '提交一次申诉' : 'Submit one appeal'}
              </button>
            </div>
          )}
        </div>
      )}
      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}
