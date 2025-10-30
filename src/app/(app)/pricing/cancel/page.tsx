'use client';

import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        {/* Cancel Icon */}
        <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-12 h-12 text-yellow-600 dark:text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Cancel Message */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Subscription Not Completed
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Your payment was cancelled. No charges have been made to your account.
        </p>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8 text-left">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
            Why upgrade?
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Get unlimited AI-powered essay edits
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Customize essays for specific schools
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Create unlimited essay drafts
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Get priority support when you need it
            </li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            onClick={() => router.push('/pricing')}
          >
            View Pricing Again
          </Button>
          <Button
            fullWidth
            variant="outline"
            onClick={() => router.push('/dashboard')}
          >
            Continue with Free Plan
          </Button>
        </div>

        {/* Help Link */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Have questions? <a href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">Contact support</a>
        </p>
      </Card>
    </div>
  );
}
