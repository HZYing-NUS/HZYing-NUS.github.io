import 'server-only';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import {
  findDefaultModelConfiguration,
  findModelConfiguration,
} from '@/shared/models/ai_catalog';

export type ResolvedAiModel = NonNullable<
  Awaited<ReturnType<typeof findModelConfiguration>>
>;

export async function resolveAiModel(
  publicId: string,
  channel: 'primary' | 'fallback' = 'primary'
) {
  const model =
    publicId === 'auto'
      ? await findDefaultModelConfiguration()
      : await findModelConfiguration(publicId);
  if (!model) throw new Error('MODEL_NOT_AVAILABLE');

  const providerId =
    channel === 'fallback' ? model.fallbackProviderId : model.providerId;
  const providerModelId =
    channel === 'fallback'
      ? model.fallbackProviderModelId
      : model.providerModelId;
  const providerCode =
    channel === 'fallback' ? model.fallbackProviderCode : model.providerCode;
  const apiBaseUrl =
    channel === 'fallback' ? model.fallbackApiBaseUrl : model.apiBaseUrl;
  const apiKeyEnvName =
    channel === 'fallback' ? model.fallbackApiKeyEnvName : model.apiKeyEnvName;

  if (!providerId || !providerModelId || !providerCode || !apiKeyEnvName) {
    throw new Error(
      channel === 'fallback'
        ? 'MODEL_FALLBACK_NOT_AVAILABLE'
        : 'MODEL_PROVIDER_NOT_CONFIGURED'
    );
  }
  const apiKey = process.env[apiKeyEnvName];
  if (!apiKey) throw new Error('MODEL_PROVIDER_NOT_CONFIGURED');

  const provider = createOpenRouter({
    apiKey,
    baseURL: apiBaseUrl || undefined,
    compatibility: providerCode === 'openrouter' ? 'strict' : 'compatible',
  });

  return {
    configuration: {
      ...model,
      providerId,
      providerModelId,
      providerCode,
      apiBaseUrl,
      apiKeyEnvName,
      inputPricePerMillion:
        channel === 'fallback' && model.fallbackInputPricePerMillion
          ? model.fallbackInputPricePerMillion
          : model.inputPricePerMillion,
      outputPricePerMillion:
        channel === 'fallback' && model.fallbackOutputPricePerMillion
          ? model.fallbackOutputPricePerMillion
          : model.outputPricePerMillion,
      cacheReadPricePerMillion:
        channel === 'fallback' && model.fallbackCacheReadPricePerMillion
          ? model.fallbackCacheReadPricePerMillion
          : model.cacheReadPricePerMillion,
      cacheWritePricePerMillion:
        channel === 'fallback' && model.fallbackCacheWritePricePerMillion
          ? model.fallbackCacheWritePricePerMillion
          : model.cacheWritePricePerMillion,
    },
    channel,
    languageModel: provider.chat(providerModelId),
  };
}

export function getFallbackAvailability(model: ResolvedAiModel) {
  return {
    available: Boolean(
      model.fallbackProviderId &&
        model.fallbackProviderModelId &&
        model.fallbackProviderCode &&
        model.fallbackApiKeyEnvName &&
        process.env[model.fallbackApiKeyEnvName]
    ),
    sameModel: model.fallbackIsSameModel,
  };
}

export function createPriceSnapshot(model: ResolvedAiModel) {
  return {
    providerId: model.providerId,
    modelId: model.modelId,
    publicModelId: model.publicId,
    pricingVersion: model.pricingVersion,
    currency: model.currency,
    inputPricePerMillion: model.inputPricePerMillion,
    outputPricePerMillion: model.outputPricePerMillion,
    cacheReadPricePerMillion: model.cacheReadPricePerMillion ?? '0',
    cacheWritePricePerMillion: model.cacheWritePricePerMillion ?? '0',
  };
}
