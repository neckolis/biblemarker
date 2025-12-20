import { useState, useEffect } from 'react'
import { Translation, Book, getTranslations, getBooks } from '../lib/api'

interface Props {
    onSelectionChange: (translation: string, bookId: number, chapter: number) => void
    initialSelection?: { t: string, b: number, c: number } | null
}

export function BiblePicker({ onSelectionChange, initialSelection }: Props) {
    const [translations, setTranslations] = useState<Translation[]>([])
    const [books, setBooks] = useState<Book[]>([])

    const [selectedTranslation, setSelectedTranslation] = useState<string>(() => {
        if (initialSelection?.t) return initialSelection.t;
        return localStorage.getItem('precept_default_translation') || 'NASB';
    })
    const [selectedBookId, setSelectedBookId] = useState<number>(initialSelection?.b || 0)
    const [selectedChapter, setSelectedChapter] = useState<number>(initialSelection?.c || 1)

    useEffect(() => {
        getTranslations().then(data => {
            setTranslations(data)
            // If we have data and NO selection currently (unlikely with our state init), 
            // we'd fallback, but the lazy initializer handles it.
        }).catch(console.error)
    }, [])

    useEffect(() => {
        if (selectedTranslation) {
            localStorage.setItem('precept_default_translation', selectedTranslation);
            getBooks(selectedTranslation).then(data => {
                setBooks(data)
                if (data.length > 0 && (!selectedBookId || !data.find(b => b.bookid === selectedBookId))) {
                    setSelectedBookId(data[0].bookid)
                    setSelectedChapter(1)
                }
            }).catch(console.error)
        }
    }, [selectedTranslation])

    useEffect(() => {
        if (initialSelection) {
            setSelectedTranslation(initialSelection.t)
            setSelectedBookId(initialSelection.b)
            setSelectedChapter(initialSelection.c)
        }
    }, [initialSelection])

    const handleApply = () => {
        if (selectedTranslation && selectedBookId) {
            onSelectionChange(selectedTranslation, selectedBookId, selectedChapter)
        }
    }

    const selectedBook = books.find(b => b.bookid === selectedBookId)

    return (
        <div className="bible-picker-horizontal">
            <div className="field-group">
                <select
                    value={selectedTranslation}
                    onChange={e => setSelectedTranslation(e.target.value)}
                    className="picker-select"
                >
                    <option value="" disabled>Translation</option>
                    {translations.map(t => <option key={t.slug} value={t.slug}>{t.slug.toUpperCase()}</option>)}
                </select>

                <select
                    value={selectedBookId || ''}
                    onChange={e => {
                        const id = parseInt(e.target.value)
                        setSelectedBookId(id)
                        setSelectedChapter(1)
                    }}
                    className="picker-select"
                >
                    <option value="" disabled>Book</option>
                    {books.map(b => <option key={b.bookid} value={b.bookid}>{b.name}</option>)}
                </select>

                {selectedBook && (
                    <select
                        value={selectedChapter}
                        onChange={e => setSelectedChapter(parseInt(e.target.value))}
                        className="picker-select chapter-select"
                    >
                        {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(c => (
                            <option key={c} value={c}>Ch {c}</option>
                        ))}
                    </select>
                )}

                <button onClick={handleApply} className="btn-go">Go</button>
            </div>

            <style>{`
                .bible-picker-horizontal {
                    display: flex;
                    align-items: center;
                }
                .field-group {
                    display: flex;
                    gap: 8px;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                .picker-select {
                    background: transparent;
                    border: none;
                    padding: 6px 10px;
                    font-family: inherit;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: #1e293b;
                    cursor: pointer;
                    outline: none;
                    border-radius: 6px;
                    transition: background 0.2s;
                }
                .picker-select:hover {
                    background: rgba(255,255,255,0.5);
                }
                .chapter-select {
                    width: 70px;
                }
                .btn-go {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 6px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-go:hover {
                    filter: brightness(1.1);
                    transform: scale(1.02);
                }
            `}</style>
        </div>
    )
}
