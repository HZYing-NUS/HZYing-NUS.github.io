import type { UIMessage } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import {
  getAiFilesByIds,
  getRelevantProjectFiles,
} from '@/shared/models/ai_file';
import {
  ChatMessageStatus,
  getChatMessages,
} from '@/shared/models/chat_message';
import { findPublishedSkill } from '@/shared/models/skill';
import { getUserInfo } from '@/shared/models/user';
import { buildAiContext } from '@/shared/services/ai/context';
import {
  getReasoningBudgetTokens,
  isReasoningEnabledForModel,
  resolveAiModelConfiguration,
} from '@/shared/services/ai/model-router';
import {
  AI_ESTIMATED_BASE_OUTPUT_TOKENS,
  calculateAiPrice,
  calculateContextAddonCosts,
  calculateFileParseCostUsd,
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
    const model = await resolveAiModelConfiguration(body.model || 'auto');
    if (body.reasoning && !isReasoningEnabledForModel(model)) {
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
    if (body.skill && body.skill !== 'general' && !requestedSkill) {
      return respErr('SKILL_NOT_AVAILABLE');
    }
    const context = await buildAiContext({
      userId: user.id,
      projectId: body.projectId || null,
      chatId: body.chatId || 'estimate',
      skillVersionId: body.skillVersionId || requestedSkill?.version.id || null,
      skillDisabled: Boolean(body.skillDisabled),
      webSearchEnabled: false,
      includeWebSearch: false,
      locale: body.locale === 'en' ? 'en' : 'zh',
      fileIds,
      allowBinaryLoading: false,
      message: {
        id: 'estimate',
        role: 'user',
        parts: [{ type: 'text', text }],
      } as UIMessage,
    });
    const settings = await getAiPricingSettings();
    if (body.webSearch) requireWebSearchPricing(settings);
    const history = body.chatId
      ? await getChatMessages({
          userId: user.id,
          chatId: body.chatId,
          status: ChatMessageStatus.CREATED,
          page: 1,
          limit: 30,
          newestFirst: true,
        })
      : [];
    const historyText = history
      .reverse()
      .map((message) => {
        if (!message.parts) return message.content || '';
        try {
          const parts = JSON.parse(message.parts) as UIMessage['parts'];
          return parts
            .filter(
              (
                part
              ): part is Extract<
                UIMessage['parts'][number],
                { type: 'text' }
              > => part.type === 'text'
            )
            .map((part) => part.text)
            .join('\n');
        } catch {
          return message.content || '';
        }
      })
      .join('\n');
    const inputTokens =
      estimateTokenCount(`${context.system}\n${historyText}\n${text}`) +
      context.imageParts.length * settings.imageInputTokens;
    const reasoningTokens = body.reasoning
      ? getReasoningBudgetTokens(model)
      : 0;
    const outputTokens = Math.min(
      model.maxOutputTokens,
      AI_ESTIMATED_BASE_OUTPUT_TOKENS + reasoningTokens
    );
    const addonCosts = calculateContextAddonCosts({
      fileContextTokens: context.fileContextTokens,
      memoryContextTokens: context.memoryContextTokens,
      settings,
    });
    const files = await getAiFilesByIds(fileIds.slice(0, 10), user.id);
    const estimatedParseCostUsd = files.reduce(
      (total: number, file: (typeof files)[number]) =>
        file.parseStatus === 'parsed' || file.mimeType.startsWith('image/')
          ? total
          : total + calculateFileParseCostUsd(file.sizeBytes, settings),
      0
    );
    addonCosts.fileCostUsd += estimatedParseCostUsd;
    const result = calculateAiPrice({
      model,
      usage: {
        inputTokens,
        outputTokens,
        webSearchCostUsd: body.webSearch
          ? settings.webSearchEstimatedCostUsd
          : 0,
        ...addonCosts,
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
      fileCostUsd: addonCosts.fileCostUsd,
      memoryCostUsd: addonCosts.memoryCostUsd,
      estimatedFileParseCostUsd: estimatedParseCostUsd,
      note: 'ESTIMATE_ONLY',
    });
  } catch (error) {
    console.error('AI credit estimate failed', {
      reason: error instanceof Error ? error.message : 'ESTIMATE_FAILED',
    });
    return respErr(error instanceof Error ? error.message : 'ESTIMATE_FAILED');
  }
}
