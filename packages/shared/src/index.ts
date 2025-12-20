export interface Annotation {
    id: string;
    document_id: string;
    user_id: string;
    type: 'highlight' | 'underline' | 'circle' | 'box'; // 'circle'/'box' might be shapes, but if text-anchored they are here.
    color: string;
    style?: string; // e.g. 'double', 'wavy' for underline
    verse: number;
    start_offset: number;
    end_offset: number;
    created_at?: string;
}

export interface Document {
    id: string;
    translation: string;
    book_id: number;
    chapter: number;
    title: string;
}

export interface Preset {
    id: string;
    name: string;
    kind: 'highlight' | 'underline' | 'shape';
    config: any;
}
