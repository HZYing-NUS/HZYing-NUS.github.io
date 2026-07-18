'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';

import { WorkspaceEmpty, WorkspaceShell } from './workspace-shell';

export function GlobalMemoriesWorkspace() {
  const t = useTranslations('ai.chat.workspace');
  const locale = useLocale();
  const { user, setIsShowSignModal } = useAppContext();
  const [items, setItems] = useState<any[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [content, setContent] = useState('');
  const load = useCallback(async () => {
    if (!user) return;
    const p = await fetch('/api/memories/global').then((r) => r.json());
    if (p.code === 0) {
      setItems(p.data.items);
      setEnabled(p.data.enabled);
    }
  }, [user]);
  useEffect(() => {
    const run = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(run);
  }, [load]);
  const create = async () => {
    if (!content.trim()) return;
    await fetch('/api/memories/global', {
      method: 'POST',
      body: JSON.stringify({ content, confirmed: true }),
    });
    setContent('');
    await load();
  };
  const update = async (id: string, patch: object) => {
    await fetch('/api/memories/global', {
      method: 'PATCH',
      body: JSON.stringify({ id, ...patch }),
    });
    await load();
  };
  const remove = async (id: string) => {
    await fetch(`/api/memories/global?id=${id}`, { method: 'DELETE' });
    await load();
  };
  const setMemoryEnabled = async (nextEnabled: boolean) => {
    await fetch('/api/memories/global', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: nextEnabled }),
    });
    setEnabled(nextEnabled);
  };
  return (
    <WorkspaceShell
      title={t('global_memory')}
      description={t('global_description')}
    >
      {!user ? (
        <WorkspaceEmpty>
          <button
            className="underline"
            onClick={() => setIsShowSignModal(true)}
          >
            {locale === 'zh' ? '登录后管理记忆' : 'Sign in to manage memory'}
          </button>
        </WorkspaceEmpty>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between border-y border-black/10 py-4 dark:border-white/10">
            <div>
              <Label htmlFor="global-memory-enabled">
                {locale === 'zh'
                  ? '在普通对话中使用全局记忆'
                  : 'Use global memory in chats'}
              </Label>
              <p className="text-muted-foreground mt-1 text-xs">
                {locale === 'zh'
                  ? '关闭后保留已有记忆，但不会加载到新的回答。'
                  : 'Existing memories are kept but excluded from new answers.'}
              </p>
            </div>
            <Switch
              id="global-memory-enabled"
              checked={enabled}
              onCheckedChange={setMemoryEnabled}
            />
          </div>
          <div className="mb-8 flex gap-2">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('new_memory')}
            />
            <Button onClick={create}>
              <Plus className="size-4" />
              {t('new_memory')}
            </Button>
          </div>
          <div className="dark:divide-border dark:border-border divide-y divide-black/10 border-y border-black/10">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-4 py-5">
                <div className="flex-1">
                  <Textarea
                    className="min-h-20 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                    defaultValue={item.content}
                    onBlur={(e) => update(item.id, { content: e.target.value })}
                  />
                  <p className="font-mono text-[10px] tracking-wider text-[#8c867c] uppercase">
                    {item.status === 'confirmed' ? 'Confirmed' : t('pending')}
                  </p>
                </div>
                {item.status !== 'confirmed' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => update(item.id, { confirmed: true })}
                  >
                    <Check className="size-4" />
                    {t('confirm')}
                  </Button>
                ) : null}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}

