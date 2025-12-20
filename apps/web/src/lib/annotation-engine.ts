import { Annotation, AnnotationStyle } from '@precept/shared';
import { getSelectionRange } from './selection-utils';

export function getSelectedAnnotations(
    docId: string,
    userId: string,
    style: AnnotationStyle,
    color?: string,
    explicitRange?: Range
): Annotation[] {
    const selection = window.getSelection();
    const rangeToUse = explicitRange || (selection && !selection.isCollapsed ? selection.getRangeAt(0) : null);

    if (!rangeToUse) return [];

    const annotations: Annotation[] = [];
    // Target the isolated text specifically to avoid counting symbols in offsets
    const textElements = document.querySelectorAll('.verse-text');

    textElements.forEach((el) => {
        const textEl = el as HTMLElement;
        const verseEl = textEl.closest('.verse-container') as HTMLElement | null;
        if (!verseEl) return;

        const verseNumber = parseInt(verseEl.dataset.verse || '0');
        if (!verseNumber) return;

        const range = getSelectionRange(textEl, rangeToUse);
        if (range && range.start !== range.end) {
            annotations.push({
                id: crypto.randomUUID(),
                document_id: docId,
                user_id: userId,
                style,
                color,
                verse: verseNumber,
                start_offset: range.start,
                end_offset: range.end,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }
    });

    return annotations;
}

export function applyAnnotationSmart(
    currentAnnotations: Annotation[],
    newAnns: Annotation[]
): Annotation[] {
    let updated = [...currentAnnotations];

    newAnns.forEach(newAnn => {
        if (newAnn.style === 'symbol') {
            updated = updated.filter(a =>
                !(a.verse === newAnn.verse &&
                    a.start_offset === newAnn.start_offset &&
                    a.end_offset === newAnn.end_offset &&
                    a.style === 'symbol')
            );
        }
        updated.push(newAnn);
    });

    return updated;
}

export function clearIntersectingAnnotations(
    currentAnnotations: Annotation[],
    explicitRange?: Range
): Annotation[] {
    const selection = window.getSelection();
    const rangeToUse = explicitRange || (selection && !selection.isCollapsed ? selection.getRangeAt(0) : null);

    if (!rangeToUse) return currentAnnotations;

    const textElements = document.querySelectorAll('.verse-text');
    const toRemove: Set<string> = new Set();

    textElements.forEach((el) => {
        const textEl = el as HTMLElement;
        const verseEl = textEl.closest('.verse-container') as HTMLElement | null;
        if (!verseEl) return;

        const verseNumber = parseInt(verseEl.dataset.verse || '0');
        if (!verseNumber) return;

        const range = getSelectionRange(textEl, rangeToUse);
        if (!range) return;

        currentAnnotations
            .filter((a) => a.verse === verseNumber)
            .forEach((a) => {
                const intersects = Math.max(a.start_offset, range.start) < Math.min(a.end_offset, range.end);
                if (intersects) {
                    toRemove.add(a.id);
                }
            });
    });

    return currentAnnotations.filter((a) => !toRemove.has(a.id));
}
