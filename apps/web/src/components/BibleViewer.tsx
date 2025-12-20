import { useState, useEffect } from 'react'
import { Verse, getChapter } from '../lib/api'
import { VerseRenderer } from './VerseRenderer'
import { Annotation } from '@precept/shared'

interface Props {
    translation: string
    bookId: number
    chapter: number
    annotations: Annotation[]
    targetVerse?: number | null
}

export function BibleViewer({ translation, bookId, chapter, annotations, targetVerse }: Props) {
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

    useEffect(() => {
        if (!loading && targetVerse && verses.length > 0) {
            // Wait a tick for DOM to ready
            setTimeout(() => {
                const element = document.querySelector(`[data-verse="${targetVerse}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('verse-highlight-flash');
                    setTimeout(() => element.classList.remove('verse-highlight-flash'), 2000);
                }
            }, 100);
        }
    }, [loading, targetVerse, verses])

    if (loading) return <div>Loading scripture...</div>

    return (
        <div className="bible-content">
            {verses.map(v => (
                <VerseRenderer
                    key={v.pk}
                    verse={v}
                    annotations={annotations}
                />
            ))}
            <style>{`
                @keyframes flash {
                    0% { background-color: rgba(59, 130, 246, 0.2); }
                    100% { background-color: transparent; }
                }
                .verse-highlight-flash {
                    animation: flash 2s ease-out;
                    border-radius: 4px;
                }
            `}</style>
        </div>
    )
}
