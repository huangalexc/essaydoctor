import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createPortalSession } from '@/lib/stripe';
import prisma from '@/lib/prisma';

/**
 * GET /api/subscriptions/portal
 * Create a Stripe billing portal session for subscription management
 */
export async function GET(request: NextRequest) {
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

    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get base URL for return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const returnUrl = `${baseUrl}/dashboard`;

    console.log('[PORTAL] Creating session for customer:', subscription.stripeCustomerId);

    // Create portal session
    const portalSession = await createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl,
    });

    console.log('[PORTAL] Session created:', portalSession.id);

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error('[PORTAL] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
