// I actually inlined it in the previous step, but I should probably move it if I want clean code. 
// However, the ReplaceFileContent might have failed if I tried to replace too much context.
// Let's see if the previous step works first. 
// I'll wait for the response. 
// Actually, I replaced the START of App function but I need to make sure I included the IMPORTS.
// I added imports in the replacement content.
// "import { Editor, Tldraw } from 'tldraw'"
// "import { saveDocument, getDocuments, getDocument } from './lib/persistence'"
// Wait, I replaced `function App() {` ... down to `const [selection, setSelection]`.
// I need to be careful about not deleting the `useEffect` hooks if they were below.
// In the previous file content, `useEffect` was right at the top of App().
// My replacement content INCLUDES `// ... useEffect auth ...`.
// THIS IS BAD. I replaced code with a comment!
// I need to PROVIDE the code, not a comment.
// I will re-issue the `replace_file_content` with FULL implementation of the function or careful slicing.

// Let's cancel the previous tool call conceptually (I can't), but I will overwrite it with a `write_to_file` of `App.tsx`
// containing the full logic to be safe, since I have changed so much.

import { useState, useEffect } from 'react'
import { Annotation } from '@precept/shared'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { BiblePicker } from './components/BiblePicker'
import { BibleViewer } from './components/BibleViewer'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { saveDocument, getDocuments, getDocument } from './lib/persistence'
import { getPresets, createPreset } from './lib/presets'
import { Preset } from '@precept/shared'
import './index.css'

