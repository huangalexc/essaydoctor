/**
 * Stripe Integration
 *
 * Handles payment processing, subscriptions, and webhooks for Essay Doctor.
 */

import Stripe from 'stripe';

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

/**
 * Stripe Price IDs for subscription tiers
 */
export const STRIPE_PRICES = {
  PLUS: process.env.STRIPE_PRICE_ID_PLUS || '',
  PRO: process.env.STRIPE_PRICE_ID_PRO || '',
} as const;

/**
 * Subscription tier configuration
 */
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'FREE',
    price: 0,
    aiEditsLimit: 2,
    draftsLimit: 2,
    customizationsLimit: 1,
    features: [
      '2 AI edits per month',
      '2 essay drafts',
      'Basic version control',
      'Email support',
    ],
  },
  PLUS: {
    name: 'PLUS',
    price: 19,
    priceId: STRIPE_PRICES.PLUS,
    aiEditsLimit: Infinity,
    draftsLimit: Infinity,
    customizationsLimit: 10,
    features: [
      'Unlimited AI edits',
      'Unlimited essay drafts',
      'Full version control',
      'School-specific customization (10/month)',
      'Priority email support',
    ],
  },
  PRO: {
    name: 'PRO',
    price: 49,
    priceId: STRIPE_PRICES.PRO,
    aiEditsLimit: Infinity,
    draftsLimit: Infinity,
    customizationsLimit: Infinity,
    features: [
      'Everything in Plus',
      'Unlimited school customizations',
      'Dedicated essay advisor',
      'Video feedback sessions',
      '1-on-1 strategy sessions',
    ],
  },
} as const;

/**
 * Create a Stripe checkout session for subscription signup
 */
export async function createCheckoutSession(params: {
  userId: string;
  userEmail: string;
  tier: 'PLUS' | 'PRO';
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const { userId, userEmail, tier, successUrl, cancelUrl } = params;

  const priceId = STRIPE_PRICES[tier];

  if (!priceId) {
    throw new Error(`Price ID not configured for tier: ${tier}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    client_reference_id: userId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tier,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
      },
    },
  });

  return session;
}

/**
 * Create a Stripe billing portal session for subscription management
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const { customerId, returnUrl } = params;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}

/**
 * Upgrade/downgrade a subscription
 */
export async function updateSubscription(params: {
  subscriptionId: string;
  newTier: 'PLUS' | 'PRO';
}): Promise<Stripe.Subscription> {
  const { subscriptionId, newTier } = params;

  const newPriceId = STRIPE_PRICES[newTier];

  if (!newPriceId) {
    throw new Error(`Price ID not configured for tier: ${newTier}`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentItem = subscription.items.data[0];

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: currentItem.id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'always_invoice',
    metadata: {
      ...subscription.metadata,
      tier: newTier,
    },
  });

  return updatedSubscription;
}

/**
 * Construct a Stripe webhook event from raw body
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

export default stripe;
