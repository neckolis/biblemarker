import { supabase } from './supabase'
import { Document, Annotation } from '@precept/shared'

const API_BASE = '/api'

export async function getDocuments() {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${API_BASE}/documents`, {
        headers: {
            'Authorization': `Bearer ${session?.access_token}`
        }
    })
    if (!res.ok) return [];
    return res.json()
}

export async function getDocument(id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${API_BASE}/documents/${id}`, {
        headers: {
            'Authorization': `Bearer ${session?.access_token}`
        }
    })
    if (!res.ok) throw new Error('Failed to fetch document')
    return res.json()
}

export async function saveDocument(doc: Partial<Document>, annotations: Annotation[]) {
    const { data: { session } } = await supabase.auth.getSession()

    const isNew = !doc.id;
    const method = isNew ? 'POST' : 'PUT';
    const url = isNew ? `${API_BASE}/documents` : `${API_BASE}/documents/${doc.id}`;

    const body = {
        ...doc,
        user_id: session?.user.id,
        annotations,
    }

    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(body)
    })

    if (!res.ok) throw new Error('Failed to save document')
    return res.json()
}
