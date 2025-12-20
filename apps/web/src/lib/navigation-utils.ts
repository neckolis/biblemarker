import { Book } from './api';

export interface ParsedReference {
    bookId: number;
    chapter: number;
    verse: number | null;
}

export function parseReference(query: string, books: Book[]): ParsedReference | null {
    // Clean query
    const cleanQuery = query.trim().toLowerCase();

    // Regex for: "John 3:16", "1 John 2:1", "John 3", "1 John 2"
    // Handles book names with spaces and numbers
    const regex = /^(.+?)\s+(\d+)(?::(\d+))?$/;
    const match = cleanQuery.match(regex);

    if (!match) {
        // Try just a book name?
        const book = books.find(b => b.name.toLowerCase() === cleanQuery);
        if (book) return { bookId: book.bookid, chapter: 1, verse: null };
        return null;
    }

    const bookName = match[1];
    const chapter = parseInt(match[2]);
    const verse = match[3] ? parseInt(match[3]) : null;

    // Find the best matching book
    // 1. Exact match
    let book = books.find(b => b.name.toLowerCase() === bookName);

    // 2. Starts with (e.g. "Gen" for "Genesis")
    if (!book) {
        book = books.find(b => b.name.toLowerCase().startsWith(bookName));
    }

    if (!book) return null;

    return {
        bookId: book.bookid,
        chapter: Math.min(chapter, book.chapters),
        verse
    };
}
