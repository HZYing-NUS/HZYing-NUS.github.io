import { getEnabledModels } from '@/shared/models/ai_catalog';
import { getAllConfigs } from '@/shared/models/config';
import { isReasoningEnabledForModel } from '@/shared/services/ai/model-router';

export async function GET() {
  const [models, configs] = await Promise.all([
    getEnabledModels(),
    getAllConfigs(),
  ]);
  const webSearchApiKeyEnv =
    configs.ai_web_search_api_key_env || 'TAVILY_API_KEY';
  const webSearchCostUsd = Number(configs.ai_web_search_cost_usd || '0');
  const defaultModel = models[0];
  return Response.json({
    defaultModel: defaultModel
      ? { id: defaultModel.publicId, name: defaultModel.visibleName }
      : null,
    webSearchAvailable: Boolean(
      process.env[webSearchApiKeyEnv] && webSearchCostUsd > 0
    ),
    models: [
      {
        id: 'auto',
        name: 'Auto',
        description: null,
        supportsReasoning: defaultModel
          ? isReasoningEnabledForModel(defaultModel)
          : false,
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
        supportsReasoning: isReasoningEnabledForModel(model),
        recommendationMode: model.recommendationMode,
      })),
    ],
  });
}
