import React from 'react';
import clsx from 'clsx';

export default function Checkbox({ checked, onChange, disabled, className, ...props }) {
  return (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={onChange}
      disabled={disabled}
      className={clsx(
        'h-4 w-4 rounded border-gray-300 text-forest-600 accent-forest-600',
        className,
      )}
      {...props}
    />
  );
}