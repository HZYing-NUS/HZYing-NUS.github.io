import type { UIMessage } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import { getRelevantProjectFiles } from '@/shared/models/ai_file';
import { findPublishedSkill } from '@/shared/models/skill';
import { getUserInfo } from '@/shared/models/user';
import { buildAiContext } from '@/shared/services/ai/context';
import {
  getReasoningBudgetTokens,
  isReasoningEnabledForModel,
  resolveAiModel,
} from '@/shared/services/ai/model-router';
import {
  calculateAiPrice,
  estimateTokenCount,
  getAiPricingSettings,
  requireWebSearchPricing,
} from '@/shared/services/ai/pricing';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('UNAUTHORIZED');
    const body = await req.json();
    const text = String(body.text || '').trim();
    const model = await resolveAiModel(body.model || 'auto');
    if (body.reasoning && !isReasoningEnabledForModel(model.configuration)) {
      return respErr('REASONING_NOT_AVAILABLE');
    }
    const fileIds = Array.isArray(body.fileIds)
      ? body.fileIds
      : body.projectId
        ? (await getRelevantProjectFiles(user.id, body.projectId, text)).map(
            (file: { id: string }) => file.id
          )
        : [];
    const requestedSkill =
      body.skill && body.skill !== 'general'
        ? await findPublishedSkill(body.skill)
        : undefined;
    const context = await buildAiContext({
      userId: user.id,
      projectId: body.projectId || null,
      chatId: body.chatId || 'estimate',
      skillVersionId: body.skillVersionId || requestedSkill?.version.id || null,
      skillDisabled: false,
      webSearchEnabled: false,
      includeWebSearch: false,
      locale: body.locale === 'en' ? 'en' : 'zh',
      fileIds,
      message: {
        id: 'estimate',
        role: 'user',
        parts: [{ type: 'text', text }],
      } as UIMessage,
    });
    const settings = await getAiPricingSettings();
    if (body.webSearch) requireWebSearchPricing(settings);
    const inputTokens =
      estimateTokenCount(`${context.system}\n${text}`) +
      context.imageParts.length * settings.imageInputTokens;
    const reasoningTokens = body.reasoning
      ? getReasoningBudgetTokens(model.configuration)
      : 0;
    const outputTokens = Math.min(
      model.configuration.maxOutputTokens,
      1200 + reasoningTokens
    );
    const result = calculateAiPrice({
      model: model.configuration,
      usage: {
        inputTokens,
        outputTokens,
        webSearchCostUsd: body.webSearch
          ? settings.webSearchEstimatedCostUsd
          : 0,
      },
      ...settings,
    });
    return respData({
      credits: result.credits,
      inputTokens,
      assumedOutputTokens: outputTokens,
      assumedReasoningTokens: reasoningTokens,
      includesWebSearch: Boolean(body.webSearch),
      sourceCount: context.sources.length,
      imageCount: context.imageParts.length,
      note: 'ESTIMATE_ONLY',
    });
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'ESTIMATE_FAILED');
  }
}
