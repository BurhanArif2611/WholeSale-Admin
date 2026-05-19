import React from 'react';
import { Input, InputProps } from '@/components/ui';

export type FormFieldProps = InputProps;

/** Standard form field — labels, placeholders, hints, validation, and focus states. */
export function FormField(props: FormFieldProps) {
  return <Input {...props} />;
}
