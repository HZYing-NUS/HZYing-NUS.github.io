import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiModel, aiProvider } from '@/config/db/schema';

export type NewAiProvider = typeof aiProvider.$inferInsert;
export type NewAiModel = typeof aiModel.$inferInsert;
export type AdminAiProvider = {
  id: string;
  code: string;
  name: string;
  apiBaseUrl: string | null;
  apiKeyEnvName: string | null;
  status: string;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
};
export type AdminAiModel = {
  id: string;
  publicId: string;
  visibleName: string;
  description: string | null;
  providerId: string;
  providerCode: string;
  providerModelId: string;
  fallbackProviderId: string | null;
  fallbackProviderModelId: string | null;
  fallbackIsSameModel: boolean;
  fallbackInputPricePerMillion: string | null;
  fallbackOutputPricePerMillion: string | null;
  fallbackCacheReadPricePerMillion: string | null;
  fallbackCacheWritePricePerMillion: string | null;
  inputPricePerMillion: string;
  outputPricePerMillion: string;
  cacheReadPricePerMillion: string | null;
  cacheWritePricePerMillion: string | null;
  currency: string;
  pricingVersion: string;
  pricingSource: string | null;
  pricingEffectiveAt: Date;
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsReasoning: boolean;
  reasoningEffort: string;
  enabled: boolean;
  recommendationMode: string | null;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
};
export type UpdateAiProvider = Partial<
  Pick<
    NewAiProvider,
    'name' | 'apiBaseUrl' | 'apiKeyEnvName' | 'status' | 'priority'
  >
>;
export type UpdateAiModel = Partial<
  Pick<
    NewAiModel,
    | 'visibleName'
    | 'description'
    | 'providerId'
    | 'providerModelId'
    | 'fallbackProviderId'
    | 'fallbackProviderModelId'
    | 'fallbackIsSameModel'
    | 'fallbackInputPricePerMillion'
    | 'fallbackOutputPricePerMillion'
    | 'fallbackCacheReadPricePerMillion'
    | 'fallbackCacheWritePricePerMillion'
    | 'inputPricePerMillion'
    | 'outputPricePerMillion'
    | 'cacheReadPricePerMillion'
    | 'cacheWritePricePerMillion'
    | 'currency'
    | 'pricingVersion'
    | 'pricingSource'
    | 'pricingEffectiveAt'
    | 'contextWindow'
    | 'maxOutputTokens'
    | 'supportsVision'
    | 'supportsTools'
    | 'supportsStreaming'
    | 'supportsReasoning'
    | 'reasoningEffort'
    | 'enabled'
    | 'recommendationMode'
    | 'sort'
  >
>;

export async function upsertAiProvider(provider: NewAiProvider) {
  const [result] = await db()
    .insert(aiProvider)
    .values(provider)
    .onConflictDoUpdate({
      target: aiProvider.code,
      set: provider,
    })
    .returning();
  return result;
}

export async function upsertAiModel(model: NewAiModel) {
  const [result] = await db()
    .insert(aiModel)
    .values(model)
    .onConflictDoUpdate({
      target: aiModel.publicId,
      set: model,
    })
    .returning();
  return result;
}

export async function getAdminAiProviders(): Promise<AdminAiProvider[]> {
  return db()
    .select({
      id: aiProvider.id,
      code: aiProvider.code,
      name: aiProvider.name,
      apiBaseUrl: aiProvider.apiBaseUrl,
      apiKeyEnvName: aiProvider.apiKeyEnvName,
      status: aiProvider.status,
      priority: aiProvider.priority,
      createdAt: aiProvider.createdAt,
      updatedAt: aiProvider.updatedAt,
    })
    .from(aiProvider)
    .orderBy(asc(aiProvider.priority), asc(aiProvider.code));
}

export async function updateAiProvider(id: string, updates: UpdateAiProvider) {
  const [result] = await db()
    .update(aiProvider)
    .set(updates)
    .where(eq(aiProvider.id, id))
    .returning({
      id: aiProvider.id,
      code: aiProvider.code,
      name: aiProvider.name,
      apiBaseUrl: aiProvider.apiBaseUrl,
      apiKeyEnvName: aiProvider.apiKeyEnvName,
      status: aiProvider.status,
      priority: aiProvider.priority,
      updatedAt: aiProvider.updatedAt,
    });
  return result;
}

export async function getAdminAiModels(): Promise<AdminAiModel[]> {
  return db()
    .select({
      id: aiModel.id,
      publicId: aiModel.publicId,
      visibleName: aiModel.visibleName,
      description: aiModel.description,
      providerId: aiModel.providerId,
      providerCode: aiProvider.code,
      providerModelId: aiModel.providerModelId,
      fallbackProviderId: aiModel.fallbackProviderId,
      fallbackProviderModelId: aiModel.fallbackProviderModelId,
      fallbackIsSameModel: aiModel.fallbackIsSameModel,
      fallbackInputPricePerMillion: aiModel.fallbackInputPricePerMillion,
      fallbackOutputPricePerMillion: aiModel.fallbackOutputPricePerMillion,
      fallbackCacheReadPricePerMillion:
        aiModel.fallbackCacheReadPricePerMillion,
      fallbackCacheWritePricePerMillion:
        aiModel.fallbackCacheWritePricePerMillion,
      inputPricePerMillion: aiModel.inputPricePerMillion,
      outputPricePerMillion: aiModel.outputPricePerMillion,
      cacheReadPricePerMillion: aiModel.cacheReadPricePerMillion,
      cacheWritePricePerMillion: aiModel.cacheWritePricePerMillion,
      currency: aiModel.currency,
      pricingVersion: aiModel.pricingVersion,
      pricingSource: aiModel.pricingSource,
      pricingEffectiveAt: aiModel.pricingEffectiveAt,
      contextWindow: aiModel.contextWindow,
      maxOutputTokens: aiModel.maxOutputTokens,
      supportsVision: aiModel.supportsVision,
      supportsTools: aiModel.supportsTools,
      supportsStreaming: aiModel.supportsStreaming,
      supportsReasoning: aiModel.supportsReasoning,
      reasoningEffort: aiModel.reasoningEffort,
      enabled: aiModel.enabled,
      recommendationMode: aiModel.recommendationMode,
      sort: aiModel.sort,
      createdAt: aiModel.createdAt,
      updatedAt: aiModel.updatedAt,
    })
    .from(aiModel)
    .innerJoin(aiProvider, eq(aiModel.providerId, aiProvider.id))
    .orderBy(asc(aiModel.sort), asc(aiModel.publicId));
}

