'use client';

import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, locale }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Assistant request failed');
      }
      const result = await response.json();
      setAnswer(result.answer || '');
      setSources(result.sources || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isZh
            ? '请求失败。'
            : 'Request failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card border-border mt-10 rounded-xl border p-6 md:p-8">
      <Textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder={
          isZh
            ? '例如：我想在两周内做一个 AI SaaS 落地页，该用哪些资源？'
            : 'For example: Which resources should I use to build an AI SaaS landing page in two weeks?'
        }
        rows={5}
        className="min-h-32"
      />
      <Button
        onClick={ask}
        disabled={loading || !question.trim()}
        className="mt-4"
      >
        {loading
          ? isZh
            ? '检索中...'
            : 'Searching...'
          : isZh
            ? '获取建议'
            : 'Get recommendations'}
      </Button>
      {error ? <p className="text-destructive mt-4 text-sm">{error}</p> : null}
      {answer ? (
        <div className="border-border mt-7 border-t pt-6">
          <p className="text-sm leading-7 whitespace-pre-wrap">{answer}</p>
          {sources.length ? (
            <div className="mt-6">
              <p className="text-sm font-medium">
                {isZh ? '站内来源' : 'Site sources'}
              </p>
              <ul className="mt-3 space-y-2">
                {sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      className="text-primary text-sm hover:underline"
                    >
                      {source.title}{' '}
                      <span className="text-muted-foreground">
                        ({source.type})
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
