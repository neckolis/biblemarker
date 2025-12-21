import { useState, useEffect, useRef } from 'react'
import { analyzeWord, aiChat } from '../lib/api'

interface Props {
    context: {
        translation: string;
        book: string;
        bookId: number;
        chapter: number;
        verse: number;
        verseText: string;
        surroundingContext?: { verse: number; text: string }[];
    };
    clicked?: {
        text: string;
        start: number;
        end: number;
    };
    onClose: () => void;
    onAnalysisSuccess?: (strongs: string) => void;
}

export function AIResearchPanel({ context, clicked, onClose, onAnalysisSuccess }: Props) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [chatMessage, setChatMessage] = useState('')
    const [chatHistory, setChatHistory] = useState<any[]>([])
    const [chatLoading, setChatLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // If we have a clicked word, analyze it.
        // If not (general chat mode), we just clear data and don't load.
        if (!clicked) {
            setData(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true)
        setError(null)
        setData(null)
        setChatHistory([])

        analyzeWord({
            translation: context.translation,
            book: context.book,
            chapter: context.chapter,
            verse: context.verse,
            verseText: context.verseText,
            clickedText: clicked.text,
            clickedStart: clicked.start,
            clickedEnd: clicked.end,
            surroundingContext: context.surroundingContext
        })
            .then(data => {
                setData(data);
                // If we have a result with a Strong's number, notify the parent to highlight it
                if (onAnalysisSuccess && data.results && data.results.length > 0 && data.results[0].strongs) {
                    onAnalysisSuccess(data.results[0].strongs);
                }
            })
            .catch(err => {
                console.error(err)
                setError('Failed to analyze word')
            })
            .finally(() => setLoading(false))
    }, [context, clicked])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory])

    const handleChat = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!chatMessage.trim() || chatLoading) return

        const userMsg = chatMessage
        setChatMessage('')
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
        setChatLoading(true)

        try {
            const res = await aiChat({
                context: {
                    translation: context.translation,
                    book: context.book,
                    chapter: context.chapter,
                    verse: context.verse,
                    verseText: context.verseText,
                    activeAnalysis: data // Pass current analysis context to chat
                },
                message: userMsg,
                history: chatHistory
            })
            setChatHistory(prev => [...prev, { role: 'assistant', content: res.message }])
        } catch (err) {
            console.error(err)
            setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }])
        } finally {
            setChatLoading(false)
        }
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    return (
        <div className="ai-research-panel">
            <header className="ai-header">
                <div className="header-top">
                    <div className="ai-badge">{clicked ? 'AI WORD STUDY' : 'BIBLE STUDY CHAT'}</div>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>
                {clicked && (
                    <div className="disclaimer">
                        <span className="warning-icon">⚠</span> AI-generated research—verify with trusted sources.
                    </div>
                )}
            </header>

            <div className="ai-content" ref={scrollRef}>
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        Analyzing context...
                    </div>
                ) : error ? (
                    <div className="error-state">{error}</div>
                ) : data ? (
                    <div className="analysis-results">
                        {data.results.map((res: any, idx: number) => (
                            <div key={idx} className="result-card">
                                {res.confidence < 0.6 && (
                                    <div className="low-confidence-badge">Low Confidence Result</div>
                                )}

                                <div className="result-main">
                                    <div className="original-row">
                                        <span className="lemma">{res.original.lemma}</span>
                                        <div className="actions">
                                            <button onClick={() => handleCopy(res.original.lemma)} className="btn-xs">Copy Lemma</button>
                                        </div>
                                    </div>
                                    <div className="meta-row">
                                        <span className="transliteration">{res.transliteration}</span>
                                        <span className="dot">•</span>
                                        <span className="language">{res.original.language.toUpperCase()}</span>
                                    </div>
                                </div>

                                <div className="gloss-box">
                                    <div className="gloss-label">Gloss</div>
                                    <div className="gloss-text">{res.gloss}</div>
                                </div>

                                <div className="details-grid">
                                    <div className="detail-item">
                                        <div className="label">Strong's</div>
                                        <div className="val">
                                            {res.strongs}
                                            <button onClick={() => handleCopy(res.strongs)} className="btn-xs-clean">Copy</button>
                                        </div>
                                    </div>
                                    <div className="detail-item">
                                        <div className="label">Morphology</div>
                                        <div className="val">{res.morphology}</div>
                                    </div>
                                </div>

                                <div className="explanation-section">
                                    <div className="label">Contextual Analysis</div>
                                    <ul className="bullets">
                                        {res.explanationBullets.map((b: string, i: number) => (
                                            <li key={i}>{b}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="report-incorrect">
                                    <button className="btn-link">Report incorrect result</button>
                                </div>
                            </div>
                        ))}

                        <div className="resources-section">
                            <div className="section-title">Further Reading</div>
                            <a
                                href={`https://www.preceptaustin.org/${context.book.toLowerCase().replace(/\s/g, '-')}-${context.chapter}-commentary`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="resource-link"
                            >
                                <span className="icon">📖</span>
                                <div>
                                    <div className="link-title">Precept Austin Commentary</div>
                                    <div className="link-desc">Verse-by-verse study for {context.book} {context.chapter}</div>
                                </div>
                            </a>
                            <a
                                href="https://www.preceptaustin.org/verse-by-verse-comments-entire-new-testament"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="resource-link secondary"
                            >
                                <span className="icon">🔗</span>
                                <div>
                                    <div className="link-title">All Verse-by-Verse Reources</div>
                                    <div className="link-desc">Index of all available commentaries</div>
                                </div>
                            </a>
                        </div>

                        <div className="chat-section">
                            <div className="section-title">Word Study Chat</div>
                            <div className="chat-messages">
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`msg ${msg.role}`}>
                                        <div className="msg-content">{msg.content}</div>
                                    </div>
                                ))}
                                {chatLoading && <div className="msg assistant loading">Thinking...</div>}
                            </div>
                            <form onSubmit={handleChat} className="chat-input-row">
                                <input
                                    value={chatMessage}
                                    onChange={e => setChatMessage(e.target.value)}
                                    placeholder="Ask a question about this word..."
                                    disabled={chatLoading}
                                />
                                <button type="submit" disabled={chatLoading}>Send</button>
                            </form>
                        </div>
                    </div>
                ) : (
                    // General Chat Mode View (no data)
                    <div className="analysis-results">
                        <div className="resources-section">
                            <div className="section-title">Further Reading</div>
                            <a
                                href={`https://www.preceptaustin.org/${context.book.toLowerCase().replace(/\s/g, '-')}-${context.chapter}-commentary`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="resource-link"
                            >
                                <span className="icon">📖</span>
                                <div>
                                    <div className="link-title">Precept Austin Commentary</div>
                                    <div className="link-desc">Verse-by-verse study for {context.book} {context.chapter}</div>
                                </div>
                            </a>
                        </div>

                        <div className="chat-section" style={{ flexGrow: 1 }}>
                            <div className="section-title">Study Assistant</div>
                            <div className="chat-messages" style={{ maxHeight: 'none', flexGrow: 1 }}>
                                {chatHistory.length === 0 && (
                                    <div className="msg assistant">
                                        <div className="msg-content">
                                            Hello! I'm your research assistant for {context.book} {context.chapter}.
                                            Ask me anything about the context, history, or meaning of this passage.
                                        </div>
                                    </div>
                                )}
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`msg ${msg.role}`}>
                                        <div className="msg-content">{msg.content}</div>
                                    </div>
                                ))}
                                {chatLoading && <div className="msg assistant loading">Thinking...</div>}
                            </div>
                            <form onSubmit={handleChat} className="chat-input-row">
                                <input
                                    value={chatMessage}
                                    onChange={e => setChatMessage(e.target.value)}
                                    placeholder="Ask a question about this chapter..."
                                    disabled={chatLoading}
                                />
                                <button type="submit" disabled={chatLoading}>Send</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <style>{STYLES}</style>
        </div>
    )
}

