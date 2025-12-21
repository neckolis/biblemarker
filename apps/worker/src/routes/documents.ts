import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'

type Bindings = {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY: string
    ENABLE_AUTH: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', async (c, next) => {
    const authHeader = c.req.header('Authorization')
    const enableAuth = c.env.ENABLE_AUTH === 'true'

    if (enableAuth && !authHeader) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    await next()
})

app.get('/', async (c) => {
    const jwt = c.req.header('Authorization')?.replace('Bearer ', '')
    const apiKey = jwt ? c.env.SUPABASE_ANON_KEY : c.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, apiKey, jwt)

    const { data, error } = await supabase
        .from('defined_documents')
        .select('*')
        .order('updated_at', { ascending: false })

    if (error) return c.json({ error: error.message }, 500)
    return c.json(data)
})

app.get('/:id', async (c) => {
    const id = c.req.param('id')
    const jwt = c.req.header('Authorization')?.replace('Bearer ', '')

    // Choose key: Anon+JWT (User) OR ServiceRole (Admin/Local Dev)
    const apiKey = jwt ? c.env.SUPABASE_ANON_KEY : c.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, apiKey, jwt)

    const { data: doc, error } = await supabase
        .from('defined_documents')
        .select(`
            *,
            annotations (*),
            shapes (*)
        `)
        .eq('id', id)
        .single()

    if (error) return c.json({ error: error.message }, 500)
    return c.json(doc)
})

app.post('/', async (c) => {
    const jwt = c.req.header('Authorization')?.replace('Bearer ', '')
    const apiKey = jwt ? c.env.SUPABASE_ANON_KEY : c.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, apiKey, jwt)

    const body = await c.req.json()

    // Create Document
    const { data, error } = await supabase
        .from('defined_documents')
        .insert(body)
        .select()
        .single()

    if (error) return c.json({ error: error.message }, 500)
    return c.json(data)
})

app.put('/:id', async (c) => {
    const id = c.req.param('id')
    const jwt = c.req.header('Authorization')?.replace('Bearer ', '')
    const apiKey = jwt ? c.env.SUPABASE_ANON_KEY : c.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, apiKey, jwt)

    const { annotations, shapes, ...docUpdates } = await c.req.json()

    const { error: docError } = await supabase
        .from('defined_documents')
        .update(docUpdates)
        .eq('id', id)

    if (docError) return c.json({ error: docError.message }, 500)

    // Handle Annotations
    if (annotations && annotations.length > 0) {
        const { error: annError } = await supabase
            .from('annotations')
            .upsert(annotations)
            .eq('document_id', id) // Extra safety? RLS handles it.
        if (annError) return c.json({ error: annError.message }, 500)
    }

    // Handle Shapes
    if (shapes && shapes.length > 0) {
        const { error: shapeError } = await supabase
            .from('shapes')
            .upsert(shapes)
            .eq('document_id', id)
        if (shapeError) return c.json({ error: shapeError.message }, 500)
    }

    return c.json({ status: 'ok' })
})

export default app
