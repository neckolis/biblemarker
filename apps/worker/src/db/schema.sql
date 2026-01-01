-- =============================================================================
-- AI Study Database Schema
-- =============================================================================
-- Run with: wrangler d1 execute inductive-bible-db --file=./src/db/schema.sql
-- =============================================================================

-- Conversations: User chat sessions
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    context_translation TEXT,
    context_book_id INTEGER,
    context_chapter INTEGER,
    context_verse_start INTEGER,
    context_verse_end INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- Messages: Individual chat messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- Sources: Citations attached to assistant messages
CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('scripture', 'precept', 'lexicon', 'other')),
    reference TEXT,
    url TEXT,
    title TEXT,
    snippet TEXT,
    relevance_score REAL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sources_message ON sources(message_id);

-- PreceptAustin Documents: Page-level metadata
CREATE TABLE IF NOT EXISTS precept_docs (
    id TEXT PRIMARY KEY,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse_start INTEGER,
    verse_end INTEGER,
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    fetched_at TEXT,
    content_hash TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'indexed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_precept_docs_book ON precept_docs(book, chapter);
CREATE INDEX IF NOT EXISTS idx_precept_docs_status ON precept_docs(status);

-- PreceptAustin Chunks: Chunked text for RAG
CREATE TABLE IF NOT EXISTS precept_chunks (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    vector_id TEXT,
    token_count INTEGER,
    FOREIGN KEY (doc_id) REFERENCES precept_docs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_precept_chunks_doc ON precept_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_precept_chunks_vector ON precept_chunks(vector_id);

-- Search Logs: Analytics for search queries
CREATE TABLE IF NOT EXISTS search_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    query TEXT NOT NULL,
    mode TEXT CHECK (mode IN ('scripture', 'precept', 'chats', 'all')),
    results_count INTEGER,
    latency_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_search_logs_user ON search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created ON search_logs(created_at DESC);

-- Follow-up Suggestions: Stored suggestions for conversation continuity
CREATE TABLE IF NOT EXISTS follow_ups (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_message ON follow_ups(message_id);
