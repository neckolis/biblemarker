import { useState, useEffect, useCallback, useMemo } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { BiblePicker } from './components/BiblePicker'
import { BibleViewer } from './components/BibleViewer'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { saveDocument, getDocuments, getDocument } from './lib/persistence'
import { AppMode, Annotation, AnnotationStyle } from '@precept/shared'
import { tldrawBridge } from './lib/tldraw-bridge'
import { KBarProvider } from 'kbar'
import { CommandPalette } from './components/CommandPalette'
import { createActions } from './commands/registry'
import { SelectionToolbar } from './components/SelectionToolbar'
import { getSelectedAnnotations, clearIntersectingAnnotations, applyAnnotationSmart } from './lib/annotation-engine'
import { parseReference } from './lib/navigation-utils'
import { getBooks, Book } from './lib/api'
import { ResearchMode } from './components/ResearchMode'
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

    // Load books for current translation to power navigation
    useEffect(() => {
        const currentT = selection?.t || localStorage.getItem('precept_default_translation') || 'NASB';
        getBooks(currentT).then(setBooks).catch(console.error);
    }, [selection?.t])

    const handleSave = useCallback(async () => {
        if (!selection) return alert('Select a chapter first')
        if (!session) return alert('Please sign in to save')

        const editor = tldrawBridge.getEditor()
        let shapes: any[] = []
        if (editor) {
            const snapshot = editor.store.getSnapshot()
            shapes = Object.values(snapshot.store)
        }

        try {
            const saved = await saveDocument({
                id: docId || undefined,
                title: docTitle,
                translation: selection.t,
                book_id: selection.b,
                chapter: selection.c
            }, annotations, shapes)

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
        if (!session) return;
        const newAnns = getSelectedAnnotations(docId || 'pending', session.user.id, style, color, range);
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

            if (e.key === 'Escape' && mode === 'draw') {
                if (document.activeElement === document.body) {
                    setMode('read')
                }
                return;
            }

            if (isMod && e.key === 't') {
                e.preventDefault();
                setMode('draw');
                setTimeout(() => {
                    tldrawBridge.selectTool('text');
                    tldrawBridge.focus();
                }, 50);
            } else if (isMod && e.key === 'd') {
                e.preventDefault();
                setMode('draw');
                setTimeout(() => {
                    tldrawBridge.selectTool('draw');
                    tldrawBridge.focus();
                }, 50);
            } else if (isMod && e.key === 'g') {
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <h1 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1.5rem' }}>BibleMarker</h1>
                        <BiblePicker
                            onSelectionChange={(t, b, c) => setSelection({ t, b, c, v: null })}
                            initialSelection={selection}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        {selection && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    value={docTitle}
                                    onChange={e => setDocTitle(e.target.value)}
                                    placeholder="Study Title"
                                    className="title-input"
                                />
                                <button onClick={handleSave} className="btn-save-sm">Save</button>
                            </div>
                        )}

                        <nav className="mode-tabs">
                            <button
                                className={`mode-tab ${mode === 'read' ? 'active' : ''}`}
                                onClick={() => setMode('read')}
                            >
                                Read
                            </button>
                            <button
                                className={`mode-tab ${mode === 'draw' ? 'active' : ''}`}
                                onClick={() => setMode('draw')}
                            >
                                Draw
                            </button>
                            <button
                                className={`mode-tab ${mode === 'research' ? 'active' : ''}`}
                                onClick={() => setMode('research')}
                            >
                                Research
                            </button>
                        </nav>

                        {session && (
                            <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Sign Out</button>
                        )}
                    </div>
                </header>

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
                                <button className="btn-primary" onClick={() => alert('SignIn flow')}>Sign In</button>
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
                                        <h2>Welcome to BibleMarker</h2>
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

                        {/* Tldraw Layer */}
                        <div className="tldraw-layer" style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: mode === 'draw' ? 10 : 1,
                            pointerEvents: mode === 'draw' ? 'auto' : 'none',
                        }}>
                            <div className="tldraw-wrapper" style={{ width: '100%', height: '100%' }}>
                                <Tldraw
                                    persistenceKey="precept-demo"
                                    hideUi={mode !== 'draw'}
                                    onMount={(editor) => tldrawBridge.setEditor(editor)}
                                />
                            </div>
                        </div>

                        {/* Research Layer */}
                        {mode === 'research' && selection && (
                            <div className="research-layer" style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 20,
                                background: '#fff'
                            }}>
                                <ResearchMode
                                    translation={selection.t}
                                    bookId={selection.b}
                                    chapter={selection.c}
                                    targetVerse={selection.v}
                                />
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <style>{`
                .sidebar {
                    width: 260px;
                    background: #f8fafc;
                    border-right: 1px solid #e2e8f0;
                    padding: 1.5rem;
                    overflow-y: auto;
                    flex-shrink: 0;
                }
                .title-input {
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    width: 180px;
                    outline: none;
                }
                .title-input:focus { border-color: #3b82f6; background: #fff; }
                .btn-save-sm {
                    background: #1e293b;
                    color: white;
                    border: none;
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                }
                .mode-pill {
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                }
                .mode-pill.read { background: #dcfce7; color: #166534; }
                .mode-pill.draw { background: #fef9c3; color: #854d0e; }
                .btn-ghost { background: none; border: none; color: #64748b; font-size: 0.85rem; cursor: pointer; }
                .btn-ghost:hover { color: #1e293b; }
                .welcome-state { margin-top: 10vh; text-align: center; color: #64748b; }

                .mode-tabs {
                    display: flex;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 10px;
                    gap: 4px;
                }
                .mode-tab {
                    padding: 6px 16px;
                    border: none;
                    background: none;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #64748b;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .mode-tab.active {
                    background: #fff;
                    color: #1e293b;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .mode-tab:hover:not(.active) {
                    background: #e2e8f0;
                }
            `}</style>
        </KBarProvider>
    )
}

function App() {
    return <AppContent />
}

export default App
