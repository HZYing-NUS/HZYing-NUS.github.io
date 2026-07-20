import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  type UIMessage,
} from 'ai';

import { enforceFixedWindowRateLimit } from '@/shared/lib/rate-limit';
import {
  getAiFilesByIds,
  getRelevantProjectFiles,
} from '@/shared/models/ai_file';
import {
  acquireAiRequestLease,
  assertAiAccess,
  releaseAiRequestLease,
} from '@/shared/models/ai_guard';
import { findChatById, updateChat } from '@/shared/models/chat';
import {
  ChatMessageStatus,
  claimChatMessageFallback,
  claimChatMessageRequest,
  createChatMessage,
  failChatMessageRequest,
  findChatMessageById,
  getChatMessages,
  updateChatMessage,
} from '@/shared/models/chat_message';
import {
  extendCreditReservation,
  refundCreditReservation,
  reserveCredits,
  settleCreditReservation,
} from '@/shared/models/credit';
import {
  saveGlobalMemoryCandidates,
  saveProjectMemoryCandidates,
} from '@/shared/models/memory';
import { findProjectById } from '@/shared/models/project';
import { enqueueReferralEventBestEffort } from '@/shared/models/referral';
import { findUserById, getUserInfo } from '@/shared/models/user';
import { buildAiContext } from '@/shared/services/ai/context';
import { sumChargeableParseCosts } from '@/shared/services/ai/file-parse-policy';
import { parseAiFile } from '@/shared/services/ai/file-parsing';
import {
  extractGlobalMemoryCandidates,
  extractProjectMemoryCandidates,
} from '@/shared/services/ai/memory-extraction';
import {
  createPriceSnapshot,
  getFallbackAvailability,
  getReasoningBudgetTokens,
  getReasoningEffort,
  isReasoningEnabledForModel,
  resolveAiModel,
} from '@/shared/services/ai/model-router';
import {
  AI_ESTIMATED_BASE_OUTPUT_TOKENS,
  calculateAddonOnlyPrice,
  calculateAiPrice,
  calculateContextAddonCosts,
  calculateFileParseCostUsd,
  calculateWebSearchCostUsd,
  estimateStreamingOutputTokenUpperBound,
  estimateTokenCount,
  getAiPricingSettings,
  requireWebSearchPricing,
} from '@/shared/services/ai/pricing';
import { referralEventKey } from '@/shared/services/referral-policy';

export const maxDuration = 120;

function internalErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'AI_REQUEST_FAILED';
}

function publicErrorCode(error: unknown) {
  const message = internalErrorMessage(error);
  if (message.includes('Insufficient credits')) return 'INSUFFICIENT_CREDITS';
  if (
    [
      'AI_ACCESS_BLOCKED',
      'AI_CONCURRENCY_LIMIT',
      'INSUFFICIENT_CREDITS',
      'WEB_SEARCH_NOT_CONFIGURED',
      'WEB_SEARCH_PRICING_NOT_CONFIGURED',
      'MODEL_NOT_AVAILABLE',
      'MODEL_DOES_NOT_SUPPORT_VISION',
      'INVALID_FALLBACK_CONFIRMATION',
      'REASONING_NOT_AVAILABLE',
      'FALLBACK_CONFIRMATION_ALREADY_USED',
      'REQUEST_ABORTED',
    ].includes(message)
  ) {
    return message;
  }
  return 'AI_REQUEST_FAILED';
}

