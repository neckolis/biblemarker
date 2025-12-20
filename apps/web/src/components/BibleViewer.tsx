import { useState, useEffect } from 'react'
import { Verse, getChapter } from '../lib/api'
import { VerseRenderer } from './VerseRenderer'
import { Annotation } from '@precept/shared'

interface Props {
    translation: string
    bookId: number
    chapter: number
    annotations: Annotation[] // Pass in from parent (App)
    onTextSelection: (verseId: number, start: number, end: number) => void
}

export function BibleViewer({ translation, bookId, chapter, annotations, onTextSelection }: Props) {
    const [verses, setVerses] = useState<Verse[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!translation || !bookId || !chapter) return

        setLoading(true)
        getChapter(translation, bookId, chapter)
            .then(setVerses)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [translation, bookId, chapter])

    if (loading) return <div>Loading scripture...</div>

    return (
        <div className="bible-content">
            {verses.map(v => (
                <VerseRenderer
                    key={v.pk}
                    verse={v}
                    annotations={annotations}
                    onSelection={onTextSelection}
                />
            ))}
        </div>
    )
}
