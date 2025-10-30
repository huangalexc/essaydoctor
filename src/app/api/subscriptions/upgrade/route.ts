import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateSubscription } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const upgradeSchema = z.object({
  tier: z.enum(['PLUS', 'PRO']),
});

/**
 * POST /api/subscriptions/upgrade
 * Upgrade/downgrade user's subscription
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validation = upgradeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { tier } = validation.data;
    const userId = session.user.id;

    // Get user's subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found. Please sign up first.' },
        { status: 404 }
      );
    }

    if (subscription.tier === tier) {
      return NextResponse.json(
        { error: `You are already on the ${tier} plan` },
        { status: 400 }
      );
    }

    console.log('[UPGRADE] Updating subscription from', subscription.tier, 'to', tier);

    // Update subscription in Stripe
    const stripeSubscription = await updateSubscription({
      subscriptionId: subscription.stripeSubscriptionId,
      newTier: tier,
    });

    // Update database
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        tier,
        cancelAtPeriodEnd: false,
      },
    });

    console.log('[UPGRADE] Subscription updated successfully');

    return NextResponse.json({
      message: `Successfully upgraded to ${tier}`,
      tier,
      periodEnd: new Date(stripeSubscription.current_period_end * 1000),
    });
  } catch (error: any) {
    console.error('[UPGRADE] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}
