'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';

type Queue = {
  reviews: Review[];
  appeals: Array<{ appeal: { id: string; statement: string }; review: Review }>;
};
type Review = {
  id: string;
  objectType: string;
  objectId: string;
  status: string;
  policyDecision: string | null;
  riskLevel: string | null;
  categories: unknown;
  evidence: unknown;
  reason: string | null;
  modelId: string | null;
  actualModelId: string | null;
  promptVersion: string;
  ruleVersion: string;
  normalizedContent: unknown;
  deterministicFindings: unknown;
  usage: unknown;
  internalCostUsd: string | null;
};

export function CommunityModerationAdmin({ isZh }: { isZh: boolean }) {
  const [queue, setQueue] = useState<Queue>({ reviews: [], appeals: [] });
  const [selected, setSelected] = useState<Review | null>(null);
  const [note, setNote] = useState('');
  async function load() {
    const payload = await fetch('/api/admin/community/moderation').then(
      (response) => response.json()
    );
    if (payload.code !== 0) throw new Error(payload.message);
    setQueue(payload.data);
  }
  useEffect(() => {
    void fetch('/api/admin/community/moderation')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.code !== 0) throw new Error(payload.message);
        setQueue(payload.data);
      })
      .catch((error) => toast.error(error.message));
  }, []);
  async function act(action: string) {
    if (!selected || !note.trim())
      return toast.error(isZh ? '请填写复核说明。' : 'Enter a review note.');
    const payload = await fetch(
      `/api/admin/community/moderation/${selected.id}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, note }),
      }
    ).then((response) => response.json());
    if (payload.code !== 0) return toast.error(payload.message);
    toast.success(isZh ? '复核已保存。' : 'Review saved.');
    setSelected(null);
    setNote('');
    await load();
  }
  async function appeal(id: string, action: string) {
    if (!note.trim())
      return toast.error(isZh ? '请填写复核说明。' : 'Enter a review note.');
    const payload = await fetch(
      `/api/admin/community/moderation/appeals/${id}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, note }),
      }
    ).then((response) => response.json());
    if (payload.code !== 0) return toast.error(payload.message);
    await load();
  }
  return (
    <main className="p-6 md:p-8">
      <h1 className="text-2xl font-semibold">
        {isZh ? '内容审核队列' : 'Moderation queue'}
      </h1>
      <p className="text-muted-foreground mt-2">
        {isZh
          ? '人工复核中风险、阻断和审核失败内容。'
          : 'Review medium-risk, blocked, and failed moderation results.'}
      </p>
      <div className="mt-8 grid gap-6 xl:grid-cols-[22rem_1fr]">
        <section className="space-y-3">
          {queue.reviews.map((review) => (
            <button
              key={review.id}
              onClick={() => setSelected(review)}
              className="w-full rounded-xl border p-4 text-left"
            >
              <p className="font-medium">
                {review.objectType} · {review.riskLevel || review.status}
              </p>
              <p className="text-muted-foreground mt-1 truncate text-xs">
                {review.objectId}
              </p>
            </button>
          ))}
          <h2 className="pt-5 font-semibold">
            {isZh ? '待处理申诉' : 'Pending appeals'}
          </h2>
          {queue.appeals.map(({ appeal: item, review }) => (
            <div key={item.id} className="rounded-xl border p-4">
              <p className="text-sm">{item.statement}</p>
              <button
                className="text-primary mt-2 text-xs"
                onClick={() => setSelected(review)}
              >
                {isZh ? '查看审核结果' : 'View review'}
              </button>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => void appeal(item.id, 'confirmed_violation')}
                >
                  {isZh ? '确认违规' : 'Confirm'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void appeal(item.id, 'false_positive_recheck')}
                >
                  {isZh ? '误判重审' : 'Recheck'}
                </Button>
              </div>
            </div>
          ))}
        </section>
        <section className="rounded-xl border p-5">
          {selected ? (
            <div className="space-y-4">
              <h2 className="font-semibold">
                {selected.objectType} · {selected.riskLevel}
              </h2>
              <pre className="bg-muted max-h-60 overflow-auto rounded-lg p-3 text-xs whitespace-pre-wrap">
                {JSON.stringify(selected.normalizedContent, null, 2)}
              </pre>
              <p className="text-sm">{selected.reason}</p>
              <pre className="bg-muted rounded-lg p-3 text-xs whitespace-pre-wrap">
                {JSON.stringify(
                  {
                    categories: selected.categories,
                    deterministicFindings: selected.deterministicFindings,
                    evidence: selected.evidence,
                    modelId: selected.modelId,
                    actualModelId: selected.actualModelId,
                    promptVersion: selected.promptVersion,
                    ruleVersion: selected.ruleVersion,
                    usage: selected.usage,
                    internalCostUsd: selected.internalCostUsd,
                  },
                  null,
                  2
                )}
              </pre>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={isZh ? '人工复核说明' : 'Manual review note'}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void act('allow')}>
                  {isZh ? '允许' : 'Allow'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void act('blocked')}
                >
                  {isZh ? '阻断' : 'Block'}
                </Button>
                <Button variant="outline" onClick={() => void act('recheck')}>
                  {isZh ? '重新审核' : 'Recheck'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              {isZh ? '选择一条审核记录。' : 'Select a moderation review.'}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
