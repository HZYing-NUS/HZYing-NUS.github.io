import 'server-only';

import { getAllConfigs } from '@/shared/models/config';

export interface ExternalSource {
  type: 'web';
  title: string;
  url: string;
  excerpt: string;
}

export async function searchWeb(question: string) {
  const configs = await getAllConfigs();
  const apiKeyEnvName = configs.ai_web_search_api_key_env || 'TAVILY_API_KEY';
  const apiKey = process.env[apiKeyEnvName];
  if (!apiKey) throw new Error('WEB_SEARCH_NOT_CONFIGURED');

  const response = await fetch(
    configs.ai_web_search_url || 'https://api.tavily.com/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: question,
        search_depth: 'basic',
        max_results: 5,
        include_answer: false,
      }),
    }
  );
  if (!response.ok) throw new Error('WEB_SEARCH_FAILED');
  const result = (await response.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
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
  return { sources, executed: true as const };
}
