export interface Translation {
    slug: string;
    name: string;
}

export interface Book {
    bookid: number;
    name: string;
    chapters: number;
}

export interface Verse {
    pk: number;
    verse: number;
    text: string;
}

const ALLOWED_TRANSLATIONS = ['ESV', 'NASB', 'NLT'];

export class BollsClient {
    private baseUrl = 'https://bolls.life';
    private cache: KVNamespace | null;

    constructor(cache?: KVNamespace) {
        this.cache = cache || null;
    }

    async getTranslations(): Promise<Translation[]> {
        // In a real app, I'd check bolls.life/static/translations.json,
        // but we have a strict requirement to only show ESV, NASB, NLT.
        // So we just return these hardcoded, or fetch to verify existence if needed.
        // But bolls.life API is simple enough we can just map slugs.
        return [
            { slug: 'ESV', name: 'English Standard Version' },
            { slug: 'NASB', name: 'New American Standard Bible' },
            { slug: 'NLT', name: 'New Living Translation' },
        ];
    }

    async getBooks(translation: string): Promise<Book[]> {
        if (!ALLOWED_TRANSLATIONS.includes(translation)) {
            throw new Error('Translation not allowed');
        }

        const cacheKey = `books:${translation}`;
        if (this.cache) {
            const cached = await this.cache.get(cacheKey, 'json');
            if (cached) return cached as Book[];
        }

        const res = await fetch(`${this.baseUrl}/get-books/${translation}/`);
        if (!res.ok) throw new Error('Failed to fetch books');
        const data = await res.json() as Book[];

        // Sort or filter if needed? Bolls usually returns standard order.

        if (this.cache) {
            await this.cache.put(cacheKey, JSON.stringify(data), { expirationTtl: 86400 * 7 }); // 1 week
        }

        return data;
    }

    async getChapter(translation: string, bookId: number, chapter: number): Promise<Verse[]> {
        if (!ALLOWED_TRANSLATIONS.includes(translation)) {
            throw new Error('Translation not allowed');
        }

        const cacheKey = `chapter:${translation}:${bookId}:${chapter}`;
        if (this.cache) {
            const cached = await this.cache.get(cacheKey, 'json');
            if (cached) return cached as Verse[];
        }

        const res = await fetch(`${this.baseUrl}/get-text/${translation}/${bookId}/${chapter}/`);
        if (!res.ok) throw new Error('Failed to fetch chapter');
        const data = await res.json() as Verse[];

        if (this.cache) {
            await this.cache.put(cacheKey, JSON.stringify(data), { expirationTtl: 86400 * 30 }); // 30 days
        }

        return data;
    }
}
