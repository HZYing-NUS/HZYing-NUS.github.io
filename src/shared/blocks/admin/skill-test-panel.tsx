'use client';

import { useState } from 'react';
import { CheckCircle2Icon, FlaskConicalIcon, Loader2Icon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

export function SkillTestPanel({
  versionId,
  isZh,
}: {
  versionId: string;
  isZh: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    name: string;
    version: number;
    versionId: string;
    system: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const test = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/skills/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillVersionId: versionId,
          locale: isZh ? 'zh' : 'en',
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'SKILL_TEST_FAILED');
      }
      setResult(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SKILL_TEST_FAILED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-border/70 bg-muted/20 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {isZh ? '运行时加载测试' : 'Runtime loading test'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {isZh
              ? '读取聊天请求实际会加载的内容，不调用模型，不消耗 Credit。'
              : 'Reads the exact content a chat request would load. No model call or Credit usage.'}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={test}>
          {loading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <FlaskConicalIcon className="size-4" />
          )}
          {isZh ? '测试加载' : 'Test loading'}
        </Button>
      </div>
      {result ? (
        <div className="mt-4 space-y-3">
          <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" />
            {isZh
              ? `已成功加载：${result.name}，版本 ${result.version}`
              : `Loaded successfully: ${result.name}, version ${result.version}`}
          </p>
          <pre className="bg-background max-h-72 overflow-auto rounded-lg border p-3 text-xs leading-5 whitespace-pre-wrap">
            {result.system}
          </pre>
        </div>
      ) : null}
      {error ? (
        <p className="text-destructive mt-3 text-sm" role="alert">
          {isZh ? `加载失败：${error}` : `Loading failed: ${error}`}
        </p>
      ) : null}
    </div>
  );
}
