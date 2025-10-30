import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events for subscription lifecycle
 *
 * Important: This endpoint must receive the raw request body
 * Next.js bodyParser must be disabled for webhook signature verification
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[WEBHOOK] Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Construct and verify webhook event
    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(body, signature);
    } catch (err: any) {
      console.error('[WEBHOOK] Signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`[WEBHOOK] Received event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('[WEBHOOK] Checkout completed:', session.id);

  const userId = session.client_reference_id || session.metadata?.userId;
  const tier = session.metadata?.tier as 'FREE' | 'PLUS' | 'PRO' | undefined;

  if (!userId) {
    console.error('[WEBHOOK] Missing userId in checkout session');
    return;
  }

  if (!tier || (tier !== 'PLUS' && tier !== 'PRO')) {
    console.error('[WEBHOOK] Invalid tier in checkout session:', tier);
    return;
  }

  // Update or create subscription record
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tier,
      status: 'ACTIVE',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    update: {
      tier,
      status: 'ACTIVE',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      cancelAtPeriodEnd: false,
    },
  });

  console.log('[WEBHOOK] Subscription created for user:', userId);
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('[WEBHOOK] Subscription created:', subscription.id);

  const userId = subscription.metadata?.userId;
  const tier = subscription.metadata?.tier as 'FREE' | 'PLUS' | 'PRO' | undefined;

  if (!userId || !tier) {
    console.error('[WEBHOOK] Missing metadata in subscription');
    return;
  }

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tier,
      status: 'ACTIVE',
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      tier,
      status: 'ACTIVE',
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

/**
 * Handle subscription updates (upgrades, downgrades, renewals)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('[WEBHOOK] Subscription updated:', subscription.id);

  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    console.error('[WEBHOOK] Subscription not found in database');
    return;
  }

  // Determine new tier from subscription metadata or price
  const newTier = subscription.metadata?.tier as 'FREE' | 'PLUS' | 'PRO' | undefined;

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      tier: newTier || dbSubscription.tier,
      status: subscription.status === 'active' ? 'ACTIVE' : subscription.status === 'canceled' ? 'CANCELLED' : 'EXPIRED',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('[WEBHOOK] Subscription deleted:', subscription.id);

  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    console.error('[WEBHOOK] Subscription not found in database');
    return;
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      tier: 'FREE',
      status: 'CANCELLED',
    },
  });
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('[WEBHOOK] Payment succeeded for invoice:', invoice.id);

  if (!invoice.subscription) {
    return;
  }

  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!dbSubscription) {
    console.error('[WEBHOOK] Subscription not found for invoice');
    return;
  }

  // Update subscription period
  if (invoice.period_end) {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
        status: 'ACTIVE',
      },
    });
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('[WEBHOOK] Payment failed for invoice:', invoice.id);

  if (!invoice.subscription) {
    return;
  }

  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!dbSubscription) {
    console.error('[WEBHOOK] Subscription not found for invoice');
    return;
  }

  // Mark subscription as expired if payment fails
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: 'EXPIRED',
    },
  });

  console.log('[WEBHOOK] Subscription marked as expired due to failed payment');
}

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
