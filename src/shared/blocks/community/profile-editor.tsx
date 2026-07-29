'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

type ExperienceItem = {
  title: string;
  organization: string;
  period: string;
  description: string;
};

type SocialLink = {
  label: string;
  url: string;
};

type WorkItem = {
  title: string;
  description: string;
  url: string;
};

type ProfileForm = {
  displayName: string;
  avatarUrl: string;
  headline: string;
  aboutZh: string;
  aboutEn: string;
  experience: ExperienceItem[];
  skills: string;
  focusAreas: string;
  works: WorkItem[];
  region: string;
  websiteUrl: string;
  socialLinks: SocialLink[];
};

const emptyExperience = (): ExperienceItem => ({
  title: '',
  organization: '',
  period: '',
  description: '',
});

const emptySocialLink = (): SocialLink => ({ label: '', url: '' });
const emptyWork = (): WorkItem => ({ title: '', description: '', url: '' });

const empty: ProfileForm = {
  displayName: '',
  avatarUrl: '',
  headline: '',
  aboutZh: '',
  aboutEn: '',
  experience: [],
  skills: '',
  focusAreas: '',
  works: [],
  region: '',
  websiteUrl: '',
  socialLinks: [],
};

function readExperience(value: unknown): ExperienceItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item && typeof item === 'object' ? item : {};
    const record = row as Record<string, unknown>;
    return {
      title: String(record.title || record.titleZh || record.titleEn || ''),
      organization: String(
        record.organization ||
          record.organizationZh ||
          record.organizationEn ||
          record.roleZh ||
          record.roleEn ||
          ''
      ),
      period: String(record.period || record.periodZh || record.periodEn || ''),
      description: String(
        record.description || record.descriptionZh || record.descriptionEn || ''
      ),
    };
  });
}

function readSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item && typeof item === 'object' ? item : {};
    const record = row as Record<string, unknown>;
    return {
      label: String(record.label || ''),
      url: String(record.url || ''),
    };
  });
}

