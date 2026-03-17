import React, { useRef, useEffect } from 'react';

/**
 * Excel-like editable cell. Supports Tab (next cell), Enter (next row).
 * Optional readOnly for computed cells (e.g. Total).
 */
export function EditableCell({
  value,
  onChange,
  onKeyDown,
  onTab,
  onEnter,
  readOnly = false,
  type = 'text',
  className = '',
  placeholder = '',
  'data-row': dataRow,
  'data-col': dataCol,
  ...rest
}) {
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!readOnly) onTab?.();
      onKeyDown?.({ key: 'Tab', row: dataRow, col: dataCol });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!readOnly) onEnter?.();
      onKeyDown?.({ key: 'Enter', row: dataRow, col: dataCol });
    } else {
      onKeyDown?.(e);
    }
  };

  const displayValue = value === '' || value == null ? '' : String(value);

  return (
    <td className={`p-0 align-middle ${className}`}>
      <input
        ref={inputRef}
        type={type}
        value={displayValue}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        placeholder={placeholder}
        className="w-full min-w-[4rem] px-2 py-1.5 text-sm text-gray-900 bg-transparent border-0 rounded focus:ring-2 focus:ring-brand/40 focus:bg-brand/5 focus:outline-none read-only:bg-gray-50 read-only:cursor-default"
        data-row={dataRow}
        data-col={dataCol}
        {...rest}
      />
    </td>
  );
}

export default EditableCell;
