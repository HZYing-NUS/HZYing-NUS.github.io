import * as React from 'react';
import { ControllerRenderProps } from 'react-hook-form';

import {
  Select as SelectComponent,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { FormField } from '@/shared/types/blocks/form';

const EMPTY_SELECT_VALUE = '__empty_select_value__';

export function Select({
  field,
  formField,
  data,
}: {
  field: FormField;
  formField: ControllerRenderProps<Record<string, unknown>, string>;
  data?: any;
}) {
  const value =
    formField.value === '' ? EMPTY_SELECT_VALUE : (formField.value as string);

  return (
    <SelectComponent
      value={value}
      onValueChange={(nextValue) =>
        formField.onChange(nextValue === EMPTY_SELECT_VALUE ? '' : nextValue)
      }
      {...field.attributes}
    >
      <SelectTrigger className="bg-background w-full rounded-md">
        <SelectValue placeholder={field.placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-background rounded-md">
        {field.options?.map((option: any) => (
          <SelectItem
            key={option.value || EMPTY_SELECT_VALUE}
            value={option.value || EMPTY_SELECT_VALUE}
          >
            {option.title}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectComponent>
  );
}
