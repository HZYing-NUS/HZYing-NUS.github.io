'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { ControllerRenderProps } from 'react-hook-form';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { FormField } from '@/shared/types/blocks/form';

type CollectionStep = {
  clientId: string;
  existing: boolean;
  resourceId: string;
  stepTitleZh: string;
  stepTitleEn: string;
  stepDescriptionZh: string;
  stepDescriptionEn: string;
  relationType: 'required' | 'alternative';
};

const emptyStep: CollectionStep = {
  clientId: '',
  existing: false,
  resourceId: '',
  stepTitleZh: '',
  stepTitleEn: '',
  stepDescriptionZh: '',
  stepDescriptionEn: '',
  relationType: 'required',
};

function readSteps(value: unknown): CollectionStep[] {
  let parsed: unknown = value;
  if (typeof value === 'string' && value) {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.map((item) => {
    const step = item as Partial<CollectionStep>;
    return {
      clientId: step.clientId || crypto.randomUUID(),
      existing: step.existing === true,
      resourceId: step.resourceId || '',
      stepTitleZh: step.stepTitleZh || '',
      stepTitleEn: step.stepTitleEn || '',
      stepDescriptionZh: step.stepDescriptionZh || '',
      stepDescriptionEn: step.stepDescriptionEn || '',
      relationType:
        step.relationType === 'alternative' ? 'alternative' : 'required',
    };
  });
}

export function CollectionSteps({
  field,
  formField,
}: {
  field: FormField;
  formField: ControllerRenderProps<Record<string, unknown>, string>;
}) {
  const isZh = field.metadata?.locale === 'zh';
  const [steps, setSteps] = useState(() => readSteps(formField.value));

  const changeSteps = (nextSteps: CollectionStep[]) => {
    setSteps(nextSteps);
    formField.onChange(
      JSON.stringify(nextSteps.map(({ clientId: _clientId, ...step }) => step))
    );
  };

  const updateStep = (
    index: number,
    key: keyof CollectionStep,
    value: string
  ) => {
    changeSteps(
      steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, [key]: value } : step
      )
    );
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const nextSteps = [...steps];
    [nextSteps[index], nextSteps[targetIndex]] = [
      nextSteps[targetIndex],
      nextSteps[index],
    ];
    changeSteps(nextSteps);
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.clientId} className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">
              {isZh ? `步骤 ${index + 1}` : `Step ${index + 1}`}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === 0}
                onClick={() => moveStep(index, -1)}
                aria-label={isZh ? '上移' : 'Move up'}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === steps.length - 1}
                onClick={() => moveStep(index, 1)}
                aria-label={isZh ? '下移' : 'Move down'}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  changeSteps(
                    steps.filter((_, stepIndex) => stepIndex !== index)
                  )
                }
                aria-label={isZh ? '删除步骤' : 'Remove step'}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{isZh ? '资源' : 'Resource'}</Label>
              <select
                value={step.resourceId}
                onChange={(event) =>
                  updateStep(index, 'resourceId', event.target.value)
                }
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
              >
                <option value="">
                  {isZh ? '请选择资源' : 'Select a resource'}
                </option>
                {field.options?.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={steps.some(
                      (otherStep, otherIndex) =>
                        otherIndex !== index &&
                        otherStep.resourceId === option.value
                    )}
                  >
                    {option.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{isZh ? '关系' : 'Relation'}</Label>
              <select
                value={step.relationType}
                onChange={(event) =>
                  updateStep(index, 'relationType', event.target.value)
                }
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
              >
                <option value="required">{isZh ? '必选' : 'Required'}</option>
                <option value="alternative">
                  {isZh ? '替代方案' : 'Alternative'}
                </option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{isZh ? '中文步骤标题' : 'Chinese step title'}</Label>
              <Input
                value={step.stepTitleZh}
                onChange={(event) =>
                  updateStep(index, 'stepTitleZh', event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{isZh ? '英文步骤标题' : 'English step title'}</Label>
              <Input
                value={step.stepTitleEn}
                onChange={(event) =>
                  updateStep(index, 'stepTitleEn', event.target.value)
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>
                {isZh ? '中文步骤说明' : 'Chinese step description'}
              </Label>
              <Textarea
                value={step.stepDescriptionZh}
                onChange={(event) =>
                  updateStep(index, 'stepDescriptionZh', event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                {isZh ? '英文步骤说明' : 'English step description'}
              </Label>
              <Textarea
                value={step.stepDescriptionEn}
                onChange={(event) =>
                  updateStep(index, 'stepDescriptionEn', event.target.value)
                }
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          changeSteps([
            ...steps,
            { ...emptyStep, clientId: crypto.randomUUID() },
          ])
        }
      >
        <Plus className="size-4" />
        {isZh ? '添加步骤' : 'Add step'}
      </Button>
    </div>
  );
}
