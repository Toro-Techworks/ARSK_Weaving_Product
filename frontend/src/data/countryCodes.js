/**
 * Static country calling codes for phone prefix selector.
 * `national_length` = expected subscriber number length (validation).
 */

export const countryCodes = [
  { name: 'India', code: 'IN', dial_code: '+91', national_length: 10 },
  { name: 'United States / Canada', code: 'US', dial_code: '+1', national_length: 10 },
  { name: 'United Kingdom', code: 'GB', dial_code: '+44', national_length: 10 },
  { name: 'France', code: 'FR', dial_code: '+33', national_length: 9 },
  { name: 'Germany', code: 'DE', dial_code: '+49', national_length: 10 },
  { name: 'United Arab Emirates', code: 'AE', dial_code: '+971', national_length: 9 },
  { name: 'Saudi Arabia', code: 'SA', dial_code: '+966', national_length: 9 },
  { name: 'Qatar', code: 'QA', dial_code: '+974', national_length: 8 },
  { name: 'Bahrain', code: 'BH', dial_code: '+973', national_length: 8 },
  { name: 'Oman', code: 'OM', dial_code: '+968', national_length: 8 },
  { name: 'Bangladesh', code: 'BD', dial_code: '+880', national_length: 10 },
  { name: 'Sri Lanka', code: 'LK', dial_code: '+94', national_length: 9 },
  { name: 'Pakistan', code: 'PK', dial_code: '+93', national_length: 10 },
  { name: 'China', code: 'CN', dial_code: '+86', national_length: 11 },
  { name: 'Japan', code: 'JP', dial_code: '+81', national_length: 10 },
  { name: 'Singapore', code: 'SG', dial_code: '+65', national_length: 8 },
  { name: 'Australia', code: 'AU', dial_code: '+61', national_length: 9 },
  { name: 'New Zealand', code: 'NZ', dial_code: '+64', national_length: 9 },
  { name: 'South Korea', code: 'KR', dial_code: '+82', national_length: 10 },
  { name: 'Malaysia', code: 'MY', dial_code: '+60', national_length: 9 },
  { name: 'Indonesia', code: 'ID', dial_code: '+62', national_length: 10 },
  { name: 'Thailand', code: 'TH', dial_code: '+66', national_length: 9 },
  { name: 'Philippines', code: 'PH', dial_code: '+63', national_length: 10 },
  { name: 'Vietnam', code: 'VN', dial_code: '+84', national_length: 9 },
  { name: 'Nepal', code: 'NP', dial_code: '+977', national_length: 10 },
  { name: 'Kuwait', code: 'KW', dial_code: '+965', national_length: 8 },
  { name: 'Italy', code: 'IT', dial_code: '+39', national_length: 10 },
  { name: 'Spain', code: 'ES', dial_code: '+34', national_length: 9 },
  { name: 'Netherlands', code: 'NL', dial_code: '+31', national_length: 9 },
  { name: 'Belgium', code: 'BE', dial_code: '+32', national_length: 9 },
  { name: 'Switzerland', code: 'CH', dial_code: '+41', national_length: 9 },
  { name: 'South Africa', code: 'ZA', dial_code: '+27', national_length: 9 },
  { name: 'Kenya', code: 'KE', dial_code: '+254', national_length: 9 },
  { name: 'Nigeria', code: 'NG', dial_code: '+234', national_length: 10 },
  { name: 'Brazil', code: 'BR', dial_code: '+55', national_length: 11 },
  { name: 'Mexico', code: 'MX', dial_code: '+52', national_length: 10 },
];

/** Default prefix (India). */
export const DEFAULT_DIAL_CODE = '+91';

/**
 * ISO 3166-1 alpha-2 → regional indicator flag emoji.
 * @param {string} code
 */
export function flagEmoji(code) {
  const s = String(code || '').toUpperCase();
  if (s.length !== 2 || !/^[A-Z]{2}$/.test(s)) return '';
  const base = 0x1f1e6;
  return String.fromCodePoint(base + s.charCodeAt(0) - 65, base + s.charCodeAt(1) - 65);
}

/**
 * Filter by country name, ISO code, or dial code.
 * @param {string} query
 * @returns {typeof countryCodes}
 */
export function filterCountryCodes(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [...countryCodes];
  const compact = q.replace(/\s/g, '');
  return countryCodes.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dial_code.toLowerCase().includes(compact),
  );
}
