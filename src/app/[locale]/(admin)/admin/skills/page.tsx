import type React from 'react';
import { revalidatePath } from 'next/cache';
import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAllPermissions } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  getAdminSkills,
  getAdminSkillVersions,
  updateSkill,
  updateSkillVersion,
} from '@/shared/models/skill';
import { Crumb } from '@/shared/types/blocks/common';

function requiredText(data: FormData, name: string) {
  const value = String(data.get(name) || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalText(data: FormData, name: string) {
  return String(data.get(name) || '').trim() || null;
}

function parseJson(data: FormData, name: string) {
  const value = requiredText(data, name);
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

export default async function AdminSkillsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAllPermissions({
    codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
    redirectUrl: '/admin/no-permission',
    locale,
  });
  const isZh = locale === 'zh';
  const skills = await getAdminSkills();
  const versions = new Map(
    await Promise.all(
      skills.map(
        async (item) => [item.id, await getAdminSkillVersions(item.id)] as const
      )
    )
  );
  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Admin', url: '/admin' },
    { title: 'Skills', is_active: true },
  ];

  async function saveSkill(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    const id = requiredText(data, 'id');
    const currentSkills = await getAdminSkills();
    if (!currentSkills.some((item) => item.id === id)) {
      throw new Error('Invalid skill');
    }
    await updateSkill(id, {
      name: requiredText(data, 'name'),
      description: optionalText(data, 'description'),
      suitableFor: optionalText(data, 'suitableFor'),
      unsuitableFor: optionalText(data, 'unsuitableFor'),
      status: requiredText(data, 'status'),
      userEnabled: data.get('userEnabled') === 'on',
    });
    revalidatePath(`/${locale}/admin/skills`);
  }

  async function saveVersion(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    const id = requiredText(data, 'id');
    const currentSkills = await getAdminSkills();
    const currentVersions = (
      await Promise.all(
        currentSkills.map((item) => getAdminSkillVersions(item.id))
      )
    ).flat();
    const known = currentVersions.find((item) => item.id === id);
    if (!known) throw new Error('Invalid skill version');
    const status = requiredText(data, 'status');
    if (known.status === 'published') {
      await updateSkillVersion(id, { status });
      revalidatePath(`/${locale}/admin/skills`);
      return;
    }
    await updateSkillVersion(id, {
      methodology: requiredText(data, 'methodology'),
      systemPrompt: requiredText(data, 'systemPrompt'),
      diagnosticSteps: parseJson(data, 'diagnosticSteps'),
      followUpQuestions: parseJson(data, 'followUpQuestions'),
      quickOutputFormat: requiredText(data, 'quickOutputFormat'),
      deepOutputFormat: requiredText(data, 'deepOutputFormat'),
      completionConditions: requiredText(data, 'completionConditions'),
      referenceMaterials: optionalText(data, 'referenceMaterials')
        ? parseJson(data, 'referenceMaterials')
        : null,
      status,
      publishedAt:
        status === 'published'
          ? known.publishedAt || new Date()
          : known.publishedAt,
    });
    revalidatePath(`/${locale}/admin/skills`);
  }

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={isZh ? 'Skill 管理' : 'Skill management'}
          description={
            isZh
              ? '控制用户开放状态、发布状态和版本化核心定义。已存在版本原地编辑，历史对话仍按锁定的版本 ID 读取。'
              : 'Control user availability, publication status, and versioned definitions. Existing chats continue reading their locked version ID.'
          }
        />
        <div className="space-y-8">
          {skills.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{item.name}</CardTitle>
                  <Badge
                    variant={
                      item.status === 'published' ? 'default' : 'secondary'
                    }
                  >
                    {item.status}
                  </Badge>
                  <Badge variant={item.userEnabled ? 'outline' : 'secondary'}>
                    {item.userEnabled
                      ? isZh
                        ? '用户可用'
                        : 'User enabled'
                      : isZh
                        ? '用户不可用'
                        : 'User disabled'}
                  </Badge>
                </div>
                <CardDescription>{item.slug}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <form action={saveSkill} className="grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="id" value={item.id} />
                  <Field label={isZh ? '名称' : 'Name'}>
                    <Input name="name" defaultValue={item.name} required />
                  </Field>
                  <Field label={isZh ? '发布状态' : 'Publication status'}>
                    <StatusSelect name="status" value={item.status} />
                  </Field>
                  <Field
                    label={isZh ? '描述' : 'Description'}
                    className="md:col-span-2"
                  >
                    <Textarea
                      name="description"
                      defaultValue={item.description || ''}
                    />
                  </Field>
                  <Field label={isZh ? '适合场景' : 'Suitable for'}>
                    <Textarea
                      name="suitableFor"
                      defaultValue={item.suitableFor || ''}
                    />
                  </Field>
                  <Field label={isZh ? '不适合场景' : 'Unsuitable for'}>
                    <Textarea
                      name="unsuitableFor"
                      defaultValue={item.unsuitableFor || ''}
                    />
                  </Field>
                  <div className="flex items-center gap-5 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        name="userEnabled"
                        type="checkbox"
                        defaultChecked={item.userEnabled}
                        className="size-4"
                      />
                      {isZh ? '向用户开放' : 'Available to users'}
                    </label>
                    <Button type="submit">
                      {isZh ? '保存 Skill' : 'Save skill'}
                    </Button>
                  </div>
                </form>

                {(versions.get(item.id) || []).map((version) => (
                  <form
                    key={version.id}
                    action={saveVersion}
                    className="border-t pt-7"
                  >
                    <input type="hidden" name="id" value={version.id} />
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">
                        Version {version.version}
                      </h4>
                      <Badge
                        variant={
                          version.status === 'published'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {version.status}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {version.publishedAt
                          ? version.publishedAt.toLocaleString(locale)
                          : isZh
                            ? '未发布'
                            : 'Not published'}
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label={isZh ? '版本状态' : 'Version status'}>
                        <StatusSelect name="status" value={version.status} />
                      </Field>
                      <div />
                      <Field label={isZh ? '方法论' : 'Methodology'}>
                        <Textarea
                          name="methodology"
                          className="min-h-40"
                          defaultValue={version.methodology}
                          required
                        />
                      </Field>
                      <Field label="System Prompt">
                        <Textarea
                          name="systemPrompt"
                          className="min-h-40"
                          defaultValue={version.systemPrompt}
                          required
                        />
                      </Field>
                      <Field
                        label={
                          isZh ? '诊断步骤（JSON）' : 'Diagnostic steps (JSON)'
                        }
                      >
                        <Textarea
                          name="diagnosticSteps"
                          className="min-h-36 font-mono text-xs"
                          defaultValue={JSON.stringify(
                            version.diagnosticSteps,
                            null,
                            2
                          )}
                          required
                        />
                      </Field>
                      <Field
                        label={
                          isZh
                            ? '追问问题（JSON）'
                            : 'Follow-up questions (JSON)'
                        }
                      >
                        <Textarea
                          name="followUpQuestions"
                          className="min-h-36 font-mono text-xs"
                          defaultValue={JSON.stringify(
                            version.followUpQuestions,
                            null,
                            2
                          )}
                          required
                        />
                      </Field>
                      <Field
                        label={isZh ? '快速输出格式' : 'Quick output format'}
                      >
                        <Textarea
                          name="quickOutputFormat"
                          className="min-h-32"
                          defaultValue={version.quickOutputFormat}
                          required
                        />
                      </Field>
                      <Field
                        label={isZh ? '深度输出格式' : 'Deep output format'}
                      >
                        <Textarea
                          name="deepOutputFormat"
                          className="min-h-32"
                          defaultValue={version.deepOutputFormat}
                          required
                        />
                      </Field>
                      <Field
                        label={isZh ? '完成条件' : 'Completion conditions'}
                      >
                        <Textarea
                          name="completionConditions"
                          defaultValue={version.completionConditions}
                          required
                        />
                      </Field>
                      <Field
                        label={
                          isZh
                            ? '专属资料（JSON）'
                            : 'Reference materials (JSON)'
                        }
                      >
                        <Textarea
                          name="referenceMaterials"
                          className="font-mono text-xs"
                          defaultValue={
                            version.referenceMaterials
                              ? JSON.stringify(
                                  version.referenceMaterials,
                                  null,
                                  2
                                )
                              : ''
                          }
                        />
                      </Field>
                      <div className="md:col-span-2">
                        <Button type="submit">
                          {isZh ? '保存版本定义' : 'Save version definition'}
                        </Button>
                      </div>
                    </div>
                  </form>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </Main>
    </>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StatusSelect({ name, value }: { name: string; value: string }) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
    >
      <option value="draft">draft</option>
      <option value="published">published</option>
      <option value="archived">archived</option>
    </select>
  );
}
