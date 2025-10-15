'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button, Card } from '@/components/ui';
import { useUIStore } from '@/store';
import { api } from '@/lib/api-client';

const tiers = [
  {
    name: 'FREE',
    price: 0,
    billing: 'Forever',
    description: 'Perfect for trying out Essay Doctor',
    features: [
      '2 AI edits per month',
      '2 essay drafts',
      'Basic version control',
      'Email support',
      '10 proven essay principles feedback',
    ],
    limitations: [
      'Limited AI edits',
      'Limited drafts',
      'No school customization',
    ],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    name: 'PLUS',
    price: 19,
    billing: 'per month',
    description: 'For serious applicants',
    features: [
      'Unlimited AI edits',
      'Unlimited essay drafts',
      'Full version control',
      'School-specific customization',
      'Priority email support',
      '10 proven essay principles feedback',
      'Advanced analytics',
    ],
    limitations: [],
    cta: 'Upgrade to Plus',
    highlighted: true,
  },
  {
    name: 'PRO',
    price: 49,
    billing: 'per month',
    description: 'For maximum results',
    features: [
      'Everything in Plus',
      'Dedicated essay advisor',
      'Video feedback sessions',
      'Custom essay templates',
      'Early access to new features',
      '1-on-1 strategy sessions',
      'College-specific guides',
    ],
    limitations: [],
    cta: 'Upgrade to Pro',
    highlighted: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { addToast } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const handleUpgrade = async (tier: 'PLUS' | 'PRO') => {
    if (status !== 'authenticated') {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setSelectedTier(tier);

    try {
      const response = await api.subscriptions.createCheckoutSession(tier);

      if (response.error) {
        addToast({ type: 'error', message: response.error });
      } else if (response.data?.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      addToast({ type: 'error', message: error.message || 'Failed to start checkout' });
    } finally {
      setIsLoading(false);
      setSelectedTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pricing</h1>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Select the perfect plan to craft your winning college essays
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`p-8 relative ${
                tier.highlighted
                  ? 'ring-2 ring-blue-600 dark:ring-blue-400 shadow-xl'
                  : ''
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">
                    ${tier.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">/{tier.billing}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tier.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
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
                    <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
                {tier.limitations.map((limitation, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                      {limitation}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                fullWidth
                variant={tier.highlighted ? 'primary' : 'outline'}
                onClick={() => {
                  if (tier.name === 'FREE') {
                    router.push('/dashboard');
                  } else {
                    handleUpgrade(tier.name as 'PLUS' | 'PRO');
                  }
                }}
                isLoading={isLoading && selectedTier === tier.name}
                disabled={isLoading}
              >
                {tier.cta}
              </Button>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h3>

          <div className="space-y-6">
            <Card className="p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I upgrade or downgrade anytime?
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect
                immediately, and we'll prorate any billing differences.
              </p>
            </Card>

            <Card className="p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                What happens to my drafts if I downgrade?
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                All your drafts are safe! You'll keep access to everything you've created, but you
                won't be able to create new drafts beyond the free tier limits.
              </p>
            </Card>

            <Card className="p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Do you offer refunds?
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Yes, we offer a 14-day money-back guarantee. If you're not satisfied with Essay
                Doctor, contact us within 14 days of your purchase for a full refund.
              </p>
            </Card>

            <Card className="p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Is my payment information secure?
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Absolutely! We use Stripe for payment processing, which is the same payment
                processor used by millions of businesses worldwide. We never store your credit card
                information.
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Still have questions? We're here to help!
          </p>
          <Button variant="outline" onClick={() => router.push('/contact')}>
            Contact Support
          </Button>
        </div>
      </main>
    </div>
  );
}
