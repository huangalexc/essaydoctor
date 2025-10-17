'use client';

interface ProgressBarProps {
  current: number;
  total: number;
  percentage: number;
  className?: string;
}

export function ProgressBar({ current, total, percentage, className = '' }: ProgressBarProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Processing... {current} of {total} schools
        </span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">{percentage}%</span>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