function readWorks(value: unknown): WorkItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item && typeof item === 'object' ? item : {};
    const record = row as Record<string, unknown>;
    return {
      title: String(record.title || ''),
      description: String(record.description || ''),
      url: String(record.url || ''),
    };
  });
}

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
    if (result.code !== 0) throw new Error(result.message);
    const row = result.data;
    const source = row.revision || row.profile || {};
    setForm({
      displayName: source.displayName || '',
      avatarUrl: source.avatarUrl || '',
      headline: source.headline || '',
      aboutZh: source.aboutZh || '',
      aboutEn: source.aboutEn || '',
      experience: readExperience(source.experience),
      skills: Array.isArray(source.skills) ? source.skills.join(', ') : '',
      focusAreas: Array.isArray(source.focusAreas)
        ? source.focusAreas.join(', ')
        : '',
      works: readWorks(source.works),
      region: source.region || '',
      websiteUrl: source.websiteUrl || '',
      socialLinks: readSocialLinks(source.socialLinks),
    });
    setStatus(
      source.moderationStatus || row.profile?.moderationStatus || 'draft'
    );
    setReviewId(source.moderationReviewId || null);
  }, []);

  useEffect(() => {
    void load().catch((error) => toast.error(error.message));
  }, [load]);

  useEffect(() => {
    if (!reviewId) {
      setReview(null);
      return;
    }
    void fetch(`/api/community/me/moderation/${reviewId}`)
      .then((response) => response.json())
      .then((result) => result.code === 0 && setReview(result.data));
  }, [reviewId]);

  const payload = () => ({
    ...form,
    experience: form.experience
      .map((item) => ({
        title: item.title.trim(),
        organization: item.organization.trim(),
        roleZh: item.organization.trim(),
        roleEn: item.organization.trim(),
        periodZh: item.period.trim(),
        periodEn: item.period.trim(),
        descriptionZh: item.description.trim(),
        descriptionEn: item.description.trim(),
      }))
      .filter((item) => Object.values(item).some(Boolean)),
    skills: form.skills
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    focusAreas: form.focusAreas
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    works: form.works
      .map((item) => ({
        title: item.title.trim(),
        description: item.description.trim(),
        url: item.url.trim(),
      }))
      .filter((item) => item.title || item.description || item.url),
    socialLinks: form.socialLinks
      .map((item) => ({
        label: item.label.trim(),
        url: item.url.trim(),
      }))
      .filter((item) => item.label || item.url),
  });

  const persistDraft = async () => {
    const result = await fetch('/api/community/me/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload()),
    }).then((response) => response.json());
    if (result.code !== 0) throw new Error(result.message);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await persistDraft();
      setMessage(zh ? '资料草稿已保存。' : 'Profile draft saved.');
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'COMMUNITY_PROFILE_SAVE_FAILED'
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await persistDraft();
      const result = await fetch('/api/community/me/profile', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: '{}',
      }).then((response) => response.json());
      if (result.code !== 0) throw new Error(result.message);
      setMessage(zh ? '资料已提交审核。' : 'Profile submitted for review.');
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'COMMUNITY_PROFILE_SUBMIT_FAILED'
      );
    } finally {
      setBusy(false);
    }
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

  const updateExperience = (
    index: number,
    key: keyof ExperienceItem,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      experience: current.experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const updateSocialLink = (
    index: number,
    key: keyof SocialLink,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const updateWork = (index: number, key: keyof WorkItem, value: string) => {
    setForm((current) => ({
      ...current,
      works: current.works.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const field = (key: keyof ProfileForm, label: string, multiline = false) => (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      {multiline ? (
        <Textarea
          value={String(form[key])}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          className="min-h-28"
        />
      ) : (
        <Input
          value={String(form[key])}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
        />
      )}
    </label>
  );

  return (
    <form onSubmit={save} className="grid gap-6">
      <div className="rounded-xl border p-5">
        <p className="text-sm font-medium">
          {zh ? '公开主页状态' : 'Public profile status'}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">{status}</p>
      </div>

      <section className="grid gap-5 rounded-xl border p-5">
        <div>
          <h2 className="font-semibold">
            {zh ? '公开主页基础信息' : 'Public profile basics'}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {zh
              ? '只有公开名称必填。其余项目不填写时不会出现在主页中。'
              : 'Only the display name is required. Empty optional sections stay hidden.'}
          </p>
        </div>
        {field(
          'displayName',
          zh ? '公开名称（必填）' : 'Display name (required)'
        )}
        {field('avatarUrl', zh ? '头像图片 HTTPS 地址' : 'Avatar HTTPS URL')}
        {field('headline', zh ? '一句话介绍' : 'Headline')}
        {field('region', zh ? '所在地' : 'Location')}
        {field('aboutZh', zh ? '中文个人介绍' : 'Chinese introduction', true)}
        {field('aboutEn', zh ? '英文个人介绍' : 'English introduction', true)}
        {field(
          'skills',
          zh ? '技能（用逗号分隔）' : 'Skills (comma separated)'
        )}
        {field(
          'focusAreas',
          zh ? '关注方向（用逗号分隔）' : 'Focus areas (comma separated)'
        )}
      </section>

      <section className="grid gap-4 rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{zh ? '作品' : 'Works'}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {zh
                ? '作品为可选项。链接只接受 HTTPS 地址，不填写链接也可以展示作品。'
                : 'Works are optional. Links must use HTTPS, and a work can be shown without a link.'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setForm((current) => ({
                ...current,
                works: [...current.works, emptyWork()],
              }))
            }
          >
            {zh ? '添加作品' : 'Add work'}
          </Button>
        </div>
        {form.works.map((item, index) => (
          <div key={index} className="bg-muted/40 grid gap-3 rounded-lg p-4">
            <Input
              value={item.title}
              onChange={(event) =>
                updateWork(index, 'title', event.target.value)
              }
              placeholder={zh ? '作品名称' : 'Work title'}
            />
            <Textarea
              value={item.description}
              onChange={(event) =>
                updateWork(index, 'description', event.target.value)
              }
              placeholder={zh ? '作品简介' : 'Work description'}
            />
            <Input
              value={item.url}
              onChange={(event) => updateWork(index, 'url', event.target.value)}
              placeholder="https://"
            />
            <Button
              type="button"
              variant="ghost"
              className="justify-self-start"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  works: current.works.filter(
                    (_, itemIndex) => itemIndex !== index
                  ),
                }))
              }
            >
              {zh ? '删除这个作品' : 'Remove work'}
            </Button>
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{zh ? '经历' : 'Experience'}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {zh
                ? '经历为可选项，可以添加多条。'
                : 'Experience is optional and can contain multiple entries.'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setForm((current) => ({
                ...current,
                experience: [...current.experience, emptyExperience()],
              }))
            }
          >
            {zh ? '添加经历' : 'Add experience'}
          </Button>
        </div>
        {form.experience.map((item, index) => (
          <div key={index} className="bg-muted/40 grid gap-3 rounded-lg p-4">
            <Input
              value={item.title}
              onChange={(event) =>
                updateExperience(index, 'title', event.target.value)
              }
              placeholder={zh ? '职位或经历名称' : 'Role or experience title'}
            />
            <Input
              value={item.organization}
              onChange={(event) =>
                updateExperience(index, 'organization', event.target.value)
              }
              placeholder={zh ? '组织或项目' : 'Organization or project'}
            />
            <Input
              value={item.period}
              onChange={(event) =>
                updateExperience(index, 'period', event.target.value)
              }
              placeholder={zh ? '时间范围' : 'Time period'}
            />
            <Textarea
              value={item.description}
              onChange={(event) =>
                updateExperience(index, 'description', event.target.value)
              }
              placeholder={zh ? '简要说明' : 'Short description'}
            />
            <Button
              type="button"
              variant="ghost"
              className="justify-self-start"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  experience: current.experience.filter(
                    (_, itemIndex) => itemIndex !== index
                  ),
                }))
              }
            >
              {zh ? '删除这条经历' : 'Remove experience'}
            </Button>
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-xl border p-5">
        <div>
          <h2 className="font-semibold">
            {zh ? '外部链接' : 'External links'}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {zh
              ? '只接受 HTTPS 地址。外链会标记为用户内容，并在新窗口打开。'
              : 'HTTPS only. Links are labeled as user content and open in a new tab.'}
          </p>
        </div>
        {field('websiteUrl', zh ? '个人网站' : 'Personal website')}
        {form.socialLinks.map((item, index) => (
          <div
            key={index}
            className="bg-muted/40 grid gap-3 rounded-lg p-4 sm:grid-cols-[12rem_1fr_auto]"
          >
            <Input
              value={item.label}
              onChange={(event) =>
                updateSocialLink(index, 'label', event.target.value)
              }
              placeholder={zh ? '平台名称' : 'Platform name'}
            />
            <Input
              value={item.url}
              onChange={(event) =>
                updateSocialLink(index, 'url', event.target.value)
              }
              placeholder="https://"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  socialLinks: current.socialLinks.filter(
                    (_, itemIndex) => itemIndex !== index
                  ),
                }))
              }
            >
              {zh ? '删除' : 'Remove'}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          onClick={() =>
            setForm((current) => ({
              ...current,
              socialLinks: [...current.socialLinks, emptySocialLink()],
            }))
          }
        >
          {zh ? '添加社交链接' : 'Add social link'}
        </Button>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} variant="outline">
          {zh ? '保存草稿' : 'Save draft'}
        </Button>
        <Button disabled={busy} type="button" onClick={() => void submit()}>
          {zh ? '保存并提交审核' : 'Save and submit for review'}
        </Button>
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
              <Textarea
                value={appeal}
                onChange={(event) => setAppeal(event.target.value)}
                placeholder={
                  zh
                    ? '说明为什么这是误判。'
                    : 'Explain why this is a false positive.'
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void submitAppeal()}
              >
                {zh ? '提交一次申诉' : 'Submit one appeal'}
              </Button>
            </div>
          )}
        </div>
      )}
      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}
