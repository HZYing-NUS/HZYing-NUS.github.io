import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

import { getAllConfigs } from '@/shared/models/config';
import { getSignUser } from '@/shared/models/user';
import { enforceFixedWindowRateLimit, enforceMinIntervalRateLimit } from '@/shared/lib/rate-limit';
import { retrieveAssistantSources } from '@/shared/services/resource-assistant';

export async function POST(request: NextRequest) {
  const user = await getSignUser();
  const fixedWindowResponse = await enforceFixedWindowRateLimit(request, {
    keyPrefix: 'resource-assistant',
    key: user ? `resource-assistant:user:${user.id}` : undefined,
    limit: 12,
    windowSeconds: 60,
  });
  if (fixedWindowResponse) return fixedWindowResponse;

  const intervalResponse = enforceMinIntervalRateLimit(request, {
    keyPrefix: 'resource-assistant-interval',
    intervalMs: 1200,
  });
  if (intervalResponse) return intervalResponse;

  const body = await request.json();
  const question = String(body.question || '').trim();
  const locale = body.locale === 'en' ? 'en' : 'zh';
  if (!question) return Response.json({ message: 'Question is required.' }, { status: 400 });

  const sources = await retrieveAssistantSources(question, locale);
  if (!sources.length) {
    return Response.json({
      answer: locale === 'zh' ? '没有找到可引用的站内内容，暂时无法可靠回答。' : 'I could not find citable content on this site, so I cannot answer reliably.',
      sources: [],
    });
  }

  const configs = await getAllConfigs();
  const apiKey = configs.openrouter_api_key;
  const model = configs.openrouter_default_model;
  if (!apiKey || !model) {
    return Response.json({ message: 'AI provider is not configured.' }, { status: 503 });
  }

  const openrouter = createOpenRouter({ apiKey });
  const context = sources.map((source, index) => `[${index + 1}] ${source.type}: ${source.title}\nURL: ${source.url}\n${source.excerpt}`).join('\n\n');
  const result = streamText({
    model: openrouter(model),
    system: locale === 'zh'
      ? '你是 AI Web SaaS 出海资源助手。只能根据提供的站内来源回答，不要编造。若来源不足，请明确说明。回答简洁，并在涉及具体建议时引用来源编号。'
      : 'You are an AI Web SaaS resource assistant. Answer only from the provided site sources and do not invent facts. State when the sources are insufficient. Keep answers concise and cite source numbers for concrete recommendations.',
    prompt: `Question: ${question}\n\nSite sources:\n${context}`,
  });

  return result.toTextStreamResponse({ headers: { 'x-resource-sources': JSON.stringify(sources.map(({ title, url, type }) => ({ title, url, type }))) } });
}
