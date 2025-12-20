import { useEffect, useState } from 'react'
import { Annotation } from '@precept/shared'
import { getRectsForRange } from '../lib/annotation-utils'

interface Props {
    verseId: number;
    annotations: Annotation[];
    containerRef: React.RefObject<HTMLElement>;
}

export function AnnotationLayer({ verseId, annotations, containerRef }: Props) {
    const [rects, setRects] = useState<{ id: string, rects: DOMRect[], color: string, type: string }[]>([])

    // Re-calculate rects on alignment/resize
    useEffect(() => {
        const updateRects = () => {
            const verseEl = containerRef.current;
            if (!verseEl) return;

            const calculated = annotations.filter(a => a.verse === verseId).map(a => {
                const rangeRects = getRectsForRange(verseEl, a.start_offset, a.end_offset);

                // rangeRects are relative to VIEWPORT. We need them relative to the verse element (for absolute positioning)
                // Or we just render fixed/absolute overlay on top of everything?
                // If we render inside the verse element (relative), we need to offset by verseEl.getBoundingClientRect()

                const verseRect = verseEl.getBoundingClientRect();
                const textRects = rangeRects.map(r => {
                    return {
                        top: r.top - verseRect.top,
                        left: r.left - verseRect.left,
                        width: r.width,
                        height: r.height
                    } as DOMRect
                });

                return { id: a.id, rects: textRects, color: a.color, type: a.type };
            });

            setRects(calculated);
        };

        // Initial calc
        updateRects();

        // Resize observer? Or just window resize
        window.addEventListener('resize', updateRects);
        return () => window.removeEventListener('resize', updateRects);
    }, [verseId, annotations, containerRef]);

    return (
        <div className="annotation-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {rects.map(group => (
                <div key={group.id}>
                    {group.rects.map((r, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            top: r.top,
                            left: r.left,
                            width: r.width,
                            height: r.height,
                            backgroundColor: group.type === 'highlight' ? group.color : 'transparent',
                            opacity: 0.3,
                            borderBottom: group.type === 'underline' ? `2px solid ${group.color}` : 'none'
                        }} />
                    ))}
                </div>
            ))}
        </div>
    )
}
