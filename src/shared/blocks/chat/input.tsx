'use client';

import { useState } from 'react';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import {
  BrainCircuitIcon,
  ChevronDownIcon,
  CircleDollarSignIcon,
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

import { chatModels, chatSkills, getChatModel, getChatSkill } from './catalog';

export function ChatInput({
  handleSubmit,
  status,
  error,
  onInputChange,
  lockedModel,
  lockedSkill,
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
}) {
  const t = useTranslations('ai.chat.generator');
  const { user, isCheckSign, setIsShowSignModal, setIsShowPaymentModal } =
    useAppContext();
  const [model, setModel] = useState(lockedModel || chatModels[0].id);
  const [skill, setSkill] = useState(lockedSkill || chatSkills[0].id);
  const [input, setInput] = useState('');
  const [reasoning, setReasoning] = useState(false);

  const selectedModel = getChatModel(lockedModel || model);
  const selectedSkill = getChatSkill(lockedSkill || skill);
  const availableCredits = user?.credits ?? 0;
  const isInsufficient = Boolean(
    user && availableCredits < selectedModel.creditCost
  );
  const isDisabled = status === 'submitted' || isCheckSign || isInsufficient;

  return (
    <div className="w-full">
      {!isCheckSign && !user ? (
        <div className="border-border bg-card flex flex-col gap-4 border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">登录后开始对话</p>
            <p className="text-muted-foreground text-sm">
              新用户会获得 10 Credit，可用于体验不同模型与专家。
            </p>
          </div>
          <Button onClick={() => setIsShowSignModal(true)} className="shrink-0">
            登录或注册
          </Button>
        </div>
      ) : (
        <>
          <div className="border-border bg-card mb-3 flex flex-col gap-3 border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
                <selectedModel.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {selectedModel.label}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {selectedModel.description} · {selectedSkill.label}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Badge variant="secondary" className="gap-1 font-normal">
                <CircleDollarSignIcon className="size-3" />
                {selectedModel.creditCost} Credit / 次
              </Badge>
              <Badge variant="outline" className="gap-1 font-normal">
                <SparklesIcon className="size-3" />
                {availableCredits} Credit
              </Badge>
            </div>
          </div>

          {isInsufficient ? (
            <div className="border-destructive/30 bg-destructive/5 mb-3 flex flex-col gap-3 border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground">
                当前模型需要 {selectedModel.creditCost} Credit，你的余额不足。
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShowPaymentModal(true)}
              >
                充值 Credit
              </Button>
            </div>
          ) : null}

          <PromptInput
            onSubmit={async (message) => {
              if (!user) {
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
                  webSearch: false,
                  reasoning,
                });
                setInput('');
              } catch {
                // The parent keeps the draft when a request fails.
              }
            }}
            className="border-border bg-card border shadow-none"
            globalDrop
            multiple
          >
            <PromptInputBody>
              <PromptInputTextarea
                className="min-h-28 overflow-hidden p-4 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isDisabled}
                placeholder={
                  user ? t('input_placeholder') : '登录后即可开始对话'
                }
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
                  <PromptInputSelectTrigger className="max-w-40">
                    <PromptInputSelectValue>
                      {selectedModel.label}
                    </PromptInputSelectValue>
                    <ChevronDownIcon className="size-3" />
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {chatModels.map((item) => (
                      <PromptInputSelectItem key={item.id} value={item.id}>
                        <span className="flex min-w-48 items-center justify-between gap-4">
                          <span>
                            <span className="block font-medium">
                              {item.label}
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              {item.description}
                            </span>
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {item.creditCost} Credit
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
                  <PromptInputSelectTrigger className="max-w-48">
                    <PromptInputSelectValue>
                      {selectedSkill.label}
                    </PromptInputSelectValue>
                    <ChevronDownIcon className="size-3" />
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {chatSkills.map((item) => (
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

                <div className="ml-1 flex items-center">
                  <Switch
                    id="prompt-reasoning-switch"
                    checked={reasoning}
                    disabled={isDisabled}
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
                    <TooltipContent sideOffset={6}>深度思考</TooltipContent>
                  </Tooltip>
                </div>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!input || isDisabled}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </>
      )}
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
