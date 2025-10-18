import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateDraftSchema = z.object({
  name: z.string().optional(),
  promptText: z.string().optional(),
  content: z.string().optional(),
  tag: z.enum(['IN_PROGRESS', 'REVIEW', 'FINAL']).optional(),
  wordCount: z.number().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: draftId } = await params;

    // Get draft
    const draft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        userId,
      },
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
        },
      },
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error('Draft fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch draft' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: draftId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = updateDraftSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid request data' },
        { status: 400 }
      );
    }

    // Check if draft exists and belongs to user
    const existingDraft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        userId,
      },
    });

    if (!existingDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
    }

    if (validation.data.promptText !== undefined) {
      updateData.promptText = validation.data.promptText;
    }

    if (validation.data.content !== undefined) {
      updateData.content = validation.data.content;
      // Recalculate word count if content is updated
      updateData.wordCount = validation.data.content.trim()
        ? validation.data.content.trim().split(/\s+/).filter(Boolean).length
        : 0;
    }

    if (validation.data.tag !== undefined) {
      updateData.tag = validation.data.tag;
    }

    // Update draft
    const updatedDraft = await prisma.draft.update({
      where: { id: draftId },
      data: updateData,
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
          take: 1,
        },
      },
    });

    return NextResponse.json(updatedDraft);
  } catch (error) {
    console.error('Draft update error:', error);
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: draftId } = await params;

    // Check if draft exists and belongs to user
    const existingDraft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        userId,
      },
    });

    if (!existingDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Delete draft (cascade will delete versions)
    await prisma.draft.delete({
      where: { id: draftId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Draft deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    );
  }
}
