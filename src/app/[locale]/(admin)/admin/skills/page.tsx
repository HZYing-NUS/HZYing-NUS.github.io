import type React from 'react';
import { revalidatePath } from 'next/cache';
import { generateId } from 'ai';
import { ArchiveIcon, CopyPlusIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { PERMISSIONS, requireAllPermissions } from '@/core/rbac';
import { SkillTestPanel } from '@/shared/blocks/admin/skill-test-panel';
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
  archiveSkillVersion,
  createNextSkillVersion,
  createSkillWithInitialVersion,
  deleteSkill,
  deleteSkillVersion,
  getAdminSkillById,
  getAdminSkills,
  getAdminSkillVersionById,
  getAdminSkillVersions,
  getSkillUsageRecords,
  publishSkillVersion,
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

function parseSlug(data: FormData) {
  const slug = requiredText(data, 'slug').toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('slug must use lowercase letters, numbers, and hyphens');
  }
  return slug;
}

function revalidate(locale: string) {
  revalidatePath(`/${locale}/admin/skills`);
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
  const usageRecords = await getSkillUsageRecords();
  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Admin', url: '/admin' },
    { title: isZh ? 'Skill 管理' : 'Skill management', is_active: true },
  ];

  async function createNewSkill(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    const id = generateId().toLowerCase();
    const skillId = `skill:${id}`;
    await createSkillWithInitialVersion({
      skillRecord: {
        id: skillId,
        slug: parseSlug(data),
        name: requiredText(data, 'name'),
        nameEn: requiredText(data, 'nameEn'),
        description: requiredText(data, 'description'),
        descriptionEn: requiredText(data, 'descriptionEn'),
        suitableFor: requiredText(data, 'suitableFor'),
        suitableForEn: requiredText(data, 'suitableForEn'),
        unsuitableFor: requiredText(data, 'unsuitableFor'),
        unsuitableForEn: requiredText(data, 'unsuitableForEn'),
        status: 'draft',
        userEnabled: false,
      },
      versionRecord: {
        id: `skill-version:${id}:v1`,
        version: 1,
        methodology: requiredText(data, 'methodology'),
        methodologyEn: requiredText(data, 'methodologyEn'),
        systemPrompt: requiredText(data, 'systemPrompt'),
        systemPromptEn: requiredText(data, 'systemPromptEn'),
        diagnosticSteps: parseJson(data, 'diagnosticSteps'),
        diagnosticStepsEn: parseJson(data, 'diagnosticStepsEn'),
        followUpQuestions: parseJson(data, 'followUpQuestions'),
        followUpQuestionsEn: parseJson(data, 'followUpQuestionsEn'),
        quickOutputFormat: requiredText(data, 'quickOutputFormat'),
        quickOutputFormatEn: requiredText(data, 'quickOutputFormatEn'),
        deepOutputFormat: requiredText(data, 'deepOutputFormat'),
        deepOutputFormatEn: requiredText(data, 'deepOutputFormatEn'),
        completionConditions: requiredText(data, 'completionConditions'),
        completionConditionsEn: requiredText(data, 'completionConditionsEn'),
        referenceMaterials: null,
        auditMetadata: { source: 'admin' },
        status: 'draft',
      },
    });
    revalidate(locale);
  }

  async function saveSkill(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    const id = requiredText(data, 'id');
    if (!(await getAdminSkillById(id))) throw new Error('Invalid skill');
    const status = requiredText(data, 'status');
    const userEnabled = data.get('userEnabled') === 'on';
    if (
      (status === 'published' || userEnabled) &&
      !(await getAdminSkillVersions(id)).some(
        (version) => version.status === 'published'
      )
    ) {
      throw new Error('Publish a complete version before enabling the Skill');
    }
    await updateSkill(id, {
      name: requiredText(data, 'name'),
      nameEn: requiredText(data, 'nameEn'),
      description: optionalText(data, 'description'),
      descriptionEn: optionalText(data, 'descriptionEn'),
      suitableFor: optionalText(data, 'suitableFor'),
      suitableForEn: optionalText(data, 'suitableForEn'),
      unsuitableFor: optionalText(data, 'unsuitableFor'),
      unsuitableForEn: optionalText(data, 'unsuitableForEn'),
      status,
      userEnabled: status === 'published' && userEnabled,
    });
    revalidate(locale);
  }

  async function saveDraftVersion(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    const id = requiredText(data, 'id');
    const known = await getAdminSkillVersionById(id);
    if (!known || known.version.status !== 'draft') {
      throw new Error('Only draft versions can be edited');
    }
    await updateSkillVersion(id, {
      methodology: requiredText(data, 'methodology'),
      methodologyEn: requiredText(data, 'methodologyEn'),
      systemPrompt: requiredText(data, 'systemPrompt'),
      systemPromptEn: requiredText(data, 'systemPromptEn'),
      diagnosticSteps: parseJson(data, 'diagnosticSteps'),
      diagnosticStepsEn: parseJson(data, 'diagnosticStepsEn'),
      followUpQuestions: parseJson(data, 'followUpQuestions'),
      followUpQuestionsEn: parseJson(data, 'followUpQuestionsEn'),
      quickOutputFormat: requiredText(data, 'quickOutputFormat'),
      quickOutputFormatEn: requiredText(data, 'quickOutputFormatEn'),
      deepOutputFormat: requiredText(data, 'deepOutputFormat'),
      deepOutputFormatEn: requiredText(data, 'deepOutputFormatEn'),
      completionConditions: requiredText(data, 'completionConditions'),
      completionConditionsEn: requiredText(data, 'completionConditionsEn'),
      referenceMaterials: optionalText(data, 'referenceMaterials')
        ? parseJson(data, 'referenceMaterials')
        : null,
    });
    revalidate(locale);
  }

  async function createVersion(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    await createNextSkillVersion(requiredText(data, 'skillId'));
    revalidate(locale);
  }

  async function publishVersion(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    const id = requiredText(data, 'id');
    const selected = await getAdminSkillVersionById(id);
    if (!selected || selected.version.status !== 'draft') {
      throw new Error('Only draft versions can be published');
    }
    if (
      !selected.version.methodologyEn ||
      !selected.version.systemPromptEn ||
      !selected.version.diagnosticStepsEn ||
      !selected.version.followUpQuestionsEn ||
      !selected.version.quickOutputFormatEn ||
      !selected.version.deepOutputFormatEn ||
      !selected.version.completionConditionsEn
    ) {
      throw new Error('English definition is required before publishing');
    }
    await publishSkillVersion(id);
    await updateSkill(selected.skill.id, { status: 'published' });
    revalidate(locale);
  }

  async function archiveVersion(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    await archiveSkillVersion(requiredText(data, 'id'));
    revalidate(locale);
  }

  async function removeVersion(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    await deleteSkillVersion(requiredText(data, 'id'));
    revalidate(locale);
  }

  async function removeSkill(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    await deleteSkill(requiredText(data, 'id'));
    revalidate(locale);
  }

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={isZh ? 'Skill 管理' : 'Skill management'}
          description={
            isZh
              ? '发布版本保持不可变。修改内容时创建新草稿版本，历史对话继续读取原版本。'
              : 'Published versions stay immutable. Create a new draft for changes; existing chats keep their original version.'
          }
        />

        <div className="space-y-8">
          <Card className="overflow-hidden border-[#c45d38]/30">
            <CardHeader className="bg-[#c45d38]/5">
              <CardTitle className="flex items-center gap-2">
                <PlusIcon className="size-5" />
                {isZh ? '新增 Skill' : 'Add Skill'}
              </CardTitle>
              <CardDescription>
                {isZh
                  ? '创建后默认是未开放的草稿，并同时建立 Version 1。中英文内容均为必填。'
                  : 'Creates a disabled draft with Version 1. Both Chinese and English definitions are required.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form action={createNewSkill} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Slug">
                    <Input
                      name="slug"
                      placeholder="customer-interview-coach"
                      required
                    />
                  </Field>
                  <div />
                  <BilingualTextFields
                    zhName="name"
                    enName="nameEn"
                    zhLabel="中文名称"
                    enLabel="English name"
                  />
                  <BilingualTextFields
                    zhName="description"
                    enName="descriptionEn"
                    zhLabel="中文描述"
                    enLabel="English description"
                    textarea
                  />
                  <BilingualTextFields
                    zhName="suitableFor"
                    enName="suitableForEn"
                    zhLabel="中文适合场景"
                    enLabel="Suitable for"
                    textarea
                  />
                  <BilingualTextFields
                    zhName="unsuitableFor"
                    enName="unsuitableForEn"
                    zhLabel="中文不适合场景"
                    enLabel="Not suitable for"
                    textarea
                  />
                  <VersionDefinitionFields isZh={isZh} />
                </div>
                <Button type="submit">
                  <PlusIcon className="size-4" />
                  {isZh
                    ? '创建 Skill 和 Version 1'
                    : 'Create Skill and Version 1'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {skills.map((item) => {
            const itemVersions = versions.get(item.id) || [];
            const hasDraft = itemVersions.some(
              (version) => version.status === 'draft'
            );
            return (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>
                          {isZh ? item.name : item.nameEn || item.name}
                        </CardTitle>
                        <Badge
                          variant={
                            item.status === 'published'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {item.status}
                        </Badge>
                        <Badge
                          variant={item.userEnabled ? 'outline' : 'secondary'}
                        >
                          {item.userEnabled
                            ? isZh
                              ? '用户可用'
                              : 'User enabled'
                            : isZh
                              ? '用户不可用'
                              : 'User disabled'}
                        </Badge>
                      </div>
                      <CardDescription className="mt-2 font-mono">
                        {item.slug}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={createVersion}>
                        <input type="hidden" name="skillId" value={item.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={hasDraft}
                        >
                          <CopyPlusIcon className="size-4" />
                          {isZh ? '创建新版本' : 'Create new version'}
                        </Button>
                      </form>
                      {item.status === 'draft' ? (
                        <form action={removeSkill}>
                          <input type="hidden" name="id" value={item.id} />
                          <Button type="submit" variant="destructive">
                            <Trash2Icon className="size-4" />
                            {isZh ? '删除草稿 Skill' : 'Delete draft Skill'}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  <form
                    action={saveSkill}
                    className="grid gap-4 md:grid-cols-2"
                  >
                    <input type="hidden" name="id" value={item.id} />
                    <BilingualTextFields
                      zhName="name"
                      enName="nameEn"
                      zhLabel="中文名称"
                      enLabel="English name"
                      zhValue={item.name}
                      enValue={item.nameEn || ''}
                    />
                    <BilingualTextFields
                      zhName="description"
                      enName="descriptionEn"
                      zhLabel="中文描述"
                      enLabel="English description"
                      zhValue={item.description || ''}
                      enValue={item.descriptionEn || ''}
                      textarea
                    />
                    <BilingualTextFields
                      zhName="suitableFor"
                      enName="suitableForEn"
                      zhLabel="中文适合场景"
                      enLabel="Suitable for"
                      zhValue={item.suitableFor || ''}
                      enValue={item.suitableForEn || ''}
                      textarea
                    />
                    <BilingualTextFields
                      zhName="unsuitableFor"
                      enName="unsuitableForEn"
                      zhLabel="中文不适合场景"
                      enLabel="Not suitable for"
                      zhValue={item.unsuitableFor || ''}
                      enValue={item.unsuitableForEn || ''}
                      textarea
                    />
                    <Field label={isZh ? 'Skill 状态' : 'Skill status'}>
                      <StatusSelect name="status" value={item.status} />
                    </Field>
                    <div className="flex items-end gap-5 pb-1">
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
                        {isZh ? '保存 Skill 信息' : 'Save Skill details'}
                      </Button>
                    </div>
                  </form>

                  {itemVersions.map((version) => {
                    const editable = version.status === 'draft';
                    return (
                      <section key={version.id} className="border-t pt-7">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold">
                              {isZh
                                ? `版本 ${version.version}`
                                : `Version ${version.version}`}
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
                          <div className="flex flex-wrap gap-2">
                            {editable ? (
                              <>
                                <form action={publishVersion}>
                                  <input
                                    type="hidden"
                                    name="id"
                                    value={version.id}
                                  />
                                  <Button type="submit" size="sm">
                                    {isZh ? '发布此版本' : 'Publish version'}
                                  </Button>
                                </form>
                                <form action={removeVersion}>
                                  <input
                                    type="hidden"
                                    name="id"
                                    value={version.id}
                                  />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="destructive"
                                  >
                                    <Trash2Icon className="size-4" />
                                    {isZh ? '删除草稿' : 'Delete draft'}
                                  </Button>
                                </form>
                              </>
                            ) : version.status === 'published' ? (
                              <form action={archiveVersion}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={version.id}
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="outline"
                                >
                                  <ArchiveIcon className="size-4" />
                                  {isZh ? '归档版本' : 'Archive version'}
                                </Button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                        {!editable ? (
                          <p className="text-muted-foreground mb-4 text-sm">
                            {isZh
                              ? '该版本已锁定，只能查看。需要修改时请创建新版本。'
                              : 'This version is locked and read-only. Create a new version to make changes.'}
                          </p>
                        ) : null}
                        <form action={saveDraftVersion} className="space-y-5">
                          <input type="hidden" name="id" value={version.id} />
                          <div className="grid gap-4 md:grid-cols-2">
                            <VersionDefinitionFields
                              isZh={isZh}
                              version={version}
                              disabled={!editable}
                            />
                          </div>
                          {editable ? (
                            <Button type="submit">
                              {isZh ? '保存草稿定义' : 'Save draft definition'}
                            </Button>
                          ) : null}
                        </form>
                        <div className="mt-5">
                          <SkillTestPanel versionId={version.id} isZh={isZh} />
                        </div>
                      </section>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle>{isZh ? '最近调用记录' : 'Recent usage'}</CardTitle>
              <CardDescription>
                {isZh
                  ? '用于确认对话实际锁定的 Skill 和版本。测试加载不会出现在这里。'
                  : 'Confirms the Skill and version locked to each chat. Loading tests do not appear here.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageRecords.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-muted-foreground border-b text-xs uppercase">
                      <tr>
                        <th className="px-3 py-3">{isZh ? '时间' : 'Time'}</th>
                        <th className="px-3 py-3">{isZh ? '对话' : 'Chat'}</th>
                        <th className="px-3 py-3">Skill</th>
                        <th className="px-3 py-3">
                          {isZh ? '版本' : 'Version'}
                        </th>
                        <th className="px-3 py-3">
                          {isZh ? '消息数' : 'Messages'}
                        </th>
                        <th className="px-3 py-3">
                          {isZh ? '状态' : 'Status'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageRecords.map((record) => (
                        <tr
                          key={record.chatId}
                          className="border-b last:border-0"
                        >
                          <td className="px-3 py-4 text-xs">
                            {record.createdAt.toLocaleString(locale)}
                          </td>
                          <td className="max-w-72 px-3 py-4">
                            <Link
                              href={`/chat/${record.chatId}`}
                              target="_blank"
                              className="font-medium hover:underline"
                            >
                              {record.chatTitle || record.chatId}
                            </Link>
                          </td>
                          <td className="px-3 py-4">
                            {isZh
                              ? record.skillName
                              : record.skillNameEn || record.skillName}
                          </td>
                          <td className="px-3 py-4 font-mono">
                            v{record.version}
                          </td>
                          <td className="px-3 py-4">{record.messageCount}</td>
                          <td className="px-3 py-4">
                            <Badge
                              variant={
                                record.skillDisabledAt ? 'secondary' : 'outline'
                              }
                            >
                              {record.skillDisabledAt
                                ? isZh
                                  ? '已关闭'
                                  : 'Disabled'
                                : isZh
                                  ? '启用中'
                                  : 'Enabled'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  {isZh
                    ? '还没有 Skill 调用记录。'
                    : 'No Skill usage has been recorded yet.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}

function BilingualTextFields({
  zhName,
  enName,
  zhLabel,
  enLabel,
  zhValue = '',
  enValue = '',
  textarea = false,
}: {
  zhName: string;
  enName: string;
  zhLabel: string;
  enLabel: string;
  zhValue?: string;
  enValue?: string;
  textarea?: boolean;
}) {
  const Control = textarea ? Textarea : Input;
  return (
    <>
      <Field label={zhLabel}>
        <Control name={zhName} defaultValue={zhValue} required />
      </Field>
      <Field label={enLabel}>
        <Control name={enName} defaultValue={enValue} required />
      </Field>
    </>
  );
}

function VersionDefinitionFields({
  isZh,
  version,
  disabled = false,
}: {
  isZh: boolean;
  version?: Awaited<ReturnType<typeof getAdminSkillVersions>>[number];
  disabled?: boolean;
}) {
  return (
    <>
      <DefinitionField
        label="中文 System Prompt"
        name="systemPrompt"
        value={version?.systemPrompt}
        disabled={disabled}
      />
      <DefinitionField
        label="English system prompt"
        name="systemPromptEn"
        value={version?.systemPromptEn || ''}
        disabled={disabled}
      />
      <DefinitionField
        label="中文方法论"
        name="methodology"
        value={version?.methodology}
        disabled={disabled}
      />
      <DefinitionField
        label="English methodology"
        name="methodologyEn"
        value={version?.methodologyEn || ''}
        disabled={disabled}
      />
      <DefinitionField
        label="中文诊断步骤（JSON）"
        name="diagnosticSteps"
        value={
          version
            ? JSON.stringify(version.diagnosticSteps, null, 2)
            : '[\n  ""\n]'
        }
        disabled={disabled}
        mono
      />
      <DefinitionField
        label="English steps (JSON)"
        name="diagnosticStepsEn"
        value={
          version?.diagnosticStepsEn
            ? JSON.stringify(version.diagnosticStepsEn, null, 2)
            : '[\n  ""\n]'
        }
        disabled={disabled}
        mono
      />
      <DefinitionField
        label="中文追问问题（JSON）"
        name="followUpQuestions"
        value={
          version
            ? JSON.stringify(version.followUpQuestions, null, 2)
            : '[\n  ""\n]'
        }
        disabled={disabled}
        mono
      />
      <DefinitionField
        label="English follow-up questions (JSON)"
        name="followUpQuestionsEn"
        value={
          version?.followUpQuestionsEn
            ? JSON.stringify(version.followUpQuestionsEn, null, 2)
            : '[\n  ""\n]'
        }
        disabled={disabled}
        mono
      />
      <DefinitionField
        label="中文快速输出格式"
        name="quickOutputFormat"
        value={version?.quickOutputFormat}
        disabled={disabled}
      />
      <DefinitionField
        label="English quick output format"
        name="quickOutputFormatEn"
        value={version?.quickOutputFormatEn || ''}
        disabled={disabled}
      />
      <DefinitionField
        label="中文深度输出格式"
        name="deepOutputFormat"
        value={version?.deepOutputFormat}
        disabled={disabled}
      />
      <DefinitionField
        label="English deep output format"
        name="deepOutputFormatEn"
        value={version?.deepOutputFormatEn || ''}
        disabled={disabled}
      />
      <DefinitionField
        label="中文完成条件"
        name="completionConditions"
        value={version?.completionConditions}
        disabled={disabled}
      />
      <DefinitionField
        label="English completion conditions"
        name="completionConditionsEn"
        value={version?.completionConditionsEn || ''}
        disabled={disabled}
      />
      {version ? (
        <Field
          label={
            isZh ? '专属资料标识（JSON）' : 'Reference material IDs (JSON)'
          }
          className="md:col-span-2"
        >
          <Textarea
            name="referenceMaterials"
            className="min-h-28 font-mono text-xs"
            defaultValue={
              version.referenceMaterials
                ? JSON.stringify(version.referenceMaterials, null, 2)
                : ''
            }
            disabled={disabled}
          />
        </Field>
      ) : null}
    </>
  );
}

function DefinitionField({
  label,
  name,
  value = '',
  disabled,
  mono = false,
}: {
  label: string;
  name: string;
  value?: string | null;
  disabled: boolean;
  mono?: boolean;
}) {
  return (
    <Field label={label}>
      <Textarea
        name={name}
        className={`min-h-32 ${mono ? 'font-mono text-xs' : ''}`}
        defaultValue={value || ''}
        disabled={disabled}
        required={!disabled}
      />
    </Field>
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
