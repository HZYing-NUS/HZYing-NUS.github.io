'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import { CopyIcon } from 'lucide-react';
import { useLocale } from 'next-intl';

import { useRouter } from '@/core/i18n/navigation';
import { Action, Actions } from '@/shared/components/ai-elements/actions';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/shared/components/ai-elements/conversation';
import { Loader } from '@/shared/components/ai-elements/loader';
import {
  Message,
  MessageContent,
} from '@/shared/components/ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/shared/components/ai-elements/reasoning';
import { Response } from '@/shared/components/ai-elements/response';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/shared/components/ai-elements/sources';
import { Button } from '@/shared/components/ui/button';
import { useChatContext } from '@/shared/contexts/chat';
import { cn } from '@/shared/lib/utils';

const PRODUCT_IDEA_DIAGNOSIS_SKILL = 'product-idea-diagnosis';

export function ChatMessages({
  chatInstance,
}: {
  chatInstance: UseChatHelpers<UIMessage>;
}) {
  const { messages, status } = chatInstance;
  const locale = useLocale();
  const router = useRouter();
  const { chat } = useChatContext();
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const [skillEstimates, setSkillEstimates] = useState<Record<string, number>>(
    {}
  );
  const [creatingSkillChat, setCreatingSkillChat] = useState<string | null>(
    null
  );
  const [confirmingFallback, setConfirmingFallback] = useState<string | null>(
    null
  );

  const skillCandidates = useMemo(
    () =>
      !chat?.skillVersionId
        ? messages.filter(
            (message) =>
              message.role === 'user' &&
              message.parts.some(
                (part) =>
                  part.type === 'text' &&
                  /idea|产品想法|商业模式|mvp|创业/i.test(part.text)
              )
          )
        : [],
    [chat?.skillVersionId, messages]
  );
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  useEffect(() => {
    for (const message of skillCandidates) {
      if (skillEstimates[message.id]) continue;
      const text = message.parts
        .filter(
          (
            part
          ): part is Extract<
            (typeof message.parts)[number],
            { type: 'text' }
          > => part.type === 'text'
        )
        .map((part) => part.text)
        .join('\n');
      void fetch('/api/ai/estimate', {
        method: 'POST',
        body: JSON.stringify({
          text,
          model: chat?.model || 'auto',
          projectId: chat?.projectId,
          chatId: chat?.id,
          skill: PRODUCT_IDEA_DIAGNOSIS_SKILL,
          locale,
        }),
      })
        .then((response) => response.json())
        .then((payload) => {
          if (payload.code !== 0) return;
          setSkillEstimates((current) => ({
            ...current,
            [message.id]: payload.data.credits,
          }));
        })
        .catch(() => undefined);
    }
  }, [
    chat?.id,
    chat?.model,
    chat?.projectId,
    locale,
    skillCandidates,
    skillEstimates,
  ]);

  const recommendSkill = async (messageId: string) => {
    if (!chat?.id) return;
    setCreatingSkillChat(messageId);
    const payload = await fetch('/api/chat/skill-recommendation', {
      method: 'POST',
      body: JSON.stringify({
        sourceChatId: chat.id,
        sourceMessageId: messageId,
        skill: PRODUCT_IDEA_DIAGNOSIS_SKILL,
      }),
    }).then((response) => response.json());
    if (payload.code === 0) {
      router.push(
        `/chat/${payload.data.id}?send=1&messageId=${encodeURIComponent(payload.data.pendingMessageId)}`
      );
      return;
    }
    setCreatingSkillChat(null);
  };

  const confirmFallback = async (
    assistantMessageId: string,
    sourceMessageId: string
  ) => {
    const sourceMessage = messages.find(
      (message) => message.id === sourceMessageId && message.role === 'user'
    );
    if (!sourceMessage) return;

    setConfirmingFallback(assistantMessageId);
    try {
      await chatInstance.sendMessage(
        {
          text:
            locale === 'zh'
              ? '已确认：仅本次使用备用配置，重新处理上一条失败的请求。'
              : 'Confirmed: use the fallback configuration for this request only and restart the failed request.',
        },
        {
          body: {
            fallbackForMessageId: sourceMessageId,
            locale,
          },
        }
      );
    } finally {
      setConfirmingFallback(null);
    }
  };

  return (
    <Conversation className="h-full">
      <ConversationContent>
        {messages.map((message) => {
          const metadata =
            message.metadata && typeof message.metadata === 'object'
              ? (message.metadata as {
                  type?: string;
                  sourceDetails?: Array<{
                    type: string;
                    title: string;
                    url?: string;
                  }>;
                  inputTokens?: number;
                  outputTokens?: number;
                  settledCredits?: number;
                  errorReason?: string;
                  fallbackConfirmedAt?: string | null;
                })
              : undefined;
          const isAssistantError =
            message.role === 'assistant' && metadata?.type === 'error';

          return (
            <div key={message.id}>
              {message.role === 'assistant' &&
              message.parts.some((part) => part.type === 'data-file-source') ? (
                <div className="mb-3 border-l-2 border-[#c45d38] pl-4 text-xs">
                  <p className="font-medium">
                    {locale === 'zh' ? '项目文件' : 'Project files'}
                  </p>
                  {message.parts
                    .filter((part) => part.type === 'data-file-source')
                    .map((part, index) => (
                      <p
                        className="text-muted-foreground"
                        key={`${message.id}-file-${index}`}
                      >
                        {
                          (part as unknown as { data: { title?: string } }).data
                            .title
                        }
                      </p>
                    ))}
                </div>
              ) : null}
              {message.role === 'assistant' &&
              metadata?.sourceDetails?.length ? (
                <div className="mb-4 grid gap-3 border-l-2 border-[#c45d38] pl-4 text-xs sm:grid-cols-3">
                  {[
                    {
                      key: 'site',
                      label: locale === 'zh' ? 'WebTools' : 'WebTools',
                      types: ['resource', 'collection', 'article', 'profile'],
                    },
                    {
                      key: 'web',
                      label: locale === 'zh' ? '外部网页' : 'External web',
                      types: ['web'],
                    },
                    {
                      key: 'file',
                      label: locale === 'zh' ? '项目文件' : 'Project files',
                      types: ['file'],
                    },
                  ].map((group) => {
                    const sources = metadata.sourceDetails!.filter((source) =>
                      group.types.includes(source.type)
                    );
                    return sources.length ? (
                      <div key={group.key}>
                        <p className="mb-1 font-medium">{group.label}</p>
                        {sources.map((source, index) =>
                          source.url ? (
                            <a
                              className="text-muted-foreground block truncate underline"
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              key={`${source.title}-${index}`}
                            >
                              {source.title}
                            </a>
                          ) : (
                            <p
                              className="text-muted-foreground truncate"
                              key={`${source.title}-${index}`}
                            >
                              {source.title}
                            </p>
                          )
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              ) : null}
              {message.role === 'assistant' &&
                message.parts.filter((part) => part.type === 'source-url')
                  .length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === 'source-url'
                        ).length
                      }
                    />
                    {message.parts
                      .filter((part) => part.type === 'source-url')
                      .map((part, i) => (
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source
                            key={`${message.id}-${i}`}
                            href={part.url}
                            title={part.url}
                          />
                        </SourcesContent>
                      ))}
                  </Sources>
                )}
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case 'text':
                    return (
                      <Fragment key={`${message.id}-${i}`}>
                        <Message from={message.role}>
                          <MessageContent>
                            <Response
                              className={cn(
                                isAssistantError && 'text-destructive'
                              )}
                            >
                              {part.text}
                            </Response>
                          </MessageContent>
                        </Message>
                        {message.role === 'assistant' &&
                          i === messages.length - 1 && (
                            <Actions className="mt-2">
                              <Action
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                <CopyIcon className="size-3" />
                              </Action>
                            </Actions>
                          )}
                      </Fragment>
                    );
                  case 'reasoning':
                    return (
                      <Reasoning
                        key={`${message.id}-${i}`}
                        className="w-full"
                        isStreaming={
                          status === 'streaming' &&
                          i === message.parts.length - 1 &&
                          message.id === messages.at(-1)?.id
                        }
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  case 'data-provider-fallback': {
                    if (metadata?.fallbackConfirmedAt) return null;
                    const offer = part.data as {
                      sourceMessageId: string;
                      sameModel: boolean;
                      estimatedCredits: number;
                      incurredCredits: number;
                      action: 'restart';
                    };
                    return (
                      <div
                        className="mt-3 border-l-2 border-[#c45d38] bg-black/[0.025] p-4 text-sm dark:bg-white/[0.025]"
                        key={`${message.id}-${i}`}
                      >
                        <p className="font-medium">
                          {locale === 'zh'
                            ? '当前渠道调用失败，已停止并退款。'
                            : 'The current channel failed. Generation stopped and the reservation was refunded.'}
                        </p>
                        <p className="text-muted-foreground mt-2">
                          {locale === 'zh'
                            ? `备用配置${offer.sameModel ? '仍为同一模型' : '不是同一模型'}；确认后会重新发起请求，预计 ${offer.estimatedCredits} Credit。本次已产生费用：${offer.incurredCredits} Credit。`
                            : `The fallback ${offer.sameModel ? 'uses the same model' : 'uses a different model'}. Confirmation starts a new request estimated at ${offer.estimatedCredits} Credit. Cost incurred by this failed request: ${offer.incurredCredits} Credit.`}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            disabled={
                              confirmingFallback === message.id ||
                              status === 'submitted' ||
                              status === 'streaming'
                            }
                            onClick={() =>
                              confirmFallback(message.id, offer.sourceMessageId)
                            }
                          >
                            {confirmingFallback === message.id
                              ? locale === 'zh'
                                ? '正在重新发起……'
                                : 'Restarting…'
                              : locale === 'zh'
                                ? '确认使用备用配置'
                                : 'Confirm fallback'}
                          </Button>
                          <span className="text-muted-foreground self-center text-xs">
                            {locale === 'zh'
                              ? '不确认则不会切换。'
                              : 'No switch occurs without confirmation.'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  case 'data-credit-settlement': {
                    const settlement = part.data as {
                      inputTokens: number;
                      outputTokens: number;
                      settledCredits: number;
                      refundedCredits: number;
                    };
                    return (
                      <div
                        className="text-muted-foreground mt-3 flex flex-wrap gap-3 border-t border-black/10 pt-2 font-mono text-[10px]"
                        key={`${message.id}-${i}`}
                      >
                        <span>{settlement.inputTokens} input tokens</span>
                        <span>{settlement.outputTokens} output tokens</span>
                        <span>{settlement.settledCredits} Credit</span>
                        {settlement.refundedCredits > 0 ? (
                          <span>
                            {locale === 'zh'
                              ? `退回 ${settlement.refundedCredits} Credit`
                              : `${settlement.refundedCredits} Credit refunded`}
                          </span>
                        ) : null}
                      </div>
                    );
                  }
                  default:
                    return null;
                }
              })}
              {skillCandidates.some(
                (candidate) => candidate.id === message.id
              ) ? (
                <div className="mt-2 border-l-2 border-[#c45d38] pl-4 text-sm">
                  <p>
                    {locale === 'zh'
                      ? '这个问题适合使用「产品想法诊断」。'
                      : 'This question is a good fit for Product idea diagnosis.'}
                  </p>
                  <Button
                    className="mt-2"
                    size="sm"
                    variant="outline"
                    disabled={creatingSkillChat === message.id}
                    onClick={() => recommendSkill(message.id)}
                  >
                    {creatingSkillChat === message.id
                      ? locale === 'zh'
                        ? '正在创建……'
                        : 'Creating…'
                      : locale === 'zh'
                        ? `确认使用${skillEstimates[message.id] ? ` · 预计 ${skillEstimates[message.id]} Credit` : ''}`
                        : `Confirm${skillEstimates[message.id] ? ` · Est. ${skillEstimates[message.id]} Credit` : ''}`}
                  </Button>
                </div>
              ) : null}
              {message.role === 'assistant' &&
              !message.parts.some(
                (part) => part.type === 'data-credit-settlement'
              ) &&
              (metadata?.inputTokens ||
                metadata?.outputTokens ||
                metadata?.settledCredits ||
                metadata?.errorReason) ? (
                <div className="text-muted-foreground mt-3 flex flex-wrap gap-3 border-t border-black/10 pt-2 font-mono text-[10px]">
                  <span>{metadata.inputTokens || 0} input tokens</span>
                  <span>{metadata.outputTokens || 0} output tokens</span>
                  <span>{metadata.settledCredits || 0} Credit</span>
                  {metadata.errorReason ? (
                    <>
                      <span className="text-destructive">
                        {locale === 'zh'
                          ? '回答已中断。充值后可从已有内容继续，并按新请求计费。'
                          : 'Response interrupted. Recharge, then continue from the existing answer as a new billed request.'}
                      </span>
                      {message.id === messages.at(-1)?.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            status === 'submitted' || status === 'streaming'
                          }
                          onClick={() =>
                            chatInstance.sendMessage({
                              text:
                                locale === 'zh'
                                  ? '请从上一条回答中断的位置继续，不要重复已经生成的内容。'
                                  : 'Continue from where the previous answer was interrupted without repeating generated content.',
                            })
                          }
                        >
                          {locale === 'zh' ? '继续回答' : 'Continue answer'}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        {status === 'submitted' && <Loader />}
        <div ref={endOfMessagesRef} />
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
