// Helper to get selection relative to a text element
export function getSelectionRange(textElement: HTMLElement, explicitRange?: Range): { start: number, end: number } | null {
    const selection = window.getSelection();
    const range = explicitRange || (selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null);

    if (!range) return null;

    // Check if the textElement contains either the start or end of the range
    const isStartInVerse = textElement.contains(range.startContainer);
    const isEndInVerse = textElement.contains(range.endContainer);

    // If the selection doesn't touch this text element at all, skip.
    if (!isStartInVerse && !isEndInVerse) {
        const textRange = document.createRange();
        textRange.selectNode(textElement);
        const startsBefore = range.compareBoundaryPoints(Range.START_TO_START, textRange) <= 0;
        const endsAfter = range.compareBoundaryPoints(Range.END_TO_END, textRange) >= 0;
        if (!(startsBefore && endsAfter)) return null;
    }

    let start = 0;
    let end = 0;

    const walker = document.createTreeWalker(textElement, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    let currentOffset = 0;
    let foundStart = isStartInVerse ? false : true;
    let foundEnd = isEndInVerse ? false : true;

    if (!isStartInVerse) {
        start = 0;
    }

    while ((node = walker.nextNode())) {
        const len = node.textContent?.length || 0;

        if (!foundStart && node === range.startContainer) {
            start = currentOffset + range.startOffset;
            foundStart = true;
        }

        if (!foundEnd && node === range.endContainer) {
            end = currentOffset + range.endOffset;
            foundEnd = true;
        }

        currentOffset += len;
        if (foundStart && foundEnd) break;
    }

    if (!isEndInVerse) {
        end = currentOffset;
    }

    return { start, end };
}
