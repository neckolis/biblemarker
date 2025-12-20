// Helper to get selection relative to a verse
export function getSelectionRange(verseElement: HTMLElement): { start: number, end: number } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);

    // Check if selection is within the verse
    if (!verseElement.contains(range.commonAncestorContainer)) return null;

    // Calculate global offset relative to verse
    // This is the reverse of the setStart logic in annotation-utils

    let start = 0;
    let end = 0;

    const walker = document.createTreeWalker(verseElement, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    let currentOffset = 0;
    let foundStart = false;
    let foundEnd = false;

    while ((node = walker.nextNode())) {
        const len = node.textContent?.length || 0;

        if (!foundStart) {
            if (node === range.startContainer) {
                start = currentOffset + range.startOffset;
                foundStart = true;
            } else {
                // Check if start container is an ancestor? No, range.startContainer is usually text node.
            }
        }

        if (!foundEnd) {
            if (node === range.endContainer) {
                end = currentOffset + range.endOffset;
                foundEnd = true;
            }
        }

        // Safety: If we passed the nodes without finding them (which shouldn't happen if contained), break?

        currentOffset += len;
        if (foundStart && foundEnd) break;
    }

    if (foundStart && foundEnd) {
        return { start, end };
    }

    return null;
}
