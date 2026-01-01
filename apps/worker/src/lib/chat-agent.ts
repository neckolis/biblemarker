/// <reference types="@cloudflare/workers-types" />
import { Env, RAGContext, Message, Source } from './types';

/**
 * Chat Agent - Core logic for AI Study chat with RAG
 */

const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5' as const;
const LLM_MODEL = '@cf/meta/llama-3-8b-instruct' as const;

/**
 * System prompt for inductive Bible study
 */
const SYSTEM_PROMPT = `You are an expert Bible study assistant specializing in the Precept Inductive Bible Study Method.

## Your Role
- Guide users through Observation, Interpretation, and Application (OIA)
- Cite Scripture as the highest authority
- Reference PreceptAustin commentary when relevant (summarize, don't copy verbatim)
- Support apologetics and systematic theology questions
- Be concise but thorough

## Response Format
When helping with inductive study, structure your response with these sections when appropriate:

**OBSERVATION** (What does the text say?)
- Key observations about the passage
- Who, What, When, Where, Why, How

**INTERPRETATION** (What does the text mean?)
- Historical and cultural context
- Cross-references to other Scripture
- Original language insights if relevant

**APPLICATION** (How should I respond?)
- Personal application points
- Commands to obey, truths to believe

## Citation Format
Always cite your sources inline:
- Scripture: Use format like (John 3:16) or (Romans 8:28-29)
- PreceptAustin: Mention "According to PreceptAustin commentary..." with the key insight

## Guidelines
- Scripture is the highest authority - always point back to the text
- Be helpful and encouraging in the faith
- If unsure, acknowledge uncertainty
- Keep responses focused and actionable`;

/**
 * Generate embeddings for text using Workers AI
 */
export async function generateEmbedding(ai: Ai, text: string): Promise<number[]> {
    const result = await ai.run(EMBEDDING_MODEL, {
        text: [text]
    }) as { data: number[][] };
    return result.data[0];
}

/**
 * Retrieve relevant context from Vectorize
 */
export async function retrieveRAGContext(
    env: Env,
    query: string,
    passageContext?: { translation: string; book_id: number; chapter: number }
): Promise<RAGContext> {
    const context: RAGContext = {
        scripture: [],
        precept: [],
        chat_history: []
    };

    // Generate query embedding
    let queryEmbedding: number[];
    try {
        queryEmbedding = await generateEmbedding(env.AI, query);
    } catch (e) {
        console.error('Failed to generate embedding:', e);
        return context;
    }

    // Query Vectorize for similar chunks
    if (env.VECTORIZE) {
        try {
            const results = await env.VECTORIZE.query(queryEmbedding, {
                topK: 5,
                returnMetadata: 'all'
            });

            // Fetch full chunk text from D1
            for (const match of results.matches) {
                if (match.metadata?.type === 'precept' && match.metadata?.chunk_id) {
                    const chunk = await env.DB.prepare(
                        `SELECT pc.text, pd.url, pd.book, pd.chapter, pd.verse_start
                         FROM precept_chunks pc
                         JOIN precept_docs pd ON pc.doc_id = pd.id
                         WHERE pc.id = ?`
                    ).bind(match.metadata.chunk_id).first();

                    if (chunk) {
                        context.precept.push({
                            text: chunk.text as string,
                            url: chunk.url as string,
                            reference: `${chunk.book} ${chunk.chapter}:${chunk.verse_start || ''}`
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Vectorize query failed:', e);
        }
    }

    // Add current passage context if available
    if (passageContext) {
        context.scripture.push(
            `Current passage: ${passageContext.translation} Book ${passageContext.book_id} Chapter ${passageContext.chapter}`
        );
    }

    return context;
}

/**
 * Format RAG context for injection into prompt
 */
function formatRAGContext(context: RAGContext): string {
    const parts: string[] = [];

    if (context.scripture.length > 0) {
        parts.push('**Scripture Context:**');
        parts.push(...context.scripture);
    }

    if (context.precept.length > 0) {
        parts.push('\n**PreceptAustin Commentary:**');
        for (const p of context.precept) {
            parts.push(`- ${p.reference}: "${p.text.substring(0, 300)}..." [Source](${p.url})`);
        }
    }

    return parts.join('\n');
}

/**
 * Build messages array for LLM
 */
function buildMessages(
    userMessage: string,
    context: RAGContext,
    history: Message[]
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // System prompt with context
    const contextStr = formatRAGContext(context);
    const systemContent = contextStr
        ? `${SYSTEM_PROMPT}\n\n## Retrieved Context\n${contextStr}`
        : SYSTEM_PROMPT;

    messages.push({ role: 'system', content: systemContent });

    // Add conversation history (last 10 messages)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({ role: msg.role, content: msg.content });
        }
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    return messages;
}

/**
 * Generate chat response using Workers AI (streaming)
 */
export async function generateChatResponse(
    env: Env,
    userMessage: string,
    context: RAGContext,
    history: Message[]
): Promise<ReadableStream> {
    const messages = buildMessages(userMessage, context, history);

    const stream = await env.AI.run(LLM_MODEL, {
        messages,
        stream: true,
        max_tokens: 2048
    } as any);

    return stream as ReadableStream;
}

/**
 * Generate chat response (non-streaming, for testing)
 */
export async function generateChatResponseSync(
    env: Env,
    userMessage: string,
    context: RAGContext,
    history: Message[]
): Promise<string> {
    const messages = buildMessages(userMessage, context, history);

    const result = await env.AI.run(LLM_MODEL, {
        messages,
        max_tokens: 2048
    } as any) as { response: string };

    return result.response;
}

/**
 * Extract sources from assistant response
 */
export function extractSources(content: string, context: RAGContext): Partial<Source>[] {
    const sources: Partial<Source>[] = [];

    // Extract scripture references (basic pattern)
    const scripturePattern = /\(([1-3]?\s?[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\)/g;
    let match;
    while ((match = scripturePattern.exec(content)) !== null) {
        sources.push({
            type: 'scripture',
            reference: match[1],
            snippet: match[0]
        });
    }

    // Add PreceptAustin sources from context
    for (const p of context.precept) {
        sources.push({
            type: 'precept',
            reference: p.reference,
            url: p.url,
            snippet: p.text.substring(0, 200)
        });
    }

    return sources;
}

/**
 * Generate follow-up question suggestions
 */
export async function generateFollowUps(
    env: Env,
    conversation: string
): Promise<string[]> {
    try {
        const result = await env.AI.run(LLM_MODEL, {
            messages: [
                {
                    role: 'system',
                    content: 'Generate 3 brief follow-up questions for Bible study. Return only the questions, one per line, no numbering.'
                },
                {
                    role: 'user',
                    content: `Based on this conversation, suggest follow-up questions:\n\n${conversation.substring(0, 1000)}`
                }
            ],
            max_tokens: 200
        } as any) as { response: string };

        const response = result.response;
        return response.split('\n').filter(q => q.trim().length > 0).slice(0, 3);
    } catch (e) {
        console.error('Failed to generate follow-ups:', e);
        return [];
    }
}
