import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react'
import { Verse, getChapter } from '../lib/api'
import { LexiconPanel } from './LexiconPanel'
import { AIResearchPanel } from './AIResearchPanel'

interface Props {
    translation: string;
    bookId: number;
    chapter: number;
    targetVerse?: number | null;
}

const HEBREW_STRONGS_SLUG = 'WLCa';
const GREEK_STRONGS_SLUG = 'TISCH';

export function ResearchMode({ translation, bookId, chapter, targetVerse }: Props) {
    const [englishVerses, setEnglishVerses] = useState<Verse[]>([])
    const [originalVerses, setOriginalVerses] = useState<Verse[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedLexicon, setSelectedLexicon] = useState<{ query: string; dict: 'BDBT' | 'RUSD' } | null>(null)
    const [selectedAiResearch, setSelectedAiResearch] = useState<{
        context: {
            translation: string;
            book: string;
            bookId: number;
            chapter: number;
            verse: number;
            verseText: string;
            surroundingContext?: { verse: number; text: string }[];
        },
        clicked?: { text: string, start: number, end: number }
    } | null>(null)
    const [showOriginal, setShowOriginal] = useState(false)
    const [currentTranslation, setCurrentTranslation] = useState(translation)
    const [hoveredStrongs, setHoveredStrongs] = useState<string | null>(null)

    const leftPaneRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [leftPanePercent, setLeftPanePercent] = useState(50)
    const [lexiconWidth, setLexiconWidth] = useState(450)
    const [isResizingMid, setIsResizingMid] = useState(false)
    const [isResizingLexicon, setIsResizingLexicon] = useState(false)

    // Mobile states
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [drawerExpanded, setDrawerExpanded] = useState(false)

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setDrawerExpanded(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-expand drawer when a tool is opened on mobile
    useEffect(() => {
        if (isMobile && (selectedLexicon || selectedAiResearch)) {
            setDrawerExpanded(true);
        }
    }, [selectedLexicon, selectedAiResearch, isMobile]);

    const rightPaneRef = useRef<HTMLDivElement>(null)



    const [books, setBooks] = useState<any[]>([])

    const isOT = bookId <= 39;
    const [currentDict, setCurrentDict] = useState<'BDBT' | 'RUSD'>('BDBT');

    const bookName = useMemo(() => {
        return books.find(b => b.bookid === bookId)?.name || 'Unknown Book';
    }, [books, bookId]);

    const effectiveEnglish = currentTranslation;
    const effectiveOriginal = isOT ? HEBREW_STRONGS_SLUG : GREEK_STRONGS_SLUG;

    // Resize effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingMid) {
                const container = containerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const currentLexWidth = (selectedLexicon || selectedAiResearch) ? lexiconWidth : 0;

                if (!showOriginal) {
                    const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
                    setLeftPanePercent(Math.max(20, Math.min(80, newPercent)));
                } else {
                    const panesAreaWidth = rect.width - currentLexWidth;
                    const newPercent = ((e.clientX - rect.left) / panesAreaWidth) * 100;
                    setLeftPanePercent(Math.max(20, Math.min(80, newPercent)));
                }
            }
            if (isResizingLexicon) {
                const container = containerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const newWidth = rect.right - e.clientX;
                setLexiconWidth(Math.max(300, Math.min(rect.width * 0.7, newWidth)));
            }
        };

        const handleMouseUp = () => {
            setIsResizingMid(false);
            setIsResizingLexicon(false);
            document.body.style.cursor = 'default';
        };

        if (isResizingMid || isResizingLexicon) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [isResizingMid, isResizingLexicon, selectedLexicon, selectedAiResearch, lexiconWidth, showOriginal]);

    // Load books
    useEffect(() => {
        import('../lib/api').then(api => api.getBooks(currentTranslation).then(setBooks));
    }, [currentTranslation]);

    // Load chapter data
    useEffect(() => {
        if (!bookId || !chapter) return;

        setLoading(true)
        Promise.all([
            getChapter(effectiveEnglish, bookId, chapter),
            getChapter(effectiveOriginal, bookId, chapter)
        ]).then(([eng, orig]) => {
            setEnglishVerses(eng)
            setOriginalVerses(orig)

            // Auto-open Chat if not already open
            if (!selectedAiResearch && eng.length > 0) {
                setSelectedAiResearch({
                    context: {
                        translation: currentTranslation,
                        book: bookName,
                        bookId: bookId,
                        chapter: chapter,
                        verse: 0,
                        verseText: eng.map(v => `[${v.verse}] ${v.text.replace(/<[^>]*>/g, '')}`).join('\n')
                    },
                    clicked: undefined
                });
            }
        }).catch(err => {
            console.error('Failed to load research data', err)
        }).finally(() => setLoading(false))
    }, [effectiveEnglish, effectiveOriginal, bookId, chapter, bookName, currentTranslation]);

    // Scroll to target verse
    useEffect(() => {
        if (!loading && targetVerse && englishVerses.length > 0) {
            setTimeout(() => {
                handleVerseClick(targetVerse);
            }, 200);
        }
    }, [loading, targetVerse, englishVerses]);

    const handleVerseClick = (vNum: number) => {
        const leftEl = leftPaneRef.current?.querySelector(`[data-verse="${vNum}"]`);
        const rightEl = rightPaneRef.current?.querySelector(`[data-verse="${vNum}"]`);

        leftEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        rightEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        [leftEl, rightEl].forEach(el => {
            if (el) {
                el.classList.add('verse-flash');
                setTimeout(() => el.classList.remove('verse-flash'), 2000);
            }
        });
    };

    const handleTokenClick = (word: string, strongs?: string, verse?: Verse) => {
        if (verse && englishVerses.length > 0) {
            const start = verse.text.indexOf(word);
            const verseIdx = englishVerses.findIndex(v => v.pk === verse.pk);
            const surroundingContext: { verse: number; text: string }[] = [];

            if (verseIdx > 0) {
                const prev = englishVerses[verseIdx - 1];
                surroundingContext.push({ verse: prev.verse, text: prev.text.replace(/<[^>]*>/g, '') });
            }
            if (verseIdx < englishVerses.length - 1) {
                const next = englishVerses[verseIdx + 1];
                surroundingContext.push({ verse: next.verse, text: next.text.replace(/<[^>]*>/g, '') });
            }

            setSelectedAiResearch({
                context: {
                    translation: currentTranslation,
                    book: bookName,
                    bookId: bookId,
                    chapter: chapter,
                    verse: verse.verse,
                    verseText: verse.text.replace(/<[^>]*>/g, ''),
                    surroundingContext
                },
                clicked: {
                    text: word,
                    start: start,
                    end: start + word.length
                }
            });
            setSelectedLexicon(null);
            return;
        }

        if (strongs) {
            setSelectedLexicon({ query: strongs, dict: currentDict });
        } else if (word) {
            setSelectedLexicon({ query: word, dict: currentDict });
        }
        setSelectedAiResearch(null);
    };

    const handleAnalysisSuccess = (strongs: string | null) => {
        if (strongs) {
            const rawId = strongs.replace(/^[HG]/i, '');
            setHoveredStrongs(rawId);
        } else {
            setHoveredStrongs(null);
        }
    };

    const handleOpenGeneralChat = () => {
        setSelectedAiResearch({
            context: {
                translation: currentTranslation,
                book: bookName,
                bookId: bookId,
                chapter: chapter,
                verse: 0,
                verseText: englishVerses.map(v => `[${v.verse}] ${v.text.replace(/<[^>]*>/g, '')}`).join('\n')
            },
            clicked: undefined
        });
        setSelectedLexicon(null);
    };

    const handleJumpToStrong = (id: string) => {
        setSelectedLexicon({ query: id, dict: currentDict });
    };

    if (loading && englishVerses.length === 0) {
        return <div className="research-loading">Loading Research Mode...</div>;
    }

    return (
        <div className="research-container" ref={containerRef}>
            {/* Desktop View Content */}
            {!isMobile && (
                <div className="research-panes">
                    {/* Left Pane - English */}
                    <div
                        ref={leftPaneRef}
                        className="pane english-pane"
                        style={{ width: `${leftPanePercent}%`, flex: 'none' }}
                    >
                        <header className="pane-header">
                            <div className="pane-title">{translation}</div>
                            <div className="pane-tools">
                                <label className="toggle-original">
                                    <input
                                        type="checkbox"
                                        checked={showOriginal}
                                        onChange={e => setShowOriginal(e.target.checked)}
                                    />
                                    <span className="toggle-label">Show Original ({isOT ? 'Hebrew' : 'Greek'})</span>
                                </label>
                                <select
                                    value={currentTranslation}
                                    onChange={e => setCurrentTranslation(e.target.value)}
                                    className="translation-select"
                                >
                                    <option value="NASB">NASB</option>
                                    <option value="ESV">ESV</option>
                                    <option value="NLT">NLT</option>
                                    <option value="KJV">KJV (Strongs)</option>
                                </select>
                            </div>
                        </header>
                        <div className="pane-content">
                            {loading ? <div className="loading-state">Loading...</div> : (
                                englishVerses.map(v => (
                                    <div key={v.pk} className="verse-row" data-verse={v.verse}>
                                        <span className="v-num" onClick={() => handleVerseClick(v.verse)}>{v.verse}</span>
                                        <TokenizedVerse
                                            text={v.text}
                                            onTokenClick={(word: string, strongs?: string) => handleTokenClick(word, strongs, v)}
                                            onTokenHover={setHoveredStrongs}
                                            activeStrongs={hoveredStrongs}
                                            isHebrew={false}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Resizer */}
                    <div
                        className={`resizer ${isResizingMid ? 'active' : ''}`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizingMid(true);
                        }}
                    />

                    {/* Right Pane: Original (Conditional) */}
                    {showOriginal && (
                        <>
                            <div ref={rightPaneRef} className="pane original-pane" style={{ flex: 1, minWidth: 0 }}>
                                <header className="pane-header">
                                    <div className="pane-title">{isOT ? 'Hebrew (WLC)' : 'Greek (SBLGNT)'}</div>
                                    <div className="pane-meta">{isOT ? 'BDBT Dictionary' : 'RUSD/Thayer Dictionary'}</div>
                                </header>
                                <div className="pane-content" dir={isOT ? 'rtl' : 'ltr'}>
                                    {loading ? <div className="loading-state">Loading...</div> : (
                                        originalVerses.map(v => (
                                            <div key={v.pk} className="verse-row" data-verse={v.verse}>
                                                <span className="v-num" onClick={() => handleVerseClick(v.verse)}>{v.verse}</span>
                                                <TokenizedVerse
                                                    text={v.text}
                                                    onTokenClick={(word: string, strongs?: string) => handleTokenClick(word, strongs, v)}
                                                    onTokenHover={setHoveredStrongs}
                                                    activeStrongs={hoveredStrongs}
                                                    isHebrew={isOT}
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div
                                className={`resizer lexicon-resizer ${isResizingLexicon ? 'active' : ''}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsResizingLexicon(true);
                                }}
                            />
                        </>
                    )}

                    {/* Lexicon Panel - No Original */}
                    {selectedLexicon && !showOriginal && (
                        <div className="lexicon-wrapper" style={{ flex: `0 0 ${100 - leftPanePercent}%` }}>
                            <LexiconPanel
                                query={selectedLexicon.query}
                                dict={currentDict}
                                onClose={() => setSelectedLexicon(null)}
                                onJumpToStrong={handleJumpToStrong}
                                onDictChange={setCurrentDict}
                            />
                        </div>
                    )}

                    {/* Lexicon Panel - With Original */}
                    {selectedLexicon && showOriginal && (
                        <div className="lexicon-wrapper" style={{ width: `${lexiconWidth}px`, flex: 'none' }}>
                            <LexiconPanel
                                query={selectedLexicon.query}
                                dict={currentDict}
                                onClose={() => setSelectedLexicon(null)}
                                onJumpToStrong={handleJumpToStrong}
                                onDictChange={setCurrentDict}
                            />
                        </div>
                    )}

                    {/* AI Panel - No Original */}
                    {selectedAiResearch && !showOriginal && (
                        <div className="lexicon-wrapper" style={{ flex: `0 0 ${100 - leftPanePercent}%` }}>
                            <AIResearchPanel
                                context={selectedAiResearch.context}
                                clicked={selectedAiResearch.clicked}
                                onClose={() => handleOpenGeneralChat()}
                                onAnalysisSuccess={handleAnalysisSuccess}
                            />
                        </div>
                    )}

                    {/* AI Panel - With Original */}
                    {selectedAiResearch && showOriginal && (
                        <div className="lexicon-wrapper" style={{ width: `${lexiconWidth}px`, flex: 'none' }}>
                            <AIResearchPanel
                                context={selectedAiResearch.context}
                                clicked={selectedAiResearch.clicked}
                                onClose={() => handleOpenGeneralChat()}
                                onAnalysisSuccess={handleAnalysisSuccess}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Mobile View Content */}
            {isMobile && (
                <div className="research-panes">
                    <div className="pane english-pane" style={{ flex: 1 }}>
                        <header className="pane-header">
                            <div className="pane-title">{translation}</div>
                            <select
                                value={currentTranslation}
                                onChange={e => setCurrentTranslation(e.target.value)}
                                className="translation-select"
                            >
                                <option value="NASB">NASB</option>
                                <option value="ESV">ESV</option>
                                <option value="NLT">NLT</option>
                                <option value="KJV">KJV</option>
                            </select>
                        </header>
                        <div className="pane-content">
                            {loading ? <div className="loading-state">Loading...</div> : (
                                englishVerses.map(v => (
                                    <div key={v.pk} className="verse-row" data-verse={v.verse}>
                                        <span className="v-num" onClick={() => handleVerseClick(v.verse)}>{v.verse}</span>
                                        <TokenizedVerse
                                            text={v.text}
                                            onTokenClick={(word: string, strongs?: string) => handleTokenClick(word, strongs, v)}
                                            onTokenHover={setHoveredStrongs}
                                            activeStrongs={hoveredStrongs}
                                            isHebrew={false}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Drawer for research tools */}
                    {(selectedLexicon || selectedAiResearch) && (
                        <div className={`research-drawer ${drawerExpanded ? '' : 'collapsed'}`}>
                            <div className="drawer-handle" onClick={() => setDrawerExpanded(!drawerExpanded)}>
                                <div className="drawer-bar"></div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Maximize2 size={14} />
                                    {selectedLexicon ? `Lexicon: ${selectedLexicon.query}` : 'Research'}
                                </div>
                                {drawerExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                            </div>
                            <div className="drawer-content">
                                {selectedLexicon && (
                                    <LexiconPanel
                                        query={selectedLexicon.query}
                                        dict={currentDict}
                                        onClose={() => setSelectedLexicon(null)}
                                        onJumpToStrong={handleJumpToStrong}
                                        onDictChange={setCurrentDict}
                                    />
                                )}
                                {selectedAiResearch && !selectedLexicon && (
                                    <AIResearchPanel
                                        context={selectedAiResearch.context}
                                        clicked={selectedAiResearch.clicked}
                                        onClose={() => handleOpenGeneralChat()}
                                        onAnalysisSuccess={handleAnalysisSuccess}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}


            <style>{`
                .research-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    width: 100%;
                    background: #fff;
                    font-family: 'Inter', sans-serif;
                    overflow: hidden;
                    position: relative;
                }
                @media (min-width: 768px) {
                    .research-container {
                        flex-direction: row;
                    }
                }
                .research-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    font-size: 1.2rem;
                    color: #64748b;
                }
                .research-panes {
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                    overflow: hidden;
                }
                @media (min-width: 768px) {
                    .research-panes {
                        flex-direction: row;
                    }
                }
                .pane {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .resizer {
                    width: 6px;
                    background: #f1f5f9;
                    cursor: col-resize;
                    transition: background 0.2s, width 0.2s;
                    z-index: 100;
                    border-left: 1px solid #e1e7ef;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                @media (max-width: 767px) {
                    .resizer { display: none; }
                }
                .resizer::after {
                    content: "";
                    width: 2px;
                    height: 16px;
                    background: #cbd5e1;
                    border-radius: 1px;
                }
                .resizer:hover, .resizer.active {
                    background: #3b82f6;
                }
                .resizer:hover::after, .resizer.active::after {
                    background: #fff;
                }
                .lexicon-resizer {
                    border-left: 1px solid #e1e7ef;
                }
                .lexicon-wrapper {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #fff;
                }
                /* Mobile Drawer Styles */
                .research-drawer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: #fff;
                    z-index: 1000;
                    box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
                    border-top: 1px solid #e2e8f0;
                    border-top-left-radius: 16px;
                    border-top-right-radius: 16px;
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    max-height: 85vh;
                }
                .research-drawer.collapsed {
                    transform: translateY(calc(100% - 50px));
                }
                .drawer-handle {
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 1rem;
                    cursor: pointer;
                    background: #f8fafc;
                    border-top-left-radius: 16px;
                    border-top-right-radius: 16px;
                    flex-shrink: 0;
                }
                .drawer-bar {
                    width: 40px;
                    height: 4px;
                    background: #cbd5e1;
                    border-radius: 2px;
                    margin: 0 auto;
                    position: absolute;
                    top: 8px;
                    left: calc(50% - 20px);
                }
                .drawer-content {
                    flex-grow: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .pane-header {
                    padding: 0.75rem 1rem;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .translation-select {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 2px 4px;
                    color: #475569;
                    outline: none;
                }
                .pane-tools {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .toggle-original {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                }
                .toggle-label {
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: #64748b;
                }
                .pane-title {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .pane-meta {
                    font-size: 0.7rem;
                    color: #94a3b8;
                    font-weight: 500;
                }
                .pane-content {
                    flex-grow: 1;
                    overflow-y: auto;
                    padding: 2.5rem;
                    line-height: 2;
                }
                @media (max-width: 767px) {
                    .pane-content { padding: 1.5rem; }
                }
                .loading-state {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100px;
                    color: #94a3b8;
                    font-style: italic;
                }
                .verse-row {
                    display: flex;
                    margin-bottom: 2rem;
                    gap: 1.5rem;
                    padding: 8px;
                    border-radius: 8px;
                    transition: all 0.3s;
                }
                .verse-flash {
                    background: rgba(59, 130, 246, 0.08);
                }
                .v-num {
                    font-size: 0.8rem;
                    font-weight: 800;
                    color: #cbd5e1;
                    cursor: pointer;
                    user-select: none;
                    min-width: 2rem;
                    padding-top: 0.4rem;
                }
                .v-num:hover { color: #3b82f6; }
                
                .v-text { 
                    font-size: 1.15rem; 
                    color: #334155;
                }
                
                .original-pane .v-text {
                    font-size: 1.6rem;
                    color: #1e293b;
                }
                
                .token {
                    display: inline-block;
                    cursor: pointer;
                    padding: 0 4px;
                    border-radius: 4px;
                    transition: all 0.15s;
                    border-bottom: 2px solid transparent;
                }
                .token:hover {
                    background: #eff6ff;
                    color: #2563eb;
                }
                .token.active-highlight {
                    background: #dbeafe;
                    color: #1e40af;
                    border-bottom-color: #3b82f6;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
                }
            `}</style>
        </div>
    );
}

function TokenizedVerse({ text, onTokenClick, onTokenHover, activeStrongs, isHebrew }: {
    text: string,
    onTokenClick: (word: string, strongs?: string) => void,
    onTokenHover: (strongs: string | null) => void,
    activeStrongs: string | null,
    isHebrew: boolean
}) {
    const parts = text.split(/(<S>\d+<\/S>)/);
    const tokens: { word: string; strongs?: string }[] = [];

    let currentWord = "";
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith("<S>")) {
            const id = part.replace(/<\/?S>/g, "");
            if (currentWord.trim().length > 0) {
                tokens.push({ word: currentWord.trim(), strongs: id });
            } else if (tokens.length > 0) {
                tokens[tokens.length - 1].strongs = id;
            }
            currentWord = "";
        } else {
            const wordsInPart = part.split(/\s+/).filter(Boolean);
            for (let j = 0; j < wordsInPart.length; j++) {
                const word = wordsInPart[j];
                if (j === wordsInPart.length - 1 && i + 1 < parts.length && parts[i + 1].startsWith("<S>")) {
                    currentWord = word;
                } else {
                    tokens.push({ word: word });
                }
            }
            if (wordsInPart.length === 0) {
                currentWord = "";
            }
        }
    }
    if (currentWord.trim().length > 0) {
        tokens.push({ word: currentWord.trim() });
    }

    if (tokens.length === 0 || !tokens.some(t => t.strongs)) {
        const cleanText = text.replace(/<[^>]*>/g, '');
        return (
            <span className="v-text tokenized">
                {cleanText.split(/\s+/).filter(Boolean).map((token, idx) => (
                    <span
                        key={idx}
                        className="token"
                        onClick={() => onTokenClick(token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))}
                    >
                        {token}{' '}
                    </span>
                ))}
            </span>
        );
    }

    return (
        <span className="v-text tokenized">
            {tokens.map((token, idx) => {
                const isMatch = activeStrongs && token.strongs === activeStrongs;
                const lookupQuery = token.strongs ? (isHebrew ? `H${token.strongs}` : `G${token.strongs}`) : undefined;
                const cleanedWord = token.word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

                return (
                    <span
                        key={idx}
                        className={`token ${isMatch ? 'active-highlight' : ''}`}
                        onMouseEnter={() => token.strongs && onTokenHover(token.strongs)}
                        onMouseLeave={() => onTokenHover(null)}
                        onClick={() => onTokenClick(cleanedWord, lookupQuery)}
                    >
                        {token.word}{' '}
                    </span>
                );
            })}
        </span>
    );
}
