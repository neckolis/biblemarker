export type AnnotationStyle = 'highlight' | 'underline' | 'double-underline' | 'symbol';

export interface Annotation {
    id: string;
    document_id: string;
    user_id: string;
    style: AnnotationStyle;
    color?: string; // primarily for highlight
    verse: number;
    start_offset: number;
    end_offset: number;
    created_at: string;
    updated_at: string;
}

export interface Document {
    id: string;
    translation: string;
    book_id: number;
    chapter: number;
    title: string;
    user_id: string;
    annotations?: Annotation[];
    shapes?: any[];
}

export interface Preset {
    id: string;
    name: string;
    kind: 'highlight' | 'underline' | 'shape';
    config: any;
}

export * from './commands';