export function SkillsWorkspace() {
  const t = useTranslations('ai.chat.workspace');
  const locale = useLocale();
  const [skills, setSkills] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then((p) => p.code === 0 && setSkills(p.data));
  }, []);
  return (
    <WorkspaceShell title={t('skills')} description={t('skills_description')}>
      {skills.length === 0 ? (
        <WorkspaceEmpty>{t('skill_unavailable')}</WorkspaceEmpty>
      ) : (
        skills.map((skill) => (
          <article
            key={skill.id}
            className="dark:border-border grid gap-8 border-y border-black/15 py-8 md:grid-cols-[1fr_18rem]"
          >
            <div>
              <p className="mb-3 font-mono text-[10px] tracking-[.2em] text-[#a34e32] uppercase">
                Skill 01
              </p>
              <h2 className="text-2xl font-medium">{skill.name}</h2>
              <p className="dark:text-muted-foreground mt-3 max-w-2xl text-sm leading-7 text-[#68635b]">
                {skill.description}
              </p>
              <dl className="mt-7 grid gap-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium">
                    {locale === 'zh' ? '适合' : 'Suitable for'}
                  </dt>
                  <dd className="mt-2 text-[#6f6a61]">
                    {skill.suitableFor ||
                      (locale === 'zh'
                        ? '早期产品想法、MVP 和付费验证。'
                        : 'Early product ideas, MVP scope, and payment validation.')}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">
                    {locale === 'zh' ? '不适合' : 'Not suitable for'}
                  </dt>
                  <dd className="mt-2 text-[#6f6a61]">
                    {skill.unsuitableFor ||
                      (locale === 'zh'
                        ? '替代法律、财务或医疗专业判断。'
                        : 'Replacing legal, financial, or medical professionals.')}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="dark:border-border border-l border-black/10 pl-7">
              <p className="mb-5 text-sm leading-6 text-[#6f6a61]">
                {locale === 'zh'
                  ? '启用后创建新对话。一条对话最多启用一个 Skill。'
                  : 'Enabling this starts a new chat. Each chat can use at most one Skill.'}
              </p>
              <Button asChild>
                <Link href={`/chat?skill=${skill.slug}`}>
                  {t('skill_action')}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </article>
        ))
      )}
    </WorkspaceShell>
  );
}

export function CreditsWorkspace() {
  const t = useTranslations('ai.chat.workspace');
  const locale = useLocale();
  const { user, setIsShowSignModal } = useAppContext();
  const [activity, setActivity] = useState<any>(null);
  useEffect(() => {
    if (user)
      fetch('/api/credits/activity')
        .then((r) => r.json())
        .then((p) => p.code === 0 && setActivity(p.data));
  }, [user]);
  if (!user)
    return (
      <WorkspaceShell
        title={t('credits')}
        description={t('credits_description')}
      >
        <WorkspaceEmpty>
          <button
            className="underline"
            onClick={() => setIsShowSignModal(true)}
          >
            {locale === 'zh' ? '登录后查看 Credit' : 'Sign in to view Credit'}
          </button>
        </WorkspaceEmpty>
      </WorkspaceShell>
    );
  return (
    <WorkspaceShell title={t('credits')} description={t('credits_description')}>
      <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
        <aside>
          <p className="font-mono text-[10px] tracking-[.18em] text-[#777268] uppercase">
            {t('balance')}
          </p>
          <p className="mt-3 text-5xl font-semibold tracking-tight">
            {activity?.balance ?? '—'}
          </p>
          <p className="mt-8 border-l-2 border-[#c45d38] pl-4 text-sm leading-6">
            <strong>{t('packages_pending')}</strong>
            <br />
            <span className="text-[#6f6a61]">{t('packages_contact')}</span>
          </p>
        </aside>
        <section className="space-y-10">
          <Ledger
            title={t('reservations')}
            rows={activity?.reservations || []}
            valueKey="reservedCredits"
          />
          <Ledger
            title={t('ledger')}
            rows={activity?.ledger || []}
            valueKey="chargedCredits"
          />
        </section>
      </div>
    </WorkspaceShell>
  );
}

function Ledger({
  title,
  rows,
  valueKey,
}: {
  title: string;
  rows: any[];
  valueKey: string;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      <div className="dark:divide-border dark:border-border divide-y divide-black/10 border-y border-black/10 text-sm">
        {rows.length ? (
          rows.slice(0, 20).map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_auto_auto] gap-4 py-3"
            >
              <span>{row.status || row.entryType}</span>
              <span className="font-mono text-xs">
                {row[valueKey] ?? 0} Credit
              </span>
              <time className="text-[#777268]">
                {new Date(row.createdAt).toLocaleDateString()}
              </time>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-[#777268]">—</p>
        )}
      </div>
    </div>
  );
}
