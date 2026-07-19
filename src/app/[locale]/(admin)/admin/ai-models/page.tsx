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
  deleteAiModel,
  deleteAiProvider,
  getAdminAiModels,
  getAdminAiProviders,
  upsertAiModel,
  upsertAiProvider,
  updateAiModel,
  updateAiProvider,
} from '@/shared/models/ai_catalog';
import { getUuid } from '@/shared/lib/hash';
import { Crumb } from '@/shared/types/blocks/common';

function requiredText(data: FormData, name: string) {
  const value = String(data.get(name) || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function requiredInteger(data: FormData, name: string) {
  const value = Number(requiredText(data, name));
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function requiredPositiveInteger(data: FormData, name: string) {
  const value = requiredInteger(data, name);
  if (value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

function decimalText(data: FormData, name: string): string;
function decimalText(
  data: FormData,
  name: string,
  optional: true
): string | null;
function decimalText(data: FormData, name: string, optional = false) {
  const value = optional ? optionalText(data, name) : requiredText(data, name);
  if (value === null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${name} must be a non-negative decimal`);
  }
  return value;
}

function optionalText(data: FormData, name: string) {
  return String(data.get(name) || '').trim() || null;
}

export default async function AdminAiModelsPage({
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
  const [providers, models] = await Promise.all([
    getAdminAiProviders(),
    getAdminAiModels(),
  ]);
  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Admin', url: '/admin' },
    { title: isZh ? '模型与 Provider' : 'Models & Providers', is_active: true },
  ];

  async function saveProvider(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    const id = requiredText(data, 'id');
    const apiKeyEnvName = optionalText(data, 'apiKeyEnvName');
    if (apiKeyEnvName && !/^[A-Z][A-Z0-9_]*$/.test(apiKeyEnvName)) {
      throw new Error('API key environment variable name is invalid');
    }
    await updateAiProvider(id, {
      name: requiredText(data, 'name'),
      apiBaseUrl: optionalText(data, 'apiBaseUrl'),
      apiKeyEnvName,
      status: requiredText(data, 'status'),
      priority: requiredInteger(data, 'priority'),
    });
    revalidatePath(`/${locale}/admin/ai-models`);
  }

  async function addProvider(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    const code = requiredText(data, 'code');
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(code)) {
      throw new Error('Provider code must use lowercase letters, numbers, hyphens or underscores');
    }
    if ((await getAdminAiProviders()).some((provider) => provider.code === code)) {
      throw new Error('Provider code already exists');
    }
    const status = requiredText(data, 'status');
    if (!['active', 'inactive'].includes(status)) {
      throw new Error('Invalid provider status');
    }
    const apiKeyEnvName = optionalText(data, 'apiKeyEnvName');
    if (apiKeyEnvName && !/^[A-Z][A-Z0-9_]*$/.test(apiKeyEnvName)) {
      throw new Error('API key environment variable name is invalid');
    }
    await upsertAiProvider({
      id: getUuid(),
      code,
      name: requiredText(data, 'name'),
      apiBaseUrl: optionalText(data, 'apiBaseUrl'),
      apiKeyEnvName,
      status,
      priority: requiredInteger(data, 'priority'),
    });
    revalidatePath(`/${locale}/admin/ai-models`);
  }

  async function removeProvider(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    try {
      await deleteAiProvider(requiredText(data, 'id'));
    } catch {
      throw new Error('Provider is still referenced by a model or usage record and cannot be deleted');
    }
    revalidatePath(`/${locale}/admin/ai-models`);
  }

  async function saveModel(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    const id = requiredText(data, 'id');
    const providerId = requiredText(data, 'providerId');
    const fallbackProviderId = optionalText(data, 'fallbackProviderId');
    const currentProviders = await getAdminAiProviders();
    if (!currentProviders.some((provider) => provider.id === providerId)) {
      throw new Error('Invalid provider');
    }
    if (
      fallbackProviderId &&
      !currentProviders.some((provider) => provider.id === fallbackProviderId)
    ) {
      throw new Error('Invalid fallback provider');
    }
    const pricingEffectiveAt = new Date(
      requiredText(data, 'pricingEffectiveAt')
    );
    if (Number.isNaN(pricingEffectiveAt.getTime())) {
      throw new Error('Invalid pricing effective time');
    }
    const reasoningEffort = requiredText(data, 'reasoningEffort');
    if (!['low', 'medium', 'high'].includes(reasoningEffort)) {
      throw new Error('Invalid reasoning effort');
    }
    await updateAiModel(id, {
      visibleName: requiredText(data, 'visibleName'),
      description: optionalText(data, 'description'),
      providerId,
      providerModelId: requiredText(data, 'providerModelId'),
      fallbackProviderId,
      fallbackProviderModelId: fallbackProviderId
        ? requiredText(data, 'fallbackProviderModelId')
        : null,
      fallbackIsSameModel: Boolean(
        fallbackProviderId && data.get('fallbackIsSameModel') === 'on'
      ),
      fallbackInputPricePerMillion: fallbackProviderId
        ? decimalText(data, 'fallbackInputPricePerMillion')
        : null,
      fallbackOutputPricePerMillion: fallbackProviderId
        ? decimalText(data, 'fallbackOutputPricePerMillion')
        : null,
      fallbackCacheReadPricePerMillion: fallbackProviderId
        ? decimalText(data, 'fallbackCacheReadPricePerMillion', true)
        : null,
      fallbackCacheWritePricePerMillion: fallbackProviderId
        ? decimalText(data, 'fallbackCacheWritePricePerMillion', true)
        : null,
      inputPricePerMillion: decimalText(data, 'inputPricePerMillion'),
      outputPricePerMillion: decimalText(data, 'outputPricePerMillion'),
      cacheReadPricePerMillion: decimalText(
        data,
        'cacheReadPricePerMillion',
        true
      ),
      cacheWritePricePerMillion: decimalText(
        data,
        'cacheWritePricePerMillion',
        true
      ),
      currency: requiredText(data, 'currency'),
      pricingVersion: requiredText(data, 'pricingVersion'),
      pricingSource: optionalText(data, 'pricingSource'),
      pricingEffectiveAt,
      contextWindow: requiredPositiveInteger(data, 'contextWindow'),
      maxOutputTokens: requiredPositiveInteger(data, 'maxOutputTokens'),
      supportsVision: data.get('supportsVision') === 'on',
      supportsTools: data.get('supportsTools') === 'on',
      supportsStreaming: data.get('supportsStreaming') === 'on',
      supportsReasoning: data.get('supportsReasoning') === 'on',
      reasoningEffort,
      enabled: data.get('enabled') === 'on',
      recommendationMode: optionalText(data, 'recommendationMode'),
      sort: requiredInteger(data, 'sort'),
    });
    revalidatePath(`/${locale}/admin/ai-models`);
  }

  async function addModel(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    const providerId = requiredText(data, 'providerId');
    const currentProviders = await getAdminAiProviders();
    if (!currentProviders.some((provider) => provider.id === providerId)) {
      throw new Error('Invalid provider');
    }
    const publicId = requiredText(data, 'publicId');
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(publicId)) {
      throw new Error('Model ID must use lowercase letters, numbers, dots, hyphens or underscores');
    }
    if ((await getAdminAiModels()).some((model) => model.publicId === publicId)) {
      throw new Error('Model ID already exists');
    }
    const reasoningEffort = requiredText(data, 'reasoningEffort');
    if (!['low', 'medium', 'high'].includes(reasoningEffort)) {
      throw new Error('Invalid reasoning effort');
    }
    await upsertAiModel({
      id: getUuid(),
      publicId,
      visibleName: requiredText(data, 'visibleName'),
      description: optionalText(data, 'description'),
      providerId,
      providerModelId: requiredText(data, 'providerModelId'),
      inputPricePerMillion: decimalText(data, 'inputPricePerMillion'),
      outputPricePerMillion: decimalText(data, 'outputPricePerMillion'),
      currency: requiredText(data, 'currency'),
      pricingVersion: requiredText(data, 'pricingVersion'),
      pricingEffectiveAt: new Date(),
      contextWindow: requiredPositiveInteger(data, 'contextWindow'),
      maxOutputTokens: requiredPositiveInteger(data, 'maxOutputTokens'),
      supportsVision: data.get('supportsVision') === 'on',
      supportsTools: data.get('supportsTools') === 'on',
      supportsStreaming: data.get('supportsStreaming') === 'on',
      supportsReasoning: data.get('supportsReasoning') === 'on',
      reasoningEffort,
      enabled: data.get('enabled') === 'on',
      sort: requiredInteger(data, 'sort'),
    });
    revalidatePath(`/${locale}/admin/ai-models`);
  }

  async function removeModel(data: FormData) {
    'use server';
    await requireAllPermissions({
      codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
      locale,
    });
    try {
      await deleteAiModel(requiredText(data, 'id'));
    } catch {
      throw new Error('Model is still referenced by usage records and cannot be deleted');
    }
    revalidatePath(`/${locale}/admin/ai-models`);
  }

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={isZh ? '模型与 Provider' : 'Models & Providers'}
          description={
            isZh
              ? '用户只看到模型名称和能力。密钥仅保存环境变量名称，后台不会读取或显示真实值。'
              : 'Users only see model names and capabilities. The admin stores environment variable names and never reads or displays secret values.'
          }
        />

        <section className="mb-10 space-y-4">
          <h3 className="text-lg font-semibold">Provider</h3>
          <Card>
            <CardHeader>
              <CardTitle>{isZh ? '新增 Provider' : 'Add provider'}</CardTitle>
              <CardDescription>
                {isZh ? 'Provider code 创建后不可修改。' : 'The provider code cannot be changed after creation.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={addProvider} className="grid gap-4 md:grid-cols-2">
                <Field label={isZh ? '代码' : 'Code'}>
                  <Input name="code" placeholder="openai-compatible" required />
                </Field>
                <Field label={isZh ? '名称' : 'Name'}>
                  <Input name="name" required />
                </Field>
                <Field label="API Base URL" className="md:col-span-2">
                  <Input name="apiBaseUrl" />
                </Field>
                <Field label={isZh ? 'API Key 环境变量名' : 'API key environment variable'} className="md:col-span-2">
                  <Input name="apiKeyEnvName" autoComplete="off" placeholder="OPENAI_API_KEY" />
                </Field>
                <Field label={isZh ? '状态' : 'Status'}>
                  <select name="status" defaultValue="active" className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </Field>
                <Field label={isZh ? '优先级' : 'Priority'}>
                  <Input name="priority" type="number" min="0" defaultValue="0" required />
                </Field>
                <div className="md:col-span-2">
                  <Button type="submit">{isZh ? '新增 Provider' : 'Add provider'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <div className="grid gap-4 xl:grid-cols-2">
            {providers.map((provider) => (
              <Card key={provider.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>{provider.name}</CardTitle>
                    <Badge
                      variant={
                        provider.status === 'active' ? 'default' : 'secondary'
                      }
                    >
                      {provider.status}
                    </Badge>
                  </div>
                  <CardDescription>{provider.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    action={saveProvider}
                    className="grid gap-4 md:grid-cols-2"
                  >
                    <input type="hidden" name="id" value={provider.id} />
                    <Field label={isZh ? '名称' : 'Name'}>
                      <Input
                        name="name"
                        defaultValue={provider.name}
                        required
                      />
                    </Field>
                    <Field label={isZh ? '状态' : 'Status'}>
                      <select
                        name="status"
                        defaultValue={provider.status}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </Field>
                    <Field label="API Base URL" className="md:col-span-2">
                      <Input
                        name="apiBaseUrl"
                        defaultValue={provider.apiBaseUrl || ''}
                      />
                    </Field>
                    <Field
                      label={
                        isZh
                          ? 'API Key 环境变量名'
                          : 'API key environment variable'
                      }
                      className="md:col-span-2"
                    >
                      <Input
                        name="apiKeyEnvName"
                        defaultValue={provider.apiKeyEnvName || ''}
                        autoComplete="off"
                      />
                      <p className="text-muted-foreground text-xs">
                        {isZh
                          ? '这里只填写例如 ANTHROPIC_API_KEY，不填写密钥值。'
                          : 'Enter a name such as ANTHROPIC_API_KEY, never the secret value.'}
                      </p>
                    </Field>
                    <Field label={isZh ? '优先级' : 'Priority'}>
                      <Input
                        name="priority"
                        type="number"
                        min="0"
                        defaultValue={provider.priority}
                        required
                      />
                    </Field>
                    <div className="flex items-end gap-2">
                      <Button type="submit">
                        {isZh ? '保存 Provider' : 'Save provider'}
                      </Button>
                      <Button type="submit" variant="destructive" formAction={removeProvider}>
                        {isZh ? '删除' : 'Delete'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">
            {isZh ? '用户可见模型' : 'User-visible models'}
          </h3>
          {providers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{isZh ? '新增用户可见模型' : 'Add user-visible model'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={addModel} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label={isZh ? '模型 ID' : 'Model ID'}>
                    <Input name="publicId" placeholder="claude-sonnet" required />
                  </Field>
                  <Field label={isZh ? '用户可见名称' : 'Visible name'}>
                    <Input name="visibleName" required />
                  </Field>
                  <Field label="Provider">
                    <select name="providerId" className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm" required>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>{provider.name} ({provider.code})</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Provider Model ID">
                    <Input name="providerModelId" required />
                  </Field>
                  <Field label={isZh ? '输入价／百万 Token' : 'Input / 1M tokens'}>
                    <Input name="inputPricePerMillion" inputMode="decimal" defaultValue="0" required />
                  </Field>
                  <Field label={isZh ? '输出价／百万 Token' : 'Output / 1M tokens'}>
                    <Input name="outputPricePerMillion" inputMode="decimal" defaultValue="0" required />
                  </Field>
                  <Field label={isZh ? '币种' : 'Currency'}><Input name="currency" defaultValue="USD" required /></Field>
                  <Field label={isZh ? '价格版本' : 'Pricing version'}><Input name="pricingVersion" defaultValue="manual" required /></Field>
                  <Field label={isZh ? '上下文长度' : 'Context window'}><Input name="contextWindow" type="number" min="1" defaultValue="128000" required /></Field>
                  <Field label={isZh ? '最大输出 Token' : 'Max output tokens'}><Input name="maxOutputTokens" type="number" min="1" defaultValue="8192" required /></Field>
                  <Field label={isZh ? '推理强度' : 'Reasoning effort'}>
                    <select name="reasoningEffort" defaultValue="medium" className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select>
                  </Field>
                  <Field label={isZh ? '排序' : 'Sort'}><Input name="sort" type="number" min="0" defaultValue="0" required /></Field>
                  <Field label={isZh ? '描述' : 'Description'} className="md:col-span-2 xl:col-span-4"><Textarea name="description" /></Field>
                  <div className="flex flex-wrap items-center gap-5 md:col-span-2 xl:col-span-4">
                    <Check name="enabled" label={isZh ? '启用' : 'Enabled'} checked />
                    <Check name="supportsStreaming" label={isZh ? '流式' : 'Streaming'} checked />
                    <Check name="supportsVision" label={isZh ? '视觉' : 'Vision'} checked={false} />
                    <Check name="supportsTools" label={isZh ? '工具' : 'Tools'} checked={false} />
                    <Check name="supportsReasoning" label={isZh ? '深度思考' : 'Extended thinking'} checked={false} />
                  </div>
                  <div className="xl:col-span-4"><Button type="submit">{isZh ? '新增模型' : 'Add model'}</Button></div>
                </form>
              </CardContent>
            </Card>
          )}
          {models.map((model) => (
            <Card key={model.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{model.visibleName}</CardTitle>
                  <Badge variant={model.enabled ? 'default' : 'secondary'}>
                    {model.enabled
                      ? isZh
                        ? '已启用'
                        : 'Enabled'
                      : isZh
                        ? '已停用'
                        : 'Disabled'}
                  </Badge>
                  {model.recommendationMode && (
                    <Badge variant="outline">{model.recommendationMode}</Badge>
                  )}
                  {model.supportsReasoning && (
                    <Badge variant="outline">
                      {isZh ? '深度思考' : 'Extended thinking'} ·{' '}
                      {model.reasoningEffort}
                    </Badge>
                  )}
                </div>
                <CardDescription>{model.publicId}</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action={saveModel}
                  className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                  <input type="hidden" name="id" value={model.id} />
                  <Field label={isZh ? '用户可见名称' : 'Visible name'}>
                    <Input
                      name="visibleName"
                      defaultValue={model.visibleName}
                      required
                    />
                  </Field>
                  <Field label="Provider">
                    <select
                      name="providerId"
                      defaultValue={model.providerId}
                      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    >
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name} ({provider.code})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Provider Model ID">
                    <Input
                      name="providerModelId"
                      defaultValue={model.providerModelId}
                      required
                    />
                  </Field>
                  <Field label={isZh ? '备用 Provider' : 'Fallback provider'}>
                    <select
                      name="fallbackProviderId"
                      defaultValue={model.fallbackProviderId || ''}
                      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    >
                      <option value="">
                        {isZh ? '不启用备用渠道' : 'No fallback'}
                      </option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name} ({provider.code})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label={
                      isZh ? '备用 Provider Model ID' : 'Fallback model ID'
                    }
                  >
                    <Input
                      name="fallbackProviderModelId"
                      defaultValue={model.fallbackProviderModelId || ''}
                    />
                  </Field>
                  <Field label={isZh ? '排序' : 'Sort'}>
                    <Input
                      name="sort"
                      type="number"
                      min="0"
                      defaultValue={model.sort}
                      required
                    />
                  </Field>
                  <Field
                    label={isZh ? '描述' : 'Description'}
                    className="md:col-span-2 xl:col-span-4"
                  >
                    <Textarea
                      name="description"
                      defaultValue={model.description || ''}
                    />
                  </Field>
                  <Field
                    label={isZh ? '输入价／百万 Token' : 'Input / 1M tokens'}
                  >
                    <Input
                      name="inputPricePerMillion"
                      inputMode="decimal"
                      defaultValue={model.inputPricePerMillion}
                      required
                    />
                  </Field>
                  <Field
                    label={isZh ? '输出价／百万 Token' : 'Output / 1M tokens'}
                  >
                    <Input
                      name="outputPricePerMillion"
                      inputMode="decimal"
                      defaultValue={model.outputPricePerMillion}
                      required
                    />
                  </Field>
                  <Field label={isZh ? '缓存读取价' : 'Cache read price'}>
                    <Input
                      name="cacheReadPricePerMillion"
                      inputMode="decimal"
                      defaultValue={model.cacheReadPricePerMillion || ''}
                    />
                  </Field>
                  <Field label={isZh ? '缓存写入价' : 'Cache write price'}>
                    <Input
                      name="cacheWritePricePerMillion"
                      inputMode="decimal"
                      defaultValue={model.cacheWritePricePerMillion || ''}
                    />
                  </Field>
                  <Field label={isZh ? '备用输入价' : 'Fallback input price'}>
                    <Input
                      name="fallbackInputPricePerMillion"
                      inputMode="decimal"
                      defaultValue={model.fallbackInputPricePerMillion || ''}
                    />
                  </Field>
                  <Field label={isZh ? '备用输出价' : 'Fallback output price'}>
                    <Input
                      name="fallbackOutputPricePerMillion"
                      inputMode="decimal"
                      defaultValue={model.fallbackOutputPricePerMillion || ''}
                    />
                  </Field>
                  <Field
                    label={
                      isZh ? '备用缓存读取价' : 'Fallback cache read price'
                    }
                  >
                    <Input
                      name="fallbackCacheReadPricePerMillion"
                      inputMode="decimal"
                      defaultValue={
                        model.fallbackCacheReadPricePerMillion || ''
                      }
                    />
                  </Field>
                  <Field
                    label={
                      isZh ? '备用缓存写入价' : 'Fallback cache write price'
                    }
                  >
                    <Input
                      name="fallbackCacheWritePricePerMillion"
                      inputMode="decimal"
                      defaultValue={
                        model.fallbackCacheWritePricePerMillion || ''
                      }
                    />
                  </Field>
                  <Field label={isZh ? '币种' : 'Currency'}>
                    <Input
                      name="currency"
                      defaultValue={model.currency}
                      required
                    />
                  </Field>
                  <Field label={isZh ? '价格版本' : 'Pricing version'}>
                    <Input
                      name="pricingVersion"
                      defaultValue={model.pricingVersion}
                      required
                    />
                  </Field>
                  <Field label={isZh ? '价格来源' : 'Pricing source'}>
                    <Input
                      name="pricingSource"
                      defaultValue={model.pricingSource || ''}
                    />
                  </Field>
                  <Field label={isZh ? '价格生效时间' : 'Pricing effective at'}>
                    <Input
                      name="pricingEffectiveAt"
                      type="datetime-local"
                      defaultValue={model.pricingEffectiveAt
                        .toISOString()
                        .slice(0, 16)}
                      required
                    />
                  </Field>
                  <Field label={isZh ? '上下文长度' : 'Context window'}>
                    <Input
                      name="contextWindow"
                      type="number"
                      min="1"
                      defaultValue={model.contextWindow}
                      required
                    />
                  </Field>
                  <Field label={isZh ? '最大输出 Token' : 'Max output tokens'}>
                    <Input
                      name="maxOutputTokens"
                      type="number"
                      min="1"
                      defaultValue={model.maxOutputTokens}
                      required
                    />
                  </Field>
                  <Field label={isZh ? '推荐模式' : 'Recommendation mode'}>
                    <Input
                      name="recommendationMode"
                      defaultValue={model.recommendationMode || ''}
                      placeholder="default / fast / quality"
                    />
                  </Field>
                  <Field label={isZh ? '推理强度' : 'Reasoning effort'}>
                    <select
                      name="reasoningEffort"
                      defaultValue={model.reasoningEffort}
                      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                    <p className="text-muted-foreground text-xs">
                      {isZh
                        ? '仅在确认 Provider 和模型支持 reasoning 后启用。'
                        : 'Enable only after verifying reasoning support for this Provider model.'}
                    </p>
                  </Field>
                  <div className="flex flex-wrap items-end gap-5 pb-2">
                    <Check
                      name="fallbackIsSameModel"
                      label={
                        isZh ? '备用渠道为同一模型' : 'Fallback uses same model'
                      }
                      checked={model.fallbackIsSameModel}
                    />
                    <Check
                      name="enabled"
                      label={isZh ? '启用' : 'Enabled'}
                      checked={model.enabled}
                    />
                    <Check
                      name="supportsVision"
                      label={isZh ? '视觉' : 'Vision'}
                      checked={model.supportsVision}
                    />
                    <Check
                      name="supportsTools"
                      label={isZh ? '工具' : 'Tools'}
                      checked={model.supportsTools}
                    />
                    <Check
                      name="supportsStreaming"
                      label={isZh ? '流式' : 'Streaming'}
                      checked={model.supportsStreaming}
                    />
                    <Check
                      name="supportsReasoning"
                      label={isZh ? '深度思考' : 'Extended thinking'}
                      checked={model.supportsReasoning}
                    />
                  </div>
                  <div className="flex gap-2 xl:col-span-4">
                    <Button type="submit">
                      {isZh ? '保存模型' : 'Save model'}
                    </Button>
                    <Button type="submit" variant="destructive" formAction={removeModel}>
                      {isZh ? '删除' : 'Delete'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ))}
        </section>
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

function Check({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="size-4"
      />
      {label}
    </label>
  );
}
