import { useRef } from 'react'
import { Verse } from '../lib/api'
import { Annotation } from '@precept/shared'
import { AnnotationLayer } from './AnnotationLayer'
import { getSelectionRange } from '../lib/selection-utils'

interface Props {
    verse: Verse;
    annotations: Annotation[];
    onSelection: (verseId: number, start: number, end: number) => void;
}

export function VerseRenderer({ verse, annotations, onSelection }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseUp = () => {
        if (!containerRef.current) return;
        const range = getSelectionRange(containerRef.current);
        if (range) {
            onSelection(verse.verse, range.start, range.end);
        }
    }

    return (
        <div
            ref={containerRef}
            className="verse-container"
            data-verse={verse.verse}
            style={{ position: 'relative', marginBottom: '1em', lineHeight: '2.5' }}
            onMouseUp={handleMouseUp}
        >
            <AnnotationLayer
                verseId={verse.verse}
                annotations={annotations}
                containerRef={containerRef}
            />
            {/* Text Layer - must be on top of annotations but below connection lines if we had them. 
                transparent annotations are behind.
            */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <span className="verse-num" style={{ fontWeight: 'bold', marginRight: '0.5em', userSelect: 'none', color: '#666' }}>
                    {verse.verse}
                </span>
                <span
                    className="verse-text"
                    dangerouslySetInnerHTML={{ __html: verse.text }}
                />
            </div>
        </div>
    )
}
