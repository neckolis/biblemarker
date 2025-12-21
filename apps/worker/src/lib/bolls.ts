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

const ALLOWED_SLUGS = ['ESV', 'NASB', 'NLT', 'KJV', 'WLC', 'WLCa', 'SBLGNT', 'TISCH'];

export class BollsClient {
    private baseUrl = 'https://bolls.life';
    private cache: KVNamespace | null;

    constructor(cache?: KVNamespace) {
        this.cache = cache || null;
    }

    async getTranslations(): Promise<Translation[]> {
        return [
            { slug: 'ESV', name: 'English Standard Version' },
            { slug: 'NASB', name: 'New American Standard Bible' },
            { slug: 'NLT', name: 'New Living Translation' },
            { slug: 'KJV', name: 'King James Version (with Strongs)' },
        ];
    }

    private isAllowed(slug: string): boolean {
        return ALLOWED_SLUGS.includes(slug);
    }

    async getBooks(translation: string): Promise<Book[]> {
        if (!this.isAllowed(translation)) {
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

        if (this.cache) {
            await this.cache.put(cacheKey, JSON.stringify(data), { expirationTtl: 86400 * 7 }); // 1 week
        }

        return data;
    }

    async getChapter(translation: string, bookId: number, chapter: number): Promise<Verse[]> {
        if (!this.isAllowed(translation)) {
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

    async search(translation: string, query: string): Promise<any[]> {
        if (!this.isAllowed(translation)) {
            throw new Error('Translation not allowed');
        }

        const res = await fetch(`${this.baseUrl}/v2/find/${translation}/?search=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Failed to search');
        return res.json();
    }

    async getLexiconDefinition(dict: string, query: string): Promise<any> {
        if (!['BDBT', 'RUSD'].includes(dict)) {
            throw new Error('Invalid dictionary');
        }

        const cacheKey = `lexicon:${dict}:${query}`;
        if (this.cache) {
            const cached = await this.cache.get(cacheKey, 'json');
            if (cached) return cached;
        }

        const res = await fetch(`${this.baseUrl}/dictionary-definition/${dict}/${encodeURIComponent(query)}/`);
        if (!res.ok) throw new Error('Failed to fetch lexicon definition');
        const data = await res.json();

        if (this.cache) {
            await this.cache.put(cacheKey, JSON.stringify(data), { expirationTtl: 86400 * 30 }); // 30 days
        }

        return data;
    }
}

