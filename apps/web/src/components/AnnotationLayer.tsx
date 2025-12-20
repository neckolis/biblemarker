import { useEffect, useState, useMemo } from 'react';
import { Annotation } from '@precept/shared';
import { getRectsForRange, getUnifiedRectForRange } from '../lib/annotation-utils';

interface Props {
    verseId: number;
    annotations: Annotation[];
    containerRef: React.RefObject<HTMLElement>;
    textRef: React.RefObject<HTMLElement>;
}

interface MarkupItem {
    id: string;
    rects: DOMRect[];
    unifiedRect: DOMRect | null;
    color?: string;
    style: string;
}

export function AnnotationLayer({ verseId, annotations, containerRef, textRef }: Props) {
    const [markup, setMarkup] = useState<MarkupItem[]>([]);

    useEffect(() => {
        const updateRects = () => {
            const verseEl = containerRef.current;
            const textEl = textRef.current;
            if (!verseEl || !textEl) return;

            const verseRect = verseEl.getBoundingClientRect();

            const calculated = annotations
                .filter((a) => a.verse === verseId)
                .map((a) => {
                    // Measure relative to the isolated text element
                    const rangeRects = getRectsForRange(textEl, a.start_offset, a.end_offset);
                    const unifiedRectRaw = getUnifiedRectForRange(textEl, a.start_offset, a.end_offset);

                    const relativeRects = rangeRects.map((r) => ({
                        top: r.top - verseRect.top,
                        left: r.left - verseRect.left,
                        width: r.width,
                        height: r.height,
                    } as DOMRect));

                    const relativeUnified = unifiedRectRaw ? ({
                        top: unifiedRectRaw.top - verseRect.top,
                        left: unifiedRectRaw.left - verseRect.left,
                        width: unifiedRectRaw.width,
                        height: unifiedRectRaw.height,
                    } as DOMRect) : null;

                    return {
                        id: a.id,
                        rects: relativeRects,
                        unifiedRect: relativeUnified,
                        color: a.color,
                        style: a.style
                    };
                });

            setMarkup(calculated);
        };

        updateRects();
        window.addEventListener('resize', updateRects);

        const scrollContainer = containerRef.current?.closest('.bible-viewer-container');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', updateRects);
            return () => {
                window.removeEventListener('resize', updateRects);
                scrollContainer.removeEventListener('scroll', updateRects);
            };
        }

        return () => window.removeEventListener('resize', updateRects);
    }, [verseId, annotations, containerRef, textRef]);

    const symbols = useMemo(() => markup.filter(m => m.style === 'symbol'), [markup]);
    const nonSymbols = useMemo(() => markup.filter(m => m.style !== 'symbol'), [markup]);

    return (
        <div className="annotation-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
            {nonSymbols.map((item) => (
                <div key={item.id} className={`annotation-item style-${item.style}`}>
                    {item.rects.map((r, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                top: r.top,
                                left: r.left,
                                width: r.width,
                                height: r.height,
                                backgroundColor: item.style === 'highlight' ? item.color : 'transparent',
                                opacity: item.style === 'highlight' ? 0.35 : 1,
                                borderBottom: (item.style === 'underline' || item.style === 'double-underline')
                                    ? `2px solid ${item.color || '#3b82f6'}`
                                    : 'none',
                            }}
                        >
                            {item.style === 'double-underline' && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '-4px',
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        backgroundColor: item.color || '#3b82f6',
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            ))}

            {symbols.map((item) => {
                if (!item.unifiedRect) return null;

                return (
                    <div
                        key={item.id}
                        className="symbol-item"
                        style={{
                            position: 'absolute',
                            top: item.unifiedRect.top - 28,
                            left: item.unifiedRect.left + (item.unifiedRect.width / 2),
                            transform: 'translateX(-50%)',
                            fontSize: '1.4rem',
                            lineHeight: 1,
                            zIndex: 2,
                            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {item.color}
                    </div>
                );
            })}
        </div>
    );
}
