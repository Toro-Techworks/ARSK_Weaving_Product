import React, { useMemo, forwardRef } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

/**
 * @param {object} opts
 * @param {boolean} [opts.compact] - Shorter control, aligns with dense table cells
 * @param {boolean} [opts.hideIndicators] - No clear (use isClearable={false}) / chevron / separator — more room for the value
 */
function buildStyles({ compact = false, hideIndicators = false }) {
  return {
    control: (provided, state) => ({
      ...provided,
      minHeight: compact ? 34 : 40,
      minWidth: 0,
      borderRadius: 8,
      borderColor: state.isFocused
        ? 'rgb(79 70 229)'
        : compact
          ? 'transparent'
          : '#D1D5DB',
      boxShadow: state.isFocused ? '0 0 0 1px rgb(79 70 229)' : 'none',
      fontSize: '14px',
      '&:hover': {
        borderColor: state.isFocused ? 'rgb(79 70 229)' : compact ? 'transparent' : '#9CA3AF',
      },
      backgroundColor: state.isDisabled ? '#F9FAFB' : '#FFFFFF',
      cursor: state.isDisabled ? 'not-allowed' : 'default',
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: compact ? '2px 8px' : '0 12px',
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      ...(hideIndicators ? { display: 'none' } : {}),
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0,
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9CA3AF',
      fontSize: '14px',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#111827',
      fontSize: '14px',
      maxWidth: hideIndicators ? '100%' : provided.maxWidth,
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 10050,
      borderRadius: 8,
      overflow: 'hidden',
    }),
    menuPortal: (provided) => ({
      ...provided,
      // Above modals (z-50), layout chrome, and sticky grid headers
      zIndex: 10050,
    }),
    option: (provided, state) => ({
      ...provided,
      fontSize: '14px',
      backgroundColor: state.isFocused ? '#EEF2FF' : state.isSelected ? '#E0E7FF' : '#FFFFFF',
      color: '#111827',
    }),
  };
}

const SearchableSelect = forwardRef(function SearchableSelect(
  {
    options = [],
    value,
    onChange,
    placeholder = 'Select...',
    isClearable = true,
    isDisabled = false,
    loadOptions,
    defaultOptions = true,
    classNamePrefix = 'erp-select',
    /**
     * Portals the menu to this element so options are not clipped by grid/table `overflow: auto|hidden`.
     * Pass `null` to keep the menu in the DOM hierarchy (e.g. rare custom layouts).
     * @type {HTMLElement | null | undefined}
     */
    menuPortalTarget,
    /** Match table cell inputs (yarn receipt Type, etc.) */
    compact = false,
    /** Hide chevron, separator, and clear affordances — pair with isClearable={false} for a clean value display */
    hideIndicators = false,
    onMenuOpen,
    onMenuClose,
    onKeyDown,
  },
  ref
) {
  const Comp = loadOptions ? AsyncSelect : Select;
  const resolvedValue = options.find((opt) => String(opt.value) === String(value)) || null;

  const styles = useMemo(
    () => buildStyles({ compact, hideIndicators }),
    [compact, hideIndicators],
  );

  const portalTarget =
    menuPortalTarget === undefined
      ? typeof document !== 'undefined'
        ? document.body
        : null
      : menuPortalTarget;

  return (
    <Comp
      ref={ref}
      options={options}
      loadOptions={loadOptions}
      defaultOptions={defaultOptions}
      value={resolvedValue}
      onChange={(selected) => onChange?.(selected?.value ?? '')}
      placeholder={placeholder}
      isSearchable
      isClearable={isClearable}
      isDisabled={isDisabled}
      styles={styles}
      classNamePrefix={classNamePrefix}
      menuPortalTarget={portalTarget ?? undefined}
      menuPosition={portalTarget ? 'fixed' : 'absolute'}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
      onKeyDown={onKeyDown}
    />
  );
});

export default SearchableSelect;
