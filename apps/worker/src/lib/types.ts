/// <reference types="@cloudflare/workers-types" />

/**
 * Environment bindings for the Inductive Bible AI Worker
 */
export interface Env {
    // KV Namespaces
    BIBLE_CACHE: KVNamespace;

    // D1 Database
    DB: D1Database;

    // Vectorize Index
    VECTORIZE: VectorizeIndex;

    // Workers AI
    AI: Ai;

    // Environment Variables
    ENVIRONMENT: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    ENABLE_AUTH: string;
    DEEPSEEK_API_KEY?: string;
    ADMIN_SECRET?: string;
}

/**
 * AI Study Types
 */
export interface Conversation {
    id: string;
    user_id: string;
    title: string | null;
    context_translation: string | null;
    context_book_id: number | null;
    context_chapter: number | null;
    context_verse_start: number | null;
    context_verse_end: number | null;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens_used: number | null;
    created_at: string;
}

export interface Source {
    id: string;
    message_id: string;
    type: 'scripture' | 'precept' | 'lexicon' | 'other';
    reference: string | null;
    url: string | null;
    title: string | null;
    snippet: string | null;
    relevance_score: number | null;
}

export interface PreceptDoc {
    id: string;
    book: string;
    chapter: number;
    verse_start: number | null;
    verse_end: number | null;
    url: string;
    title: string | null;
    fetched_at: string | null;
    content_hash: string | null;
    status: 'pending' | 'indexed' | 'failed';
}

export interface PreceptChunk {
    id: string;
    doc_id: string;
    chunk_index: number;
    text: string;
    vector_id: string | null;
    token_count: number | null;
}

/**
 * Chat Request/Response Types
 */
export interface ChatRequest {
    message: string;
    conversation_id?: string;
    context?: {
        translation: string;
        book_id: number;
        chapter: number;
        verse_start?: number;
        verse_end?: number;
    };
}

export interface ChatResponse {
    conversation_id: string;
    message_id: string;
    content: string;
    sources: Source[];
    follow_ups: string[];
}

export interface SearchRequest {
    query: string;
    mode: 'scripture' | 'precept' | 'chats' | 'all';
    limit?: number;
}

export interface SearchResult {
    type: 'scripture' | 'precept' | 'chat';
    reference?: string;
    title?: string;
    snippet: string;
    url?: string;
    score: number;
}

/**
 * RAG Context Types
 */
export interface RAGContext {
    scripture: string[];
    precept: Array<{
        text: string;
        url: string;
        reference: string;
    }>;
    chat_history: Message[];
}
