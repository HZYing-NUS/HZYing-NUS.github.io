import 'server-only';

import { getAllConfigs } from '@/shared/models/config';

import type { ResolvedAiModel } from './model-router';

export interface AiUsageInput {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  webSearchCostUsd?: number;
  fileCostUsd?: number;
  memoryCostUsd?: number;
}

export interface AiPriceResult {
  internalCostUsd: number;
  retailCostUsd: number;
  rawCredits: number;
  credits: number;
}

export async function getAiPricingSettings() {
  const configs = await getAllConfigs();
  const configuredWebSearchCreditCost =
    configs.ai_web_search_credit_cost_usd?.trim() ||
    configs.ai_web_search_cost_usd?.trim();
  const webSearchDepth =
    configs.ai_web_search_depth === 'advanced' ? 'advanced' : 'basic';
  const estimatedWebSearchCredits = webSearchDepth === 'advanced' ? 2 : 1;
  const settings = {
    multiplier: Number(configs.ai_cost_multiplier || '2.857143'),
    creditValueUsd: Number(configs.ai_credit_value_usd || '0.05'),
    minimumMarginUsd: Number(configs.ai_minimum_margin_usd || '0'),
    minimumCredits: Number(configs.ai_minimum_request_credits || '1'),
    reservationChunk: Number(configs.ai_reservation_chunk || '2'),
    reservationThresholdTokens: Number(
      configs.ai_reservation_threshold_tokens || '1024'
    ),
    webSearchCreditCostUsd: configuredWebSearchCreditCost
      ? Number(configuredWebSearchCreditCost)
      : 0,
    estimatedWebSearchCredits,
    webSearchEstimatedCostUsd: configuredWebSearchCreditCost
      ? Number(configuredWebSearchCreditCost) * estimatedWebSearchCredits
      : 0,
    webSearchPricingConfigured: Boolean(configuredWebSearchCreditCost),
    imageInputTokens: Number(
      configs.ai_image_input_tokens ||
        process.env.AI_IMAGE_INPUT_TOKENS ||
        '1200'
    ),
  };
  if (
    settings.multiplier <= 0 ||
    settings.creditValueUsd <= 0 ||
    settings.minimumCredits < 1 ||
    settings.reservationChunk < 1 ||
    settings.reservationThresholdTokens < 1 ||
    settings.imageInputTokens < 1 ||
    settings.webSearchCreditCostUsd < 0 ||
    (settings.webSearchPricingConfigured &&
      settings.webSearchCreditCostUsd === 0)
  ) {
    throw new Error('INVALID_AI_PRICING_CONFIGURATION');
  }
  return settings;
}

export function calculateWebSearchCostUsd(
  settings: Awaited<ReturnType<typeof getAiPricingSettings>>,
  providerCredits: number
) {
  return settings.webSearchCreditCostUsd * Math.max(0, providerCredits);
}

export function requireWebSearchPricing(
  settings: Awaited<ReturnType<typeof getAiPricingSettings>>
) {
  if (!settings.webSearchPricingConfigured) {
    throw new Error('WEB_SEARCH_PRICING_NOT_CONFIGURED');
  }
}

export function calculateAiPrice({
  model,
  usage,
  multiplier,
  creditValueUsd,
  minimumMarginUsd,
  minimumCredits,
}: {
  model: ResolvedAiModel;
  usage: AiUsageInput;
  multiplier: number;
  creditValueUsd: number;
  minimumMarginUsd: number;
  minimumCredits: number;
}): AiPriceResult {
  const inputCost =
    ((usage.inputTokens ?? 0) * Number(model.inputPricePerMillion)) / 1_000_000;
  const outputCost =
    ((usage.outputTokens ?? 0) * Number(model.outputPricePerMillion)) /
    1_000_000;
  const cacheReadCost =
    ((usage.cacheReadTokens ?? 0) *
      Number(model.cacheReadPricePerMillion ?? 0)) /
    1_000_000;
  const cacheWriteCost =
    ((usage.cacheWriteTokens ?? 0) *
      Number(model.cacheWritePricePerMillion ?? 0)) /
    1_000_000;
  const internalCostUsd =
    inputCost +
    outputCost +
    cacheReadCost +
    cacheWriteCost +
    (usage.webSearchCostUsd ?? 0) +
    (usage.fileCostUsd ?? 0) +
    (usage.memoryCostUsd ?? 0);
  const retailCostUsd = Math.max(
    internalCostUsd * multiplier,
    internalCostUsd + minimumMarginUsd
  );
  const rawCredits = retailCostUsd / creditValueUsd;

  return {
    internalCostUsd,
    retailCostUsd,
    rawCredits,
    credits: Math.max(minimumCredits, Math.ceil(rawCredits - 1e-9)),
  };
}

export function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 3));
}
