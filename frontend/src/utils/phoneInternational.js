import { countryCodes } from '../data/countryCodes';

/** Longest dial codes first for prefix matching (derived from static dataset). */
export const PHONE_COUNTRIES = countryCodes.map((c) => ({
  dialCode: c.dial_code,
  name: c.name,
  nationalLength: c.national_length ?? 10,
  isoCode: c.code,
}));

export const DEFAULT_PHONE_DIAL = '+91';

function allCountriesLongestDialFirst() {
  return [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
}

/**
 * @param {string} dialCode
 */
export function findPhoneCountryByDial(dialCode) {
  return PHONE_COUNTRIES.find((x) => x.dialCode === dialCode);
}

/**
 * @param {unknown} stored
 * @returns {{ dialCode: string, national: string }}
 */
export function parsePhoneToParts(stored) {
  const raw = String(stored ?? '').trim();
  if (!raw) {
    return { dialCode: DEFAULT_PHONE_DIAL, national: '' };
  }

  if (raw.startsWith('+')) {
    const sorted = allCountriesLongestDialFirst();
    for (const c of sorted) {
      if (raw.startsWith(c.dialCode)) {
        const national = raw.slice(c.dialCode.length).replace(/\D/g, '').slice(0, c.nationalLength);
        return { dialCode: c.dialCode, national };
      }
    }
    const digits = raw.slice(1).replace(/\D/g, '');
    return { dialCode: DEFAULT_PHONE_DIAL, national: digits.slice(0, 10) };
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return { dialCode: '+91', national: digits.slice(2, 12) };
  }
  return { dialCode: DEFAULT_PHONE_DIAL, national: digits.slice(0, 10) };
}

/**
 * @param {string} dialCode
 * @param {string} nationalDigits
 * @returns {string}
 */
/**
 * @param {string} dialCode
 * @param {string} nationalDigits
 * @returns {string} Full E.164-style value, or dial-only (e.g. "+44") when there are no national digits yet.
 */
export function composeInternationalPhone(dialCode, nationalDigits) {
  const dc = String(dialCode || '').trim();
  const d = String(nationalDigits || '').replace(/\D/g, '');
  if (!d) return dc;
  return `${dc}${d}`;
}

/**
 * Normalize API / legacy values to international string for form state.
 * @param {unknown} stored
 * @returns {string}
 */
export function ensureInternationalFormat(stored) {
  const raw = String(stored ?? '').trim();
  if (!raw) return '';
  const { dialCode, national } = parsePhoneToParts(stored);
  return composeInternationalPhone(dialCode, national);
}

/**
 * @param {unknown} stored
 * @returns {boolean} true if empty (optional) or full valid national length for dial code
 */
export function isValidInternationalPhone(stored) {
  const { dialCode, national } = parsePhoneToParts(stored);
  if (!national) return true;
  const c = findPhoneCountryByDial(dialCode);
  const len = c?.nationalLength ?? 10;
  return national.length === len;
}
