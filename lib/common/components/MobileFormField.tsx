import React, { useCallback, useMemo } from 'react';
import { FormField, FormFieldProps } from '@/lib/common/components/FormField';
import {
  MOBILE_DIGIT_LENGTH,
  sanitizeMobileInput,
  getMobileFieldError,
} from '@/lib/common/utils/validation';

export type MobileFormFieldProps = Omit<FormFieldProps, 'onChangeText'> & {
  value: string;
  onChangeText: (value: string) => void;
  /** When false, empty value is allowed (e.g. alternate number). Default true. */
  required?: boolean;
  /** When false, suppress built-in validation errors (use external `error`). */
  showValidation?: boolean;
  requiredMessage?: string;
  invalidMessage?: string;
};

/**
 * Numeric-only mobile input — strips non-digits, caps at 10, validates on display.
 */
export function MobileFormField({
  value,
  onChangeText,
  required = true,
  showValidation = true,
  requiredMessage,
  invalidMessage,
  error: externalError,
  keyboardType = 'numeric',
  maxLength = MOBILE_DIGIT_LENGTH,
  icon = 'call-outline',
  ...rest
}: MobileFormFieldProps) {
  const handleChange = useCallback(
    (text: string) => onChangeText(sanitizeMobileInput(text)),
    [onChangeText],
  );

  const validationError = useMemo(
    () =>
      getMobileFieldError(value, {
        required,
        messages: { required: requiredMessage, invalid: invalidMessage },
      }),
    [value, required, requiredMessage, invalidMessage],
  );

  const error =
    externalError !== undefined && externalError !== null
      ? externalError
      : showValidation
        ? validationError
        : null;

  return (
    <FormField
      {...rest}
      value={value}
      onChangeText={handleChange}
      keyboardType={keyboardType}
      maxLength={maxLength}
      icon={icon}
      error={error}
    />
  );
}
