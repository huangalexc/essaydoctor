import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cancelSubscription } from '@/lib/stripe';
import prisma from '@/lib/prisma';

/**
 * POST /api/subscriptions/cancel
 * Cancel user's subscription (set to cancel at period end)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    if (subscription.tier === 'FREE') {
      return NextResponse.json(
        { error: 'You are already on the free plan' },
        { status: 400 }
      );
    }

    console.log('[CANCEL] Cancelling subscription:', subscription.stripeSubscriptionId);

    // Cancel subscription at period end
    const stripeSubscription = await cancelSubscription(subscription.stripeSubscriptionId);

    // Update database
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    console.log('[CANCEL] Subscription cancelled, active until:', stripeSubscription.current_period_end);

    return NextResponse.json({
      message: 'Subscription will be cancelled at period end',
      periodEnd: new Date(stripeSubscription.current_period_end * 1000),
    });
  } catch (error: any) {
    console.error('[CANCEL] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
