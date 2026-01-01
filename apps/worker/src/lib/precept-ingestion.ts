/// <reference types="@cloudflare/workers-types" />
import { Env } from './types';

/**
 * PreceptAustin Ingestion Pipeline
 * 
 * Indexes verse-by-verse commentary from PreceptAustin.org for RAG retrieval.
 * Stores minimal snippets with URLs for fair use.
 */

const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5' as const;
const MAX_CHUNK_TOKENS = 500;
const THROTTLE_MS = 1000; // 1 request per second

// NT Book mappings for URL construction
const BOOK_SLUGS: Record<string, string> = {
    'Matthew': 'matthew',
    'Mark': 'mark',
    'Luke': 'luke',
    'John': 'john',
    'Acts': 'acts',
    'Romans': 'romans',
    '1 Corinthians': '1_corinthians',
    '2 Corinthians': '2_corinthians',
    'Galatians': 'galatians',
    'Ephesians': 'ephesians',
    'Philippians': 'philippians',
    'Colossians': 'colossians',
    '1 Thessalonians': '1_thessalonians',
    '2 Thessalonians': '2_thessalonians',
    '1 Timothy': '1_timothy',
    '2 Timothy': '2_timothy',
    'Titus': 'titus',
    'Philemon': 'philemon',
    'Hebrews': 'hebrews',
    'James': 'james',
    '1 Peter': '1_peter',
    '2 Peter': '2_peter',
    '1 John': '1_john',
    '2 John': '2_john',
    '3 John': '3_john',
    'Jude': 'jude',
    'Revelation': 'revelation'
};

/**
 * Generate a hash for content deduplication
 */
