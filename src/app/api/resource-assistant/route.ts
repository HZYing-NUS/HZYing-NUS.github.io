import { NextRequest } from 'next/server';

import {
  enforceFixedWindowRateLimit,
  enforceMinIntervalRateLimit,
} from '@/shared/lib/rate-limit';
import { getSignUser } from '@/shared/models/user';
import { retrieveAssistantSources } from '@/shared/services/resource-assistant';

export async function POST(request: NextRequest) {
  const user = await getSignUser();
  if (!user) {
    return Response.json({ message: 'UNAUTHORIZED' }, { status: 401 });
  }

  const fixedWindowResponse = await enforceFixedWindowRateLimit(request, {
    keyPrefix: 'resource-assistant',
    key: `resource-assistant:user:${user.id}`,
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
  if (!question) {
    return Response.json({ message: 'QUESTION_REQUIRED' }, { status: 400 });
  }

  const sources = await retrieveAssistantSources(question, locale);
  return Response.json({
    answer:
      locale === 'zh'
        ? sources.length
          ? '已找到相关站内资料。需要 AI 综合回答时，请进入聊天工作区；聊天会在调用模型前预扣 Credit。'
          : '没有找到达到相关性阈值的可引用站内内容。'
        : sources.length
          ? 'Relevant site sources were found. Open the chat workspace for an AI synthesis; chat reserves Credit before calling a model.'
          : 'No citable site content met the relevance threshold.',
    sources: sources.map(({ title, url, type }) => ({ title, url, type })),
    aiGeneration: false,
  });
}
