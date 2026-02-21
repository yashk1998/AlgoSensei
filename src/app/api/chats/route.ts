import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { getServerSession } from 'next-auth';
import { getSessionId } from '@/lib/session';
import {
  encodeEmail,
  generateId,
  uploadJson,
  listJsonBlobs,
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

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailKey = encodeEmail(session.user.email);
    const userChats = await listJsonBlobs<StoredChat>(`chats/${emailKey}/`);

    // Sort by updatedAt descending (most recent first)
    userChats.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json(userChats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await req.json();
    const sessionId = getSessionId();
    const chatId = generateId();
    const emailKey = encodeEmail(session.user.email);
    const now = new Date().toISOString();

    const newChat: StoredChat = {
      _id: chatId,
      userEmail: session.user.email,
      sessionId: sessionId || null,
      title: title || 'New Discussion',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    await uploadJson(`chats/${emailKey}/${chatId}.json`, newChat);

    return NextResponse.json(newChat);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