function hashContent(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

/**
 * Simple text chunking by sentences
 */
function chunkText(text: string, maxTokens: number = MAX_CHUNK_TOKENS): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        // Rough token estimate: ~4 chars per token
        const estimatedTokens = (currentChunk.length + sentence.length) / 4;

        if (estimatedTokens > maxTokens && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

/**
 * Extract clean text from HTML (basic extraction)
 */
function extractTextFromHTML(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}

/**
 * Fetch a page with throttling
 */
async function fetchWithThrottle(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'InductiveBibleAI/1.0 (Bible Study App; contact@inductivebible.ai)'
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch ${url}: ${response.status}`);
            return null;
        }

        // Throttle
        await new Promise(resolve => setTimeout(resolve, THROTTLE_MS));

        return await response.text();
    } catch (e) {
        console.error(`Error fetching ${url}:`, e);
        return null;
    }
}

/**
 * Build URL for a PreceptAustin verse commentary page
 */
function buildPreceptUrl(book: string, chapter: number): string {
    const slug = BOOK_SLUGS[book] || book.toLowerCase().replace(/\s+/g, '_');
    return `https://www.preceptaustin.org/${slug}-${chapter}-commentary`;
}

/**
 * Parse verse reference from anchor (e.g., #3:16 or #1:1)
 */
function parseVerseFromAnchor(anchor: string): { verseStart: number; verseEnd: number | null } | null {
    const match = anchor.match(/#(\d+):(\d+)(?:-(\d+))?/);
    if (match) {
        return {
            verseStart: parseInt(match[2]),
            verseEnd: match[3] ? parseInt(match[3]) : null
        };
    }
    return null;
}

/**
 * Index a single chapter from PreceptAustin
 */
export async function indexChapter(
    env: Env,
    book: string,
    chapter: number
): Promise<{ success: boolean; chunks: number; error?: string }> {
    const url = buildPreceptUrl(book, chapter);
    const docId = `precept-${book.toLowerCase().replace(/\s+/g, '-')}-${chapter}`;

    // Check if already indexed
    const existing = await env.DB.prepare(
        `SELECT id, content_hash FROM precept_docs WHERE id = ?`
    ).bind(docId).first();

    // Fetch the page
    const html = await fetchWithThrottle(url);
    if (!html) {
        return { success: false, chunks: 0, error: 'Failed to fetch page' };
    }

    const contentHash = hashContent(html);

    // Skip if content hasn't changed
    if (existing && existing.content_hash === contentHash) {
        return { success: true, chunks: 0, error: 'Already indexed (unchanged)' };
    }

    // Extract text
    const text = extractTextFromHTML(html);

    // Don't index if too short
    if (text.length < 100) {
        return { success: false, chunks: 0, error: 'Content too short' };
    }

    // Limit to first ~5000 chars for fair use (snippet only)
    const snippetText = text.substring(0, 5000);
    const title = `${book} ${chapter} Commentary`;

    try {
        // Upsert document record
        if (existing) {
            await env.DB.prepare(
                `UPDATE precept_docs SET content_hash = ?, fetched_at = datetime('now'), status = 'indexed' WHERE id = ?`
            ).bind(contentHash, docId).run();

            // Delete old chunks
            await env.DB.prepare(`DELETE FROM precept_chunks WHERE doc_id = ?`).bind(docId).run();
        } else {
            await env.DB.prepare(
                `INSERT INTO precept_docs (id, book, chapter, url, title, fetched_at, content_hash, status)
                 VALUES (?, ?, ?, ?, ?, datetime('now'), ?, 'indexed')`
            ).bind(docId, book, chapter, url, title, contentHash).run();
        }

        // Chunk the text
        const chunks = chunkText(snippetText);

        // Generate embeddings and store chunks
        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i];
            const chunkId = `${docId}-chunk-${i}`;

            // Generate embedding
            const embeddingResult = await env.AI.run(EMBEDDING_MODEL, {
                text: [chunkText]
            }) as { data: number[][] };

            const embedding = embeddingResult.data[0];

            // Store in D1
            await env.DB.prepare(
                `INSERT INTO precept_chunks (id, doc_id, chunk_index, text, token_count)
                 VALUES (?, ?, ?, ?, ?)`
            ).bind(chunkId, docId, i, chunkText, Math.ceil(chunkText.length / 4)).run();

            // Store in Vectorize
            if (env.VECTORIZE) {
                await env.VECTORIZE.upsert([{
                    id: chunkId,
                    values: embedding,
                    metadata: {
                        type: 'precept',
                        chunk_id: chunkId,
                        book: book,
                        chapter: chapter,
                        url: url
                    }
                }]);
            }
        }

        return { success: true, chunks: chunks.length };
    } catch (e: any) {
        console.error('Indexing error:', e);

        // Mark as failed
        await env.DB.prepare(
            `UPDATE precept_docs SET status = 'failed' WHERE id = ?`
        ).bind(docId).run();

        return { success: false, chunks: 0, error: e.message };
    }
}

/**
 * Get indexing status
 */
export async function getIngestionStatus(env: Env): Promise<{
    total: number;
    indexed: number;
    pending: number;
    failed: number;
}> {
    const result = await env.DB.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'indexed' THEN 1 ELSE 0 END) as indexed,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM precept_docs
    `).first();

    return {
        total: Number(result?.total || 0),
        indexed: Number(result?.indexed || 0),
        pending: Number(result?.pending || 0),
        failed: Number(result?.failed || 0)
    };
}

/**
 * Seed initial document records for a book
 */
export async function seedBookDocuments(
    env: Env,
    book: string,
    chapters: number
): Promise<void> {
    for (let chapter = 1; chapter <= chapters; chapter++) {
        const docId = `precept-${book.toLowerCase().replace(/\s+/g, '-')}-${chapter}`;
        const url = buildPreceptUrl(book, chapter);
        const title = `${book} ${chapter} Commentary`;

        await env.DB.prepare(
            `INSERT OR IGNORE INTO precept_docs (id, book, chapter, url, title, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`
        ).bind(docId, book, chapter, url, title).run();
    }
}
