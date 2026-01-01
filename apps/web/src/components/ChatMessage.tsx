import { useState } from 'react';
import { Copy, Check, RefreshCw, ExternalLink } from 'lucide-react';

interface Source {
    id: string;
    type: 'scripture' | 'precept' | 'lexicon' | 'other';
    reference?: string;
    url?: string;
    snippet?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sources?: Source[];
}

interface ChatMessageProps {
    message: Message;
    onCopy: (content: string) => void;
    onRegenerate?: () => void;
    isLoading?: boolean;
}

export function ChatMessage({ message, onCopy, onRegenerate, isLoading }: ChatMessageProps) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        onCopy(message.content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className={`message ${message.role}`}>
            <div className="message-content">
                {message.role === 'assistant' ? (
                    <div className="markdown-content" dangerouslySetInnerHTML={{
                        __html: formatMarkdown(message.content)
                    }} />
                ) : (
                    <p>{message.content}</p>
                )}
            </div>

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
                <div className="sources-section">
                    <span className="sources-label">Sources:</span>
                    {message.sources.map((source, idx) => (
                        <span key={idx} className={`source-pill ${source.type}`}>
                            {source.type === 'precept' && source.url ? (
                                <a href={source.url} target="_blank" rel="noopener noreferrer">
                                    {source.reference || 'PreceptAustin'}
                                    <ExternalLink size={10} />
                                </a>
                            ) : (
                                source.reference
                            )}
                        </span>
                    ))}
                </div>
            )}

            {/* Message Actions */}
            {message.role === 'assistant' && (
                <div className="message-actions">
                    <button
                        className="action-btn"
                        onClick={handleCopy}
                        title="Copy"
                    >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    {onRegenerate && (
                        <button
                            className="action-btn"
                            onClick={onRegenerate}
                            disabled={isLoading}
                            title="Regenerate"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Simple markdown-like formatting
 */
function formatMarkdown(text: string): string {
    if (!text) return '';

    return text
        // Headers
        .replace(/\*\*OBSERVATION\*\*/g, '<h3>📖 OBSERVATION</h3>')
        .replace(/\*\*INTERPRETATION\*\*/g, '<h3>🔍 INTERPRETATION</h3>')
        .replace(/\*\*APPLICATION\*\*/g, '<h3>✅ APPLICATION</h3>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Line breaks (preserve double newlines as paragraphs)
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        // Markdown Links: [Title](URL)
        .replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-left:2px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y1="3"></line></svg></a>')
        // Wrap in paragraph
        .replace(/^/, '<p>')
        .replace(/$/, '</p>')
        // Clean up empty paragraphs
        .replace(/<p><\/p>/g, '')
        .replace(/<p><br>/g, '<p>')
        // Lists (simple)
        .replace(/<br>- /g, '</p><ul><li>')
        .replace(/<li>(.+?)(<br>|<\/p>)/g, '<li>$1</li>$2');
}
