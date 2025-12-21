import { supabase } from './supabase'

const API_BASE = '/api' // Relative path because served from same Worker

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

export async function getTranslations(): Promise<Translation[]> {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: any = {}
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`

    const res = await fetch(`${API_BASE}/translations`, { headers })
    if (!res.ok) throw new Error('Failed to fetch translations')
    return res.json()
}

export async function getBooks(translation: string): Promise<Book[]> {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: any = {}
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`

    const res = await fetch(`${API_BASE}/books?translation=${translation}`, { headers })
    if (!res.ok) throw new Error('Failed to fetch books')
    return res.json()
}

export async function getChapter(translation: string, bookId: number, chapter: number): Promise<Verse[]> {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: any = {}
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`

    const res = await fetch(`${API_BASE}/chapters?translation=${translation}&book=${bookId}&chapter=${chapter}`, { headers })
    if (!res.ok) throw new Error('Failed to fetch chapter')
    return res.json()
}

export async function searchScripture(translation: string, query: string): Promise<any[]> {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: any = {}
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`

    const res = await fetch(`${API_BASE}/search?translation=${translation}&query=${encodeURIComponent(query)}`, { headers })
    if (!res.ok) throw new Error('Failed to search scripture')
    return res.json()
}

export async function getLexicon(dict: 'BDBT' | 'RUSD', query: string): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: any = {}
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`

    const res = await fetch(`${API_BASE}/lexicon?dict=${dict}&query=${encodeURIComponent(query)}`, { headers })
    if (!res.ok) throw new Error('Failed to fetch lexicon')
    return res.json()
}

export async function analyzeWord(params: {
    translation: string;
    book: string;
    chapter: number;
    verse: number;
    verseText: string;
    clickedText: string;
    clickedStart: number;
    clickedEnd: number;
    surroundingContext?: { verse: number; text: string }[];
}): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: any = { 'Content-Type': 'application/json' }
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`

    const res = await fetch(`${API_BASE}/research/analyze-word`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
    })
    if (!res.ok) throw new Error('Analysis failed')
    return res.json()
}

export async function aiChat(params: {
    context: {
        translation: string;
        book: string;
        chapter: number;
        verse?: number;
        verseText: string;
        activeAnalysis?: any;
    };
    message: string;
    history?: any[];
}): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: any = { 'Content-Type': 'application/json' }
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`

    const res = await fetch(`${API_BASE}/research/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
    })
    if (!res.ok) throw new Error('Chat failed')
    return res.json()
}

