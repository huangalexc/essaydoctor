import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import { generateVerificationToken } from '@/lib/tokens';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with free tier subscription
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        role: 'MEMBER',
        subscription: {
          create: {
            tier: 'FREE',
            status: 'ACTIVE',
          },
        },
        usageTracking: {
          create: {
            aiEditsCount: 0,
            customizationsCount: 0,
            schoolFetchesCount: 0,
            periodStart: new Date(),
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        },
      },
    });

    // Generate verification token
    const verificationToken = await generateVerificationToken(user.id);

    // TODO: Send verification email
    // await sendVerificationEmail(email, verificationToken);

    return NextResponse.json(
      {
        message: 'Registration successful. Please check your email to verify your account.',
        userId: user.id,
        // For development, return the token (remove in production)
        ...(process.env.NODE_ENV === 'development' && { verificationToken }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
