import { headers } from 'next/headers';

export interface MemoryUpsert {
  userId: string;
  sessionId?: string | null;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

const MEM0_BASE_URL = process.env.MEM0_BASE_URL || 'https://api.mem0.ai';
const MEM0_API_KEY = process.env.MEM0_API_KEY;

export async function mem0UpsertMemory(payload: MemoryUpsert) {
  if (!MEM0_API_KEY) return; // noop if not configured in dev
  await fetch(`${MEM0_BASE_URL}/v1/memory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MEM0_API_KEY}`,
    },
    body: JSON.stringify(payload),
    // Never revalidate; this is a server action-style call
    cache: 'no-store',
  });
}

export async function mem0QueryMemories(userId: string) {
  if (!MEM0_API_KEY) return [] as Array<{ content: string; score?: number }>;
  const res = await fetch(`${MEM0_BASE_URL}/v1/memory/search?userId=${encodeURIComponent(userId)}`, {
    headers: { 'Authorization': `Bearer ${MEM0_API_KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.results || [];
}


