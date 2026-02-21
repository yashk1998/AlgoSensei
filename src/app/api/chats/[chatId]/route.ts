import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getSessionId } from '@/lib/session';
import {
  encodeEmail,
  downloadJson,
  uploadJson,
  deleteBlob,
} from '@/lib/azure-storage';

interface StoredChat {
  _id: string;
  userEmail: string;
  sessionId: string | null;
  title: string;
  messages: unknown[];
  createdAt: string;
  updatedAt: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailKey = encodeEmail(session.user.email);
    const chat = await downloadJson<StoredChat>(
      `chats/${emailKey}/${params.chatId}.json`
    );

    if (!chat || chat.userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, message } = await req.json();
    const emailKey = encodeEmail(session.user.email);
    const blobPath = `chats/${emailKey}/${params.chatId}.json`;
    const sessionId = getSessionId();

    // Read current state
    const chat = await downloadJson<StoredChat>(blobPath);
    if (!chat || chat.userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Modify in memory
    chat.updatedAt = new Date().toISOString();

    if (title) {
      chat.title = title;
    }

    if (message) {
      const enrichedMessage = {
        ...message,
        sessionId: sessionId || null,
      };
      (chat.messages as unknown[]).push(enrichedMessage);
    }

    // Write back
    await uploadJson(blobPath, chat);

    return NextResponse.json(chat);
  } catch (error) {
    console.error('Update chat error:', error);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailKey = encodeEmail(session.user.email);
    const deleted = await deleteBlob(
      `chats/${emailKey}/${params.chatId}.json`
    );

    if (!deleted) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}
