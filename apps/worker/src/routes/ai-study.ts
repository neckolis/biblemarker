/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { Env, ChatRequest, Conversation, Message, Source } from '../lib/types';
import {
    retrieveRAGContext,
    generateChatResponse,
    generateChatResponseSync,
    extractSources,
    generateFollowUps
} from '../lib/chat-agent';

const app = new Hono<{ Bindings: Env }>();

/**
 * Generate a UUID
 */
function uuid(): string {
    return crypto.randomUUID();
}

/**
 * POST /api/ai-study/chat - Streaming chat with RAG
 */
app.post('/chat', async (c) => {
    const body = await c.req.json<ChatRequest>();
    const { message, conversation_id, context } = body;

    if (!message || message.trim().length === 0) {
        return c.json({ error: 'Message is required' }, 400);
    }

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
        convId = uuid();
        await c.env.DB.prepare(
            `INSERT INTO conversations (id, user_id, title, context_translation, context_book_id, context_chapter)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
            convId,
            'guest-user', // TODO: Get from auth
            message.substring(0, 50),
            context?.translation || null,
            context?.book_id || null,
            context?.chapter || null
        ).run();
    }

    // Save user message
    const userMsgId = uuid();
    await c.env.DB.prepare(
        `INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)`
    ).bind(userMsgId, convId, message).run();

    // Load conversation history
    const historyRows = await c.env.DB.prepare(
        `SELECT id, conversation_id, role, content, created_at 
         FROM messages 
         WHERE conversation_id = ? 
         ORDER BY created_at ASC`
    ).bind(convId).all();

    const history: Message[] = (historyRows.results || []).map((row: any) => ({
        id: row.id,
        conversation_id: row.conversation_id,
        role: row.role,
        content: row.content,
        tokens_used: null,
        created_at: row.created_at
    }));

    // Retrieve RAG context
    const ragContext = await retrieveRAGContext(c.env, message, context);

    // Check if streaming is requested
    const acceptsStream = c.req.header('Accept')?.includes('text/event-stream');

    if (acceptsStream) {
        // Streaming response
        const stream = await generateChatResponse(c.env, message, ragContext, history);

        // We need to collect the full response for saving
        // Create a TransformStream to tee the response
        const { readable, writable } = new TransformStream();
        let fullResponse = '';

        const reader = stream.getReader();
        const writer = writable.getWriter();
        const textDecoder = new TextDecoder();

        // Process stream in background
        (async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    // Pass through to client
                    await writer.write(value);

                    // Accumulate for saving
                    const chunk = textDecoder.decode(value, { stream: true });
                    // Parse SSE data
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.response) {
                                    fullResponse += data.response;
                                }
                            } catch {
                                // Ignore parse errors
                            }
                        }
                    }
                }

                // Save assistant message after stream completes
                const assistantMsgId = uuid();
                await c.env.DB.prepare(
                    `INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)`
                ).bind(assistantMsgId, convId, fullResponse).run();

                // Extract and save sources
                const sources = extractSources(fullResponse, ragContext);
                for (const source of sources) {
                    await c.env.DB.prepare(
                        `INSERT INTO sources (id, message_id, type, reference, url, snippet) VALUES (?, ?, ?, ?, ?, ?)`
                    ).bind(uuid(), assistantMsgId, source.type, source.reference, source.url, source.snippet).run();
                }

                // Update conversation title if this is the first exchange
                if (history.length <= 1) {
                    const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
                    await c.env.DB.prepare(
                        `UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`
                    ).bind(title, convId).run();
                }
            } catch (e) {
                console.error('Stream processing error:', e);
            } finally {
                await writer.close();
            }
        })();

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Conversation-Id': convId
            }
        });
    } else {
        // Non-streaming response
        const response = await generateChatResponseSync(c.env, message, ragContext, history);

        // Save assistant message
        const assistantMsgId = uuid();
        await c.env.DB.prepare(
            `INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)`
        ).bind(assistantMsgId, convId, response).run();

        // Extract sources
        const sources = extractSources(response, ragContext);
        for (const source of sources) {
            await c.env.DB.prepare(
                `INSERT INTO sources (id, message_id, type, reference, url, snippet) VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(uuid(), assistantMsgId, source.type, source.reference, source.url, source.snippet).run();
        }

        // Generate follow-ups
        const conversationText = history.map(m => `${m.role}: ${m.content}`).join('\n');
        const followUps = await generateFollowUps(c.env, conversationText + `\nassistant: ${response}`);

        return c.json({
            conversation_id: convId,
            message_id: assistantMsgId,
            content: response,
            sources: sources,
            follow_ups: followUps
        });
    }
});

