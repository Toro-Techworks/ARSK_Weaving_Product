import React from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

const baseControl = {
  minHeight: 40,
  borderRadius: 8,
  borderColor: '#D1D5DB',
  boxShadow: 'none',
  fontSize: '14px',
};

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    ...baseControl,
    borderColor: state.isFocused ? 'rgb(79 70 229)' : baseControl.borderColor,
    boxShadow: state.isFocused ? '0 0 0 1px rgb(79 70 229)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? 'rgb(79 70 229)' : '#9CA3AF',
    },
    backgroundColor: state.isDisabled ? '#F9FAFB' : '#FFFFFF',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 12px',
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
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 40,
    borderRadius: 8,
    overflow: 'hidden',
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: '14px',
    backgroundColor: state.isFocused ? '#EEF2FF' : state.isSelected ? '#E0E7FF' : '#FFFFFF',
    color: '#111827',
  }),
};

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  isClearable = true,
  isDisabled = false,
  loadOptions,
  defaultOptions = true,
  classNamePrefix = 'erp-select',
  menuPortalTarget,
}) => {
  const Comp = loadOptions ? AsyncSelect : Select;
  const resolvedValue = options.find((opt) => String(opt.value) === String(value)) || null;

  return (
    <Comp
      options={options}
      loadOptions={loadOptions}
      defaultOptions={defaultOptions}
      value={resolvedValue}
      onChange={(selected) => onChange?.(selected?.value ?? '')}
      placeholder={placeholder}
      isSearchable
      isClearable={isClearable}
      isDisabled={isDisabled}
      styles={customStyles}
      classNamePrefix={classNamePrefix}
      menuPortalTarget={menuPortalTarget}
    />
  );
};

export default SearchableSelect;
