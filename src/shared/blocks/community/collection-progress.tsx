'use client';

import { useState } from 'react';
import { Check, Loader2, LogIn } from 'lucide-react';

import { useAppContext } from '@/shared/contexts/app';
import { calculateCollectionProgress } from '@/shared/services/collection-progress-policy';

export function CollectionProgress({
  collectionId,
  callbackUrl,
  steps,
  initialCompletedResourceIds,
  locale,
}: {
  collectionId: string;
  callbackUrl: string;
  steps: Array<{ resourceId: string; title: string; name: string }>;
  initialCompletedResourceIds: string[];
  locale: string;
}) {
  const isZh = locale === 'zh';
  const { user, setIsShowSignModal, setSignCallbackUrl } = useAppContext();
  const [completedResourceIds, setCompletedResourceIds] = useState(
    () => new Set(initialCompletedResourceIds)
  );
  const [pendingResourceId, setPendingResourceId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState('');
  const progress = calculateCollectionProgress(
    completedResourceIds.size,
    steps.length
  );

  const requestSignIn = () => {
    setSignCallbackUrl(callbackUrl);
    setIsShowSignModal(true);
  };

  const toggleStep = async (resourceId: string) => {
    if (!user) {
      requestSignIn();
      return;
    }
    const completed = !completedResourceIds.has(resourceId);
    setPendingResourceId(resourceId);
    setMessage('');
    try {
      const response = await fetch(
        `/api/collections/${collectionId}/progress`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceId, completed }),
        }
      );
      const payload = await response.json();
      if (!response.ok || payload.code !== 0) throw new Error('SAVE_FAILED');
      setCompletedResourceIds(
        new Set(payload.data.completedResourceIds as string[])
      );
    } catch {
      setMessage(
        isZh
          ? '进度保存失败，请稍后重试。'
          : 'Progress could not be saved. Try again.'
      );
    } finally {
      setPendingResourceId(null);
    }
  };

  return (
    <section className="bg-muted/20 mt-8 rounded-3xl border p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
            {isZh ? '执行进度' : 'Guide progress'}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {user
              ? isZh
                ? `已完成 ${progress.completedCount}／${progress.totalCount} 步`
                : `${progress.completedCount} of ${progress.totalCount} steps complete`
              : isZh
                ? '登录后逐步完成并保存进度'
                : 'Sign in to complete steps and save progress'}
          </h2>
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {progress.percentage}%
        </span>
      </div>
      <div
        className="bg-muted mt-4 h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percentage}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width]"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <div className="mt-6 grid gap-2">
        {steps.map((step, index) => {
          const completed = completedResourceIds.has(step.resourceId);
          const pending = pendingResourceId === step.resourceId;
          return (
            <button
              key={step.resourceId}
              type="button"
              onClick={() => void toggleStep(step.resourceId)}
              disabled={pending}
              aria-pressed={completed}
              className="bg-background hover:bg-muted/50 flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition disabled:cursor-wait disabled:opacity-70"
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs ${completed ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground'}`}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : completed ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : user ? (
                  String(index + 1).padStart(2, '0')
                ) : (
                  <LogIn className="size-3.5" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{step.title}</span>
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                  {step.name}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {message ? (
        <p className="text-destructive mt-4 text-sm" role="alert">
          {message}
        </p>
      ) : null}
    </section>
  );
}
