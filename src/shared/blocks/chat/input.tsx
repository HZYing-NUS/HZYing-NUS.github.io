'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import {
  BotIcon,
  BrainCircuitIcon,
  CircleDollarSignIcon,
  CpuIcon,
  Globe2Icon,
  RouteIcon,
  SparklesIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from '@/shared/components/ai-elements/prompt-input';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { useAppContext } from '@/shared/contexts/app';

import {
  chatModels,
  chatSkills,
  getChatModel,
  type ChatSkillOption,
} from './catalog';

type PublicModel = {
  id: string;
  name: string;
  description?: string | null;
  supportsReasoning?: boolean;
};

type PublicSkill = {
  slug: string;
  name: string;
  description?: string | null;
};

const PENDING_QUESTION_KEY = 'webtools:pending-chat-question';

export function ChatInput({
  handleSubmit,
  status,
  error,
  onInputChange,
  lockedModel,
  lockedSkill,
  lockedSkillLabel,
  skillInitiallyDisabled,
  lockedWebSearch,
  initialSkill,
  estimateChatId,
  estimateProjectId,
  estimateSkillVersionId,
  estimateLocale,
  suggestedQuestion,
  onSuggestedQuestionApplied,
  compact = false,
}: {
  handleSubmit: (
    message: PromptInputMessage,
    body: Record<string, any>
  ) => void | Promise<void>;
  status?: UseChatHelpers<UIMessage>['status'];
  error?: string | null;
  onInputChange?: (value: string) => void;
  lockedModel?: string;
  lockedSkill?: string;
  lockedSkillLabel?: string;
  skillInitiallyDisabled?: boolean;
  lockedWebSearch?: boolean;
  initialSkill?: string;
  estimateChatId?: string;
  estimateProjectId?: string | null;
  estimateSkillVersionId?: string | null;
  estimateLocale?: string;
  suggestedQuestion?: string;
  onSuggestedQuestionApplied?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations('ai.chat.generator');
  const locale = useLocale();
  const {
    user,
    isCheckSign,
    setIsShowSignModal,
    setIsShowPaymentModal,
    setSignCallbackUrl,
  } = useAppContext();
  const generalSkill = useMemo(
    () => ({
      ...chatSkills[0],
      label: t('general'),
      description: t('general_description'),
    }),
    [t]
  );
  const [models, setModels] = useState<PublicModel[]>([]);
  const [skills, setSkills] = useState<ChatSkillOption[]>([generalSkill]);
  const [model, setModel] = useState(lockedModel || 'auto');
  const [skill, setSkill] = useState(
    lockedSkill || initialSkill || chatSkills[0].id
  );
  const [input, setInput] = useState('');
  const [reasoning, setReasoning] = useState(false);
  const [skillDisabled, setSkillDisabled] = useState(
    Boolean(skillInitiallyDisabled)
  );
  const [skillPermanentlyDisabled, setSkillPermanentlyDisabled] = useState(
    Boolean(skillInitiallyDisabled)
  );
  const [webSearch, setWebSearch] = useState(lockedWebSearch ?? false);
  const [webSearchAvailable, setWebSearchAvailable] = useState(false);
  const [modelCatalogLoaded, setModelCatalogLoaded] = useState(false);
  const [skillCatalogLoaded, setSkillCatalogLoaded] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateFailed, setEstimateFailed] = useState(false);
  const estimateRequestId = useRef(0);
  const initialQuestionApplied = useRef(false);
  const dynamicModels = useMemo(
    () =>
      models.length
        ? models
        : chatModels.map((item) => ({
            id: item.id,
            name: item.label,
            description: item.description,
            supportsReasoning: false,
          })),
    [models]
  );
  const selectedDynamicModel =
    dynamicModels.find((item) => item.id === (lockedModel || model)) ||
    dynamicModels[0];
  const selectedModel = getChatModel(lockedModel || model);
  const reasoningAvailable = Boolean(selectedDynamicModel?.supportsReasoning);
  const selectedSkill =
    skills.find((item) => item.id === (lockedSkill || skill)) ||
    (lockedSkill && lockedSkill !== 'general'
      ? {
          id: lockedSkill,
          label: lockedSkillLabel || lockedSkill,
          description: '',
          icon: SparklesIcon,
        }
      : skills[0]);
  const availableCredits = user?.credits?.remainingCredits ?? 0;
  const requiredCredits = estimate ?? 1;
  const isInsufficient = Boolean(user && availableCredits < requiredCredits);
  const isDisabled = status === 'submitted' || isCheckSign || isInsufficient;

  useEffect(() => {
    if (initialQuestionApplied.current) return;
    initialQuestionApplied.current = true;
    const question = new URLSearchParams(window.location.search).get(
      'question'
    );
    if (question) {
      setInput(question);
      onInputChange?.(question);
    }
  }, [onInputChange]);

  useEffect(() => {
    if (!suggestedQuestion) return;
    setInput(suggestedQuestion);
    onInputChange?.(suggestedQuestion);
    onSuggestedQuestionApplied?.();
  }, [onInputChange, onSuggestedQuestionApplied, suggestedQuestion]);

  useEffect(() => {
    fetch('/api/ai/models')
      .then((r) => r.json())
      .then(
        (payload: {
          defaultModel?: { id: string; name: string } | null;
          models?: PublicModel[];
          webSearchAvailable?: boolean;
        }) => {
          setModels(
            (payload.models || []).map((item) =>
              item.id === 'auto'
                ? {
                    ...item,
                    name: payload.defaultModel?.name
                      ? t('auto_model_with_name', {
                          model: payload.defaultModel.name,
                        })
                      : t('auto_model'),
                    description: t('auto_model_description'),
                  }
                : item
            )
          );
          setWebSearchAvailable(Boolean(payload.webSearchAvailable));
          setModelCatalogLoaded(true);
          if (!payload.webSearchAvailable && lockedWebSearch === undefined) {
            setWebSearch(false);
          }
        }
      )
      .catch(() => setModelCatalogLoaded(true));
  }, [lockedWebSearch, t]);

  useEffect(() => {
    fetch(`/api/skills?locale=${locale}`)
      .then((response) => response.json())
      .then((payload: { data?: PublicSkill[] }) => {
        const availableSkills: ChatSkillOption[] = [
          generalSkill,
          ...(payload.data || []).map((item) => ({
            id: item.slug,
            label: item.name,
            description: item.description || '',
            icon: SparklesIcon,
          })),
        ];
        setSkills(availableSkills);
        setSkillCatalogLoaded(true);
        if (!lockedSkill) {
          setSkill((current) =>
            availableSkills.some((item) => item.id === current)
              ? current
              : generalSkill.id
          );
        }
      })
      .catch(() => setSkillCatalogLoaded(true));
  }, [generalSkill, locale, lockedSkill]);

  useEffect(() => {
    if (!user || !modelCatalogLoaded || !skillCatalogLoaded) return;
    let pending:
      | {
          text?: string;
          model?: string;
          skill?: string;
          webSearch?: boolean;
          reasoning?: boolean;
        }
      | undefined;
    try {
      const stored = sessionStorage.getItem(PENDING_QUESTION_KEY);
      if (!stored) return;
      pending = JSON.parse(stored);
    } catch {
      sessionStorage.removeItem(PENDING_QUESTION_KEY);
      return;
    }
    const restorePendingQuestion = window.setTimeout(() => {
      if (!pending) return;
      if (pending.text) {
        setInput(pending.text);
        onInputChange?.(pending.text);
      }
      if (
        !lockedModel &&
        pending.model &&
        dynamicModels.some((item) => item.id === pending.model)
      ) {
        setModel(pending.model);
      }
      if (
        !lockedSkill &&
        pending.skill &&
        skills.some((item) => item.id === pending.skill)
      ) {
        setSkill(pending.skill);
      }
      if (lockedWebSearch === undefined) {
        setWebSearch(Boolean(pending.webSearch && webSearchAvailable));
      }
      setReasoning(Boolean(pending.reasoning && reasoningAvailable));
      sessionStorage.removeItem(PENDING_QUESTION_KEY);
    }, 0);
    return () => window.clearTimeout(restorePendingQuestion);
  }, [
    dynamicModels,
    lockedModel,
    lockedSkill,
    lockedWebSearch,
    modelCatalogLoaded,
    onInputChange,
    skillCatalogLoaded,
    skills,
    user,
    webSearchAvailable,
    reasoningAvailable,
  ]);

  useEffect(() => {
    const requestId = ++estimateRequestId.current;
    if (!user || !input.trim()) {
      setEstimate(null);
      setEstimating(false);
      setEstimateFailed(false);
      return;
    }
    setEstimate(null);
    setEstimating(true);
    setEstimateFailed(false);
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const payload = await fetch('/api/ai/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            text: input,
            model: lockedModel || model,
            skill: lockedSkill || skill,
            skillDisabled: Boolean(
              lockedSkill && lockedSkill !== 'general' && skillDisabled
            ),
            webSearch:
              lockedWebSearch ?? (webSearchAvailable ? webSearch : false),
            reasoning: reasoningAvailable && reasoning,
            locale: estimateLocale,
            chatId: estimateChatId,
            projectId: estimateProjectId,
            skillVersionId: estimateSkillVersionId,
          }),
        }).then((r) => r.json());
        if (requestId !== estimateRequestId.current) return;
        if (payload.code === 0 && Number.isFinite(payload.data?.credits)) {
          setEstimate(payload.data.credits);
        } else {
          setEstimateFailed(true);
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !== estimateRequestId.current
        ) {
          return;
        }
        setEstimate(null);
        setEstimateFailed(true);
      } finally {
        if (requestId === estimateRequestId.current) setEstimating(false);
      }
    }, 450);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    input,
    model,
    skill,
    skillDisabled,
    webSearch,
    webSearchAvailable,
    reasoning,
    reasoningAvailable,
    user,
    lockedModel,
    lockedSkill,
    lockedWebSearch,
    estimateLocale,
    estimateChatId,
    estimateProjectId,
    estimateSkillVersionId,
  ]);

  return (
    <div className="w-full">
      <>
        {isInsufficient ? (
          <div className="border-destructive/25 bg-destructive/5 mb-3 flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              {estimate
                ? t('insufficient_estimate', {
                    balance: availableCredits,
                    estimate,
                  })
                : t('insufficient')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShowPaymentModal(true)}
            >
              {t('recharge')}
            </Button>
          </div>
        ) : null}

        <PromptInput
          onSubmit={async (message) => {
            if (!user) {
              try {
                sessionStorage.setItem(
                  PENDING_QUESTION_KEY,
                  JSON.stringify({
                    text: message.text,
                    model: lockedModel || model,
                    skill: lockedSkill || skill,
                    webSearch:
                      lockedWebSearch ??
                      (webSearchAvailable ? webSearch : false),
                    reasoning: reasoningAvailable && reasoning,
                  })
                );
              } catch {
                // The current in-memory draft remains available if storage is blocked.
              }
              setSignCallbackUrl('/');
              setIsShowSignModal(true);
              return;
            }
            if (isInsufficient) {
              setIsShowPaymentModal(true);
              return;
            }
            if (estimating) return;

            try {
              await handleSubmit(message, {
                model: lockedModel || model,
                skill: lockedSkill || skill,
                webSearch:
                  lockedWebSearch ?? (webSearchAvailable ? webSearch : false),
                reasoning: reasoningAvailable && reasoning,
                disableSkill: Boolean(
                  lockedSkill && lockedSkill !== 'general' && skillDisabled
                ),
              });
              if (lockedSkill && lockedSkill !== 'general' && skillDisabled) {
                setSkillPermanentlyDisabled(true);
              }
              setInput('');
            } catch {
              // The parent keeps the draft when a request fails.
            }
          }}
          className="border-border/80 bg-card/95 overflow-hidden rounded-[1.35rem] border shadow-[0_28px_80px_-48px_rgba(62,48,31,0.95)] backdrop-blur"
          globalDrop={Boolean(user)}
          multiple
        >
          <PromptInputBody>
            <PromptInputTextarea
              className="min-h-28 overflow-hidden p-4 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isDisabled}
              placeholder={user ? t('input_placeholder') : t('signin_title')}
              onChange={(event) => {
                const value = event.target.value;
                setEstimate(null);
                setEstimateFailed(false);
                setInput(value);
                onInputChange?.(value);
              }}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter className="border-t px-3 py-2">
            {!compact ? (
              <PromptInputTools className="min-w-0 flex-wrap gap-1.5">
                <PromptInputSelect
                  disabled={Boolean(lockedModel)}
                  onValueChange={(nextModel) => {
                    setModel(nextModel);
                    if (
                      !dynamicModels.find((item) => item.id === nextModel)
                        ?.supportsReasoning
                    ) {
                      setReasoning(false);
                    }
                  }}
                  value={lockedModel || model}
                >
                  <PromptInputSelectTrigger
                    aria-label={t('model_label')}
                    className="border-border/70 bg-muted/45 hover:bg-muted max-w-64 rounded-lg border px-2.5"
                  >
                    <PromptInputSelectValue>
                      <span className="flex min-w-0 items-center gap-2">
                        {selectedDynamicModel?.id === 'auto' ? (
                          <RouteIcon className="text-primary size-3.5 shrink-0" />
                        ) : (
                          <CpuIcon className="text-primary size-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {selectedDynamicModel?.name || selectedModel.label}
                        </span>
                      </span>
                    </PromptInputSelectValue>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {dynamicModels.map((item) => (
                      <PromptInputSelectItem key={item.id} value={item.id}>
                        <span className="flex min-w-72 items-start gap-3 py-1">
                          <span className="bg-primary/10 text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
                            {item.id === 'auto' ? (
                              <RouteIcon className="size-3.5" />
                            ) : (
                              <CpuIcon className="size-3.5" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">
                              {item.name}
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              {item.description || t('model_description')}
                            </span>
                          </span>
                        </span>
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>

                <PromptInputSelect
                  disabled={Boolean(lockedSkill)}
                  onValueChange={setSkill}
                  value={lockedSkill || skill}
                >
                  <PromptInputSelectTrigger
                    aria-label={t('skill_label')}
                    className="border-border/70 bg-muted/45 hover:bg-muted max-w-48 rounded-lg border px-2.5"
                  >
                    <PromptInputSelectValue>
                      <span className="flex min-w-0 items-center gap-2">
                        <BotIcon className="text-muted-foreground size-3.5 shrink-0" />
                        <span className="truncate">{selectedSkill.label}</span>
                      </span>
                    </PromptInputSelectValue>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {skills.map((item) => (
                      <PromptInputSelectItem key={item.id} value={item.id}>
                        <span className="block min-w-56">
                          <span className="block font-medium">
                            {item.label}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {item.description}
                          </span>
                        </span>
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="border-border/70 bg-muted/35 flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
                      <BrainCircuitIcon className="text-muted-foreground size-3.5" />
                      <Label
                        htmlFor="prompt-reasoning-switch"
                        className="text-muted-foreground cursor-pointer text-xs"
                      >
                        {t('reasoning')}
                      </Label>
                      <Switch
                        id="prompt-reasoning-switch"
                        checked={reasoning}
                        disabled={isDisabled || !reasoningAvailable}
                        onCheckedChange={setReasoning}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    {reasoningAvailable
                      ? t('reasoning_available')
                      : t('reasoning_unavailable')}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="border-border/70 bg-muted/35 flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
                      <Globe2Icon className="text-muted-foreground size-3.5" />
                      <Label
                        htmlFor="prompt-web-search-switch"
                        className="text-muted-foreground cursor-pointer text-xs"
                      >
                        {t('web')}
                      </Label>
                      <Switch
                        id="prompt-web-search-switch"
                        checked={lockedWebSearch ?? webSearch}
                        disabled={
                          isDisabled ||
                          lockedWebSearch !== undefined ||
                          !webSearchAvailable
                        }
                        onCheckedChange={setWebSearch}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    {webSearchAvailable
                      ? t('web_available')
                      : t('web_unavailable')}
                  </TooltipContent>
                </Tooltip>
                {lockedSkill && lockedSkill !== 'general' ? (
                  <div className="ml-1 flex items-center gap-2 px-2">
                    <Switch
                      id="prompt-skill-switch"
                      checked={!skillDisabled}
                      disabled={isDisabled || skillPermanentlyDisabled}
                      onCheckedChange={(enabled) => setSkillDisabled(!enabled)}
                    />
                    <Label
                      htmlFor="prompt-skill-switch"
                      className="text-muted-foreground text-xs"
                    >
                      Skill
                    </Label>
                  </div>
                ) : null}
              </PromptInputTools>
            ) : (
              <p className="text-muted-foreground hidden pl-1 text-xs sm:block">
                {t('public_input_hint')}
              </p>
            )}
            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="inline-flex gap-1 font-normal"
                    >
                      <CircleDollarSignIcon className="size-3" />
                      {estimating
                        ? t('estimating')
                        : estimate !== null
                          ? t('estimate', {
                              credits: estimate,
                              balance: availableCredits,
                            })
                          : input.trim()
                            ? estimateFailed
                              ? t('estimate_unavailable')
                              : t('estimating')
                            : t('balance', { credits: availableCredits })}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    {input.trim() ? t('usage') : t('balance_hint')}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              <PromptInputSubmit
                disabled={!input || isDisabled || estimating}
                status={status}
              />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </>
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