function isInsufficientCreditError(error: unknown) {
  return internalErrorMessage(error).includes('Insufficient credits');
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function messageText(message: UIMessage) {
  return message.parts
    .filter(
      (
        part
      ): part is Extract<(typeof message.parts)[number], { type: 'text' }> =>
        part.type === 'text'
    )
    .map((part) => part.text)
    .join('\n')
    .trim();
}

export async function POST(req: Request) {
  let reservationId: string | undefined;
  let userId: string | undefined;
  let modelConfiguration:
    | Awaited<ReturnType<typeof resolveAiModel>>['configuration']
    | undefined;
  let assistantMessageId = generateId().toLowerCase();
  let finalized = false;
  let streamFailure: string | undefined;
  let settlementAudit:
    | {
        inputTokens: number;
        outputTokens: number;
        cacheReadTokens: number;
        settledCredits: number;
        refundedCredits: number;
      }
    | undefined;
  let assistantSaved = false;
  let requestLeaseId: string | undefined;
  let requestLeaseReleased = false;
  let requestMessageClaimed = false;
  let requestMessageId: string | undefined;
  let requestLeaseReleasePromise: Promise<void> | undefined;

  const releaseRequestLease = async () => {
    if (!requestLeaseId || !userId || requestLeaseReleased) return;
    if (requestLeaseReleasePromise) return requestLeaseReleasePromise;

    const leaseId = requestLeaseId;
    const leaseUserId = userId;
    requestLeaseReleasePromise = (async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await releaseAiRequestLease(leaseId, leaseUserId);
          requestLeaseReleased = true;
          return;
        } catch (error) {
          lastError = error;
        }
      }
      console.error('AI request lease release failed', {
        requestLeaseId: leaseId,
        userId: leaseUserId,
        error: internalErrorMessage(lastError),
      });
    })();

    await requestLeaseReleasePromise;
    if (!requestLeaseReleased) requestLeaseReleasePromise = undefined;
  };

  const refundReservedCredits = async (reason: string) => {
    if (!reservationId || !userId || finalized) return;

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await refundCreditReservation({
          reservationId,
          userId,
          reason,
        });
        finalized = true;
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };

  try {
    const body = (await req.json()) as {
      chatId?: string;
      message?: UIMessage;
      model?: string;
      webSearch?: boolean;
      reasoning?: boolean;
      fileIds?: string[];
      locale?: string;
      disableSkill?: boolean;
      fallbackForMessageId?: string;
    };
    if (!body.chatId || !body.message?.id || !body.message.parts?.length) {
      return Response.json({ message: 'INVALID_REQUEST' }, { status: 400 });
    }
    requestMessageId = body.message.id;
    const user = await getUserInfo();
    if (!user)
      return Response.json({ message: 'UNAUTHORIZED' }, { status: 401 });
    userId = user.id;
    await assertAiAccess(user.id);
    const rateLimit = await enforceFixedWindowRateLimit(req, {
      keyPrefix: 'ai-chat',
      key: `ai-chat:user:${user.id}`,
      limit: positiveInteger(process.env.AI_RATE_LIMIT_PER_MINUTE, 12),
      windowSeconds: 60,
    });
    if (rateLimit) return rateLimit;

    const chat = await findChatById(body.chatId, user.id);
    if (!chat)
      return Response.json({ message: 'CHAT_NOT_FOUND' }, { status: 404 });
    const requestClaimed = await claimChatMessageRequest({
      id: body.message.id,
      chatId: chat.id,
      userId: user.id,
      status: ChatMessageStatus.PROCESSING,
      role: 'user',
      parts: JSON.stringify(body.message.parts),
      metadata: JSON.stringify({ requestState: 'processing' }),
      model: chat.model,
      provider: 'pending',
      webSearchEnabled: chat.webSearchEnabled,
      fileIds: Array.isArray(body.fileIds) ? body.fileIds : [],
    });
    if (!requestClaimed) {
      const existingUserMessage = await findChatMessageById(
        body.message.id,
        user.id
      );
      return Response.json(
        {
          message:
            existingUserMessage?.chatId === chat.id
              ? 'MESSAGE_ALREADY_PROCESSED'
              : 'MESSAGE_ID_CONFLICT',
        },
        { status: 409 }
      );
    }
    requestMessageClaimed = true;

    const primaryResolved = await resolveAiModel(chat.model);
    let fallbackSourceMessage:
      | Awaited<ReturnType<typeof findChatMessageById>>
      | undefined;
    let fallbackOffer:
      | {
          estimatedCredits?: number;
          sameModel?: boolean;
          offeredAt?: string;
        }
      | undefined;
    if (body.fallbackForMessageId) {
      fallbackSourceMessage = await findChatMessageById(
        body.fallbackForMessageId,
        user.id
      );
      if (fallbackSourceMessage?.metadata) {
        try {
          fallbackOffer = (
            JSON.parse(fallbackSourceMessage.metadata) as {
              fallbackOffer?: typeof fallbackOffer;
            }
          ).fallbackOffer;
        } catch {
          fallbackOffer = undefined;
        }
      }
      if (
        !fallbackSourceMessage ||
        fallbackSourceMessage.chatId !== chat.id ||
        fallbackSourceMessage.role !== 'user' ||
        !fallbackSourceMessage.errorReason?.startsWith('CHANNEL_FAILURE:') ||
        fallbackSourceMessage.provider !==
          primaryResolved.configuration.providerCode ||
        fallbackSourceMessage.model !== chat.model ||
        !fallbackOffer?.offeredAt ||
        fallbackSourceMessage.fallbackConfirmedAt
      ) {
        throw new Error('INVALID_FALLBACK_CONFIRMATION');
      }
    }

    const resolved = fallbackSourceMessage
      ? await resolveAiModel(chat.model, 'fallback')
      : primaryResolved;
    modelConfiguration = resolved.configuration;
    if (body.reasoning && !isReasoningEnabledForModel(modelConfiguration)) {
      throw new Error('REASONING_NOT_AVAILABLE');
    }
    const requestMessage = fallbackSourceMessage
      ? {
          ...body.message,
          parts: fallbackSourceMessage.parts
            ? (JSON.parse(fallbackSourceMessage.parts) as UIMessage['parts'])
            : body.message.parts,
        }
      : body.message;
    const pricingSettings = await getAiPricingSettings();
    if (chat.webSearchEnabled) requireWebSearchPricing(pricingSettings);
    let fileIds = Array.isArray(body.fileIds)
      ? body.fileIds.filter((id): id is string => typeof id === 'string')
      : [];
    if (!fileIds.length && fallbackSourceMessage?.fileIds) {
      fileIds = Array.isArray(fallbackSourceMessage.fileIds)
        ? fallbackSourceMessage.fileIds.filter(
            (id): id is string => typeof id === 'string'
          )
        : [];
    }
    if (!fileIds.length && chat.projectId) {
      fileIds = (
        await getRelevantProjectFiles(
          user.id,
          chat.projectId,
          messageText(requestMessage)
        )
      ).map((file: { id: string }) => file.id);
    }
    const baseContext = await buildAiContext({
      userId: user.id,
      projectId: chat.projectId,
      chatId: chat.id,
      skillVersionId: chat.skillVersionId,
      skillDisabled: Boolean(chat.skillDisabledAt || body.disableSkill),
      webSearchEnabled: chat.webSearchEnabled,
      locale: body.locale === 'en' ? 'en' : 'zh',
      message: requestMessage,
      fileIds,
      includeWebSearch: false,
      allowParsing: false,
    });
    if (baseContext.imageParts.length && !modelConfiguration.supportsVision) {
      throw new Error('MODEL_DOES_NOT_SUPPORT_VISION');
    }

    const history = await getChatMessages({
      userId: user.id,
      chatId: chat.id,
      status: ChatMessageStatus.CREATED,
      page: 1,
      limit: 30,
      newestFirst: true,
    });
    const historyMessages = history
      .reverse()
      .filter((item) => item.id !== fallbackSourceMessage?.id)
      .map(
        (item): UIMessage => ({
          id: item.id,
          role: item.role as UIMessage['role'],
          parts: item.parts ? JSON.parse(item.parts) : [],
        })
      );
    historyMessages.push({
      ...requestMessage,
      parts: [
        ...requestMessage.parts,
        ...baseContext.imageParts,
      ] as UIMessage['parts'],
    });

    const inputText = `${baseContext.system}\n${historyMessages
      .map(messageText)
      .join('\n')}`;
    const reasoningEstimateTokens = body.reasoning
      ? getReasoningBudgetTokens(modelConfiguration)
      : 0;
    const estimatedOutputTokens = Math.min(
      modelConfiguration.maxOutputTokens,
      AI_ESTIMATED_BASE_OUTPUT_TOKENS + reasoningEstimateTokens
    );
    const estimatedInputTokens =
      estimateTokenCount(inputText) +
      baseContext.imageParts.length * pricingSettings.imageInputTokens;
    const estimatedWebSearchCostUsd = chat.webSearchEnabled
      ? pricingSettings.webSearchEstimatedCostUsd
      : 0;
    const baseAddonCosts = calculateContextAddonCosts({
      fileContextTokens: baseContext.fileContextTokens,
      memoryContextTokens: baseContext.memoryContextTokens,
      settings: pricingSettings,
    });
    const requestedFiles = await getAiFilesByIds(fileIds, user.id);
    const requestedFileIds = fileIds.slice(0, 10);
    if (requestedFiles.length !== new Set(requestedFileIds).size) {
      throw new Error('FILE_NOT_FOUND');
    }
    for (const file of requestedFiles) {
      const belongsToContext = chat.projectId
        ? file.projectId === chat.projectId || file.chatId === chat.id
        : file.chatId === chat.id;
      if (!belongsToContext) throw new Error('FILE_NOT_AVAILABLE_IN_CHAT');
    }
    const pendingParseFiles = requestedFiles.filter(
      (file: (typeof requestedFiles)[number]) =>
        file.parseStatus !== 'parsed' &&
        !file.mimeType.startsWith('image/') &&
        ['text/plain', 'text/markdown', 'application/pdf'].includes(
          file.mimeType
        )
    );
    const estimatedParseCostUsd = pendingParseFiles.reduce(
      (total: number, file: (typeof pendingParseFiles)[number]) =>
        total + calculateFileParseCostUsd(file.sizeBytes, pricingSettings),
      0
    );
    const estimate = calculateAiPrice({
      model: modelConfiguration,
      usage: {
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        webSearchCostUsd: estimatedWebSearchCostUsd,
        ...baseAddonCosts,
        fileCostUsd: baseAddonCosts.fileCostUsd + estimatedParseCostUsd,
      },
      ...pricingSettings,
    });
    let fallbackEstimatedCredits: number | undefined;
    const fallbackAvailability = getFallbackAvailability(modelConfiguration);
    if (resolved.channel === 'primary' && fallbackAvailability.available) {
      try {
        const fallbackResolved = await resolveAiModel(chat.model, 'fallback');
        if (
          body.reasoning &&
          !isReasoningEnabledForModel(fallbackResolved.configuration)
        ) {
          throw new Error('FALLBACK_REASONING_NOT_AVAILABLE');
        }
        const fallbackReasoningEstimateTokens = body.reasoning
          ? getReasoningBudgetTokens(fallbackResolved.configuration)
          : 0;
        fallbackEstimatedCredits = calculateAiPrice({
          model: fallbackResolved.configuration,
          usage: {
            inputTokens:
              estimateTokenCount(inputText) +
              baseContext.imageParts.length * pricingSettings.imageInputTokens,
            outputTokens: Math.min(
              fallbackResolved.configuration.maxOutputTokens,
              AI_ESTIMATED_BASE_OUTPUT_TOKENS + fallbackReasoningEstimateTokens
            ),
            webSearchCostUsd: chat.webSearchEnabled
              ? pricingSettings.webSearchEstimatedCostUsd
              : 0,
            ...baseAddonCosts,
            fileCostUsd: baseAddonCosts.fileCostUsd + estimatedParseCostUsd,
          },
          ...pricingSettings,
        }).credits;
      } catch {
        fallbackEstimatedCredits = undefined;
      }
    }
    const requestId = `chat:${chat.id}:${body.message.id}`;
    const requestLease = await acquireAiRequestLease({
      userId: user.id,
      limit: positiveInteger(process.env.AI_MAX_CONCURRENT_REQUESTS, 2),
      ttlSeconds: maxDuration + 60,
    });
    requestLeaseId = requestLease.id;
    const reservation = await reserveCredits({
      requestId,
      userId: user.id,
      credits: estimate.credits,
      idempotencyKey: `chat:${chat.id}:${body.message.id}`,
      priceSnapshot: createPriceSnapshot(modelConfiguration),
      costBreakdown: {
        model:
          estimate.internalCostUsd -
          (chat.webSearchEnabled
            ? pricingSettings.webSearchEstimatedCostUsd
            : 0) -
          baseAddonCosts.fileCostUsd -
          baseAddonCosts.memoryCostUsd -
          estimatedParseCostUsd,
        reasoningOutputTokens: reasoningEstimateTokens,
        webSearch: chat.webSearchEnabled
          ? pricingSettings.webSearchEstimatedCostUsd
          : 0,
        file: baseAddonCosts.fileCostUsd + estimatedParseCostUsd,
        fileParsing: estimatedParseCostUsd,
        memory: baseAddonCosts.memoryCostUsd,
        contextTokensIncludedInModel: true,
      },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    reservationId = reservation.id;
    let reservedCredits = reservation.reservedCredits;
    if (
      fallbackSourceMessage &&
      !(await claimChatMessageFallback(fallbackSourceMessage.id, user.id))
    ) {
      throw new Error('FALLBACK_CONFIRMATION_ALREADY_USED');
    }

    let actualParseCostUsd = 0;
    const parseAttempts: Array<{
      fileId: string;
      chargeable: boolean;
      costUsd: number;
    }> = [];
    for (const file of pendingParseFiles) {
      const costUsd = calculateFileParseCostUsd(
        file.sizeBytes,
        pricingSettings
      );
      const parseResult = await parseAiFile(file.id, user.id, requestId);
      parseAttempts.push({
        fileId: file.id,
        chargeable: parseResult.chargeable,
        costUsd,
      });
      actualParseCostUsd = sumChargeableParseCosts(parseAttempts);
      if (parseResult.status === 'in_progress') {
        const failureReason = 'FILE_PARSE_IN_PROGRESS';
        const parsingFailure = calculateAddonOnlyPrice({
          internalCostUsd: actualParseCostUsd,
          ...pricingSettings,
        });
        const chargedCredits = Math.min(
          parsingFailure.credits,
          reservedCredits
        );
        await settleCreditReservation({
          reservationId: reservation.id,
          userId: user.id,
          actualCredits: chargedCredits,
          usage: {
            fileCostUsd: String(actualParseCostUsd),
            internalCostUsd: String(parsingFailure.internalCostUsd),
            retailCostUsd: String(parsingFailure.retailCostUsd),
            rawCredits: String(parsingFailure.rawCredits),
            status: 'file_parse_failed',
            failureReason,
            metadata: { operation: 'file_parse', fileId: file.id },
            fileParseCharges: parseAttempts
              .filter((attempt) => attempt.chargeable)
              .map((attempt) => ({
                fileId: attempt.fileId,
                attemptId: requestId,
                actualCostUsd: String(attempt.costUsd),
              })),
          },
        });
        finalized = true;
        await updateChatMessage(
          body.message.id,
          {
            metadata: JSON.stringify({ requestState: 'failed' }),
            errorReason: failureReason,
          },
          user.id
        );
        throw new Error(failureReason);
      }
      if (parseResult.status === 'failed') {
        const failureReason = parseResult.error.message;
        const parsingFailure = calculateAddonOnlyPrice({
          internalCostUsd: actualParseCostUsd,
          ...pricingSettings,
        });
        const chargedCredits = Math.min(
          parsingFailure.credits,
          reservedCredits
        );
        await settleCreditReservation({
          reservationId: reservation.id,
          userId: user.id,
          actualCredits: chargedCredits,
          usage: {
            fileCostUsd: String(actualParseCostUsd),
            internalCostUsd: String(parsingFailure.internalCostUsd),
            retailCostUsd: String(parsingFailure.retailCostUsd),
            rawCredits: String(parsingFailure.rawCredits),
            status: 'file_parse_failed',
            failureReason,
            metadata: { operation: 'file_parse', fileId: file.id },
            fileParseCharges: parseAttempts
              .filter((attempt) => attempt.chargeable)
              .map((attempt) => ({
                fileId: attempt.fileId,
                attemptId: requestId,
                actualCostUsd: String(attempt.costUsd),
              })),
          },
        });
        finalized = true;
        await updateChatMessage(
          body.message.id,
          {
            metadata: JSON.stringify({ requestState: 'failed' }),
            errorReason: failureReason,
          },
          user.id
        );
        throw new Error('FILE_PARSE_FAILED');
      }
      if (!parseResult.file || parseResult.file.parseStatus !== 'parsed') {
        throw new Error('FILE_PARSE_NOT_AVAILABLE');
      }
    }

    const context = chat.webSearchEnabled
      ? await buildAiContext({
          userId: user.id,
          projectId: chat.projectId,
          chatId: chat.id,
          skillVersionId: chat.skillVersionId,
          skillDisabled: Boolean(chat.skillDisabledAt || body.disableSkill),
          webSearchEnabled: true,
          locale: body.locale === 'en' ? 'en' : 'zh',
          message: requestMessage,
          fileIds,
          allowParsing: false,
        })
      : pendingParseFiles.length
        ? await buildAiContext({
            userId: user.id,
            projectId: chat.projectId,
            chatId: chat.id,
            skillVersionId: chat.skillVersionId,
            skillDisabled: Boolean(chat.skillDisabledAt || body.disableSkill),
            webSearchEnabled: false,
            locale: body.locale === 'en' ? 'en' : 'zh',
            message: requestMessage,
            fileIds,
            includeWebSearch: false,
            allowParsing: false,
          })
        : baseContext;

    if (
      fallbackSourceMessage &&
      (!Array.isArray(fallbackSourceMessage.sourceDetails) ||
        !fallbackSourceMessage.sourceDetails.some(
          (source) =>
            source &&
            typeof source === 'object' &&
            (source as { type?: string }).type === 'web'
        ))
    ) {
      context.webSearchExecuted = false;
    }

    const actualInputText = `${context.system}\n${historyMessages
      .map(messageText)
      .join('\n')}`;
    const actualEstimatedInputTokens =
      estimateTokenCount(actualInputText) +
      context.imageParts.length * pricingSettings.imageInputTokens;
    const actualWebSearchCostUsd = context.webSearchExecuted
      ? calculateWebSearchCostUsd(
          pricingSettings,
          context.webSearchProviderCredits
        )
      : 0;
    const actualAddonCosts = calculateContextAddonCosts({
      fileContextTokens: context.fileContextTokens,
      memoryContextTokens: context.memoryContextTokens,
      settings: pricingSettings,
    });
    actualAddonCosts.fileCostUsd += actualParseCostUsd;
    const actualEstimate = calculateAiPrice({
      model: modelConfiguration,
      usage: {
        inputTokens: actualEstimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        webSearchCostUsd: actualWebSearchCostUsd,
        ...actualAddonCosts,
      },
      ...pricingSettings,
    });
    if (actualEstimate.credits > reservedCredits) {
      const additionalCredits = actualEstimate.credits - reservedCredits;
      try {
        await extendCreditReservation({
          reservationId: reservation.id,
          userId: user.id,
          additionalCredits,
          extensionId: `${reservation.id}:context:${actualEstimate.credits}`,
        });
        reservedCredits += additionalCredits;
      } catch (error) {
        if (isInsufficientCreditError(error)) {
          throw new Error('INSUFFICIENT_CREDITS');
        }
        throw error;
      }
    }

    if (body.disableSkill && chat.skillVersionId && !chat.skillDisabledAt) {
      await updateChat(chat.id, { skillDisabledAt: new Date() }, user.id);
    }

    await updateChatMessage(
      body.message.id,
      {
        status: ChatMessageStatus.CREATED,
        metadata: JSON.stringify({
          requestId,
          requestState: 'streaming',
          reasoning: Boolean(body.reasoning),
          fallbackForMessageId: fallbackSourceMessage?.id,
        }),
        model: chat.model,
        provider: modelConfiguration.providerCode,
        skillVersionId: chat.skillVersionId,
        webSearchEnabled: chat.webSearchEnabled,
        estimatedCredits: actualEstimate.credits,
        reservedCredits,
        reservationId: reservation.id,
        sourceDetails: context.sources,
        fileIds,
      },
      user.id
    );

    const abortController = new AbortController();
    const abortSignal = AbortSignal.any([req.signal, abortController.signal]);
    let streamedOutputText = '';
    let extensionCount = 0;
    let reservationExtensionPlatformFailure = false;
    let finalizationPromise: Promise<typeof settlementAudit> | undefined;

    const settle = async ({
      usage,
      status,
      failureReason,
    }: {
      usage: {
        inputTokens?: number;
        outputTokens?: number;
        reasoningTokens?: number;
        cachedInputTokens?: number;
      };
      status: string;
      failureReason?: string;
    }) => {
      if (finalized || !reservationId || !userId || !modelConfiguration) return;
      const actualWebSearchCostUsd = context.webSearchExecuted
        ? calculateWebSearchCostUsd(
            pricingSettings,
            context.webSearchProviderCredits
          )
        : 0;
      const actual = calculateAiPrice({
        model: modelConfiguration,
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadTokens: usage.cachedInputTokens,
          webSearchCostUsd: actualWebSearchCostUsd,
          ...actualAddonCosts,
        },
        ...pricingSettings,
      });
      if (actual.credits > reservedCredits) {
        const extraCredits = actual.credits - reservedCredits;
        try {
          await extendCreditReservation({
            reservationId,
            userId,
            additionalCredits: extraCredits,
            extensionId: `${reservationId}:final:${actual.credits}`,
          });
          reservedCredits += extraCredits;
        } catch {
          failureReason =
            failureReason || 'UNRESERVED_PROVIDER_COST_PLATFORM_COVERED';
        }
      }
      const chargedCredits = Math.min(actual.credits, reservedCredits);
      await settleCreditReservation({
        reservationId,
        userId,
        actualCredits: chargedCredits,
        usage: {
          providerId: modelConfiguration.providerId,
          modelId: modelConfiguration.modelId,
          skillVersionId: chat.skillVersionId ?? undefined,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadTokens: usage.cachedInputTokens,
          webSearchCostUsd: String(actualWebSearchCostUsd),
          fileCostUsd: String(actualAddonCosts.fileCostUsd),
          memoryCostUsd: String(actualAddonCosts.memoryCostUsd),
          internalCostUsd: String(actual.internalCostUsd),
          retailCostUsd: String(actual.retailCostUsd),
          rawCredits: String(actual.rawCredits),
          status:
            chargedCredits < actual.credits ? 'platform_cost_covered' : status,
          failureReason,
          metadata: {
            sources: context.sources,
            reasoning: Boolean(body.reasoning),
            reasoningTokens: usage.reasoningTokens ?? 0,
            webSearchDepth: context.webSearchDepth,
            webSearchProviderCredits: context.webSearchProviderCredits,
          },
          fileParseCharges: parseAttempts
            .filter((attempt) => attempt.chargeable)
            .map((attempt) => ({
              fileId: attempt.fileId,
              attemptId: requestId,
              actualCostUsd: String(attempt.costUsd),
            })),
        },
      });
      if (chargedCredits > 0) {
        await enqueueReferralEventBestEffort({
          eventType: 'first_ai_settlement',
          userId,
          idempotencyKey: referralEventKey('first_ai_settlement', userId),
          payload: { reservationId, actualCredits: chargedCredits },
        });
      }
      finalized = true;
      settlementAudit = {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        cacheReadTokens: usage.cachedInputTokens ?? 0,
        settledCredits: chargedCredits,
        refundedCredits: Math.max(0, reservedCredits - chargedCredits),
      };
      await updateChatMessage(
        body.message!.id,
        {
          inputTokens: settlementAudit.inputTokens,
          outputTokens: settlementAudit.outputTokens,
          cacheReadTokens: settlementAudit.cacheReadTokens,
          reservedCredits,
          settledCredits: settlementAudit.settledCredits,
          refundedCredits: settlementAudit.refundedCredits,
          errorReason: failureReason,
        },
        userId
      );
      if (assistantSaved) {
        await updateChatMessage(
          assistantMessageId,
          {
            inputTokens: settlementAudit.inputTokens,
            outputTokens: settlementAudit.outputTokens,
            cacheReadTokens: settlementAudit.cacheReadTokens,
            reservedCredits,
            settledCredits: settlementAudit.settledCredits,
            refundedCredits: settlementAudit.refundedCredits,
            errorReason: failureReason,
          },
          userId
        );
      }
      return settlementAudit;
    };

    const finalizeOnce = (
      finalize: () => Promise<typeof settlementAudit>
    ): Promise<typeof settlementAudit> => {
      if (!finalizationPromise) {
        finalizationPromise = finalize();
        void finalizationPromise.catch(() => undefined);
      }
      return finalizationPromise;
    };

    const startSettlement = (parameters: Parameters<typeof settle>[0]) =>
      finalizeOnce(() => settle(parameters));

    const startRefundFinalization = (failure: string, errorReason: string) =>
      finalizeOnce(async () => {
        await refundReservedCredits(failure);
        settlementAudit = {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          settledCredits: 0,
          refundedCredits: reservedCredits,
        };
        await updateChatMessage(
          body.message!.id,
          {
            errorReason,
            settledCredits: 0,
            refundedCredits: reservedCredits,
          },
          user.id
        );
        return settlementAudit;
      });

    const stream = createUIMessageStream({
      originalMessages: historyMessages,
      generateId: createIdGenerator({ size: 16 }),
      onError: (error) => publicErrorCode(error),
      execute: async ({ writer }) => {
        let providerFailureHandled = false;
        const handleProviderFailure = async (
          failure: string,
          offerFallback = true
        ) => {
          if (providerFailureHandled) return finalizationPromise;
          providerFailureHandled = true;
          await startRefundFinalization(
            failure,
            `${offerFallback ? 'CHANNEL_FAILURE' : 'PLATFORM_FAILURE'}:${failure}`
          );
          const offeredAt = new Date().toISOString();
          await updateChatMessage(
            body.message!.id,
            {
              metadata: JSON.stringify({
                requestId,
                reasoning: Boolean(body.reasoning),
                fallbackOffer:
                  offerFallback &&
                  resolved.channel === 'primary' &&
                  fallbackEstimatedCredits !== undefined
                    ? {
                        estimatedCredits: fallbackEstimatedCredits,
                        sameModel: fallbackAvailability.sameModel,
                        offeredAt,
                      }
                    : undefined,
              }),
            },
            user.id
          );
          if (
            offerFallback &&
            resolved.channel === 'primary' &&
            fallbackEstimatedCredits !== undefined
          ) {
            writer.write({
              type: 'data-provider-fallback',
              id: `provider-fallback:${body.message!.id}`,
              data: {
                sourceMessageId: body.message!.id,
                sameModel: fallbackAvailability.sameModel,
                estimatedCredits: fallbackEstimatedCredits,
                incurredCredits: 0,
                action: 'restart',
              },
            });
          }
        };

        try {
          for (const [index, source] of context.sources.entries()) {
            if (!source.url && source.type === 'file') {
              writer.write({
                type: 'data-file-source',
                id: `file:${index}`,
                data: { title: source.title, type: 'file' },
              });
              continue;
            }
            if (!source.url) continue;
            writer.write({
              type: 'source-url',
              sourceId: `${source.type}:${index}`,
              title: source.title,
              url: source.url,
              providerMetadata: { webtools: { sourceType: source.type } },
            });
          }

          const result = streamText({
            model: resolved.languageModel,
            system: context.system,
            messages: convertToModelMessages(historyMessages),
            maxOutputTokens: modelConfiguration!.maxOutputTokens,
            providerOptions: body.reasoning
              ? ((() => {
                  const effort = getReasoningEffort(modelConfiguration!);
                  if (
                    resolved.configuration.providerCode ===
                    'anthropic-compatible'
                  ) {
                    return {
                      anthropic: {
                        sendReasoning: true,
                        thinking: {
                          type: 'enabled' as const,
                          budgetTokens: getReasoningBudgetTokens(
                            modelConfiguration!
                          ),
                        },
                      },
                    };
                  }
                  if (
                    resolved.configuration.providerCode === 'openai-compatible'
                  ) {
                    return { openai: { reasoningEffort: effort } };
                  }
                  return { openrouter: { reasoning: { effort } } };
                })() as any)
              : undefined,
            abortSignal,
            onChunk: async ({ chunk }) => {
              if (chunk.type !== 'text-delta') return;
              streamedOutputText += chunk.text;
              const estimatedStreamOutputTokens =
                estimateStreamingOutputTokenUpperBound(streamedOutputText);
              const projectedCredits = calculateAiPrice({
                model: modelConfiguration!,
                usage: {
                  inputTokens: actualEstimatedInputTokens,
                  outputTokens: Math.min(
                    modelConfiguration!.maxOutputTokens,
                    estimatedStreamOutputTokens +
                      reasoningEstimateTokens +
                      pricingSettings.reservationThresholdTokens
                  ),
                  webSearchCostUsd: context.webSearchExecuted
                    ? calculateWebSearchCostUsd(
                        pricingSettings,
                        context.webSearchProviderCredits
                      )
                    : 0,
                  ...actualAddonCosts,
                },
                ...pricingSettings,
              }).credits;
              if (projectedCredits <= reservedCredits) return;

              const additionalCredits = Math.max(
                pricingSettings.reservationChunk,
                projectedCredits - reservedCredits
              );
              extensionCount += 1;
              try {
                await extendCreditReservation({
                  reservationId: reservation.id,
                  userId: user.id,
                  additionalCredits,
                  extensionId: `${reservation.id}:roll:${extensionCount}`,
                });
                reservedCredits += additionalCredits;
              } catch (error) {
                if (isInsufficientCreditError(error)) {
                  streamFailure = 'INSUFFICIENT_CREDITS_DURING_GENERATION';
                } else {
                  reservationExtensionPlatformFailure = true;
                  streamFailure = 'CREDIT_RESERVATION_EXTENSION_FAILED';
                  console.error('AI rolling reservation extension failed', {
                    reservationId: reservation.id,
                    userId: user.id,
                    error: internalErrorMessage(error),
                  });
                }
                abortController.abort(streamFailure);
              }
            },
            onFinish: ({ totalUsage }) => {
              const pendingSettlement = startSettlement({
                usage: totalUsage,
                status: streamFailure ? 'interrupted' : 'settled',
                failureReason: streamFailure,
              });
              void pendingSettlement
                .then((audit) => {
                  if (audit) {
                    writer.write({
                      type: 'data-credit-settlement',
                      id: `credit-settlement:${body.message!.id}`,
                      data: audit,
                    });
                  }
                })
                .finally(releaseRequestLease);
            },
            onAbort: ({ steps }) => {
              if (reservationExtensionPlatformFailure) {
                void handleProviderFailure(streamFailure!, false).finally(
                  releaseRequestLease
                );
                return;
              }
              const usage = steps.reduce(
                (total, step) => ({
                  inputTokens:
                    total.inputTokens + (step.usage.inputTokens ?? 0),
                  outputTokens:
                    total.outputTokens + (step.usage.outputTokens ?? 0),
                  reasoningTokens:
                    total.reasoningTokens + (step.usage.reasoningTokens ?? 0),
                  cachedInputTokens:
                    total.cachedInputTokens +
                    (step.usage.cachedInputTokens ?? 0),
                }),
                {
                  inputTokens: 0,
                  outputTokens: 0,
                  reasoningTokens: 0,
                  cachedInputTokens: 0,
                }
              );
              const pendingSettlement = startSettlement({
                usage,
                status: 'interrupted',
                failureReason: streamFailure || 'REQUEST_ABORTED',
              });
              void pendingSettlement
                .then((audit) => {
                  if (audit) {
                    writer.write({
                      type: 'data-credit-settlement',
                      id: `credit-settlement:${body.message!.id}`,
                      data: audit,
                    });
                  }
                })
                .finally(releaseRequestLease);
            },
            onError: ({ error }) => {
              streamFailure = publicErrorCode(error);
              console.error('AI stream failed', {
                requestId,
                userId: user.id,
                error: internalErrorMessage(error),
              });
              if (finalizationPromise) {
                void finalizationPromise.finally(releaseRequestLease);
                return;
              }
              void handleProviderFailure(
                streamFailure,
                !reservationExtensionPlatformFailure
              )
                .catch((refundError) => {
                  console.error('AI stream reservation refund failed', {
                    reservationId: reservation.id,
                    userId: user.id,
                    error: internalErrorMessage(refundError),
                  });
                })
                .finally(releaseRequestLease);
            },
          });
          writer.merge(
            result.toUIMessageStream({
              sendSources: true,
              sendReasoning: Boolean(body.reasoning),
            })
          );
        } catch (error) {
          streamFailure = publicErrorCode(error);
          console.error('AI stream setup failed', {
            requestId,
            userId: user.id,
            error: internalErrorMessage(error),
          });
          try {
            if (finalizationPromise) {
              await finalizationPromise;
            } else {
              await handleProviderFailure(streamFailure);
            }
          } catch (refundError) {
            console.error('AI stream setup reservation refund failed', {
              reservationId: reservation.id,
              userId: user.id,
              error: internalErrorMessage(refundError),
            });
          } finally {
            await releaseRequestLease();
          }
          throw error;
        }
      },
      onFinish: async ({ responseMessage, isAborted }) => {
        try {
          if (!finalizationPromise) {
            streamFailure =
              streamFailure || 'AI_TERMINAL_FINALIZATION_NOT_STARTED';
            startRefundFinalization(
              streamFailure,
              `PLATFORM_FAILURE:${streamFailure}`
            );
          }
          try {
            await finalizationPromise;
          } catch (error) {
            streamFailure = streamFailure || 'AI_FINALIZATION_FAILED';
            console.error('AI request finalization failed', {
              reservationId: reservation.id,
              userId: user.id,
              error: internalErrorMessage(error),
            });
          }
          const now = new Date();
          const fallbackOfferPart = responseMessage.parts.find(
            (part) => part.type === 'data-provider-fallback'
          );
          const fallbackOffer = fallbackOfferPart
            ? ((fallbackOfferPart as { data: unknown }).data as {
                sourceMessageId: string;
                sameModel: boolean;
                estimatedCredits: number;
                incurredCredits: number;
                action: 'restart';
              })
            : undefined;
          await createChatMessage({
            id: assistantMessageId,
            chatId: chat.id,
            userId: user.id,
            status: ChatMessageStatus.CREATED,
            createdAt: now,
            updatedAt: now,
            role: 'assistant',
            parts: JSON.stringify(responseMessage.parts),
            metadata: fallbackOffer
              ? JSON.stringify({ fallbackOffer })
              : undefined,
            model: chat.model,
            provider: modelConfiguration!.providerCode,
            skillVersionId: chat.skillVersionId,
            webSearchEnabled: chat.webSearchEnabled,
            reservationId: reservation.id,
            reservedCredits,
            inputTokens: settlementAudit?.inputTokens,
            outputTokens: settlementAudit?.outputTokens,
            cacheReadTokens: settlementAudit?.cacheReadTokens,
            settledCredits: settlementAudit?.settledCredits,
            refundedCredits: settlementAudit?.refundedCredits,
            sourceDetails: context.sources,
            fileIds,
            errorReason: isAborted
              ? streamFailure || 'REQUEST_ABORTED'
              : streamFailure,
          });
          assistantSaved = true;
          if (!isAborted && !streamFailure) {
            const question = messageText(requestMessage);
            const conclusion = messageText(responseMessage);
            if (chat.projectId) {
              const project = await findProjectById(chat.projectId, user.id);
              if (project?.autoMemoryEnabled) {
                await saveProjectMemoryCandidates({
                  userId: user.id,
                  projectId: chat.projectId,
                  sourceChatId: chat.id,
                  sourceMessageId: assistantMessageId,
                  userSourceMessageId: body.message!.id,
                  candidates: extractProjectMemoryCandidates(
                    question,
                    conclusion
                  ),
                });
              }
            } else {
              const memoryOwner = await findUserById(user.id);
              if (memoryOwner?.globalMemoryEnabled !== false) {
                await saveGlobalMemoryCandidates({
                  userId: user.id,
                  sourceChatId: chat.id,
                  sourceMessageId: body.message!.id,
                  contents: extractGlobalMemoryCandidates(question),
                });
              }
            }
          }
        } finally {
          await releaseRequestLease();
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const internalMessage = internalErrorMessage(error);
    const message = publicErrorCode(error);
    console.error('AI request failed', {
      reservationId,
      userId,
      error: internalMessage,
    });
    if (requestMessageClaimed && userId && requestMessageId) {
      await failChatMessageRequest(requestMessageId, userId, message).catch(
        (claimError) => {
          console.error('AI request claim failure update failed', {
            userId,
            error: internalErrorMessage(claimError),
          });
        }
      );
    }
    if (reservationId && userId && !finalized) {
      try {
        await refundReservedCredits(message);
      } catch (refundError) {
        console.error('AI reservation refund failed', {
          reservationId,
          userId,
          error: internalErrorMessage(refundError),
        });
        await releaseRequestLease();
        return Response.json(
          { message: 'REFUND_FAILED', requestFailure: message },
          { status: 500 }
        );
      }
    }
    await releaseRequestLease();
    const status =
      message === 'INSUFFICIENT_CREDITS'
        ? 402
        : message === 'AI_ACCESS_BLOCKED'
          ? 403
          : message === 'AI_CONCURRENCY_LIMIT'
            ? 429
            : message === 'WEB_SEARCH_NOT_CONFIGURED' ||
                message === 'WEB_SEARCH_PRICING_NOT_CONFIGURED'
              ? 503
              : message === 'MODEL_NOT_AVAILABLE'
                ? 400
                : message === 'MODEL_DOES_NOT_SUPPORT_VISION' ||
                    message === 'INVALID_FALLBACK_CONFIRMATION' ||
                    message === 'REASONING_NOT_AVAILABLE'
                  ? 400
                  : 500;
    return Response.json({ message }, { status });
  }
}
