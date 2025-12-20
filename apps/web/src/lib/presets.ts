// Basic presets API
import { supabase } from './supabase'
import { Preset } from '@precept/shared'

const API_BASE = '/api'

export async function getPresets() {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${API_BASE}/presets`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
    })
    return res.ok ? res.json() : []
}

export async function createPreset(preset: Omit<Preset, 'id'>) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${API_BASE}/presets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ ...preset, user_id: session?.user.id })
    })
    return res.json()
}
