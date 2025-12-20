// Helper to calculate rects for a range in a text element
export function getRectsForRange(textElement: HTMLElement, startOffset: number, endOffset: number): DOMRect[] {
    const range = document.createRange();
    let currentOffset = 0;
    let startNode: Node | null = null;
    let startNodeOffset = 0;
    let endNode: Node | null = null;
    let endNodeOffset = 0;

    const walker = document.createTreeWalker(textElement, NodeFilter.SHOW_TEXT);
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

// Added a helper for a single unified rect, useful for symbols and avoiding jitter
export function getUnifiedRectForRange(textElement: HTMLElement, startOffset: number, endOffset: number): DOMRect | null {
    const range = document.createRange();
    let currentOffset = 0;
    let startNode: Node | null = null;
    let startNodeOffset = 0;
    let endNode: Node | null = null;
    let endNodeOffset = 0;

    const walker = document.createTreeWalker(textElement, NodeFilter.SHOW_TEXT);
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
        return range.getBoundingClientRect();
    }

    return null;
}
