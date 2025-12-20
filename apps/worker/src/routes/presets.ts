import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'

type Bindings = {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', async (c, next) => {
    const jwt = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!jwt) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    await next()
})

app.get('/', async (c) => {
    const jwt = c.req.header('Authorization')!
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, jwt)

    const { data, error } = await supabase
        .from('presets')
        .select('*')

    if (error) return c.json({ error: error.message }, 500)
    return c.json(data)
})

app.post('/', async (c) => {
    const jwt = c.req.header('Authorization')!
    const body = await c.req.json()
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, jwt)

    const { data, error } = await supabase
        .from('presets')
        .insert(body)
        .select()
        .single()

    if (error) return c.json({ error: error.message }, 500)
    return c.json(data)
})

app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const jwt = c.req.header('Authorization')!
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, jwt)

    const { error } = await supabase
        .from('presets')
        .delete()
        .eq('id', id)

    if (error) return c.json({ error: error.message }, 500)
    return c.json({ status: 'ok' })
})

export default app
