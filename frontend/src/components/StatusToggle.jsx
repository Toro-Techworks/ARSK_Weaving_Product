import React from 'react';

/** Active / inactive pill (matches Admin Master generic-code and entity tiles). */
export function StatusToggle({ checked, disabled, onChange, ariaLabel = 'Toggle active' }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
        checked ? 'bg-brand' : 'bg-gray-200'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-pressed={checked}
      aria-label={ariaLabel}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
