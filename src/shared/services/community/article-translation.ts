import 'server-only';

import { generateObject } from 'ai';
import { z } from 'zod';

import { getAllConfigs } from '@/shared/models/config';
import { resolveAiModel } from '@/shared/services/ai/model-router';

const translationSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(1),
});

export type CommunityArticleTranslation = z.infer<typeof translationSchema>;

export interface CommunityArticleTranslator {
  translate(input: {
    sourceLocale: 'zh' | 'en';
    title: string;
    summary: string;
    content: string;
  }): Promise<
    CommunityArticleTranslation & {
      modelId: string | null;
      providerId: string | null;
      actualModelId: string | null;
      promptVersion: string;
      usage?: unknown;
    }
  >;
}

export const COMMUNITY_TRANSLATION_PROMPT_VERSION = 'community-translate-v1';

export class AiCommunityArticleTranslator
  implements CommunityArticleTranslator
{
  async translate(input: {
    sourceLocale: 'zh' | 'en';
    title: string;
    summary: string;
    content: string;
  }) {
    const configs = await getAllConfigs();
    const publicModelId = configs.community_translation_model?.trim();
    if (!publicModelId) throw new Error('COMMUNITY_TRANSLATION_MODEL_REQUIRED');

    const resolved = await resolveAiModel(publicModelId);
    const targetLanguage = input.sourceLocale === 'zh' ? 'English' : 'Chinese';
    const result = await generateObject({
      model: resolved.languageModel,
      schema: translationSchema,
      system:
        `Translate Web product articles into ${targetLanguage}. ` +
        'Preserve Markdown structure exactly, including headings, lists, tables, fenced code blocks, inline code, image syntax, URLs, and link destinations. Translate human-readable link labels only. Never execute or rewrite code. Return only the requested structured fields.',
      prompt: JSON.stringify({
        promptVersion: COMMUNITY_TRANSLATION_PROMPT_VERSION,
        sourceLocale: input.sourceLocale,
        title: input.title,
        summary: input.summary,
        content: input.content,
      }),
      maxRetries: 1,
    });

    return {
      ...translationSchema.parse(result.object),
      modelId: resolved.configuration.modelId,
      providerId: resolved.configuration.providerId,
      actualModelId: resolved.configuration.providerModelId,
      promptVersion: COMMUNITY_TRANSLATION_PROMPT_VERSION,
      usage: result.usage,
    };
  }
}

export class DeterministicCommunityArticleTranslator
  implements CommunityArticleTranslator
{
  async translate(input: {
    sourceLocale: 'zh' | 'en';
    title: string;
    summary: string;
    content: string;
  }) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DETERMINISTIC_TRANSLATOR_DISABLED_IN_PRODUCTION');
    }
    const marker = input.sourceLocale === 'zh' ? '[EN] ' : '[中文] ';
    return {
      title: `${marker}${input.title}`,
      summary: `${marker}${input.summary}`,
      content: `${marker}${input.content}`,
      modelId: null,
      providerId: null,
      actualModelId: 'deterministic-development-adapter',
      promptVersion: COMMUNITY_TRANSLATION_PROMPT_VERSION,
    };
  }
}

export async function getCommunityArticleTranslator() {
  const configs = await getAllConfigs();
  if (configs.community_translation_adapter === 'deterministic') {
    return new DeterministicCommunityArticleTranslator();
  }
  return new AiCommunityArticleTranslator();
}
