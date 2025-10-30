'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Loading } from '@/components/ui';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Give webhook a moment to process
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <Loading size="lg" text="Verifying your subscription..." />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-12 h-12 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Essay Doctor!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Your subscription has been successfully activated.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
          Session ID: {sessionId || 'Processing...'}
        </p>

        {/* Features Unlocked */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8 text-left">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            You now have access to:
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited AI edits
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited essay drafts
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              School-specific customization
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Priority support
            </li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            onClick={() => router.push('/dashboard')}
          >
            Go to Dashboard
          </Button>
          <Button
            fullWidth
            variant="outline"
            onClick={() => router.push('/editor')}
          >
            Start Writing
          </Button>
        </div>

        {/* Help Link */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Need help? <a href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">Contact support</a>
        </p>
      </Card>
    </div>
  );
}