/**
 * GET /api/ai-study/conversations - List user conversations
 */
app.get('/conversations', async (c) => {
    const userId = 'guest-user'; // TODO: Get from auth
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    const result = await c.env.DB.prepare(
        `SELECT id, title, context_translation, context_book_id, context_chapter, created_at, updated_at
         FROM conversations
         WHERE user_id = ?
         ORDER BY updated_at DESC
         LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all();

    return c.json({
        conversations: result.results || [],
        has_more: (result.results?.length || 0) === limit
    });
});

/**
 * GET /api/ai-study/conversations/:id - Get conversation with messages
 */
app.get('/conversations/:id', async (c) => {
    const id = c.req.param('id');

    const conversation = await c.env.DB.prepare(
        `SELECT * FROM conversations WHERE id = ?`
    ).bind(id).first();

    if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404);
    }

    const messages = await c.env.DB.prepare(
        `SELECT m.*, 
                json_group_array(json_object(
                    'id', s.id,
                    'type', s.type,
                    'reference', s.reference,
                    'url', s.url,
                    'snippet', s.snippet
                )) as sources
         FROM messages m
         LEFT JOIN sources s ON m.id = s.message_id
         WHERE m.conversation_id = ?
         GROUP BY m.id
         ORDER BY m.created_at ASC`
    ).bind(id).all();

    // Parse sources JSON
    const parsedMessages = (messages.results || []).map((m: any) => ({
        ...m,
        sources: m.sources ? JSON.parse(m.sources).filter((s: any) => s.id !== null) : []
    }));

    return c.json({
        conversation,
        messages: parsedMessages
    });
});

/**
 * DELETE /api/ai-study/conversations/:id - Delete a conversation
 */
app.delete('/conversations/:id', async (c) => {
    const id = c.req.param('id');

    await c.env.DB.prepare(`DELETE FROM conversations WHERE id = ?`).bind(id).run();

    return c.json({ success: true });
});

/**
 * POST /api/ai-study/regenerate - Regenerate last assistant response
 */
app.post('/regenerate', async (c) => {
    const { conversation_id } = await c.req.json();

    if (!conversation_id) {
        return c.json({ error: 'conversation_id is required' }, 400);
    }

    // Get the last user message
    const lastUserMsg = await c.env.DB.prepare(
        `SELECT content FROM messages 
         WHERE conversation_id = ? AND role = 'user'
         ORDER BY created_at DESC LIMIT 1`
    ).bind(conversation_id).first();

    if (!lastUserMsg) {
        return c.json({ error: 'No user message found' }, 404);
    }

    // Delete the last assistant message
    await c.env.DB.prepare(
        `DELETE FROM messages 
         WHERE id IN (
             SELECT id FROM messages 
             WHERE conversation_id = ? AND role = 'assistant'
             ORDER BY created_at DESC LIMIT 1
         )`
    ).bind(conversation_id).run();

    // Get conversation context
    const conv = await c.env.DB.prepare(
        `SELECT context_translation, context_book_id, context_chapter FROM conversations WHERE id = ?`
    ).bind(conversation_id).first();

    // Re-generate using the chat endpoint logic
    const context = conv ? {
        translation: conv.context_translation as string,
        book_id: conv.context_book_id as number,
        chapter: conv.context_chapter as number
    } : undefined;

    // Load history (without the deleted message)
    const historyRows = await c.env.DB.prepare(
        `SELECT id, conversation_id, role, content, created_at 
         FROM messages 
         WHERE conversation_id = ? 
         ORDER BY created_at ASC`
    ).bind(conversation_id).all();

    const history: Message[] = (historyRows.results || []).map((row: any) => ({
        id: row.id,
        conversation_id: row.conversation_id,
        role: row.role,
        content: row.content,
        tokens_used: null,
        created_at: row.created_at
    }));

    const ragContext = await retrieveRAGContext(c.env, lastUserMsg.content as string, context);
    const response = await generateChatResponseSync(c.env, lastUserMsg.content as string, ragContext, history);

    // Save new assistant message
    const assistantMsgId = uuid();
    await c.env.DB.prepare(
        `INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)`
    ).bind(assistantMsgId, conversation_id, response).run();

    const sources = extractSources(response, ragContext);
    for (const source of sources) {
        await c.env.DB.prepare(
            `INSERT INTO sources (id, message_id, type, reference, url, snippet) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(uuid(), assistantMsgId, source.type, source.reference, source.url, source.snippet).run();
    }

    return c.json({
        message_id: assistantMsgId,
        content: response,
        sources: sources
    });
});