function ExistingDocsList({ onSelect }: { onSelect: (id: string) => void }) {
    const [docs, setDocs] = useState<any[]>([])
    useEffect(() => {
        getDocuments().then(setDocs)
    }, [])

    return (
        <div>
            <h3>Your Studies</h3>
            {docs.length === 0 && <p>No saved studies</p>}
            <ul style={{ paddingLeft: '1rem' }}>
                {docs.map(d => (
                    <li key={d.id} style={{ marginBottom: '0.5rem' }}>
                        <button
                            onClick={() => onSelect(d.id)}
                            style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                            {d.title || 'Untitled'}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function App() {
    const [session] = useState<Session | null>({
        user: { id: 'test-user-uuid', email: 'test@example.com' } as any,
        access_token: 'mock-token',
        expires_in: 3600,
        token_type: 'bearer',
        refresh_token: 'mock-refresh'
    })

    // App State
    const [selection, setSelection] = useState<{ t: string, b: number, c: number } | null>(null)
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const [presets, setPresets] = useState<Preset[]>([])

    // Persistence State
    const [editor, setEditor] = useState<Editor | null>(null)
    const [docId, setDocId] = useState<string | null>(null)
    const [docTitle, setDocTitle] = useState('Untitled Study')

    // Tools
    const [activeColor, setActiveColor] = useState('#ffff00')
    const [activeTool, setActiveTool] = useState<'highlight' | 'underline'>('highlight')

    // Load presets
    useEffect(() => {
        if (session) getPresets().then(setPresets)
    }, [session])

    useEffect(() => {
        // Mock session: effectively skip real auth for testing
        /*
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
        */
    }, [])

    const handleTextSelection = (verse: number, start: number, end: number) => {
        if (start === end) return;

        const newAnn: Annotation = {
            id: crypto.randomUUID(),
            document_id: docId || 'pending',
            user_id: session!.user.id,
            type: activeTool,
            color: activeColor,
            verse,
            start_offset: start,
            end_offset: end
        }
        setAnnotations(prev => [...prev, newAnn])
        window.getSelection()?.removeAllRanges();
    }

    const handleSave = async () => {
        if (!selection) return alert('Select a chapter first')

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
                // Refresh list?
            }
            alert('Saved!')
        } catch (e) {
            console.error(e)
            alert('Failed to save')
        }
    }

    const [drawMode, setDrawMode] = useState(false)

    const Toolbar = () => (
        <div style={{ padding: '0.5rem', borderBottom: '1px solid #ccc', background: '#f0f0f0', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* ... tool buttons ... */}
            <div>
                <strong>Tool:</strong>
                <button
                    onClick={() => setActiveTool('highlight')}
                    style={{ fontWeight: activeTool === 'highlight' ? 'bold' : 'normal', margin: '0 4px' }}
                >
                    Highlight
                </button>
                <button
                    onClick={() => setActiveTool('underline')}
                    style={{ fontWeight: activeTool === 'underline' ? 'bold' : 'normal', margin: '0 4px' }}
                >
                    Underline
                </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <strong style={{ marginRight: '4px' }}>Color:</strong>
                {['#ffff00', '#00ff00', '#ff0000', '#0000ff'].map(c => (
                    <button
                        key={c}
                        onClick={() => setActiveColor(c)}
                        style={{
                            width: '20px',
                            height: '20px',
                            background: c,
                            border: activeColor === c ? '2px solid black' : '1px solid #ccc',
                            marginRight: '4px',
                            cursor: 'pointer'
                        }}
                    />
                ))}
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid #ccc', paddingLeft: '1rem' }}>
                <strong>Presets:</strong>
                {presets.map(p => (
                    <button
                        key={p.id}
                        title={p.name}
                        onClick={() => {
                            if (p.config.color) setActiveColor(p.config.color)
                            if (p.kind) setActiveTool(p.kind as any)
                        }}
                        style={{
                            width: '20px', height: '20px',
                            background: p.config.color || '#ccc',
                            border: '1px solid #999',
                            cursor: 'pointer',
                            borderRadius: '50%'
                        }}
                    />
                ))}
                <button onClick={async () => {
                    const name = prompt('Preset Name:')
                    if (name) {
                        const newPreset = await createPreset({
                            name,
                            kind: activeTool,
                            config: { color: activeColor },
                            user_id: session!.user.id
                        } as any)
                        setPresets([...presets, newPreset])
                    }
                }}>+</button>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={drawMode} onChange={(e) => setDrawMode(e.target.checked)} />
                    <span>Draw Mode</span>
                </label>
                <button onClick={() => setAnnotations([])}>Clear Marks</button>
            </div>
        </div>
    )


    // if (!session) {
    //     return <Auth />
    // }

    return (
        <div className="app-container">
            <header>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1>Precept Digital (Auth Disabled)</h1>
                    {selection && <button onClick={handleSave}>Save Study</button>}
                    <input
                        value={docTitle}
                        onChange={e => setDocTitle(e.target.value)}
                        placeholder="Study Title"
                        style={{ padding: '4px' }}
                    />
                </div>
                {session ? <button onClick={() => supabase.auth.signOut()}>Sign Out</button> : <p>Signed out</p>}
            </header>
            <Toolbar />
            <div className="main-content" style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                <aside className="sidebar" style={{ width: '300px', borderRight: '1px solid #ddd', padding: '1rem', overflowY: 'auto' }}>
                    <h2>Bible Browser</h2>
                    <BiblePicker onSelectionChange={(t, b, c) => setSelection({ t, b, c })} />
                    <hr />
                    {session && <ExistingDocsList onSelect={(id) => {
                        getDocument(id).then(doc => {
                            setSelection({ t: doc.translation, b: doc.book_id, c: doc.chapter })
                            setAnnotations(doc.annotations || [])
                            setDocId(doc.id)
                            setDocTitle(doc.title)
                        })
                    }} />}
                    {!session && <p>Log in to see your studies</p>}
                </aside>

                <main style={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
                    <div className="bible-viewer-container" style={{
                        position: 'absolute',
                        inset: 0,
                        overflow: 'auto',
                        padding: '2rem',
                        zIndex: drawMode ? 1 : 10,
                        pointerEvents: drawMode ? 'none' : 'auto'
                    }}>
                        <div className="bible-text-wrapper" style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.2rem', paddingBottom: '500px' }}>
                            {selection ? (
                                <BibleViewer
                                    translation={selection.t}
                                    bookId={selection.b}
                                    chapter={selection.c}
                                    annotations={annotations}
                                    onTextSelection={handleTextSelection}
                                />
                            ) : (
                                <h3>Select a chapter to begin...</h3>
                            )}
                        </div>
                    </div>

                    <div className="tldraw-layer" style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: drawMode ? 10 : 1,
                        pointerEvents: drawMode ? 'auto' : 'none',
                        opacity: drawMode ? 1 : 0.5 /* semi transparent when not in focus? */
                    }}>
                        <div className="tldraw-wrapper" style={{ width: '100%', height: '100%' }}>
                            <Tldraw
                                persistenceKey="precept-demo"
                                hideUi={!drawMode}
                                onMount={(editor) => setEditor(editor)}
                            />
                        </div>
                    </div>
                </main>

            </div>
        </div>
    )
}

export default App
