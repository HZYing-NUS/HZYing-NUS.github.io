'use client';

import { useState } from 'react';

const types = [
  { value: 'resource', zh: '资源推荐', en: 'Resource recommendation' },
  { value: 'article', zh: '文章建议', en: 'Article suggestion' },
  { value: 'collection', zh: '专题建议', en: 'Collection suggestion' },
  { value: 'correction', zh: '纠错反馈', en: 'Correction' },
  { value: 'supplement', zh: '补充信息', en: 'Supplement' },
];

export function SubmissionForm({ locale }: { locale: string }) {
  const isZh = locale === 'zh';
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(formData: FormData) {
    setState('submitting');
    setMessage('');
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result = await response.json();
      if (!response.ok || result.code !== 0) throw new Error(result.message || 'Submission failed');
      setState('success');
      setMessage(isZh ? '已提交，感谢你的贡献。' : 'Submitted. Thank you for contributing.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : (isZh ? '提交失败，请稍后重试。' : 'Submission failed. Please try again.'));
    }
  }

  return (
    <form action={submit} className="mt-10 space-y-5 rounded-3xl border bg-background p-6 md:p-8">
      <label className="block text-sm font-medium">{isZh ? '投稿类型' : 'Suggestion type'}<select name="type" defaultValue="resource" className="mt-2 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm">{types.map((type) => <option key={type.value} value={type.value}>{isZh ? type.zh : type.en}</option>)}</select></label>
      <label className="block text-sm font-medium">{isZh ? '标题' : 'Title'}<input required name="title" className="mt-2 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
      <label className="block text-sm font-medium">{isZh ? '链接（可选）' : 'URL (optional)'}<input name="url" type="url" className="mt-2 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
      <label className="block text-sm font-medium">{isZh ? '说明 / 推荐理由' : 'Description / reason'}<textarea required name="description" rows={6} className="mt-2 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
      <label className="block text-sm font-medium">{isZh ? '建议标签（可选，逗号分隔）' : 'Suggested tags (optional, comma-separated)'}<input name="suggestedTags" className="mt-2 block w-full rounded-xl border bg-background px-3 py-2.5 text-sm" /></label>
      <button disabled={state === 'submitting' || state === 'success'} className="bg-primary text-primary-foreground rounded-xl px-5 py-3 text-sm font-medium disabled:opacity-60">{state === 'submitting' ? (isZh ? '提交中...' : 'Submitting...') : (isZh ? '提交建议' : 'Submit suggestion')}</button>
      {message ? <p className={state === 'error' ? 'text-destructive text-sm' : 'text-sm text-emerald-600'}>{message}</p> : null}
    </form>
  );
}
