/** Standard Indian mobile: exactly 10 digits, starting with 6–9. */
export const MOBILE_DIGIT_LENGTH = 10;

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/** Strip non-digits and cap length (default 10). */
export function sanitizeMobileInput(value: string, maxLength = MOBILE_DIGIT_LENGTH): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

/** Digits-only normalized mobile (up to 10 chars). */
export function normalizeMobile(mobile: string): string {
  return sanitizeMobileInput(mobile);
}

export function isValidMobile(mobile: string): boolean {
  const digits = normalizeMobile(mobile);
  return digits.length === MOBILE_DIGIT_LENGTH && INDIAN_MOBILE_REGEX.test(digits);
}

/** Empty is valid; otherwise must be a full 10-digit mobile. */
export function isValidMobileOptional(mobile: string): boolean {
  if (!mobile.trim()) return true;
  return isValidMobile(mobile);
}

export type MobileValidationMessages = {
  required?: string;
  invalid?: string;
};

export function getMobileFieldError(
  mobile: string,
  options: { required?: boolean; messages?: MobileValidationMessages } = {},
): string | null {
  const { required = false, messages = {} } = options;
  const digits = normalizeMobile(mobile);

  if (!digits) {
    return required ? (messages.required ?? 'Mobile number is required') : null;
  }

  if (!isValidMobile(mobile)) {
    return messages.invalid ?? 'Please enter a valid 10-digit mobile number';
  }

  return null;
}

export function isValidEmail(email: string): boolean {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidGst(gst: string): boolean {
  if (!gst.trim()) return true;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.toUpperCase());
}
