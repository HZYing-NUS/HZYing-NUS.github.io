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
import { getRelevantProjectFiles } from '@/shared/models/ai_file';
import {
  acquireAiRequestLease,
  assertAiAccess,
  releaseAiRequestLease,
} from '@/shared/models/ai_guard';
import { findChatById, updateChat } from '@/shared/models/chat';
import {
  ChatMessageStatus,
  claimChatMessageFallback,
  createChatMessage,
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
import { createProjectMemory } from '@/shared/models/memory';
import { findProjectById } from '@/shared/models/project';
import { getUserInfo } from '@/shared/models/user';
import { buildAiContext } from '@/shared/services/ai/context';
import {
  createPriceSnapshot,
  getFallbackAvailability,
  resolveAiModel,
} from '@/shared/services/ai/model-router';
import {
  calculateAiPrice,
  estimateTokenCount,
  getAiPricingSettings,
  requireWebSearchPricing,
} from '@/shared/services/ai/pricing';

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
      'WEB_SEARCH_NOT_CONFIGURED',
      'WEB_SEARCH_PRICING_NOT_CONFIGURED',
      'MODEL_NOT_AVAILABLE',
      'MODEL_DOES_NOT_SUPPORT_VISION',
      'FALLBACK_CONFIRMATION_ALREADY_USED',
      'REQUEST_ABORTED',
    ].includes(message)
  ) {
    return message;
  }
  return 'AI_REQUEST_FAILED';
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
    const user = await getUserInfo();
    if (!user)
      return Response.json({ message: 'UNAUTHORIZED' }, { status: 401 });
    userId = user.id;
    await assertAiAccess(user.id);
    if (body.reasoning) {
      return Response.json(
        { message: 'REASONING_NOT_AVAILABLE' },
        { status: 400 }
      );
    }
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
    const existingUserMessage = await findChatMessageById(
      body.message.id,
      user.id
    );
    if (existingUserMessage) {
      return Response.json(
        {
          message:
            existingUserMessage.chatId === chat.id
              ? 'MESSAGE_ALREADY_PROCESSED'
              : 'MESSAGE_ID_CONFLICT',
        },
        { status: 409 }
      );
    }

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
        return Response.json(
          { message: 'INVALID_FALLBACK_CONFIRMATION' },
          { status: 400 }
        );
      }
    }

    const resolved = fallbackSourceMessage
      ? await resolveAiModel(chat.model, 'fallback')
      : primaryResolved;
    modelConfiguration = resolved.configuration;
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
    });
    if (baseContext.imageParts.length && !modelConfiguration.supportsVision) {
      return Response.json(
        { message: 'MODEL_DOES_NOT_SUPPORT_VISION' },
        { status: 400 }
      );
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
    const estimate = calculateAiPrice({
      model: modelConfiguration,
      usage: {
        inputTokens:
          estimateTokenCount(inputText) +
          baseContext.imageParts.length * pricingSettings.imageInputTokens,
        outputTokens: Math.min(modelConfiguration.maxOutputTokens, 1500),
        webSearchCostUsd: chat.webSearchEnabled
          ? pricingSettings.webSearchCostUsd
          : 0,
      },
      ...pricingSettings,
    });
    let fallbackEstimatedCredits: number | undefined;
    const fallbackAvailability = getFallbackAvailability(modelConfiguration);
    if (resolved.channel === 'primary' && fallbackAvailability.available) {
      try {
        const fallbackResolved = await resolveAiModel(chat.model, 'fallback');
        fallbackEstimatedCredits = calculateAiPrice({
          model: fallbackResolved.configuration,
          usage: {
            inputTokens:
              estimateTokenCount(inputText) +
              baseContext.imageParts.length * pricingSettings.imageInputTokens,
            outputTokens: Math.min(
              fallbackResolved.configuration.maxOutputTokens,
              1500
            ),
            webSearchCostUsd: chat.webSearchEnabled
              ? pricingSettings.webSearchCostUsd
              : 0,
          },
          ...pricingSettings,
        }).credits;
      } catch {
        fallbackEstimatedCredits = undefined;
      }
    }
    const requestId = generateId().toLowerCase();
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
        model: estimate.internalCostUsd,
        webSearch: chat.webSearchEnabled ? pricingSettings.webSearchCostUsd : 0,
        contextTokensIncludedInModel: true,
      },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    reservationId = reservation.id;
    if (
      fallbackSourceMessage &&
      !(await claimChatMessageFallback(fallbackSourceMessage.id, user.id))
    ) {
      throw new Error('FALLBACK_CONFIRMATION_ALREADY_USED');
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

    if (body.disableSkill && chat.skillVersionId && !chat.skillDisabledAt) {
      await updateChat(chat.id, { skillDisabledAt: new Date() }, user.id);
    }

    await createChatMessage({
      id: body.message.id,
      chatId: chat.id,
      userId: user.id,
      status: ChatMessageStatus.CREATED,
      role: 'user',
      parts: JSON.stringify(requestMessage.parts),
      metadata: JSON.stringify({
        requestId,
        reasoning: Boolean(body.reasoning),
        fallbackForMessageId: fallbackSourceMessage?.id,
      }),
      model: chat.model,
      provider: modelConfiguration.providerCode,
      skillVersionId: chat.skillVersionId,
      webSearchEnabled: chat.webSearchEnabled,
      estimatedCredits: estimate.credits,
      reservedCredits: reservation.reservedCredits,
      reservationId: reservation.id,
      sourceDetails: context.sources,
      fileIds,
    });

    const abortController = new AbortController();
    const abortSignal = AbortSignal.any([req.signal, abortController.signal]);
    let outputCharacters = 0;
    let extensionCount = 0;
    let reservedCredits = reservation.reservedCredits;

    const settle = async ({
      usage,
      status,
      failureReason,
    }: {
      usage: {
        inputTokens?: number;
        outputTokens?: number;
        cachedInputTokens?: number;
      };
      status: string;
      failureReason?: string;
    }) => {
      if (finalized || !reservationId || !userId || !modelConfiguration) return;
      const actual = calculateAiPrice({
        model: modelConfiguration,
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadTokens: usage.cachedInputTokens,
          webSearchCostUsd: context.webSearchExecuted
            ? pricingSettings.webSearchCostUsd
            : 0,
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
          webSearchCostUsd: context.webSearchExecuted
            ? String(pricingSettings.webSearchCostUsd)
            : '0',
          internalCostUsd: String(actual.internalCostUsd),
          retailCostUsd: String(actual.retailCostUsd),
          rawCredits: String(actual.rawCredits),
          status:
            chargedCredits < actual.credits ? 'platform_cost_covered' : status,
          failureReason,
          metadata: { sources: context.sources },
        },
      });
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
    };

    const stream = createUIMessageStream({
      originalMessages: historyMessages,
      generateId: createIdGenerator({ size: 16 }),
      onError: (error) => publicErrorCode(error),
      execute: async ({ writer }) => {
        let providerFailureHandled = false;
        const handleProviderFailure = async (failure: string) => {
          if (providerFailureHandled) return;
          await refundReservedCredits(failure);
          providerFailureHandled = true;
          const offeredAt = new Date().toISOString();
          await updateChatMessage(
            body.message!.id,
            {
              errorReason: `CHANNEL_FAILURE:${failure}`,
              settledCredits: 0,
              refundedCredits: reservedCredits,
              metadata: JSON.stringify({
                requestId,
                reasoning: Boolean(body.reasoning),
                fallbackOffer:
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
            abortSignal,
            onChunk: async ({ chunk }) => {
              if (chunk.type !== 'text-delta') return;
              outputCharacters += chunk.text.length;
              const threshold =
                (extensionCount + 1) *
                pricingSettings.reservationThresholdTokens *
                3;
              if (outputCharacters < threshold) return;
              extensionCount += 1;
              try {
                await extendCreditReservation({
                  reservationId: reservation.id,
                  userId: user.id,
                  additionalCredits: pricingSettings.reservationChunk,
                  extensionId: `${reservation.id}:roll:${extensionCount}`,
                });
                reservedCredits += pricingSettings.reservationChunk;
              } catch (error) {
                streamFailure = 'INSUFFICIENT_CREDITS_DURING_GENERATION';
                abortController.abort(streamFailure);
              }
            },
            onFinish: async ({ totalUsage }) => {
              try {
                await settle({
                  usage: totalUsage,
                  status: streamFailure ? 'interrupted' : 'settled',
                  failureReason: streamFailure,
                });
              } finally {
                await releaseRequestLease();
              }
            },
            onAbort: async ({ steps }) => {
              const usage = steps.reduce(
                (total, step) => ({
                  inputTokens:
                    total.inputTokens + (step.usage.inputTokens ?? 0),
                  outputTokens:
                    total.outputTokens + (step.usage.outputTokens ?? 0),
                  cachedInputTokens:
                    total.cachedInputTokens +
                    (step.usage.cachedInputTokens ?? 0),
                }),
                { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 }
              );
              try {
                await settle({
                  usage,
                  status: 'interrupted',
                  failureReason: streamFailure || 'REQUEST_ABORTED',
                });
              } finally {
                await releaseRequestLease();
              }
            },
            onError: async ({ error }) => {
              try {
                streamFailure = publicErrorCode(error);
                console.error('AI stream failed', {
                  requestId,
                  userId: user.id,
                  error: internalErrorMessage(error),
                });
                try {
                  await handleProviderFailure(streamFailure);
                } catch (refundError) {
                  console.error('AI stream reservation refund failed', {
                    reservationId: reservation.id,
                    userId: user.id,
                    error: internalErrorMessage(refundError),
                  });
                }
              } finally {
                await releaseRequestLease();
              }
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
            await handleProviderFailure(streamFailure);
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
          if (chat.projectId && !isAborted && !streamFailure) {
            const project = await findProjectById(chat.projectId, user.id);
            if (project?.autoMemoryEnabled) {
              const question = messageText(requestMessage).slice(0, 240);
              const conclusion = messageText(responseMessage).slice(0, 500);
              if (question && conclusion) {
                await createProjectMemory({
                  id: generateId().toLowerCase(),
                  userId: user.id,
                  projectId: chat.projectId,
                  type: 'progress',
                  content: `问题：${question}\n结论摘要：${conclusion}`,
                  importance: 1,
                  sourceChatId: chat.id,
                  sourceMessageId: assistantMessageId,
                  status: 'active',
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
                : 500;
    return Response.json({ message }, { status });
  }
}
