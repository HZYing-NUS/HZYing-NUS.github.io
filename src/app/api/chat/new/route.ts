import { generateId } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import { ChatStatus, createChat, toPublicChat } from '@/shared/models/chat';
import { getAllConfigs } from '@/shared/models/config';
import { getRemainingCredits } from '@/shared/models/credit';
import { findProjectById } from '@/shared/models/project';
import { findPublishedSkill } from '@/shared/models/skill';
import { getUserInfo } from '@/shared/models/user';
import {
  isReasoningEnabledForModel,
  resolveAiModel,
} from '@/shared/services/ai/model-router';
import {
  getAiPricingSettings,
  requireWebSearchPricing,
} from '@/shared/services/ai/pricing';

export async function POST(req: Request) {
  try {
    const { message, body } = (await req.json()) as {
      message?: { text?: string };
      body?: {
        model?: string;
        projectId?: string;
        skill?: string;
        webSearch?: boolean;
        reasoning?: boolean;
        hasAttachments?: boolean;
      };
    };
    const text = message?.text?.trim();
    if (!body?.model) return respErr('MODEL_REQUIRED');

    const user = await getUserInfo();
    if (!user) return respErr('UNAUTHORIZED');
    if (body.webSearch) {
      const [pricingSettings, configs] = await Promise.all([
        getAiPricingSettings(),
        getAllConfigs(),
      ]);
      requireWebSearchPricing(pricingSettings);
      const webSearchApiKeyEnv =
        configs.ai_web_search_api_key_env || 'TAVILY_API_KEY';
      if (!process.env[webSearchApiKeyEnv]) {
        return respErr('WEB_SEARCH_NOT_CONFIGURED');
      }
    }
    const project = body?.projectId
      ? await findProjectById(body.projectId, user.id)
      : undefined;
    if (!text && !project && !body?.hasAttachments)
      return respErr('MESSAGE_REQUIRED');
    if (text && (await getRemainingCredits(user.id)) < 1) {
      return respErr('INSUFFICIENT_CREDITS');
    }

    const resolved = await resolveAiModel(body.model);
    if (
      body.reasoning &&
      !isReasoningEnabledForModel(resolved.configuration.publicId)
    ) {
      return respErr('REASONING_NOT_AVAILABLE');
    }
    let skillVersionId: string | undefined;
    if (body.skill && body.skill !== 'general') {
      if (body.skill !== 'product-idea-diagnosis') {
        return respErr('SKILL_NOT_AVAILABLE');
      }
      const publishedSkill = await findPublishedSkill(body.skill);
      if (!publishedSkill) return respErr('SKILL_NOT_AVAILABLE');
      skillVersionId = publishedSkill.version.id;
    }

    const pendingMessageId =
      text || body?.hasAttachments ? generateId().toLowerCase() : undefined;
    const chat = await createChat({
      id: generateId().toLowerCase(),
      userId: user.id,
      status: ChatStatus.CREATED,
      model: resolved.configuration.publicId,
      provider: resolved.configuration.providerCode,
      title: text?.substring(0, 100) || project!.name,
      parts: '',
      metadata: JSON.stringify({
        pendingMessageId,
        pendingReasoning: Boolean(body.reasoning),
      }),
      content: text ? JSON.stringify({ text }) : null,
      projectId: body.projectId,
      skillVersionId,
      webSearchEnabled: Boolean(body.webSearch),
    });

    return respData({ ...toPublicChat(chat), pendingMessageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NEW_CHAT_FAILED';
    return respErr(message);
  }
}
