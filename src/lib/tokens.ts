import { randomBytes } from 'crypto';
import prisma from './prisma';

export async function generateVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.token.create({
    data: {
      userId,
      token,
      type: 'EMAIL_VERIFY',
      expiresAt,
    },
  });

  return token;
}

export async function generatePasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing password reset tokens for this user
  await prisma.token.deleteMany({
    where: {
      userId,
      type: 'PASSWORD_RESET',
    },
  });

  await prisma.token.create({
    data: {
      userId,
      token,
      type: 'PASSWORD_RESET',
      expiresAt,
    },
  });

  return token;
}

export async function verifyToken(token: string, type: string): Promise<string | null> {
  const tokenRecord = await prisma.token.findFirst({
    where: {
      token,
      type,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!tokenRecord) {
    return null;
  }

  // Delete token after verification (one-time use)
  await prisma.token.delete({
    where: {
      id: tokenRecord.id,
    },
  });

  return tokenRecord.userId;
}

export async function deleteExpiredTokens(): Promise<void> {
  await prisma.token.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
