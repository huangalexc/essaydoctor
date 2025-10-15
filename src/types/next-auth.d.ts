import { UserRole, SubscriptionTier } from '../generated/prisma';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    role: UserRole;
    tier: SubscriptionTier;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      tier: SubscriptionTier;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    tier: SubscriptionTier;
  }
}
