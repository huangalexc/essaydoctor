import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function upgradeTestAccount() {
  try {
    console.log('Finding test account...');

    // Find the test user
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
      include: { subscription: true },
    });

    if (!user) {
      console.error('Test user not found!');
      return;
    }

    console.log(`Found user: ${user.email} (ID: ${user.id})`);
    console.log(`Current subscription tier: ${user.subscription?.tier || 'None'}`);

    // Update or create PRO subscription
    if (user.subscription) {
      console.log('Updating existing subscription to PRO...');
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          tier: 'PRO',
          status: 'ACTIVE',
        },
      });
    } else {
      console.log('Creating new PRO subscription...');
      await prisma.subscription.create({
        data: {
          userId: user.id,
          tier: 'PRO',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });
    }

    // Reset usage tracking
    console.log('Resetting usage tracking...');
    const usage = await prisma.usageTracking.findFirst({
      where: {
        userId: user.id,
        periodEnd: { gte: new Date() },
      },
    });

    if (usage) {
      await prisma.usageTracking.update({
        where: { id: usage.id },
        data: {
          aiEditsCount: 0,
          customizationsCount: 0,
          schoolFetchesCount: 0,
        },
      });
      console.log('Usage counts reset to 0');
    } else {
      console.log('No active usage tracking period found');
    }

    // Verify the changes
    const updatedUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
      include: { subscription: true },
    });

    console.log('\n✅ Upgrade complete!');
    console.log(`New subscription tier: ${updatedUser?.subscription?.tier}`);
    console.log(`Status: ${updatedUser?.subscription?.status}`);
    console.log('\nThe test account now has unlimited AI edits and rewrites.');
  } catch (error) {
    console.error('Error upgrading account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

upgradeTestAccount();
