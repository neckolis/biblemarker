import { useState, useRef, useEffect } from 'react';
import { useAIChat } from '../hooks/useAIChat';
import { AISearchBar } from './AISearchBar';
import { ChatMessage } from './ChatMessage';
import {
    Send,
    MessageSquare,
    Plus,
    ChevronRight,
    Loader2,
    Search,
    X
} from 'lucide-react';

interface Props {
    translation: string;
    bookId: number;
    chapter: number;
    bookName?: string;
}

export function AIStudyMode({ translation, bookId, chapter, bookName }: Props) {
    const {
        messages,
        conversationId,
        isLoading,
        isStreaming,
        followUps,
        error,
        sendMessage,
        regenerate,
        newConversation,
        stopStreaming,
        copyMessage
    } = useAIChat({
        context: { translation, book_id: bookId, chapter }
    });

    const [input, setInput] = useState('');
    const [showConversations, setShowConversations] = useState(false);
    const [conversations, setConversations] = useState<any[]>([]);
    const [showSearch, setShowSearch] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load conversations list
    useEffect(() => {
        fetch('/api/ai-study/conversations')
            .then(res => res.json())
            .then(data => setConversations(data.conversations || []))
            .catch(console.error);
    }, [conversationId]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
        }
    }, [input]);

    // Cmd+K shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            sendMessage(input.trim());
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };


    const handleFollowUp = (question: string) => {
        setInput(question);
        inputRef.current?.focus();
    };

    return (
        <div className="ai-study-container">
            {/* Context Pill */}
            <div className="ai-study-header">
                <div className="context-pill">
                    <span className="context-icon">📖</span>
                    <span>{bookName || `Book ${bookId}`} {chapter} ({translation})</span>
                </div>
                <div className="header-actions">
                    <button
                        className="icon-btn"
                        onClick={() => setShowConversations(!showConversations)}
                        title="Conversations"
                    >
                        <MessageSquare size={18} />
                    </button>
                    <button
                        className="icon-btn"
                        onClick={newConversation}
                        title="New Chat"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        className="icon-btn"
                        onClick={() => setShowSearch(true)}
                        title="Search (Cmd+K)"
                    >
                        <Search size={18} />
                    </button>
                </div>
            </div>

            {/* Conversations Sidebar (mobile drawer / desktop sidebar) */}
            {showConversations && (
                <div className="conversations-panel">
                    <div className="conversations-header">
                        <h3>Conversations</h3>
                        <button className="icon-btn" onClick={() => setShowConversations(false)}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="conversations-list">
                        {conversations.length === 0 && (
                            <p className="empty-state">No conversations yet</p>
                        )}
                        {conversations.map((conv: any) => (
                            <button
                                key={conv.id}
                                className={`conversation-item ${conv.id === conversationId ? 'active' : ''}`}
                                onClick={() => {
                                    // loadConversation(conv.id);
                                    setShowConversations(false);
                                }}
                            >
                                <span className="conv-title">{conv.title || 'Untitled'}</span>
                                <ChevronRight size={14} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat Messages */}
            <div className="ai-study-messages">
                {messages.length === 0 && (
                    <div className="welcome-message">
                        <h2>AI Study Assistant</h2>
                        <p>Ask questions about {bookName || 'this passage'} or request an inductive study guide.</p>
                        <div className="suggested-prompts">
                            <button onClick={() => handleFollowUp(`Help me do inductive study of ${bookName || 'this passage'} ${chapter}`)}>
                                📚 Inductive Study Guide
                            </button>
                            <button onClick={() => handleFollowUp(`What is the historical context of ${bookName || 'this passage'} ${chapter}?`)}>
                                🏛️ Historical Context
                            </button>
                            <button onClick={() => handleFollowUp(`What are the key themes in ${bookName || 'this passage'} ${chapter}?`)}>
                                🎯 Key Themes
                            </button>
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <ChatMessage
                        key={msg.id}
                        message={msg as any}
                        onCopy={copyMessage}
                        onRegenerate={msg.role === 'assistant' ? regenerate : undefined}
                        isLoading={isLoading}
                    />
                ))}

                {/* Streaming indicator */}
                {isStreaming && (
                    <div className="streaming-indicator">
                        <Loader2 size={16} className="spin" />
                        <span>Thinking...</span>
                        <button onClick={stopStreaming}>Stop</button>
                    </div>
                )}

                {/* Follow-up suggestions */}
                {followUps.length > 0 && !isLoading && (
                    <div className="follow-ups">
                        <span className="follow-ups-label">Follow-up questions:</span>
                        {followUps.map((q, idx) => (
                            <button key={idx} onClick={() => handleFollowUp(q)}>
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                {/* Error display */}
                {error && (
                    <div className="error-message">
                        <span>⚠️ {error.message}</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form className="ai-study-composer" onSubmit={handleSubmit}>
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about this passage..."
                    disabled={isLoading}
                    rows={1}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="send-btn"
                >
                    {isLoading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                </button>
            </form>

            {/* Search Bar */}
            <AISearchBar
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
            />

            <style>{`
                .ai-study-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #f8fafc;
                    position: relative;
                }

                .ai-study-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background: #fff;
                    border-bottom: 1px solid #e2e8f0;
                    flex-shrink: 0;
                }

                .context-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: #eff6ff;
                    color: #1e40af;
                    padding: 0.5rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 600;
                }

                .context-icon {
                    font-size: 1rem;
                }

                .header-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .icon-btn {
                    background: none;
                    border: none;
                    color: #64748b;
                    padding: 0.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .icon-btn:hover {
                    background: #f1f5f9;
                    color: #334155;
                }

                .conversations-panel {
                    position: absolute;
                    top: 60px;
                    right: 0;
                    bottom: 80px;
                    width: 280px;
                    background: #fff;
                    border-left: 1px solid #e2e8f0;
                    z-index: 100;
                    display: flex;
                    flex-direction: column;
                    box-shadow: -4px 0 12px rgba(0,0,0,0.1);
                }

                .conversations-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    border-bottom: 1px solid #e2e8f0;
                }

                .conversations-header h3 {
                    margin: 0;
                    font-size: 0.9rem;
                    font-weight: 600;
                }

                .conversations-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.5rem;
                }

                .conversation-item {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem;
                    border: none;
                    background: none;
                    text-align: left;
                    border-radius: 8px;
                    cursor: pointer;
                    color: #334155;
                    font-size: 0.85rem;
                }

                .conversation-item:hover, .conversation-item.active {
                    background: #eff6ff;
                }

                .conversation-item.active {
                    color: #2563eb;
                }

                .conv-title {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    flex: 1;
                }

                .ai-study-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .welcome-message {
                    text-align: center;
                    padding: 2rem;
                    color: #64748b;
                }

                .welcome-message h2 {
                    color: #334155;
                    margin-bottom: 0.5rem;
                    font-size: 1.25rem;
                }

                .welcome-message p {
                    margin-bottom: 1.5rem;
                }

                .suggested-prompts {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    justify-content: center;
                }

                .suggested-prompts button {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .suggested-prompts button:hover {
                    border-color: #3b82f6;
                    background: #eff6ff;
                }

                .message {
                    max-width: 85%;
                    padding: 1rem;
                    border-radius: 16px;
                }

                .message.user {
                    align-self: flex-end;
                    background: #3b82f6;
                    color: white;
                    border-bottom-right-radius: 4px;
                }

                .message.assistant {
                    align-self: flex-start;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-bottom-left-radius: 4px;
                }

                .message-content p {
                    margin: 0;
                    line-height: 1.6;
                }

                .markdown-content {
                    line-height: 1.7;
                }

                .markdown-content h2, .markdown-content h3 {
                    margin: 1rem 0 0.5rem;
                    color: #1e40af;
                }

                .markdown-content h2:first-child, .markdown-content h3:first-child {
                    margin-top: 0;
                }

                .markdown-content ul, .markdown-content ol {
                    margin: 0.5rem 0;
                    padding-left: 1.5rem;
                }

                .markdown-content li {
                    margin: 0.25rem 0;
                }

                .markdown-content strong {
                    color: #1e40af;
                }

                .sources-section {
                    margin-top: 0.75rem;
                    padding-top: 0.75rem;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    align-items: center;
                }

                .sources-label {
                    font-size: 0.75rem;
                    color: #64748b;
                    font-weight: 600;
                }

                .source-pill {
                    padding: 0.25rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .source-pill.scripture {
                    background: #dcfce7;
                    color: #166534;
                }

                .source-pill.precept {
                    background: #fef3c7;
                    color: #92400e;
                }

                .source-pill a {
                    color: inherit;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .source-pill a:hover {
                    text-decoration: underline;
                }

                .message-actions {
                    display: flex;
                    gap: 0.25rem;
                    margin-top: 0.5rem;
                }

                .action-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    padding: 0.25rem;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .action-btn:hover {
                    color: #64748b;
                    background: #f1f5f9;
                }

                .streaming-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #64748b;
                    font-size: 0.85rem;
                }

                .streaming-indicator button {
                    background: none;
                    border: 1px solid #e2e8f0;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    cursor: pointer;
                }

                .spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .follow-ups {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    background: #f8fafc;
                    border-radius: 8px;
                }

                .follow-ups-label {
                    width: 100%;
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-bottom: 0.25rem;
                }

                .follow-ups button {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    padding: 0.5rem 0.75rem;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    text-align: left;
                }

                .follow-ups button:hover {
                    border-color: #3b82f6;
                }

                .error-message {
                    background: #fef2f2;
                    color: #991b1b;
                    padding: 0.75rem;
                    border-radius: 8px;
                    font-size: 0.85rem;
                }

                .empty-state {
                    color: #94a3b8;
                    cursor: pointer;
                }

                .markdown-content p {
                    margin: 0 0 1rem;
                }

                .markdown-content p:last-child {
                    margin-bottom: 0;
                }

                .ai-study-composer {
                    display: flex;
                    gap: 0.5rem;
                    padding: 1rem;
                    background: #fff;
                    border-top: 1px solid #e2e8f0;
                    flex-shrink: 0;
                }

                .ai-study-composer textarea {
                    flex: 1;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 0.75rem 1rem;
                    font-size: 0.95rem;
                    font-family: inherit;
                    resize: none;
                    outline: none;
                    max-height: 150px;
                }

                .ai-study-composer textarea:focus {
                    border-color: #3b82f6;
                }

                .send-btn {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .send-btn:disabled {
                    background: #94a3b8;
                    cursor: not-allowed;
                }

                .send-btn:hover:not(:disabled) {
                    background: #2563eb;
                }

                @media (max-width: 768px) {
                    .conversations-panel {
                        left: 0;
                        width: 100%;
                        border-left: none;
                    }

                    .message {
                        max-width: 90%;
                    }
                }
            `}</style>
        </div>
    );
}
