'use client';

import { useEffect, useMemo, useState } from 'react';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import {
  BrainCircuitIcon,
  CircleDollarSignIcon,
  Globe2Icon,
  SparklesIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  skillInitiallyDisabled,
  lockedWebSearch,
  initialSkill,
  estimateChatId,
  estimateProjectId,
  estimateSkillVersionId,
  estimateLocale,
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
  skillInitiallyDisabled?: boolean;
  lockedWebSearch?: boolean;
  initialSkill?: string;
  estimateChatId?: string;
  estimateProjectId?: string | null;
  estimateSkillVersionId?: string | null;
  estimateLocale?: string;
}) {
  const t = useTranslations('ai.chat.generator');
  const { user, isCheckSign, setIsShowSignModal, setIsShowPaymentModal } =
    useAppContext();
  const generalSkill = useMemo(
    () => ({ ...chatSkills[0], label: t('general') }),
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
  const reasoningAvailable = false;

  const dynamicModels = useMemo(
    () =>
      models.length
        ? models
        : chatModels.map((item) => ({
            id: item.id,
            name: item.label,
            description: item.description,
          })),
    [models]
  );
  const selectedDynamicModel =
    dynamicModels.find((item) => item.id === (lockedModel || model)) ||
    dynamicModels[0];
  const selectedModel = getChatModel(lockedModel || model);
  const selectedSkill =
    skills.find((item) => item.id === (lockedSkill || skill)) ||
    (lockedSkill === 'product-idea-diagnosis'
      ? {
          id: lockedSkill,
          label: t('diagnosis'),
          description: '',
          icon: SparklesIcon,
        }
      : skills[0]);
  const availableCredits = user?.credits?.remainingCredits ?? 0;
  const isInsufficient = Boolean(user && availableCredits < 1);
  const isDisabled = status === 'submitted' || isCheckSign || isInsufficient;

  useEffect(() => {
    fetch('/api/ai/models')
      .then((r) => r.json())
      .then(
        (payload: { models?: PublicModel[]; webSearchAvailable?: boolean }) => {
          setModels(
            (payload.models || []).map((item) =>
              item.id === 'auto' ? { ...item, name: t('auto_model') } : item
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
    fetch('/api/skills')
      .then((response) => response.json())
      .then((payload: { data?: PublicSkill[] }) => {
        const availableSkills: ChatSkillOption[] = [
          generalSkill,
          ...(payload.data || []).map((item) => ({
            id: item.slug,
            label:
              item.slug === 'product-idea-diagnosis'
                ? t('diagnosis')
                : item.name,
            description:
              item.slug === 'product-idea-diagnosis'
                ? t('diagnosis_description')
                : item.description || '',
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
  }, [generalSkill, lockedSkill, t]);

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
    if (!user || !input.trim()) {
      return;
    }
    const timeout = window.setTimeout(async () => {
      setEstimating(true);
      const payload = await fetch('/api/ai/estimate', {
        method: 'POST',
        body: JSON.stringify({
          text: input,
          model: lockedModel || model,
          webSearch:
            lockedWebSearch ?? (webSearchAvailable ? webSearch : false),
          locale: estimateLocale,
          chatId: estimateChatId,
          projectId: estimateProjectId,
          skillVersionId: estimateSkillVersionId,
        }),
      }).then((r) => r.json());
      setEstimate(payload.code === 0 ? payload.data.credits : null);
      setEstimating(false);
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [
    input,
    model,
    webSearch,
    webSearchAvailable,
    user,
    lockedModel,
    lockedWebSearch,
    estimateLocale,
    estimateChatId,
    estimateProjectId,
    estimateSkillVersionId,
  ]);

  return (
    <div className="w-full">
      <>
        <div className="border-border/70 bg-card/85 mb-3 flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-[0_14px_40px_-32px_rgba(62,48,31,0.75)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
              <selectedModel.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {selectedDynamicModel?.name || selectedModel.label}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {selectedDynamicModel?.description || selectedModel.description}{' '}
                · {selectedSkill.label}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Badge variant="secondary" className="gap-1 font-normal">
              <CircleDollarSignIcon className="size-3" />
              {t('usage')}
            </Badge>
            <Badge variant="outline" className="gap-1 font-normal">
              {estimating
                ? t('estimating')
                : estimate
                  ? t('estimate', { credits: estimate })
                  : '—'}
            </Badge>
            {user ? (
              <Badge variant="outline" className="gap-1 font-normal">
                <SparklesIcon className="size-3" />
                {availableCredits} Credit
              </Badge>
            ) : null}
          </div>
        </div>

        {isInsufficient ? (
          <div className="border-destructive/30 bg-destructive/5 mb-3 flex flex-col gap-3 border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">{t('insufficient')}</p>
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
              setIsShowSignModal(true);
              return;
            }
            if (isInsufficient) {
              setIsShowPaymentModal(true);
              return;
            }

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
          className="border-border/80 bg-card/95 overflow-hidden rounded-2xl border shadow-[0_24px_70px_-42px_rgba(62,48,31,0.9)] backdrop-blur"
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
                setInput(value);
                onInputChange?.(value);
              }}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter className="border-t px-3 py-2">
            <PromptInputTools className="min-w-0 flex-wrap gap-1">
              <PromptInputSelect
                disabled={Boolean(lockedModel)}
                onValueChange={setModel}
                value={lockedModel || model}
              >
                <PromptInputSelectTrigger className="max-w-40 rounded-lg px-2.5">
                  <PromptInputSelectValue>
                    {selectedDynamicModel?.name || selectedModel.label}
                  </PromptInputSelectValue>
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {dynamicModels.map((item) => (
                    <PromptInputSelectItem key={item.id} value={item.id}>
                      <span className="flex min-w-48 items-center justify-between gap-4">
                        <span>
                          <span className="block font-medium">{item.name}</span>
                          <span className="text-muted-foreground block text-xs">
                            {item.description}
                          </span>
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {t('usage')}
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
                <PromptInputSelectTrigger className="max-w-48 rounded-lg px-2.5">
                  <PromptInputSelectValue>
                    {selectedSkill.label}
                  </PromptInputSelectValue>
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {skills.map((item) => (
                    <PromptInputSelectItem key={item.id} value={item.id}>
                      <span className="block min-w-56">
                        <span className="block font-medium">{item.label}</span>
                        <span className="text-muted-foreground block text-xs">
                          {item.description}
                        </span>
                      </span>
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>

              <div className="ml-1 flex items-center">
                <Switch
                  id="prompt-reasoning-switch"
                  checked={reasoning}
                  disabled={isDisabled || !reasoningAvailable}
                  onCheckedChange={setReasoning}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="prompt-reasoning-switch"
                      className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center rounded-md p-2 transition-colors"
                    >
                      <BrainCircuitIcon className="size-4" />
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    {reasoningAvailable
                      ? t('reasoning')
                      : t('reasoning_unavailable')}
                  </TooltipContent>
                </Tooltip>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="ml-1 flex items-center gap-2 rounded-lg px-2 py-1">
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
                    <Label
                      htmlFor="prompt-web-search-switch"
                      className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
                    >
                      <Globe2Icon className="size-3.5" />
                      {t('web')}
                    </Label>
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
            <PromptInputSubmit
              disabled={!input || isDisabled}
              status={status}
            />
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
