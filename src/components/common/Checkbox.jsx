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
        'h-4 w-4 rounded border-gray-300 text-violet-600 accent-violet-600',
        className,
      )}
      {...props}
    />
  );
}