import { useState, useEffect, useMemo } from 'react'
import { getLexicon } from '../lib/api'

interface Props {
    query: string;
    dict: 'BDBT' | 'RUSD';
    onClose: () => void;
    onJumpToStrong: (id: string) => void;
    onDictChange?: (dict: 'BDBT' | 'RUSD') => void;
}

export function LexiconPanel({ query, dict, onClose, onJumpToStrong, onDictChange }: Props) {
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const [isMatchesExpanded, setIsMatchesExpanded] = useState(false)

    useEffect(() => {
        if (!query) return;
        setLoading(true)
        setError(null)
        setIsExpanded(false) // Reset expansion on new query
        getLexicon(dict, query)
            .then(res => {
                const arr = Array.isArray(res) ? res : [res];
                setResults(arr.filter(Boolean))
            })
            .catch(err => {
                console.error(err)
                setError('Failed to load definition')
            })
            .finally(() => setLoading(false))
    }, [query, dict])

    const bestMatch = useMemo(() => {
        if (results.length === 0) return null;
        return [...results].sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
    }, [results]);

    const otherMatches = useMemo(() => {
        if (results.length <= 1) return [];
        const bestId = bestMatch?.topic || bestMatch?.pk;
        return results.filter(r => (r.topic || r.pk) !== bestId);
    }, [results, bestMatch]);

    const modernGloss = useMemo(() => {
        if (!bestMatch) return null;

        // If the short_definition has "at sundry times" or similar KJV phrasing, 
        // try to extract the first definition point from the full definition HTML
        const longDef = bestMatch.definition || "";

        // Regex to find things like "1. to do something" or "<b>1</b> some meaning"
        const pointMatch = longDef.match(/(?:1\.|<b>1<\/b>)\s*([^<.]+)/i) ||
            longDef.match(/definition:<\/b>\s*([^<.]+)/i);

        if (pointMatch && pointMatch[1]) {
            return pointMatch[1].trim();
        }

        return bestMatch.short_definition;
    }, [bestMatch]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (loading) return (
        <div className="lexicon-panel">
            <header className="lexicon-header">
                <h3>Lexicon Entry</h3>
                <button onClick={onClose} className="close-btn">×</button>
            </header>
            <div className="lexicon-content loading">
                <div className="spinner"></div>
                Loading lexicon...
            </div>
            <style>{STYLES}</style>
        </div>
    )

    if (error) return (
        <div className="lexicon-panel">
            <header className="lexicon-header">
                <h3>Lexicon Entry</h3>
                <button onClick={onClose} className="close-btn">×</button>
            </header>
            <div className="lexicon-content error">{error}</div>
            <style>{STYLES}</style>
        </div>
    )

    if (!bestMatch) return (
        <div className="lexicon-panel">
            <header className="lexicon-header">
                <h3>Lexicon Entry</h3>
                <button onClick={onClose} className="close-btn">×</button>
            </header>
            <div className="lexicon-content empty">No definition found for "{query}"</div>
            <style>{STYLES}</style>
        </div>
    );

    return (
        <div className="lexicon-panel">
            <header className="lexicon-header">
                <div className="header-top">
                    <h3>Lexicon Entry</h3>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>
                <div className="dict-toggle">
                    <button
                        className={`toggle-btn ${dict === 'BDBT' ? 'active' : ''}`}
                        onClick={() => onDictChange?.('BDBT')}
                    >
                        Default (BDBT)
                    </button>
                    <button
                        className={`toggle-btn ${dict === 'RUSD' ? 'active' : ''}`}
                        onClick={() => onDictChange?.('RUSD')}
                    >
                        Alternate (RUSD)
                    </button>
                </div>
            </header>

            <div className="lexicon-content">
                <div className="summary-card">
                    <div className="lexeme-row">
                        <span className="lexeme">{bestMatch.lexeme}</span>
                        <div className="lexeme-actions">
                            <button onClick={() => handleCopy(bestMatch.lexeme)} className="action-btn-sm" title="Copy Lexeme">
                                Copy
                            </button>
                        </div>
                    </div>

                    <div className="pronunciation-row">
                        <span className="transliteration">{bestMatch.transliteration}</span>
                        {bestMatch.pronunciation && <span className="pronunciation">/ {bestMatch.pronunciation} /</span>}
                    </div>

                    {bestMatch.topic && (
                        <div className="strongs-box">
                            <div className="strongs-info">
                                <span className="strongs-label">Strong's:</span>
                                <span className="strongs-id">{bestMatch.topic}</span>
                            </div>
                            <div className="strongs-actions">
                                <button onClick={() => handleCopy(bestMatch.topic)} className="action-btn-xs">Copy ID</button>
                                <button onClick={() => onJumpToStrong(bestMatch.topic)} className="action-btn-xs primary">Open Entry</button>
                            </div>
                        </div>
                    )}

                    {modernGloss && (
                        <div className="short-definition modern-gloss">
                            {modernGloss}
                        </div>
                    )}
                </div>

                <div className={`full-definition-wrapper ${isExpanded ? 'expanded' : ''}`}>
                    <button
                        className="expand-trigger"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? 'Hide Full Definition' : 'Show Full Definition'}
                        <span className="chevron">{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {isExpanded && (
                        <div
                            className="definition-html"
                            dangerouslySetInnerHTML={{ __html: bestMatch.definition }}
                        />
                    )}
                </div>

                {otherMatches.length > 0 && (
                    <div className="other-matches">
                        <button
                            className="expand-trigger secondary"
                            onClick={() => setIsMatchesExpanded(!isMatchesExpanded)}
                        >
                            Other Matches ({otherMatches.length})
                            <span className="chevron">{isMatchesExpanded ? '▲' : '▼'}</span>
                        </button>
                        {isMatchesExpanded && (
                            <div className="matches-list">
                                {otherMatches.map((match, i) => (
                                    <div key={match.pk || i} className="match-item" onClick={() => onJumpToStrong(match.topic)}>
                                        <span className="match-lexeme">{match.lexeme}</span>
                                        <span className="match-strongs">{match.topic}</span>
                                        <p className="match-short">{match.short_definition || 'No summary'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{STYLES}</style>
        </div>
    )
}

const STYLES = `
    .lexicon-panel {
        width: 100%;
        background: #fff;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        box-shadow: -4px 0 12px rgba(15, 23, 42, 0.08);
        z-index: 50;
        font-family: 'Inter', sans-serif;
    }
    .lexicon-header {
        padding: 1.25rem;
        border-bottom: 1px solid #f1f5f9;
        background: #f8fafc;
    }
    .header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .lexicon-header h3 { margin: 0; font-size: 0.875rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #94a3b8; transition: color 0.2s; }
    .close-btn:hover { color: #475569; }

    .dict-toggle {
        display: flex;
        background: #f1f5f9;
        padding: 2px;
        border-radius: 8px;
        gap: 2px;
    }
    .toggle-btn {
        flex: 1;
        border: none;
        padding: 6px 12px;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        background: transparent;
        color: #64748b;
        transition: all 0.2s;
    }
    .toggle-btn.active {
        background: #fff;
        color: #1e293b;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    
    .lexicon-content {
        padding: 1.5rem;
        overflow-y: auto;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .lexicon-content.loading { align-items: center; justify-content: center; color: #64748b; }
    .lexicon-content.error { color: #ef4444; text-align: center; }

    .summary-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    
    .lexeme-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem; }
    .lexeme { font-size: 2.25rem; font-weight: 800; color: #0f172a; line-height: 1; }
    .pronunciation-row { margin-bottom: 1.25rem; color: #64748b; font-size: 0.9375rem; }
    .transliteration { font-weight: 500; font-style: italic; margin-right: 0.5rem; }
    
    .strongs-box { 
        display: flex; 
        justify-content: space-between;
        align-items: center; 
        padding: 0.75rem;
        background: #f8fafc;
        border-radius: 8px;
        margin-bottom: 1.25rem;
        border: 1px solid #f1f5f9;
    }
    .strongs-info { display: flex; align-items: baseline; gap: 0.5rem; }
    .strongs-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
    .strongs-id { font-size: 1rem; font-weight: 700; color: #3b82f6; font-family: monospace; }
    
    .action-btn-xs {
        padding: 4px 8px;
        font-size: 0.7rem;
        font-weight: 600;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        cursor: pointer;
        color: #475569;
        margin-left: 0.25rem;
        transition: all 0.2s;
    }
    .action-btn-xs:hover { background: #f8fafc; border-color: #cbd5e1; }
    .action-btn-xs.primary {
        background: #3b82f6;
        color: #fff;
        border-color: #2563eb;
    }
    .action-btn-xs.primary:hover { background: #2563eb; }

    .action-btn-sm {
        padding: 6px 10px;
        font-size: 0.75rem;
        font-weight: 500;
        background: #f1f5f9;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        color: #475569;
    }

    .short-definition {
        font-size: 1rem;
        line-height: 1.6;
        color: #334155;
        font-weight: 500;
    }

    .short-definition.modern-gloss {
        color: #1e293b;
        font-weight: 600;
        border-left: 3px solid #3b82f6;
        padding-left: 0.75rem;
        font-size: 1.05rem;
    }

    .expand-trigger {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 0;
        background: none;
        border: none;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.875rem;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        transition: color 0.2s;
    }
    .expand-trigger:hover { color: #1e293b; }
    .expand-trigger.secondary { margin-top: 1rem; color: #94a3b8; }
    .chevron { font-size: 0.7rem; }

    .definition-html {
        padding: 1rem 0;
        line-height: 1.8;
        color: #475569;
        font-size: 0.9375rem;
    }
    .definition-html p { margin-bottom: 1rem; }
    .definition-html b { color: #1e293b; }
    .definition-html he {
        font-family: 'SBL Hebrew', 'Ezra SIL', serif;
        font-size: 1.25rem;
        direction: rtl;
        display: inline-block;
        color: #1e40af;
        margin: 0 0.125rem;
    }

    .matches-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem 0;
    }
    .match-item {
        padding: 0.75rem;
        border: 1px solid #f1f5f9;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .match-item:hover { background: #f8fafc; border-color: #e2e8f0; }
    .match-lexeme { font-weight: 700; color: #1e293b; margin-right: 0.5rem; }
    .match-strongs { font-size: 0.8rem; color: #3b82f6; font-family: monospace; }
    .match-short { font-size: 0.8rem; color: #64748b; margin-top: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .spinner {
        width: 1.5rem;
        height: 1.5rem;
        border: 2px solid #e2e8f0;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-bottom: 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
`;
