import { useState, useEffect } from 'react'
import { Translation, Book, getTranslations, getBooks } from '../lib/api'

interface Props {
    onSelectionChange: (translation: string, bookId: number, chapter: number) => void
}

export function BiblePicker({ onSelectionChange }: Props) {
    const [translations, setTranslations] = useState<Translation[]>([])
    const [books, setBooks] = useState<Book[]>([])

    const [selectedTranslation, setSelectedTranslation] = useState<string>('')
    const [selectedBook, setSelectedBook] = useState<Book | null>(null)
    const [selectedChapter, setSelectedChapter] = useState<number>(1)

    useEffect(() => {
        getTranslations().then(data => {
            setTranslations(data)
            if (data.length > 0) setSelectedTranslation(data[0].slug)
        })
    }, [])

    useEffect(() => {
        if (selectedTranslation) {
            getBooks(selectedTranslation).then(data => {
                setBooks(data)
                if (data.length > 0) setSelectedBook(data[0])
            })
        }
    }, [selectedTranslation])

    const handleGo = () => {
        if (selectedTranslation && selectedBook) {
            onSelectionChange(selectedTranslation, selectedBook.bookid, selectedChapter)
        }
    }

    return (
        <div className="bible-picker">
            <div className="field">
                <label>Translation</label>
                <select value={selectedTranslation} onChange={e => setSelectedTranslation(e.target.value)}>
                    {translations.map(t => <option key={t.slug} value={t.slug}>{t.slug}</option>)}
                </select>
            </div>

            <div className="field">
                <label>Book</label>
                <select value={selectedBook?.bookid || ''} onChange={e => {
                    const b = books.find(b => b.bookid === parseInt(e.target.value))
                    setSelectedBook(b || null)
                    setSelectedChapter(1)
                }}>
                    {books.map(b => <option key={b.bookid} value={b.bookid}>{b.name}</option>)}
                </select>
            </div>

            {selectedBook && (
                <div className="field">
                    <label>Chapter</label>
                    <select value={selectedChapter} onChange={e => setSelectedChapter(parseInt(e.target.value))}>
                        {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            )}

            <button onClick={handleGo} style={{ marginTop: '1rem', width: '100%' }}>Go</button>
        </div>
    )
}
