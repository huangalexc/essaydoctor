import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateDraftSchema = z.object({
  content: z.string().optional(),
  name: z.string().optional(),
  tag: z.enum(['IN_PROGRESS', 'FINAL', 'REVIEW', 'ARCHIVED']).optional(),
  promptText: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = params;

    // Get draft with versions
    const draft = await prisma.draft.findUnique({
      where: { id },
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

    // Check ownership
    if (draft.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ draft });
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
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = params;

    // Parse and validate request body
    const body = await request.json();
    const validation = updateDraftSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Get existing draft
    const existingDraft = await prisma.draft.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!existingDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Check ownership
    if (existingDraft.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.tag !== undefined) {
      updateData.tag = updates.tag;
    }

    if (updates.promptText !== undefined) {
      updateData.promptText = updates.promptText;
    }

    // If content is being updated, create a new version
    if (updates.content !== undefined && updates.content !== existingDraft.content) {
      const wordCount = updates.content.trim().split(/\s+/).filter(Boolean).length;
      updateData.content = updates.content;
      updateData.wordCount = wordCount;

      const latestVersionNumber = existingDraft.versions[0]?.versionNumber || 0;

      await prisma.draftVersion.create({
        data: {
          draftId: id,
          content: updates.content,
          versionNumber: latestVersionNumber + 1,
          changes: 'Manual edit',
        },
      });
    }

    // Update draft
    const updatedDraft = await prisma.draft.update({
      where: { id },
      data: updateData,
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
        },
      },
    });

    return NextResponse.json({ draft: updatedDraft });
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
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = params;

    // Get draft
    const draft = await prisma.draft.findUnique({
      where: { id },
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Check ownership
    if (draft.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete draft (versions will be cascade deleted)
    await prisma.draft.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Draft deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    );
  }
}
