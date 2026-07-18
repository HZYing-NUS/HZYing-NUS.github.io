import { getEnabledModels } from '@/shared/models/ai_catalog';
import { getAllConfigs } from '@/shared/models/config';

export async function GET() {
  const [models, configs] = await Promise.all([
    getEnabledModels(),
    getAllConfigs(),
  ]);
  const webSearchApiKeyEnv =
    configs.ai_web_search_api_key_env || 'TAVILY_API_KEY';
  const webSearchCostUsd = Number(configs.ai_web_search_cost_usd || '0');
  return Response.json({
    webSearchAvailable: Boolean(
      process.env[webSearchApiKeyEnv] && webSearchCostUsd > 0
    ),
    models: [
      {
        id: 'auto',
        name: '自动选择',
        description: '由 WebTools 选择当前默认模型',
      },
      ...models.map((model: (typeof models)[number]) => ({
        id: model.publicId,
        name: model.visibleName,
        description: model.description,
        contextWindow: model.contextWindow,
        maxOutputTokens: model.maxOutputTokens,
        supportsVision: model.supportsVision,
        supportsTools: model.supportsTools,
        supportsStreaming: model.supportsStreaming,
        recommendationMode: model.recommendationMode,
      })),
    ],
  });
}
