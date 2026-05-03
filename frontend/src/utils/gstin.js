const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;

/**
 * @param {string} gstin
 * @returns {boolean}
 */
export function isValidGSTIN(gstin) {
  if (!gstin) return false;
  const value = gstin.trim().toUpperCase();
  return GSTIN_REGEX.test(value);
}

/**
 * Uppercase, trim, strip whitespace, max 15 chars (for controlled input).
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeGstinInput(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s/g, '')
    .slice(0, 15);
}

/**
 * @param {unknown} value
 * @param {{ required?: boolean }} [options]
 * @returns {string | null} Error message or null if valid
 */
export function getGstinValidationError(value, { required = true } = {}) {
  const v = String(value ?? '').trim();
  if (!v) return required ? 'GSTIN is required' : null;
  if (!isValidGSTIN(v)) return 'Invalid GSTIN format';
  return null;
}