const STYLES = `
    .ai-research-panel {
        width: 100%;
        background: #fff;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        border-left: 1px solid #e2e8f0;
        box-shadow: -4px 0 16px rgba(15, 23, 42, 0.05);
    }
    .ai-header {
        padding: 1.25rem;
        background: #f8fafc;
        border-bottom: 2px solid #eff6ff;
    }
    .header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
    }
    .ai-badge {
        background: #3b82f6;
        color: #fff;
        font-size: 0.65rem;
        font-weight: 800;
        padding: 4px 8px;
        border-radius: 4px;
        letter-spacing: 0.05em;
    }
    .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
    
    .disclaimer {
        font-size: 0.75rem;
        color: #64748b;
        background: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #f1f5f9;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .warning-icon { color: #f59e0b; font-weight: bold; }

    .ai-content {
        flex-grow: 1;
        overflow-y: auto;
        padding: 1.5rem;
    }
    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #64748b;
        gap: 1rem;
    }
    .spinner {
        width: 2rem;
        height: 2rem;
        border: 2px solid #e2e8f0;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .result-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        position: relative;
    }
    .low-confidence-badge {
        background: #fffbeb;
        color: #92400e;
        border: 1px solid #fde68a;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 99px;
        position: absolute;
        top: -10px;
        right: 1.5rem;
    }

    .original-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem; }
    .lemma { font-size: 2.5rem; font-weight: 800; color: #0f172a; line-height: 1; }
    .meta-row { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .transliteration { font-style: italic; font-weight: 500; }
    .dot { color: #cbd5e1; }
    .language { font-weight: 700; color: #94a3b8; }

    .gloss-box {
        background: #f8fafc;
        border: 1px solid #f1f5f9;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
    }
    .gloss-label { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.25rem; }
    .gloss-text { font-size: 1.25rem; font-weight: 700; color: #1e3a8a; }

    .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    .detail-item {
        background: #fff;
        border: 1px solid #f1f5f9;
        padding: 0.75rem;
        border-radius: 6px;
    }
    .detail-item .label { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.25rem; }
    .detail-item .val { font-size: 0.9rem; font-weight: 600; color: #334155; display: flex; justify-content: space-between; align-items: center; }

    .explanation-section { margin-bottom: 1rem; }
    .explanation-section .label { font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; }
    .bullets { margin: 0; padding-left: 1.25rem; list-style-type: disc; }
    .bullets li { font-size: 0.9rem; line-height: 1.6; color: #475569; margin-bottom: 0.5rem; }

    .btn-xs {
        padding: 4px 8px;
        font-size: 0.7rem;
        font-weight: 600;
        background: #f1f5f9;
        border: none;
        border-radius: 4px;
        color: #475569;
        cursor: pointer;
    }
    .btn-xs-clean {
        background: none;
        border: none;
        font-size: 0.65rem;
        font-weight: 700;
        color: #3b82f6;
        cursor: pointer;
        padding: 0;
    }
    .btn-link { background: none; border: none; font-size: 0.75rem; color: #94a3b8; text-decoration: underline; cursor: pointer; }

    .chat-section {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .section-title { font-size: 0.875rem; font-weight: 700; color: #1e293b; }
    .chat-messages {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-height: 300px;
        overflow-y: auto;
    }
    .msg { max-width: 85%; padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; line-height: 1.5; }
    .msg.user { align-self: flex-end; background: #3b82f6; color: #fff; }
    .msg.assistant { align-self: flex-start; background: #fff; border: 1px solid #e2e8f0; color: #334155; }
    .msg.loading { color: #94a3b8; font-style: italic; background: none; border: none; }

    .chat-input-row {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    .chat-input-row input {
        flex-grow: 1;
        padding: 8px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 0.9rem;
        outline: none;
    }
    .chat-input-row input:focus { border-color: #3b82f6; }
    .chat-input-row button {
        background: #3b82f6;
        color: #fff;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
    }

    .resources-section {
        margin-bottom: 1.5rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.25rem;
    }
    .resource-link {
        display: flex;
        align-items: center;
        gap: 1rem;
        text-decoration: none;
        padding: 0.75rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-top: 0.75rem;
        transition: all 0.2s;
    }
    .resource-link:hover {
        border-color: #3b82f6;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(15, 23, 42, 0.05);
    }
    .resource-link.secondary {
        background: transparent;
        border: 1px dashed #cbd5e1;
        margin-top: 0.5rem;
    }
    .resource-link .icon { font-size: 1.25rem; }
    .link-title { font-size: 0.85rem; font-weight: 700; color: #1e293b; }
    .link-desc { font-size: 0.75rem; color: #64748b; }
`;
