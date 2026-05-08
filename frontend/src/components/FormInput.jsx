import React from 'react';
import { Check } from 'lucide-react';
import SearchableSelect from './ui/SearchableSelect';

export function FormInput({
  label,
  error,
  success,
  type = 'text',
  required,
  className = '',
  onChange,
  ...props
}) {
  const id = props.id || props.name;
  const borderClass = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : success
      ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
      : 'border-gray-300 focus:border-brand focus:ring-brand';

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={type}
          className={`w-full rounded-lg border px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-1 focus:outline-none transition-all duration-200 ${success && !error ? 'pr-10' : ''} ${borderClass}`}
          {...props}
          {...(type === 'email' ? { autoCapitalize: 'off', autoCorrect: 'off', spellCheck: false } : {})}
          onChange={(e) => {
            if (type === 'email' && onChange) {
              const v = e.target.value.toLowerCase();
              onChange({ ...e, target: { ...e.target, value: v } });
              return;
            }
            onChange?.(e);
          }}
        />
        {success && !error ? (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-green-600" aria-hidden="true">
            <Check className="w-5 h-5" strokeWidth={2} />
          </span>
        ) : null}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function FormSelect({ label, error, required, options, emptyLabel = 'Select...', className = '', ...props }) {
  const id = props.id || props.name;
  const {
    value = '',
    onChange,
    isClearable = true,
    isDisabled = false,
    loadOptions,
    defaultOptions = true,
    compact = false,
    hideIndicators = false,
    ...rest
  } = props;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <SearchableSelect
        options={options || []}
        value={value}
        onChange={(nextValue) => {
          if (typeof onChange === 'function') {
            onChange({ target: { value: nextValue } });
          }
        }}
        placeholder={emptyLabel}
        isClearable={isClearable}
        isDisabled={isDisabled || rest.disabled}
        loadOptions={loadOptions}
        defaultOptions={defaultOptions}
        compact={compact}
        hideIndicators={hideIndicators}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function FormTextarea({ label, error, required, className = '', ...props }) {
  const id = props.id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <textarea
        id={id}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-all duration-200"
        rows={3}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default FormInput;
