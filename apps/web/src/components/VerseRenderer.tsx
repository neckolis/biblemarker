import { useRef } from 'react'
import { Verse } from '../lib/api'
import { Annotation } from '@precept/shared'
import { AnnotationLayer } from './AnnotationLayer'

interface Props {
    verse: Verse;
    annotations: Annotation[];
}

export function VerseRenderer({ verse, annotations }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);

    return (
        <div
            ref={containerRef}
            className="verse-container"
            data-verse={verse.verse}
            style={{ position: 'relative', marginBottom: '1.5em', lineHeight: '2.5' }}
        >
            <AnnotationLayer
                verseId={verse.verse}
                annotations={annotations}
                containerRef={containerRef}
                textRef={textRef}
            />
            <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
                <span className="verse-num" style={{ fontWeight: 'bold', marginRight: '0.8em', userSelect: 'none', color: '#94a3b8', fontSize: '0.9rem' }}>
                    {verse.verse}
                </span>
                <span
                    ref={textRef}
                    className="verse-text"
                    style={{ pointerEvents: 'auto' }}
                    dangerouslySetInnerHTML={{ __html: verse.text }}
                />
            </div>
        </div>
    )
}
