import React from 'react';
import { cn } from '@/lib/utils';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
  maxCount?: number;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    { className, label, error, helperText, showCount, maxCount, value, onChange, ...props },
    ref
  ) => {
    const currentLength = value?.toString().length || 0;
    const wordCount = value?.toString().trim().split(/\s+/).filter(Boolean).length || 0;

    return (
      <div className="w-full">
        {label && (
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
            {showCount && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {wordCount} words
                {maxCount && ` / ${maxCount} max`}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          className={cn(
            'block w-full rounded-lg border px-4 py-3 text-base',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-y min-h-[100px]',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-600'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600',
            'dark:bg-gray-800 dark:text-gray-100',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!error && helperText && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;