export async function updateAiModel(id: string, updates: UpdateAiModel) {
  const [result] = await db()
    .update(aiModel)
    .set(updates)
    .where(eq(aiModel.id, id))
    .returning();
  return result;
}

export async function getEnabledModels() {
  return db()
    .select({
      id: aiModel.id,
      publicId: aiModel.publicId,
      visibleName: aiModel.visibleName,
      description: aiModel.description,
      contextWindow: aiModel.contextWindow,
      maxOutputTokens: aiModel.maxOutputTokens,
      supportsVision: aiModel.supportsVision,
      supportsTools: aiModel.supportsTools,
      supportsStreaming: aiModel.supportsStreaming,
      supportsReasoning: aiModel.supportsReasoning,
      reasoningEffort: aiModel.reasoningEffort,
      recommendationMode: aiModel.recommendationMode,
    })
    .from(aiModel)
    .where(eq(aiModel.enabled, true))
    .orderBy(asc(aiModel.sort));
}

export async function findModelConfiguration(publicId: string) {
  const [result] = await db()
    .select({
      modelId: aiModel.id,
      publicId: aiModel.publicId,
      providerModelId: aiModel.providerModelId,
      fallbackProviderId: aiModel.fallbackProviderId,
      fallbackProviderModelId: aiModel.fallbackProviderModelId,
      fallbackIsSameModel: aiModel.fallbackIsSameModel,
      fallbackInputPricePerMillion: aiModel.fallbackInputPricePerMillion,
      fallbackOutputPricePerMillion: aiModel.fallbackOutputPricePerMillion,
      fallbackCacheReadPricePerMillion:
        aiModel.fallbackCacheReadPricePerMillion,
      fallbackCacheWritePricePerMillion:
        aiModel.fallbackCacheWritePricePerMillion,
      inputPricePerMillion: aiModel.inputPricePerMillion,
      outputPricePerMillion: aiModel.outputPricePerMillion,
      cacheReadPricePerMillion: aiModel.cacheReadPricePerMillion,
      cacheWritePricePerMillion: aiModel.cacheWritePricePerMillion,
      currency: aiModel.currency,
      pricingVersion: aiModel.pricingVersion,
      contextWindow: aiModel.contextWindow,
      maxOutputTokens: aiModel.maxOutputTokens,
      supportsVision: aiModel.supportsVision,
      supportsReasoning: aiModel.supportsReasoning,
      reasoningEffort: aiModel.reasoningEffort,
      providerId: aiProvider.id,
      providerCode: aiProvider.code,
      apiBaseUrl: aiProvider.apiBaseUrl,
      apiKeyEnvName: aiProvider.apiKeyEnvName,
      providerMetadata: aiProvider.metadata,
    })
    .from(aiModel)
    .innerJoin(aiProvider, eq(aiModel.providerId, aiProvider.id))
    .where(
      and(
        eq(aiModel.publicId, publicId),
        eq(aiModel.enabled, true),
        eq(aiProvider.status, 'active')
      )
    );
  if (!result?.fallbackProviderId || !result.fallbackProviderModelId) {
    return result
      ? {
          ...result,
          fallbackProviderCode: null,
          fallbackApiBaseUrl: null,
          fallbackApiKeyEnvName: null,
        }
      : undefined;
  }

  const [fallbackProvider] = await db()
    .select({
      code: aiProvider.code,
      apiBaseUrl: aiProvider.apiBaseUrl,
      apiKeyEnvName: aiProvider.apiKeyEnvName,
    })
    .from(aiProvider)
    .where(
      and(
        eq(aiProvider.id, result.fallbackProviderId),
        eq(aiProvider.status, 'active')
      )
    );

  return {
    ...result,
    fallbackProviderCode: fallbackProvider?.code ?? null,
    fallbackApiBaseUrl: fallbackProvider?.apiBaseUrl ?? null,
    fallbackApiKeyEnvName: fallbackProvider?.apiKeyEnvName ?? null,
  };
}

export async function findDefaultModelConfiguration() {
  const [defaultModel] = await db()
    .select({ publicId: aiModel.publicId })
    .from(aiModel)
    .innerJoin(aiProvider, eq(aiModel.providerId, aiProvider.id))
    .where(and(eq(aiModel.enabled, true), eq(aiProvider.status, 'active')))
    .orderBy(asc(aiModel.sort))
    .limit(1);

  return defaultModel
    ? findModelConfiguration(defaultModel.publicId)
    : undefined;
}
