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

interface ResearchTab {
    id: string;
    title: string;
    type: 'ai-word-study' | 'lexicon' | 'general-chat';
    data: {
        context: any;
        clicked?: { text: string, start: number, end: number };
        lexiconQuery?: string;
    }
}

export function ResearchMode({ translation, bookId, chapter, targetVerse }: Props) {
    const [englishVerses, setEnglishVerses] = useState<Verse[]>([])
    const [loading, setLoading] = useState(false)
    const [tabs, setTabs] = useState<ResearchTab[]>([])
    const [activeTabId, setActiveTabId] = useState<string | null>(null)
    const activeTab = tabs.find(t => t.id === activeTabId);
    const [showOriginal] = useState(false)
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
        if (isMobile && activeTab) {
            setDrawerExpanded(true);
        }
    }, [activeTab, isMobile]);

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
                const currentLexWidth = activeTab ? lexiconWidth : 0;

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
    }, [isResizingMid, isResizingLexicon, activeTab, lexiconWidth, showOriginal]);

    // Load books
    useEffect(() => {
        import('../lib/api').then(api => api.getBooks(currentTranslation).then(setBooks));
    }, [currentTranslation]);

    // Load chapter data
    useEffect(() => {
        if (!bookId || !chapter) return;

        setLoading(true)
        Promise.all([
            getChapter(effectiveEnglish, bookId, chapter)
        ]).then(([eng]) => {
            setEnglishVerses(eng)

            // Auto-open Chat if not already open
            if (tabs.length === 0 && eng.length > 0) {
                const generalTab: ResearchTab = {
                    id: 'general-chat',
                    title: 'Study Chat',
                    type: 'general-chat',
                    data: {
                        context: {
                            translation: currentTranslation,
                            book: bookName,
                            bookId: bookId,
                            chapter: chapter,
                            verse: 0,
                            verseText: eng.map(v => `[${v.verse}] ${v.text.replace(/<[^>]*>/g, '')}`).join('\n')
                        }
                    }
                };
                setTabs([generalTab]);
                setActiveTabId('general-chat');
            }
        }).catch(err => {
            console.error('Failed to load research data', err)
        }).finally(() => setLoading(false))
    }, [effectiveEnglish, effectiveOriginal, bookId, chapter, bookName, currentTranslation]);
    // Patch "Unknown Book" in tabs once book names load
    useEffect(() => {
        if (bookName !== 'Unknown Book') {
            setTabs(prev => prev.map(tab => {
                if (tab.data.context && tab.data.context.book === 'Unknown Book') {
                    return {
                        ...tab,
                        data: {
                            ...tab.data,
                            context: {
                                ...tab.data.context,
                                book: bookName
                            }
                        }
                    };
                }
                return tab;
            }));
        }
    }, [bookName]);

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

            const tabId = `ai-${word.toLowerCase()}-${verse.verse}`;
            const existing = tabs.find(t => t.id === tabId);

            if (!existing) {
                const newTab: ResearchTab = {
                    id: tabId,
                    title: word,
                    type: 'ai-word-study',
                    data: {
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
                    }
                };
                setTabs(prev => [...prev, newTab]);
            }
            setActiveTabId(tabId);
            return;
        }

        if (strongs || word) {
            const query = strongs || word;
            const tabId = `lex-${query.toLowerCase()}`;
            const existing = tabs.find(t => t.id === tabId);

            if (!existing) {
                const newTab: ResearchTab = {
                    id: tabId,
                    title: word || strongs || 'Lexicon',
                    type: 'lexicon',
                    data: {
                        context: {},
                        lexiconQuery: query
                    }
                };
                setTabs(prev => [...prev, newTab]);
            }
            setActiveTabId(tabId);
        }
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
        setActiveTabId('general-chat');
    };

    const closeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);
        if (activeTabId === id && newTabs.length > 0) {
            setActiveTabId(newTabs[newTabs.length - 1].id);
        } else if (newTabs.length === 0) {
            setActiveTabId(null);
        }
    };

    const handleJumpToStrong = (id: string) => {
        handleTokenClick(id, id);
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

                    {/* Right Pane (Research Column) */}
                    <div className="research-column" style={{ flex: `0 0 ${100 - leftPanePercent}%`, display: 'flex', flexDirection: 'column' }}>
                        <div className="research-tabs-header">
                            {tabs.map(tab => (
                                <div
                                    key={tab.id}
                                    className={`research-tab-item ${activeTabId === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTabId(tab.id)}
                                >
                                    <span className="tab-title">{tab.title}</span>
                                    {tab.id !== 'general-chat' && (
                                        <button className="close-tab-btn" onClick={(e) => closeTab(tab.id, e)}>×</button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="research-tab-content">
                            {activeTab?.type === 'lexicon' && (
                                <LexiconPanel
                                    query={activeTab.data.lexiconQuery!}
                                    dict={currentDict}
                                    onClose={() => closeTab(activeTab.id, { stopPropagation: () => { } } as any)}
                                    onJumpToStrong={handleJumpToStrong}
                                    onDictChange={setCurrentDict}
                                />
                            )}
                            {(activeTab?.type === 'ai-word-study' || activeTab?.type === 'general-chat') && (
                                <AIResearchPanel
                                    context={activeTab.data.context}
                                    clicked={activeTab.data.clicked}
                                    onClose={() => handleOpenGeneralChat()}
                                    onAnalysisSuccess={handleAnalysisSuccess}
                                    customTitle={activeTab.type === 'ai-word-study' ? activeTab.title : undefined}
                                />
                            )}
                            {!activeTab && (
                                <div className="empty-research">
                                    <p>Select a word to start research</p>
                                </div>
                            )}
                        </div>
                    </div>
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
                    {activeTab && (
                        <div className={`research-drawer ${drawerExpanded ? '' : 'collapsed'}`}>
                            <div className="drawer-handle" onClick={() => setDrawerExpanded(!drawerExpanded)}>
                                <div className="drawer-bar"></div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Maximize2 size={14} />
                                    {activeTab.title}
                                </div>
                                {drawerExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                            </div>
                            <div className="drawer-content">
                                {activeTab.type === 'lexicon' && (
                                    <LexiconPanel
                                        query={activeTab.data.lexiconQuery!}
                                        dict={currentDict}
                                        onClose={() => setActiveTabId(null)}
                                        onJumpToStrong={handleJumpToStrong}
                                        onDictChange={setCurrentDict}
                                    />
                                )}
                                {(activeTab.type === 'ai-word-study' || activeTab.type === 'general-chat') && (
                                    <AIResearchPanel
                                        context={activeTab.data.context}
                                        clicked={activeTab.data.clicked}
                                        onClose={() => handleOpenGeneralChat()}
                                        onAnalysisSuccess={handleAnalysisSuccess}
                                        customTitle={activeTab.type === 'ai-word-study' ? activeTab.title : undefined}
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
                .research-column {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #fff;
                    border-left: 1px solid #e1e7ef;
                }
                .research-tabs-header {
                    display: flex;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    overflow-x: auto;
                    flex-shrink: 0;
                }
                .research-tab-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.6rem 1rem;
                    border-right: 1px solid #e2e8f0;
                    cursor: pointer;
                    background: #f1f5f9;
                    color: #64748b;
                    font-size: 0.75rem;
                    font-weight: 600;
                    transition: all 0.2s;
                    white-space: nowrap;
                    min-width: 100px;
                }
                .research-tab-item:hover {
                    background: #e2e8f0;
                    color: #475569;
                }
                .research-tab-item.active {
                    background: #fff;
                    color: #2563eb;
                    border-bottom: 2px solid #2563eb;
                }
                .tab-title {
                    max-width: 120px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .close-tab-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    font-size: 1rem;
                    padding: 0 2px;
                    border-radius: 4px;
                }
                .close-tab-btn:hover {
                    color: #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                }
                .research-tab-content {
                    flex-grow: 1;
                    overflow: hidden;
                }
                .empty-research {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #94a3b8;
                    font-style: italic;
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
