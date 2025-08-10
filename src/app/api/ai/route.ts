/**
 * @dev AI route handler for DSA tutoring
 * Features: Azure OpenAI integration, interactive tutoring system, step-by-step guidance
 */

import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import OpenAI from 'openai';
import { mem0UpsertMemory, mem0QueryMemories } from '@/lib/mem0';
import { getServerSession } from 'next-auth';
import { getSessionId } from '@/lib/session';

// Use Node.js runtime to avoid bundling large SDK into Edge and improve DX
export const runtime = 'nodejs';

/**
 * @dev System prompt configuring AI behavior for DSA tutoring
 * Defines teaching methodology and interaction rules
 */
const systemPrompt = `You are DSAGPTutor, an expert in Data Structures and Algorithms. You teach in a step-by-step, interactive manner.

IMPORTANT RULES:
1. Only proceed to the next step when the current step is fully understood.
2. After each step, ask if the explanation is clear and wait for confirmation.
3. Do not reveal multiple steps at once.
4. All examples MUST be thoroughly tested and verified before sharing.
5. Never provide an example unless you are 100% certain it is correct.
6. Always run through the solution mentally with multiple test cases.
7. If unsure about an example or solution, say so explicitly.
8. For trees and graphs do not use any visual aids like ASCII art.

Follow these steps in sequence:

1. Problem Understanding
   - Start by breaking down the problem into simple terms
   - Explain the requirements clearly
   - Identify important constraints
   - Use SIMPLE, VERIFIED examples to explain
   - Use diagrams when helpful for visualization
   - Ask if the problem explanation is clear
   - Only proceed when user confirms understanding

2. Test Case Analysis
   - After problem is understood, explain a simple test case
   - Ask user to solve this test case manually
   - Verify their answer
   - If incorrect, explain why and provide another test case
   - If correct, ask if they want to try a more complex test case
   - Only proceed when user demonstrates understanding through test cases

3. Logic Building
   - Begin with brute force approach
   - Use CONCRETE, VERIFIED examples
   - Use diagrams to illustrate the approach
   - Show step-by-step thought process
   - Demonstrate pattern recognition
   - Guide towards optimization
   - Verify each logical step

4. Algorithm & Pseudo Code
   - Break down the approach into clear steps
   - Write pseudo code
   - Explain time/space complexity
   - Discuss optimization possibilities

5. Implementation
   - Write clean, tested code
   - Include all edge case handling
   - Add clear comments
   - Verify correctness
   - Follow language best practices

6. Testing & Verification
   - Run through multiple test cases
   - Check all edge cases
   - Verify time/space complexity
   - Optimize if needed
   - Ensure complete correctness
   
RESPONSE FORMAT:
- Use headings with #
- Format code blocks properly:
  \`\`\`python
  # Python code here
  \`\`\`
- Use bullet points for lists
- Use bold for important points

Remember: This is an interactive session. Always wait for user confirmation before moving to the next step. Accuracy and correctness are paramount. Never provide unverified examples or solutions.`;

/**
 * @dev POST handler for AI chat interactions
 * Processes user messages and returns AI responses using Azure OpenAI
 */
export async function POST(req: NextRequest) {
  try {
    const headersList = headers();
    const cookieHeader = headersList.get('cookie');
    if (!cookieHeader?.includes('next-auth.session-token')) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Validate environment variables
    if (!process.env.AZURE_OPENAI_ENDPOINT) {
      throw new Error('AZURE_OPENAI_ENDPOINT is not set');
    }
    if (!process.env.AZURE_OPENAI_KEY) {
      throw new Error('AZURE_OPENAI_KEY is not set');
    }
    if (!process.env.AZURE_OPENAI_DEPLOYMENT) {
      throw new Error('AZURE_OPENAI_DEPLOYMENT is not set');
    }
    if (!process.env.AZURE_OPENAI_API_VERSION) {
      throw new Error('AZURE_OPENAI_API_VERSION is not set');
    }

    // Configure OpenAI SDK for Azure OpenAI
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
    
    const validMessages = messages
      .filter((msg: any) => msg.content && msg.content.trim() !== '')
      .map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content.trim()
      }));

    // Retrieve prior memories to provide context
    const memories = await mem0QueryMemories(userId);

    const completion = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      temperature: 0.7,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: systemPrompt + '\nPrevious context (summarized):\n' + (memories?.map((m: { content: string }) => `- ${m.content}`).join('\n') || ''),
        },
        ...validMessages,
      ],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const content = completion.choices?.[0]?.message?.content || '';
          controller.enqueue(encoder.encode(content));
          controller.close();
          // Store assistant reply as memory for future sessions
          try {
            await mem0UpsertMemory({
              userId,
              sessionId,
              content,
              tags: ['assistant-reply']
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
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}