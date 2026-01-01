/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { Env } from '../lib/types';
import { indexChapter, getIngestionStatus, seedBookDocuments } from '../lib/precept-ingestion';

const app = new Hono<{ Bindings: Env }>();

// NT Books with chapter counts
const NT_BOOKS: Array<{ name: string; chapters: number }> = [
    { name: 'Matthew', chapters: 28 },
    { name: 'Mark', chapters: 16 },
    { name: 'Luke', chapters: 24 },
    { name: 'John', chapters: 21 },
    { name: 'Acts', chapters: 28 },
    { name: 'Romans', chapters: 16 },
    { name: '1 Corinthians', chapters: 16 },
    { name: '2 Corinthians', chapters: 13 },
    { name: 'Galatians', chapters: 6 },
    { name: 'Ephesians', chapters: 6 },
    { name: 'Philippians', chapters: 4 },
    { name: 'Colossians', chapters: 4 },
    { name: '1 Thessalonians', chapters: 5 },
    { name: '2 Thessalonians', chapters: 3 },
    { name: '1 Timothy', chapters: 6 },
    { name: '2 Timothy', chapters: 4 },
    { name: 'Titus', chapters: 3 },
    { name: 'Philemon', chapters: 1 },
    { name: 'Hebrews', chapters: 13 },
    { name: 'James', chapters: 5 },
    { name: '1 Peter', chapters: 5 },
    { name: '2 Peter', chapters: 3 },
    { name: '1 John', chapters: 5 },
    { name: '2 John', chapters: 1 },
    { name: '3 John', chapters: 1 },
    { name: 'Jude', chapters: 1 },
    { name: 'Revelation', chapters: 22 }
];

/**
 * Verify admin access
 */
function verifyAdmin(c: any): boolean {
    const adminSecret = c.env.ADMIN_SECRET;
    if (!adminSecret) {
        // In development, allow without secret
        if (c.env.ENVIRONMENT === 'development') return true;
        return false;
    }
    const authHeader = c.req.header('X-Admin-Secret');
    return authHeader === adminSecret;
}

/**
 * GET /api/admin/ingest/status - Get ingestion status
 */
app.get('/ingest/status', async (c) => {
    if (!verifyAdmin(c)) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    const status = await getIngestionStatus(c.env);
    return c.json(status);
});

/**
 * POST /api/admin/ingest/seed - Seed document records for all NT books
 */
app.post('/ingest/seed', async (c) => {
    if (!verifyAdmin(c)) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    let totalSeeded = 0;
    for (const book of NT_BOOKS) {
        await seedBookDocuments(c.env, book.name, book.chapters);
        totalSeeded += book.chapters;
    }

    return c.json({
        success: true,
        message: `Seeded ${totalSeeded} document records for ${NT_BOOKS.length} NT books`
    });
});

/**
 * POST /api/admin/ingest/chapter - Index a single chapter
 */
app.post('/ingest/chapter', async (c) => {
    if (!verifyAdmin(c)) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    const { book, chapter } = await c.req.json();

    if (!book || !chapter) {
        return c.json({ error: 'book and chapter are required' }, 400);
    }

    const result = await indexChapter(c.env, book, chapter);
    return c.json(result);
});

/**
 * POST /api/admin/ingest/book - Index all chapters of a book
 */
app.post('/ingest/book', async (c) => {
    if (!verifyAdmin(c)) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    const { book } = await c.req.json();

    if (!book) {
        return c.json({ error: 'book is required' }, 400);
    }

    const bookInfo = NT_BOOKS.find(b => b.name === book);
    if (!bookInfo) {
        return c.json({ error: `Unknown book: ${book}` }, 400);
    }

    const results: any[] = [];
    for (let chapter = 1; chapter <= bookInfo.chapters; chapter++) {
        const result = await indexChapter(c.env, book, chapter);
        results.push({ chapter, ...result });

        // Stop on error to prevent runaway
        if (!result.success && !result.error?.includes('Already indexed')) {
            break;
        }
    }

    const totalChunks = results.reduce((sum, r) => sum + (r.chunks || 0), 0);
    const successCount = results.filter(r => r.success).length;

    return c.json({
        book,
        chaptersProcessed: results.length,
        successCount,
        totalChunks,
        results
    });
});

/**
 * POST /api/admin/ingest/batch - Index next N pending documents
 */
app.post('/ingest/batch', async (c) => {
    if (!verifyAdmin(c)) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    const { limit = 5 } = await c.req.json();

    // Get pending documents
    const pending = await c.env.DB.prepare(
        `SELECT id, book, chapter FROM precept_docs WHERE status = 'pending' LIMIT ?`
    ).bind(limit).all();

    if (!pending.results || pending.results.length === 0) {
        return c.json({ message: 'No pending documents', processed: 0 });
    }

    const results: any[] = [];
    for (const doc of pending.results) {
        const result = await indexChapter(c.env, doc.book as string, doc.chapter as number);
        results.push({ id: doc.id, ...result });
    }

    return c.json({
        processed: results.length,
        results
    });
});

/**
 * DELETE /api/admin/ingest/reset - Reset all indexing (dev only)
 */
app.delete('/ingest/reset', async (c) => {
    if (!verifyAdmin(c)) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    if (c.env.ENVIRONMENT !== 'development') {
        return c.json({ error: 'Only allowed in development' }, 403);
    }

    await c.env.DB.prepare('DELETE FROM precept_chunks').run();
    await c.env.DB.prepare('DELETE FROM precept_docs').run();

    return c.json({ success: true, message: 'All ingestion data reset' });
});

export default app;
