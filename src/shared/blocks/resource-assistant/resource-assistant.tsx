'use client';

import { useState } from 'react';

type Source = { title: string; url: string; type: string };

export function ResourceAssistant({ locale }: { locale: string }) {
  const isZh = locale === 'zh';
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function ask() {
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer('');
    setSources([]);
    setError('');
    try {
      const response = await fetch('/api/resource-assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, locale }),
      });
      const sourceHeader = response.headers.get('x-resource-sources');
      if (sourceHeader) setSources(JSON.parse(sourceHeader));
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Assistant request failed');
      }
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setAnswer(content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isZh ? '请求失败。' : 'Request failed.'));
    } finally {
      setLoading(false);
    }
  }

  return <div className="mt-10 rounded-3xl border bg-background p-6 md:p-8"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={isZh ? '例如：我想在两周内做一个 AI SaaS 落地页，该用哪些资源？' : 'For example: Which resources should I use to build an AI SaaS landing page in two weeks?'} rows={5} className="block w-full rounded-2xl border bg-background px-4 py-3 text-sm" /><button onClick={ask} disabled={loading || !question.trim()} className="bg-primary text-primary-foreground mt-4 rounded-xl px-5 py-3 text-sm font-medium disabled:opacity-60">{loading ? (isZh ? '检索中...' : 'Searching...') : (isZh ? '获取建议' : 'Get recommendations')}</button>{error ? <p className="text-destructive mt-4 text-sm">{error}</p> : null}{answer ? <div className="mt-7 border-t pt-6"><p className="whitespace-pre-wrap text-sm leading-7">{answer}</p>{sources.length ? <div className="mt-6"><p className="text-sm font-medium">{isZh ? '站内来源' : 'Site sources'}</p><ul className="mt-3 space-y-2">{sources.map((source) => <li key={source.url}><a href={source.url} className="text-primary text-sm hover:underline">{source.title} <span className="text-muted-foreground">({source.type})</span></a></li>)}</ul></div> : null}</div> : null}</div>;
}
