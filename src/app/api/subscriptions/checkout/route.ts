import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/stripe';
import { z } from 'zod';

const checkoutSchema = z.object({
  tier: z.enum(['PLUS', 'PRO']),
});

/**
 * POST /api/subscriptions/checkout
 * Create a Stripe checkout session for subscription signup
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { tier } = validation.data;
    const { email, id: userId } = session.user;

    // Get base URL for redirect URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const successUrl = `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing`;

    console.log('[CHECKOUT] Creating session for:', {
      userId,
      email,
      tier,
      baseUrl,
    });

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession({
      userId,
      userEmail: email,
      tier,
      successUrl,
      cancelUrl,
    });

    console.log('[CHECKOUT] Session created:', checkoutSession.id);

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error: any) {
    console.error('[CHECKOUT] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
