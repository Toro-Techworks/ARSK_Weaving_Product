import React, { useEffect, useState } from 'react';
import { FormInput } from './FormInput';
import { getGstinValidationError, isValidGSTIN, normalizeGstinInput } from '../utils/gstin';

/**
 * GSTIN input with uppercase/trim normalization, format validation, and success state.
 */
export function GstinFormField({
  value,
  onValueChange,
  required = true,
  fieldBlurred,
  onFieldBlur,
  submitAttempted,
  label = 'GST Number',
  id = 'gst_number',
}) {
  const [formatInvalidDebounced, setFormatInvalidDebounced] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const v = String(value ?? '').trim();
      if (!v) {
        setFormatInvalidDebounced(false);
        return;
      }
      setFormatInvalidDebounced(!isValidGSTIN(v));
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  const err = getGstinValidationError(value, { required });
  const showError =
    Boolean(err) &&
    (fieldBlurred || submitAttempted || (err === 'Invalid GSTIN format' && formatInvalidDebounced));

  const trimmed = String(value ?? '').trim();
  const showSuccess = trimmed.length > 0 && isValidGSTIN(trimmed);

  return (
    <FormInput
      id={id}
      name="gst_number"
      label={label}
      required={required}
      value={value}
      onChange={(e) => onValueChange(normalizeGstinInput(e.target.value))}
      onBlur={() => onFieldBlur?.()}
      error={showError ? err : undefined}
      success={showSuccess}
      maxLength={15}
      autoComplete="off"
      spellCheck={false}
      placeholder="e.g. 27ABCDE1234F1Z5"
      className="!mb-0"
    />
  );
}
