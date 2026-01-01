import { useState, useEffect, useCallback, useMemo } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { BiblePicker } from './components/BiblePicker'
import { BibleViewer } from './components/BibleViewer'
import { saveDocument, getDocuments, getDocument } from './lib/persistence'
import { AppMode, Annotation, AnnotationStyle } from '@precept/shared'
import { KBarProvider } from 'kbar'
import { CommandPalette } from './components/CommandPalette'
import { createActions } from './commands/registry'
import { SelectionToolbar } from './components/SelectionToolbar'
import { getSelectedAnnotations, clearIntersectingAnnotations, applyAnnotationSmart } from './lib/annotation-engine'
import { parseReference } from './lib/navigation-utils'
import { getBooks, Book } from './lib/api'
import { ResearchMode } from './components/ResearchMode'
import { AIStudyMode } from './components/AIStudyMode'
import { AuthModal } from './components/AuthModal'
import { X, BookOpen, FlaskConical, LogOut, User, Sparkles } from 'lucide-react'
import './index.css'

function ExistingDocsList({ onSelect }: { onSelect: (id: string) => void }) {
    const [docs, setDocs] = useState<any[]>([])
    useEffect(() => {
        getDocuments().then(setDocs)
    }, [])

    return (
        <div className="docs-list">
            <h3 className="sidebar-title">Your Studies</h3>
            {docs.length === 0 && <p className="empty-msg">No saved studies</p>}
            <ul className="doc-items">
                {docs.map(d => (
                    <li key={d.id} className="doc-item">
                        <button onClick={() => onSelect(d.id)} className="doc-link">
                            {d.title || 'Untitled'}
                        </button>
                    </li>
                ))}
            </ul>
            <style>{`
                .sidebar-title { font-size: 0.9rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 1rem; }
                .doc-items { list-style: none; padding: 0; margin: 0; }
                .doc-item { margin-bottom: 0.5rem; }
                .doc-link { background: none; border: none; color: #3b82f6; font-weight: 500; cursor: pointer; text-align: left; }
                .doc-link:hover { text-decoration: underline; }
                .empty-msg { font-size: 0.85rem; color: #94a3b8; }
            `}</style>
        </div>
    )
}

