import 'server-only';

import { getAllConfigs } from '@/shared/models/config';

export interface ExternalSource {
  type: 'web';
  title: string;
  url: string;
  excerpt: string;
}

export type WebSearchDepth = 'basic' | 'advanced';

export async function searchWeb(question: string) {
  const configs = await getAllConfigs();
  const apiKeyEnvName = configs.ai_web_search_api_key_env || 'TAVILY_API_KEY';
  const apiKey = process.env[apiKeyEnvName];
  if (!apiKey) throw new Error('WEB_SEARCH_NOT_CONFIGURED');
  const searchDepth: WebSearchDepth =
    configs.ai_web_search_depth === 'advanced' ? 'advanced' : 'basic';

  const response = await fetch(
    configs.ai_web_search_url || 'https://api.tavily.com/search',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: question,
        search_depth: searchDepth,
        max_results: 5,
        include_answer: false,
        include_usage: true,
      }),
    }
  );
  if (!response.ok) throw new Error('WEB_SEARCH_FAILED');
  const result = (await response.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
    usage?: { credits?: number };
  };
  const sources = (result.results ?? [])
    .filter((item) => item.title && item.url)
    .map(
      (item): ExternalSource => ({
        type: 'web',
        title: item.title!,
        url: item.url!,
        excerpt: item.content?.slice(0, 1200) || '',
      })
    );
  const defaultCredits = searchDepth === 'advanced' ? 2 : 1;
  const providerCredits = Number(result.usage?.credits ?? defaultCredits);
  return {
    sources,
    executed: true as const,
    searchDepth,
    providerCredits:
      Number.isFinite(providerCredits) && providerCredits > 0
        ? providerCredits
        : defaultCredits,
  };
}
