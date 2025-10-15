import { PrismaClient, UserRole, SubscriptionTier, SubscriptionStatus, DraftTag } from '../src/generated/prisma';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple password hashing function for development (use bcrypt in production)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.draftVersion.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.schoolMajorData.deleteMany();
  await prisma.usageTracking.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.token.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  console.log('👤 Creating admin user...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@essaydoctor.com',
      hashedPassword: hashPassword('admin123'),
      emailVerified: new Date(),
      role: UserRole.ADMIN,
      subscription: {
        create: {
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
        },
      },
    },
  });

  // Create test users
  console.log('👥 Creating test users...');
  const freeUser = await prisma.user.create({
    data: {
      email: 'user.free@test.com',
      hashedPassword: hashPassword('password123'),
      emailVerified: new Date(),
      role: UserRole.MEMBER,
      subscription: {
        create: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
        },
      },
      usageTracking: {
        create: {
          aiEditsCount: 1,
          customizationsCount: 0,
          schoolFetchesCount: 5,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      },
    },
  });

  const plusUser = await prisma.user.create({
    data: {
      email: 'user.plus@test.com',
      hashedPassword: hashPassword('password123'),
      emailVerified: new Date(),
      role: UserRole.MEMBER,
      subscription: {
        create: {
          tier: SubscriptionTier.PLUS,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: 'cus_test_plus',
          stripeSubscriptionId: 'sub_test_plus',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      usageTracking: {
        create: {
          aiEditsCount: 15,
          customizationsCount: 7,
          schoolFetchesCount: 45,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  const proUser = await prisma.user.create({
    data: {
      email: 'user.pro@test.com',
      hashedPassword: hashPassword('password123'),
      emailVerified: new Date(),
      role: UserRole.MEMBER,
      subscription: {
        create: {
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: 'cus_test_pro',
          stripeSubscriptionId: 'sub_test_pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      usageTracking: {
        create: {
          aiEditsCount: 50,
          customizationsCount: 25,
          schoolFetchesCount: 150,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // Create sample drafts
  console.log('📝 Creating sample drafts...');
  const sampleDraft1 = await prisma.draft.create({
    data: {
      userId: freeUser.id,
      name: 'My Journey to Computer Science',
      promptText: 'Describe a moment that shaped your interest in your chosen major.',
      content:
        'Ever since I was young, I have been fascinated by how things work. When I received my first computer at age 10, I spent hours taking it apart and putting it back together...',
      wordCount: 450,
      tag: DraftTag.IN_PROGRESS,
      versions: {
        create: [
          {
            content:
              'Ever since I was young, I have been fascinated by how things work. When I received my first computer at age 10, I spent hours taking it apart and putting it back together...',
            versionNumber: 1,
            changes: 'Initial draft',
          },
        ],
      },
    },
  });

  const sampleDraft2 = await prisma.draft.create({
    data: {
      userId: plusUser.id,
      name: 'Leadership Through Community Service',
      promptText: 'Describe a leadership experience and what you learned from it.',
      content:
        'During my junior year, I founded a tutoring program at my local community center. What started as a small project with five students grew to serve over 50 children...',
      wordCount: 620,
      tag: DraftTag.REVIEW,
      versions: {
        create: [
          {
            content:
              'During my junior year, I founded a tutoring program at my local community center. What started as a small project with five students grew to serve over 50 children...',
            versionNumber: 1,
            changes: 'Initial draft',
          },
          {
            content:
              'During my junior year, I founded a tutoring program at my local community center that would change not only the lives of the students I served, but my own perspective on leadership. What started as a small project with five students grew to serve over 50 children...',
            versionNumber: 2,
            changes: 'Added stronger opening hook',
          },
        ],
      },
    },
  });

  // Create sample school data
  console.log('🏫 Creating sample school/major data...');
  await prisma.schoolMajorData.create({
    data: {
      schoolName: 'MIT',
      majorName: 'Computer Science',
      programDescription:
        'The MIT Computer Science program is renowned for its rigorous curriculum and cutting-edge research opportunities. Students engage in hands-on projects, work with leading faculty, and have access to state-of-the-art facilities. The program emphasizes both theoretical foundations and practical applications.',
      keyFeatures: [
        'World-class faculty including Turing Award winners',
        'Access to CSAIL (Computer Science and Artificial Intelligence Laboratory)',
        'Strong focus on AI and machine learning',
        'Opportunities for undergraduate research',
        'Industry partnerships with top tech companies',
      ],
      keywords: [
        'artificial intelligence',
        'machine learning',
        'research',
        'innovation',
        'CSAIL',
        'algorithms',
        'systems',
        'theory',
      ],
      sourceUrl: 'https://www.eecs.mit.edu/',
      freshness: true,
    },
  });

  await prisma.schoolMajorData.create({
    data: {
      schoolName: 'Stanford University',
      majorName: 'Computer Science',
      programDescription:
        "Stanford's Computer Science program combines rigorous academics with Silicon Valley innovation. The program offers specialized tracks in AI, systems, theory, and human-computer interaction. Students benefit from close proximity to tech industry leaders and startups.",
      keyFeatures: [
        'Located in Silicon Valley',
        'Strong AI and ML program',
        'Entrepreneurship opportunities',
        'World-renowned faculty',
        'Collaborative research environment',
      ],
      keywords: [
        'silicon valley',
        'innovation',
        'entrepreneurship',
        'AI',
        'startups',
        'research',
        'technology',
      ],
      sourceUrl: 'https://cs.stanford.edu/',
      freshness: true,
    },
  });

  await prisma.schoolMajorData.create({
    data: {
      schoolName: 'Harvard University',
      majorName: 'Economics',
      programDescription:
        'Harvard Economics offers a comprehensive foundation in economic theory, quantitative methods, and real-world applications. The program emphasizes critical thinking, analytical skills, and understanding global economic systems. Students engage with leading scholars and have access to extensive research resources.',
      keyFeatures: [
        'Nobel Prize-winning faculty',
        'Strong emphasis on economic theory and policy',
        'Access to Harvard Business School resources',
        'Undergraduate research opportunities',
        'Global economics perspective',
      ],
      keywords: [
        'economic theory',
        'policy',
        'global economics',
        'quantitative analysis',
        'research',
        'nobel laureates',
      ],
      sourceUrl: 'https://economics.harvard.edu/',
      freshness: true,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Users created: ${4}`);
  console.log(`   Drafts created: ${2}`);
  console.log(`   School/Major data created: ${3}`);
  console.log('\n🔐 Test Credentials:');
  console.log('   Admin: admin@essaydoctor.com / admin123');
  console.log('   Free User: user.free@test.com / password123');
  console.log('   Plus User: user.plus@test.com / password123');
  console.log('   Pro User: user.pro@test.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
