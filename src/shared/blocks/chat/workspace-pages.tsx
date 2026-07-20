'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Gift,
  LoaderCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

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
    fetch(`/api/skills?locale=${locale}`)
      .then((r) => r.json())
      .then((p) => p.code === 0 && setSkills(p.data));
  }, [locale]);
  return (
    <WorkspaceShell title={t('skills')} description={t('skills_description')}>
      {skills.length === 0 ? (
        <WorkspaceEmpty>{t('skill_unavailable')}</WorkspaceEmpty>
      ) : (
        skills.map((skill, index) => (
          <article
            key={skill.id}
            className="dark:border-border grid gap-8 border-y border-black/15 py-8 md:grid-cols-[1fr_18rem]"
          >
            <div>
              <p className="mb-3 font-mono text-[10px] tracking-[.2em] text-[#a34e32] uppercase">
                Skill {String(index + 1).padStart(2, '0')}
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
                  {locale === 'zh' ? `使用${skill.name}` : `Use ${skill.name}`}
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
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [referral, setReferral] = useState<ReferralOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutCode, setCheckoutCode] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!user) return;

    let active = true;
    setActivity(null);
    setPackages([]);
    setReferral(null);
    setLoading(true);
    setLoadFailed(false);

    Promise.all([
      fetch('/api/credits/activity').then((response) => response.json()),
      fetch(`/api/credits/packages?locale=${locale}`).then((response) =>
        response.json()
      ),
      fetch('/api/referrals/me').then((response) => response.json()),
    ])
      .then(([activityPayload, packagesPayload, referralPayload]) => {
        if (!active) return;
        if (activityPayload.code === 0) setActivity(activityPayload.data);
        if (packagesPayload.code === 0) {
          setPackages(packagesPayload.data.packages || []);
        }
        if (referralPayload.code === 0) setReferral(referralPayload.data);
        setLoadFailed(
          activityPayload.code !== 0 ||
            packagesPayload.code !== 0 ||
            referralPayload.code !== 0
        );
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [locale, user]);

  const checkout = async (creditPackage: CreditPackage) => {
    setCheckoutCode(creditPackage.code);
    try {
      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: creditPackage.code,
          payment_provider: 'creem',
          locale,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 0 || !payload.data?.checkoutUrl) {
        throw new Error(payload.message || t('checkout_failed'));
      }
      window.location.href = payload.data.checkoutUrl;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('checkout_failed')
      );
      setCheckoutCode(null);
    }
  };

  const copyInviteLink = async () => {
    if (!referral?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(referral.inviteUrl);
      toast.success(t('invite_copied'));
    } catch {
      toast.error(t('invite_copy_failed'));
    }
  };

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
      {loadFailed ? (
        <p className="mb-8 border-l-2 border-[#c45d38] pl-4 text-sm text-[#6f6a61] dark:text-[#b8b0a5]">
          {t('credits_load_failed')}
        </p>
      ) : null}
      <div className="grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="font-mono text-[10px] tracking-[.18em] text-[#777268] uppercase">
            {t('balance')}
          </p>
          <p className="mt-3 text-5xl font-semibold tracking-tight">
            {loading ? '…' : (activity?.balance ?? '—')}
          </p>
          <p className="mt-3 text-xs leading-5 text-[#777268] dark:text-[#aaa399]">
            {t('balance_description')}
          </p>
        </aside>
        <div className="min-w-0 space-y-14">
          <section>
            <div className="mb-5 flex items-end justify-between gap-5">
              <div>
                <p className="font-mono text-[10px] tracking-[.18em] text-[#a34e32] uppercase">
                  {t('one_time_purchase')}
                </p>
                <h2 className="mt-2 text-xl font-medium">
                  {t('credit_packages')}
                </h2>
              </div>
              <p className="hidden max-w-xs text-right text-xs leading-5 text-[#777268] sm:block dark:text-[#aaa399]">
                {t('package_note')}
              </p>
            </div>
            {loading ? (
              <div className="dark:border-border flex min-h-48 items-center justify-center border-y border-black/10">
                <LoaderCircle className="size-5 animate-spin text-[#777268]" />
              </div>
            ) : packages.length ? (
              <div className="grid gap-px overflow-hidden border border-black/15 bg-black/15 md:grid-cols-3 dark:border-white/15 dark:bg-white/15">
                {packages.map((creditPackage) => (
                  <article
                    key={creditPackage.code}
                    className={`relative flex min-h-64 flex-col bg-[#f5f1e8] p-6 dark:bg-[#171715] ${
                      creditPackage.recommended
                        ? 'shadow-[inset_0_3px_0_#c45d38]'
                        : ''
                    }`}
                  >
                    <div className="flex min-h-6 items-center justify-between gap-3">
                      <h3 className="text-sm font-medium">
                        {creditPackage.name}
                      </h3>
                      {creditPackage.recommended ? (
                        <span className="bg-[#c45d38] px-2 py-1 font-mono text-[9px] tracking-[.12em] text-white uppercase">
                          {t('recommended')}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-8 text-4xl font-semibold tracking-[-0.04em]">
                      {creditPackage.credits.toLocaleString(locale)}
                    </p>
                    <p className="mt-1 font-mono text-[10px] tracking-[.15em] text-[#777268] uppercase">
                      Credit
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-8">
                      <p className="text-xl font-medium">
                        ${Number(creditPackage.priceUsd).toFixed(2)}
                      </p>
                      <Button
                        size="sm"
                        variant={
                          creditPackage.recommended ? 'default' : 'outline'
                        }
                        disabled={checkoutCode !== null}
                        onClick={() => checkout(creditPackage)}
                      >
                        {checkoutCode === creditPackage.code ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : null}
                        {t('buy_now')}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <WorkspaceEmpty>{t('packages_unavailable')}</WorkspaceEmpty>
            )}
            <p className="mt-4 text-xs leading-5 text-[#777268] sm:hidden dark:text-[#aaa399]">
              {t('package_note')}
            </p>
          </section>

          <section className="dark:border-border border-y border-black/15 py-8">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <Gift className="size-5 text-[#c45d38]" />
                  <h2 className="text-xl font-medium">{t('invite_rewards')}</h2>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f6a61] dark:text-[#b8b0a5]">
                  {t('invite_description')}
                </p>
                <div className="mt-6 flex min-w-0 gap-2">
                  <div className="dark:border-border min-w-0 flex-1 border border-black/15 bg-white/30 px-4 py-3 dark:bg-white/5">
                    <p className="font-mono text-[9px] tracking-[.15em] text-[#777268] uppercase">
                      {t('invite_link')}
                    </p>
                    <p className="mt-1 truncate text-sm">
                      {referral?.inviteUrl || '—'}
                    </p>
                  </div>
                  <Button
                    className="h-auto self-stretch"
                    variant="outline"
                    disabled={!referral?.inviteUrl}
                    onClick={copyInviteLink}
                  >
                    <Copy className="size-4" />
                    {t('copy_invite_link')}
                  </Button>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#777268] dark:text-[#aaa399]">
                  {t('invite_rules')}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-px bg-black/10 dark:bg-white/10">
                <ReferralStat
                  label={t('invite_code')}
                  value={referral?.inviteCode || '—'}
                />
                <ReferralStat
                  label={t('successful_invites')}
                  value={referral?.stats.successfulInvites ?? 0}
                />
                <ReferralStat
                  label={t('pending_rewards')}
                  value={`${referral?.stats.pendingCredits ?? 0} Credit`}
                />
                <ReferralStat
                  label={t('earned_rewards')}
                  value={`${referral?.stats.earnedCredits ?? 0} Credit`}
                />
              </dl>
            </div>
            {referral?.rewards?.length ? (
              <div className="mt-8">
                <Ledger
                  title={t('reward_records')}
                  rows={referral.rewards}
                  valueKey="credits"
                />
              </div>
            ) : null}
          </section>

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
      </div>
    </WorkspaceShell>
  );
}

type CreditPackage = {
  code: string;
  name: string;
  credits: number;
  priceUsd: number;
  recommended: boolean;
};

type ReferralOverview = {
  inviteCode: string;
  inviteUrl: string;
  stats: {
    successfulInvites: number;
    pendingCredits: number;
    earnedCredits: number;
  };
  rewards: Array<{
    id: string;
    status: string;
    credits: number;
    createdAt: string;
  }>;
};

function ReferralStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#f5f1e8] p-4 dark:bg-[#171715]">
      <dt className="text-[11px] leading-4 text-[#777268] dark:text-[#aaa399]">
        {label}
      </dt>
      <dd className="mt-2 font-mono text-sm font-medium break-all">{value}</dd>
    </div>
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
