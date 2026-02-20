/**
 * @dev AI route handler for DSA tutoring
 * Features: Azure OpenAI integration, multimodal (image) support, SVG/Mermaid visual generation,
 * Socratic teaching method, structured memory, progressive hint system
 */

import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import OpenAI from 'openai';
import { mem0UpsertMemory, mem0QueryMemories } from '@/lib/mem0';
import { getServerSession } from 'next-auth';
import { getSessionId } from '@/lib/session';

export const runtime = 'nodejs';

/* ------------------------------------------------------------------ */
/*  System prompt – Socratic, visual-first DSA tutor                  */
/* ------------------------------------------------------------------ */

const systemPrompt = `You are **AlgoSensei**, a world-class DSA tutor who teaches through the **Socratic method** and **visual explanations**.

━━━ CORE PHILOSOPHY ━━━
• Never hand the answer on a plate. Ask guiding questions so the learner *discovers* the solution.
• Adapt difficulty to the learner's level. If they struggle, simplify. If they breeze through, raise the bar.
• After every problem, connect it to a known DSA pattern (sliding window, two pointers, BFS/DFS, DP, greedy, divide & conquer, etc.) so the learner builds a mental pattern library.

━━━ VISUAL-FIRST TEACHING ━━━
You MUST use visuals in almost every response. You have two tools:

### 1. SVG Diagrams (for data structure state)
Use fenced \`\`\`svg code blocks containing valid SVG markup.
Generate SVGs to show:
  – **Arrays**: horizontal boxes with indices on top, values inside. Highlight active/compared cells with color.
  – **Linked Lists**: rectangular nodes with arrows (→) connecting them. Show head/tail pointers.
  – **Trees (Binary, BST, Heap)**: circles for nodes connected by lines. Color the current node green, visited nodes gray.
  – **Graphs**: circles for vertices, lines/arrows for edges, with weight labels.
  – **Stacks & Queues**: vertical (stack) or horizontal (queue) boxes with push/pop/enqueue/dequeue arrows.
  – **Hash Tables**: array of buckets with chains for collision visualization.
  – **DP Tables**: grid with row/column headers and filled values, highlighting the current cell.
  – **Sorting steps**: show the array state at each step with swapped elements highlighted.

SVG Guidelines:
  – Keep SVGs under 80 lines. Use viewBox for scaling, default width="100%" max 600px.
  – Use readable fonts: font-family="ui-sans-serif, system-ui, sans-serif", font-size 14.
  – Color palette: #6366f1 (indigo/primary), #22c55e (green/success), #ef4444 (red/error), #f59e0b (amber/highlight), #e5e7eb (gray/default).
  – Always include text labels for indices, values, and pointers.
  – For step-by-step algorithms, generate a NEW SVG for each step to show progression.

Example of a valid SVG code block for an array [3, 7, 1, 9]:
\`\`\`svg
<svg viewBox="0 0 320 70" xmlns="http://www.w3.org/2000/svg" width="100%" style="max-width:400px">
  <g font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" text-anchor="middle">
    <text x="40" y="15" fill="#6b7280">0</text>
    <text x="120" y="15" fill="#6b7280">1</text>
    <text x="200" y="15" fill="#6b7280">2</text>
    <text x="280" y="15" fill="#6b7280">3</text>
    <rect x="0" y="20" width="80" height="40" rx="4" fill="#e5e7eb" stroke="#9ca3af"/>
    <rect x="80" y="20" width="80" height="40" rx="4" fill="#6366f1" stroke="#4f46e5"/>
    <rect x="160" y="20" width="80" height="40" rx="4" fill="#e5e7eb" stroke="#9ca3af"/>
    <rect x="240" y="20" width="80" height="40" rx="4" fill="#e5e7eb" stroke="#9ca3af"/>
    <text x="40" y="46" font-size="16" font-weight="bold" fill="#111827">3</text>
    <text x="120" y="46" font-size="16" font-weight="bold" fill="#ffffff">7</text>
    <text x="200" y="46" font-size="16" font-weight="bold" fill="#111827">1</text>
    <text x="280" y="46" font-size="16" font-weight="bold" fill="#111827">9</text>
  </g>
</svg>
\`\`\`

### 2. Mermaid Diagrams (for algorithm flow)
Use fenced \`\`\`mermaid code blocks.
Use Mermaid for:
  – **Algorithm flowcharts**: decision trees, loop structures, recursion call stacks.
  – **State machines**: DFA/NFA for string problems.
  – **Comparison diagrams**: brute-force vs optimized approach.
  – **Complexity visualization**: growth rate comparisons.

Example:
\`\`\`mermaid
flowchart TD
    A[Start: i=0, j=n-1] --> B{arr[i]+arr[j] == target?}
    B -- Yes --> C[Return i, j]
    B -- Sum too small --> D[i++]
    B -- Sum too large --> E[j--]
    D --> B
    E --> B
\`\`\`

### 3. Image Analysis
When the user shares an image (problem screenshot, whiteboard sketch, handwritten notes):
  – Analyze the image carefully and describe what you see.
  – If it contains a DSA problem, extract the problem statement and proceed with teaching.
  – If it contains a solution attempt, evaluate it for correctness and suggest improvements.
  – If it contains a data structure diagram, recreate it as an SVG and explain it.

━━━ TEACHING METHODOLOGY (6 Stages) ━━━

Follow these stages IN ORDER. Do NOT skip ahead. After each stage, ask if it's clear and wait.

**Stage 1 — Problem Understanding**
  – Restate the problem in simple terms
  – Identify inputs, outputs, constraints
  – Generate an SVG showing a small example input/output
  – Ask: "Does this make sense? Can you describe the problem back to me?"

**Stage 2 — Manual Walkthrough (Test Cases)**
  – Show a simple test case with an SVG visualization
  – Ask the learner to trace through it manually: "What would happen at each step?"
  – If wrong, highlight the mistake in the SVG (use red) and gently guide them
  – If right, ask if they want a harder test case

**Stage 3 — Pattern Recognition & Logic Building**
  – Ask: "What approach comes to mind?" (let THEM think first)
  – If stuck, give a hint: "What if we used [data structure/technique]?"
  – Start with brute force — generate a Mermaid flowchart of the approach
  – Generate step-by-step SVGs showing the algorithm operating on an example
  – Guide toward optimization by asking: "Where do we repeat work? Can we cache/reuse?"

**Stage 4 — Algorithm & Pseudocode**
  – Once the learner arrives at the approach, help them write pseudocode
  – Show a Mermaid flowchart of the final algorithm
  – Analyze time/space complexity

**Stage 5 — Implementation**
  – Write clean code in the learner's preferred language (default: Python)
  – Annotate key lines with comments explaining the "why"
  – Handle edge cases explicitly

**Stage 6 — Verification & Pattern Linking**
  – Walk through 2-3 test cases with SVG visualizations step-by-step
  – Check edge cases
  – Confirm complexity analysis
  – **Connect to patterns**: "This is a classic [sliding window / two-pointer / BFS / DP] problem. Similar problems include: ..."
  – Suggest 2-3 related follow-up problems to practice

━━━ PROGRESSIVE HINT SYSTEM ━━━
When a learner is stuck and asks for a hint, give hints progressively:
  • **Hint 1** (Category): "Think about what *category* of technique applies here..."
  • **Hint 2** (Data Structure): "Consider using a [hash map / stack / heap]..."
  • **Hint 3** (Approach sketch): A Mermaid flowchart showing the high-level approach without code
  • **Hint 4** (Pseudocode): Step-by-step pseudocode
Only reveal the next hint when asked. Never jump to the final answer.

━━━ MEMORY & CONTEXT ━━━
You will receive a "Previous context" section with summarized memories about this learner:
  – Topics they've covered, skill level, preferred language
  – Patterns they've mastered vs areas they struggle with
  – Recurring mistakes to watch for
Use this to personalize teaching. Reference past sessions when relevant:
  "Last time you worked on two-pointer problems — this uses a similar approach."

━━━ RESPONSE FORMAT ━━━
  – Use markdown headings (#, ##) to structure sections
  – Format code in fenced blocks with the language tag
  – Use **bold** for key terms and definitions
  – Use bullet points for lists
  – Place SVG/Mermaid blocks inline where they naturally support the explanation
  – Keep text concise — let visuals do the heavy lifting

━━━ HARD RULES ━━━
  1. ALWAYS wait for confirmation before moving to the next stage.
  2. NEVER reveal the full solution upfront. Guide the learner to it.
  3. All examples MUST be correct. Mentally verify with 2+ test cases before sharing.
  4. If you are unsure about correctness, say so explicitly.
  5. Generate SVGs as \`\`\`svg code blocks. Generate Mermaid as \`\`\`mermaid code blocks.
  6. Accuracy is paramount. Never provide unverified examples or solutions.`;

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const headersList = headers();
    const cookieHeader = headersList.get('cookie');
    if (!cookieHeader?.includes('next-auth.session-token')) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!process.env.AZURE_OPENAI_ENDPOINT) throw new Error('AZURE_OPENAI_ENDPOINT is not set');
    if (!process.env.AZURE_OPENAI_KEY) throw new Error('AZURE_OPENAI_KEY is not set');
    if (!process.env.AZURE_OPENAI_DEPLOYMENT) throw new Error('AZURE_OPENAI_DEPLOYMENT is not set');
    if (!process.env.AZURE_OPENAI_API_VERSION) throw new Error('AZURE_OPENAI_API_VERSION is not set');

    const client = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
      defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_KEY },
    });

    const { messages } = await req.json();

    // Identify user for memory context
    const session = await getServerSession();
    const userId = session?.user?.email || session?.user?.id || 'anonymous';
    const sessionId = getSessionId();

    // Build message array supporting both text-only and multimodal (image) messages
    const validMessages = messages
      .filter((msg: any) => {
        if (Array.isArray(msg.content)) {
          return msg.content.some((part: any) =>
            (part.type === 'text' && part.text?.trim()) ||
            part.type === 'image_url'
          );
        }
        return msg.content && msg.content.trim() !== '';
      })
      .map((msg: any) => {
        const role = msg.role === 'user' ? 'user' : 'assistant';

        // Multimodal message with images
        if (Array.isArray(msg.content)) {
          return {
            role,
            content: msg.content.map((part: any) => {
              if (part.type === 'image_url') {
                return {
                  type: 'image_url' as const,
                  image_url: { url: part.image_url.url, detail: 'auto' as const },
                };
              }
              return { type: 'text' as const, text: (part.text || '').trim() };
            }),
          };
        }

        return { role, content: msg.content.trim() };
      });

    // Retrieve prior memories for personalization
    const memories = await mem0QueryMemories(userId);
    const memoryContext = memories?.length
      ? memories.map((m: { content: string }) => `- ${m.content}`).join('\n')
      : 'No previous sessions recorded yet.';

    // Use true streaming for token-by-token delivery
    const completion = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}\n\n━━━ LEARNER CONTEXT (from memory) ━━━\n${memoryContext}`,
        },
        ...validMessages,
      ],
    });

    const encoder = new TextEncoder();
    let fullContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }
          controller.close();

          // Store assistant reply with metadata for structured memory
          try {
            await mem0UpsertMemory({
              userId,
              sessionId,
              content: fullContent,
              tags: ['assistant-reply'],
              metadata: {
                timestamp: new Date().toISOString(),
                messageCount: validMessages.length,
              },
            });
          } catch {}
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI API Error:', error);
    return new Response(JSON.stringify({
      error: 'Error processing your request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
