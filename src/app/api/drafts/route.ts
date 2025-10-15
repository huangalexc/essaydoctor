import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createDraftSchema = z.object({
  promptText: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createDraftSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { promptText, content, name } = validation.data;
    const userId = session.user.id;

    // Calculate word count
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    // Check tier limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const tier = subscription?.tier || 'FREE';

    // FREE tier: max 5000 words
    if (tier === 'FREE' && wordCount > 5000) {
      return NextResponse.json(
        {
          error: 'Free tier is limited to 5000 words per draft. Please upgrade or reduce your essay length.',
          wordCount,
          limit: 5000,
        },
        { status: 403 }
      );
    }

    // FREE tier: max 2 drafts
    if (tier === 'FREE') {
      const draftCount = await prisma.draft.count({
        where: { userId },
      });

      if (draftCount >= 2) {
        return NextResponse.json(
          {
            error: 'Free tier is limited to 2 drafts. Please upgrade or delete an existing draft.',
            currentDrafts: draftCount,
            limit: 2,
          },
          { status: 403 }
        );
      }
    }

    // Create draft with initial version
    const draft = await prisma.draft.create({
      data: {
        userId,
        promptText,
        content,
        name: name || `Draft ${new Date().toLocaleDateString()}`,
        wordCount,
        tag: 'IN_PROGRESS',
        versions: {
          create: {
            content,
            versionNumber: 1,
            changes: 'Initial draft',
          },
        },
      },
      include: {
        versions: true,
      },
    });

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error('Draft creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');

    // Get user's drafts
    const drafts = await prisma.draft.findMany({
      where: {
        userId,
        ...(tag && { tag: tag as any }),
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
          take: 1, // Only include latest version
        },
      },
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('Draft fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}
