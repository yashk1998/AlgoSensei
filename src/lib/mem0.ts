/**
 * @dev Mem0 AI memory layer for structured learning context
 * Features: topic tracking, skill assessment, mistake patterns, spaced repetition signals
 */

export interface MemoryUpsert {
  userId: string;
  sessionId?: string | null;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

const MEM0_BASE_URL = process.env.MEM0_BASE_URL || 'https://api.mem0.ai';
const MEM0_API_KEY = process.env.MEM0_API_KEY;

/**
 * Store a memory entry in Mem0 with structured metadata.
 * No-ops gracefully in dev when MEM0_API_KEY is not set.
 */
export async function mem0UpsertMemory(payload: MemoryUpsert) {
  if (!MEM0_API_KEY) return;
  try {
    await fetch(`${MEM0_BASE_URL}/v1/memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MEM0_API_KEY}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Mem0 upsert error:', error);
  }
}

/**
 * Query Mem0 for all memories associated with a user.
 * Returns empty array gracefully when not configured.
 */
export async function mem0QueryMemories(userId: string) {
  if (!MEM0_API_KEY) return [] as Array<{ content: string; score?: number; metadata?: Record<string, unknown> }>;
  try {
    const res = await fetch(
      `${MEM0_BASE_URL}/v1/memory/search?userId=${encodeURIComponent(userId)}`,
      {
        headers: { 'Authorization': `Bearer ${MEM0_API_KEY}` },
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Structured memory helpers                                          */
/* ------------------------------------------------------------------ */

/**
 * Store a structured learning session summary.
 * Called after a chat session to track what was learned.
 */
export async function mem0StoreSessionSummary(
  userId: string,
  sessionId: string | null,
  summary: {
    topic: string;
    difficulty: string;
    outcome: 'solved' | 'partially_solved' | 'struggled';
    patterns: string[];
    mistakes: string[];
    preferredLanguage?: string;
  }
) {
  await mem0UpsertMemory({
    userId,
    sessionId,
    content: [
      `Topic: ${summary.topic} (${summary.difficulty})`,
      `Outcome: ${summary.outcome}`,
      summary.patterns.length > 0 ? `Patterns practiced: ${summary.patterns.join(', ')}` : '',
      summary.mistakes.length > 0 ? `Mistakes: ${summary.mistakes.join(', ')}` : '',
      summary.preferredLanguage ? `Preferred language: ${summary.preferredLanguage}` : '',
    ].filter(Boolean).join('. '),
    tags: ['session-summary', `topic:${summary.topic}`, `difficulty:${summary.difficulty}`],
    metadata: {
      type: 'session_summary',
      ...summary,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Store a learner profile update (skill level, preferences, weak areas).
 */
export async function mem0UpdateLearnerProfile(
  userId: string,
  profile: {
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    preferredLanguage?: string;
    strongTopics?: string[];
    weakTopics?: string[];
    recurringMistakes?: string[];
  }
) {
  const parts: string[] = [];
  if (profile.skillLevel) parts.push(`Skill level: ${profile.skillLevel}`);
  if (profile.preferredLanguage) parts.push(`Preferred language: ${profile.preferredLanguage}`);
  if (profile.strongTopics?.length) parts.push(`Strong in: ${profile.strongTopics.join(', ')}`);
  if (profile.weakTopics?.length) parts.push(`Needs practice: ${profile.weakTopics.join(', ')}`);
  if (profile.recurringMistakes?.length) parts.push(`Watch for: ${profile.recurringMistakes.join(', ')}`);

  if (parts.length === 0) return;

  await mem0UpsertMemory({
    userId,
    content: parts.join('. '),
    tags: ['learner-profile'],
    metadata: {
      type: 'learner_profile',
      ...profile,
      timestamp: new Date().toISOString(),
    },
  });
}
