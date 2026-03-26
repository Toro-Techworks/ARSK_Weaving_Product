import React from 'react';
import SearchableSelect from './ui/SearchableSelect';

export function FormInput({
  label,
  error,
  type = 'text',
  required,
  className = '',
  ...props
}) {
  const id = props.id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition-all duration-200"
        {...props}
      />
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