/**
 * POST /api/ai-study/search - Unified search
 */
app.post('/search', async (c) => {
    const { query, mode = 'all', limit = 10 } = await c.req.json();

    if (!query || query.trim().length === 0) {
        return c.json({ error: 'Query is required' }, 400);
    }

    const results: any[] = [];

    // Search PreceptAustin chunks via Vectorize
    if ((mode === 'all' || mode === 'precept') && c.env.VECTORIZE) {
        try {
            const embedding = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
                text: [query]
            }) as { data: number[][] };

            const vectorResults = await c.env.VECTORIZE.query(embedding.data[0], {
                topK: limit,
                returnMetadata: 'all'
            });

            for (const match of vectorResults.matches) {
                if (match.metadata?.chunk_id) {
                    const chunk = await c.env.DB.prepare(
                        `SELECT pc.text, pd.url, pd.book, pd.chapter, pd.verse_start, pd.title
                         FROM precept_chunks pc
                         JOIN precept_docs pd ON pc.doc_id = pd.id
                         WHERE pc.id = ?`
                    ).bind(match.metadata.chunk_id).first();

                    if (chunk) {
                        results.push({
                            type: 'precept',
                            reference: `${chunk.book} ${chunk.chapter}:${chunk.verse_start || ''}`,
                            title: chunk.title,
                            snippet: (chunk.text as string).substring(0, 200),
                            url: chunk.url,
                            score: match.score
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Vectorize search failed:', e);
        }
    }

    // Search past chats (keyword search in D1)
    if (mode === 'all' || mode === 'chats') {
        const chatResults = await c.env.DB.prepare(
            `SELECT m.id, m.content, c.title, c.id as conversation_id
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             WHERE m.content LIKE ?
             ORDER BY m.created_at DESC
             LIMIT ?`
        ).bind(`%${query}%`, limit).all();

        for (const row of chatResults.results || []) {
            results.push({
                type: 'chat',
                title: row.title,
                snippet: (row.content as string).substring(0, 200),
                conversation_id: row.conversation_id,
                score: 0.5 // Keyword match score
            });
        }
    }

    // Log search
    await c.env.DB.prepare(
        `INSERT INTO search_logs (id, user_id, query, mode, results_count) VALUES (?, ?, ?, ?, ?)`
    ).bind(uuid(), 'guest-user', query, mode, results.length).run();

    return c.json({ results });
});

export default app;
