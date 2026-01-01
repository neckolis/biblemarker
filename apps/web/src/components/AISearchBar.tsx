import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Book, MessageSquare, FileText, ExternalLink } from 'lucide-react';

interface SearchResult {
    type: 'scripture' | 'precept' | 'chat';
    reference?: string;
    title?: string;
    snippet: string;
    url?: string;
    conversation_id?: string;
    score: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onOpenVerse?: (book: string, chapter: number, verse: number) => void;
}

type SearchMode = 'all' | 'scripture' | 'precept' | 'chats';

export function AISearchBar({ isOpen, onClose }: Props) {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<SearchMode>('all');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (results[selectedIndex]) {
                        handleSelect(results[selectedIndex]);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    // Debounced search
    const search = useCallback(async (searchQuery: string, searchMode: SearchMode) => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/ai-study/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery, mode: searchMode, limit: 10 })
            });

            if (response.ok) {
                const data = await response.json();
                setResults(data.results || []);
                setSelectedIndex(0);
            }
        } catch (e) {
            console.error('Search failed:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle query change with debounce
    const handleQueryChange = (value: string) => {
        setQuery(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            search(value, mode);
        }, 300);
    };

    // Handle mode change
    const handleModeChange = (newMode: SearchMode) => {
        setMode(newMode);
        if (query.trim()) {
            search(query, newMode);
        }
    };

    // Handle result selection
    const handleSelect = (result: SearchResult) => {
        if (result.type === 'precept' && result.url) {
            window.open(result.url, '_blank');
        } else if (result.type === 'chat' && result.conversation_id) {
            // TODO: Navigate to chat
            console.log('Open conversation:', result.conversation_id);
        } else if (result.type === 'scripture' && result.reference) {
            // TODO: Parse reference and navigate
            console.log('Open scripture:', result.reference);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="ai-search-overlay" onClick={onClose}>
            <div className="ai-search-modal" onClick={e => e.stopPropagation()}>
                {/* Search Input */}
                <div className="ai-search-header">
                    <Search size={18} className="search-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => handleQueryChange(e.target.value)}
                        placeholder="Search Scripture, PreceptAustin, or past chats..."
                        className="ai-search-input"
                    />
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="ai-search-modes">
                    {(['all', 'scripture', 'precept', 'chats'] as SearchMode[]).map(m => (
                        <button
                            key={m}
                            className={`mode-btn ${mode === m ? 'active' : ''}`}
                            onClick={() => handleModeChange(m)}
                        >
                            {m === 'all' && 'All'}
                            {m === 'scripture' && '📖 Scripture'}
                            {m === 'precept' && '📚 PreceptAustin'}
                            {m === 'chats' && '💬 My Chats'}
                        </button>
                    ))}
                </div>

                {/* Results */}
                <div className="ai-search-results">
                    {isLoading && (
                        <div className="loading-state">Searching...</div>
                    )}

                    {!isLoading && query && results.length === 0 && (
                        <div className="empty-state">No results found</div>
                    )}

                    {!isLoading && results.map((result, idx) => (
                        <div
                            key={idx}
                            className={`search-result ${idx === selectedIndex ? 'selected' : ''}`}
                            onClick={() => handleSelect(result)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                        >
                            <div className="result-icon">
                                {result.type === 'scripture' && <Book size={16} />}
                                {result.type === 'precept' && <FileText size={16} />}
                                {result.type === 'chat' && <MessageSquare size={16} />}
                            </div>
                            <div className="result-content">
                                <div className="result-title">
                                    {result.reference || result.title || 'Untitled'}
                                    {result.url && <ExternalLink size={12} className="external-icon" />}
                                </div>
                                <div className="result-snippet">{result.snippet}</div>
                            </div>
                            <div className="result-type">{result.type}</div>
                        </div>
                    ))}
                </div>

                {/* Keyboard hints */}
                <div className="ai-search-footer">
                    <span><kbd>↑↓</kbd> Navigate</span>
                    <span><kbd>Enter</kbd> Select</span>
                    <span><kbd>Esc</kbd> Close</span>
                </div>
            </div>

            <style>{`
                .ai-search-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    padding-top: 10vh;
                    z-index: 1000;
                }

                .ai-search-modal {
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 600px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                    overflow: hidden;
                }

                .ai-search-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    border-bottom: 1px solid #e2e8f0;
                }

                .search-icon {
                    color: #94a3b8;
                    flex-shrink: 0;
                }

                .ai-search-input {
                    flex: 1;
                    border: none;
                    outline: none;
                    font-size: 1rem;
                    background: none;
                }

                .ai-search-input::placeholder {
                    color: #94a3b8;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: #64748b;
                    padding: 0.25rem;
                    cursor: pointer;
                    border-radius: 4px;
                }

                .close-btn:hover {
                    background: #f1f5f9;
                }

                .ai-search-modes {
                    display: flex;
                    gap: 0.25rem;
                    padding: 0.5rem 1rem;
                    border-bottom: 1px solid #e2e8f0;
                    overflow-x: auto;
                }

                .mode-btn {
                    background: none;
                    border: none;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    color: #64748b;
                    white-space: nowrap;
                }

                .mode-btn:hover {
                    background: #f1f5f9;
                }

                .mode-btn.active {
                    background: #eff6ff;
                    color: #2563eb;
                    font-weight: 500;
                }

                .ai-search-results {
                    max-height: 400px;
                    overflow-y: auto;
                }

                .loading-state, .empty-state {
                    padding: 2rem;
                    text-align: center;
                    color: #94a3b8;
                }

                .search-result {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    border-bottom: 1px solid #f1f5f9;
                }

                .search-result:hover, .search-result.selected {
                    background: #f8fafc;
                }

                .search-result.selected {
                    background: #eff6ff;
                }

                .result-icon {
                    color: #64748b;
                    flex-shrink: 0;
                    margin-top: 0.125rem;
                }

                .result-content {
                    flex: 1;
                    min-width: 0;
                }

                .result-title {
                    font-weight: 500;
                    color: #334155;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .external-icon {
                    color: #94a3b8;
                }

                .result-snippet {
                    font-size: 0.85rem;
                    color: #64748b;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .result-type {
                    font-size: 0.75rem;
                    color: #94a3b8;
                    text-transform: capitalize;
                    flex-shrink: 0;
                }

                .ai-search-footer {
                    display: flex;
                    gap: 1rem;
                    padding: 0.75rem 1rem;
                    border-top: 1px solid #e2e8f0;
                    font-size: 0.75rem;
                    color: #94a3b8;
                }

                .ai-search-footer kbd {
                    background: #f1f5f9;
                    padding: 0.125rem 0.375rem;
                    border-radius: 4px;
                    font-family: inherit;
                    font-size: 0.7rem;
                }

                @media (max-width: 640px) {
                    .ai-search-overlay {
                        padding-top: 0;
                        align-items: flex-end;
                    }

                    .ai-search-modal {
                        width: 100%;
                        max-width: none;
                        border-radius: 16px 16px 0 0;
                        max-height: 80vh;
                    }
                }
            `}</style>
        </div>
    );
}
