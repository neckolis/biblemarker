// Helper to calculate rects for a range in a verse element
export function getRectsForRange(verseElement: HTMLElement, startOffset: number, endOffset: number): DOMRect[] {
    // This is tricky because the verse element contains HTML children (e.g. <i>).
    // range.setStart/End needs identifying the correct text node and offset.
    // Simplifying assumption: We traverse text nodes to find the offsets.

    const range = document.createRange();
    let currentOffset = 0;
    let startNode: Node | null = null;
    let startNodeOffset = 0;
    let endNode: Node | null = null;
    let endNodeOffset = 0;

    const walker = document.createTreeWalker(verseElement, NodeFilter.SHOW_TEXT);
    let node: Node | null;

    while ((node = walker.nextNode())) {
        const len = node.textContent?.length || 0;

        if (!startNode && currentOffset + len >= startOffset) {
            startNode = node;
            startNodeOffset = startOffset - currentOffset;
        }

        if (!endNode && currentOffset + len >= endOffset) {
            endNode = node;
            endNodeOffset = endOffset - currentOffset;
            break;
        }

        currentOffset += len;
    }

    if (startNode && endNode) {
        range.setStart(startNode, startNodeOffset);
        range.setEnd(endNode, endNodeOffset);
        return Array.from(range.getClientRects());
    }

    return [];
}