function AppContent() {
    const [session, setSession] = useState<Session | null>(null)

    useEffect(() => {
        // If Auth is disabled (Local Dev), simulate a session
        if (import.meta.env.VITE_ENABLE_AUTH === 'false') {
            setSession({
                access_token: 'mock-token',
                token_type: 'bearer',
                expires_in: 3600,
                refresh_token: 'mock-refresh',
                user: {
                    id: 'local-dev-user',
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: 'dev@local.com',
                    app_metadata: {},
                    user_metadata: {},
                    created_at: new Date().toISOString(),
                }
            } as Session)
            return
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
        return () => subscription.unsubscribe()
    }, [])

    // App State
    const [selection, setSelection] = useState<{ t: string, b: number, c: number, v?: number | null } | null>(() => {
        const t = localStorage.getItem('precept_default_translation') || 'NASB';
        return { t, b: 1, c: 1, v: null };
    })
    const [mode, setMode] = useState<AppMode>('read')
    const [docId, setDocId] = useState<string | null>(null)
    const [docTitle, setDocTitle] = useState('Untitled Study')
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const [toolbarVisible, setToolbarVisible] = useState(false)
    const [books, setBooks] = useState<Book[]>([])
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Load books for current translation to power navigation
    useEffect(() => {
        const currentT = selection?.t || localStorage.getItem('precept_default_translation') || 'NASB';
        getBooks(currentT).then(setBooks).catch(console.error);
    }, [selection?.t])

    const handleSave = useCallback(async () => {
        if (!selection) return alert('Select a chapter first')
        if (!session) return alert('Please sign in to save')

        try {
            const saved = await saveDocument({
                id: docId || undefined,
                title: docTitle,
                translation: selection.t,
                book_id: selection.b,
                chapter: selection.c
            }, annotations)

            if (saved.id) {
                setDocId(saved.id)
            }
            alert('Saved!')
        } catch (e) {
            console.error(e)
            alert('Failed to save')
        }
    }, [selection, docId, docTitle, annotations, session])

    const handleApplyStyle = (style: AnnotationStyle, color?: string, range?: Range) => {
        const userId = session?.user?.id || 'guest-user';
        const newAnns = getSelectedAnnotations(docId || 'pending', userId, style, color, range);
        if (newAnns.length > 0) {
            setAnnotations(prev => applyAnnotationSmart(prev, newAnns));
            window.getSelection()?.removeAllRanges();
            setToolbarVisible(false);
        }
    };

    const handleClear = (range?: Range) => {
        const remaining = clearIntersectingAnnotations(annotations, range);
        setAnnotations(remaining);
        window.getSelection()?.removeAllRanges();
        setToolbarVisible(false);
    };

    const handleGoTo = useCallback(() => {
        const ref = prompt('Go to (e.g. John 3:16):')
        if (!ref) return;

        const parsed = parseReference(ref, books);
        if (parsed) {
            setSelection({
                t: selection?.t || 'ESV',
                b: parsed.bookId,
                c: parsed.chapter,
                v: parsed.verse
            });
        } else {
            alert('Could not parse reference. Try "John 3:16" or "Genesis 1".');
        }
    }, [books, selection?.t])

    const actions = useMemo(() => createActions({
        setMode,
        navigate: (path) => console.log('Navigate to', path),
        saveStudy: handleSave,
        openSearch: () => {
            const query = prompt('Search Scripture:')
            if (query) alert(`Searching for: ${query}`)
        },
        openGoTo: handleGoTo
    }), [handleSave, handleGoTo])

    // ESC to toggle mode & Direct Hotkeys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMod = e.metaKey || e.ctrlKey;

            if (isMod && e.key === 'g') {
                e.preventDefault();
                handleGoTo();
            } else if (isMod && e.key === 'r') {
                e.preventDefault();
                setMode('research');
            } else if (isMod && e.key === 's') {
                e.preventDefault();
                handleSave();
            }

        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [mode, handleSave, handleGoTo])

    return (
        <KBarProvider actions={actions}>
            <CommandPalette />
            <div className="app-container">
                <header>
                    {/* Left side: Brand + Bible Picker */}
                    <div className="header-brand">
                        <h1>Inductive<span className="hide-on-mobile"> Bible AI</span></h1>
                        <div className="hide-on-mobile">
                            <BiblePicker
                                onSelectionChange={(t, b, c) => setSelection({ t, b, c, v: null })}
                                initialSelection={selection}
                            />
                        </div>
                    </div>

                    {/* Right side: Controls */}
                    <div className="header-controls">
                        {/* Mode tabs - visible on all sizes */}
                        <nav className="mode-tabs">
                            <button
                                className={`mode-tab ${mode === 'read' ? 'active' : ''}`}
                                onClick={() => setMode('read')}
                            >
                                Read
                            </button>
                            <button
                                className={`mode-tab ${mode === 'research' ? 'active' : ''}`}
                                onClick={() => setMode('research')}
                            >
                                Study
                            </button>
                            <button
                                className={`mode-tab ${mode === 'ai-study' ? 'active' : ''}`}
                                onClick={() => setMode('ai-study')}
                            >
                                <Sparkles size={14} /> AI
                            </button>
                        </nav>

                        {/* Title input - hidden on mobile */}
                        {selection && (
                            <div className="hide-on-mobile" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    value={docTitle}
                                    onChange={e => setDocTitle(e.target.value)}
                                    placeholder="Study Title"
                                    className="title-input"
                                />
                                <button onClick={handleSave} className="btn-save-sm">Save</button>
                            </div>
                        )}

                        {/* Sign out - hidden on mobile */}
                        {session && (
                            <button className="btn-ghost hide-on-mobile" onClick={() => supabase.auth.signOut()}>Sign Out</button>
                        )}

                        {/* Mobile menu button */}
                        <button
                            className="mobile-menu-btn"
                            onClick={() => setMobileMenuOpen(true)}
                            aria-label="Open menu"
                        >
                            <div className="mobile-menu-icon">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </button>
                    </div>
                </header>

                {/* Mobile Menu Overlay */}
                <div
                    className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setMobileMenuOpen(false);
                    }}
                >
                    <div className="mobile-menu-panel">
                        <div className="mobile-menu-header">
                            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-color)' }}>Menu</h2>
                            <button
                                className="mobile-menu-close"
                                onClick={() => setMobileMenuOpen(false)}
                                aria-label="Close menu"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="mobile-menu-content">
                            {/* Bible Picker Section */}
                            <div className="mobile-menu-section">
                                <div className="mobile-menu-section-title">Select Passage</div>
                                <BiblePicker
                                    onSelectionChange={(t, b, c) => {
                                        setSelection({ t, b, c, v: null });
                                        setMobileMenuOpen(false);
                                    }}
                                    initialSelection={selection}
                                />
                            </div>

                            {/* Study Title Section */}
                            {selection && (
                                <div className="mobile-menu-section">
                                    <div className="mobile-menu-section-title">Study Title</div>
                                    <input
                                        value={docTitle}
                                        onChange={e => setDocTitle(e.target.value)}
                                        placeholder="Enter title..."
                                        className="title-input"
                                        style={{ width: '100%', marginBottom: '0.5rem' }}
                                    />
                                    <button
                                        onClick={() => {
                                            handleSave();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="btn-primary"
                                    >
                                        Save Study
                                    </button>
                                </div>
                            )}

                            {/* Mode Switcher Section */}
                            <div className="mobile-menu-section">
                                <div className="mobile-menu-section-title">Mode</div>
                                <button
                                    className={`mobile-menu-item ${mode === 'read' ? 'active' : ''}`}
                                    onClick={() => { setMode('read'); setMobileMenuOpen(false); }}
                                >
                                    <BookOpen size={20} /> Read Mode
                                </button>
                                <button
                                    className={`mobile-menu-item ${mode === 'research' ? 'active' : ''}`}
                                    onClick={() => { setMode('research'); setMobileMenuOpen(false); }}
                                >
                                    <FlaskConical size={20} /> Study Mode
                                </button>
                                <button
                                    className={`mobile-menu-item ${mode === 'ai-study' ? 'active' : ''}`}
                                    onClick={() => { setMode('ai-study'); setMobileMenuOpen(false); }}
                                >
                                    <Sparkles size={20} /> AI Study
                                </button>
                            </div>

                            {/* Account Section */}
                            <div className="mobile-menu-section">
                                <div className="mobile-menu-section-title">Account</div>
                                {session ? (
                                    <>
                                        <div className="mobile-menu-item" style={{ color: 'var(--text-muted)' }}>
                                            <User size={20} /> {session.user?.email || 'Signed In'}
                                        </div>
                                        <button
                                            className="mobile-menu-item"
                                            onClick={() => { supabase.auth.signOut(); setMobileMenuOpen(false); }}
                                        >
                                            <LogOut size={20} /> Sign Out
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="mobile-menu-item"
                                        onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }}
                                    >
                                        <User size={20} /> Sign In
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>


                <div className="main-content" style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                    <aside className="sidebar">
                        {session ? (
                            <ExistingDocsList onSelect={(id) => {
                                getDocument(id).then(doc => {
                                    setSelection({ t: doc.translation, b: doc.book_id, c: doc.chapter, v: null })
                                    setDocId(doc.id)
                                    setDocTitle(doc.title)
                                    setAnnotations(doc.annotations || [])
                                })
                            }} />
                        ) : (
                            <div className="auth-prompt">
                                <p>Sign in to save your studies.</p>
                                <button className="btn-primary" onClick={() => setShowAuthModal(true)}>Sign In</button>
                            </div>
                        )}
                    </aside>

                    <main style={{ flexGrow: 1, position: 'relative', overflow: 'hidden', background: '#fff' }}>
                        {/* Reader Layer */}
                        <div className="bible-viewer-container" style={{
                            position: 'absolute',
                            inset: 0,
                            overflow: 'auto',
                            padding: '2rem',
                            zIndex: mode === 'read' ? 10 : 1,
                            pointerEvents: mode === 'read' ? 'auto' : 'none',
                            opacity: mode === 'read' ? 1 : 0.4,
                            transition: 'opacity 0.2s',
                        }}>
                            <div className="bible-text-wrapper" style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.3rem', paddingBottom: '400px' }}>
                                {selection ? (
                                    <BibleViewer
                                        translation={selection.t}
                                        bookId={selection.b}
                                        chapter={selection.c}
                                        annotations={annotations}
                                        targetVerse={selection.v}
                                    />
                                ) : (
                                    <div className="welcome-state">
                                        <h2>Welcome to Inductive Bible AI</h2>
                                        <p>Select a translation and book from the top to begin your observation.</p>
                                    </div>
                                )}
                            </div>

                            {mode === 'read' && (
                                <SelectionToolbar
                                    isVisible={toolbarVisible}
                                    onClose={() => setToolbarVisible(false)}
                                    onApplyStyle={handleApplyStyle}
                                    onClear={handleClear}
                                />
                            )}
                        </div>


                        {/* Research Layer */}
                        {mode === 'research' && selection && (
                            <div className="research-layer" style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 20,
                                background: '#fff',
                                display: 'flex'
                            }}>
                                <div style={{ flexGrow: 1, minWidth: 0 }}>
                                    <ResearchMode
                                        translation={selection.t}
                                        bookId={selection.b}
                                        chapter={selection.c}
                                        targetVerse={selection.v}
                                    />
                                </div>
                            </div>
                        )}

                        {/* AI Study Layer */}
                        {mode === 'ai-study' && selection && (
                            <div className="ai-study-layer" style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 20,
                                background: '#f8fafc',
                            }}>
                                <AIStudyMode
                                    translation={selection.t}
                                    bookId={selection.b}
                                    chapter={selection.c}
                                    bookName={books.find(b => b.bookid === selection.b)?.name}
                                />
                            </div>
                        )}
                    </main>
                </div>
            </div>


            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </KBarProvider>
    )
}

function App() {
    return <AppContent />
}

export default App
