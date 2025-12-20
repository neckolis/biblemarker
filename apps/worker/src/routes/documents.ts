import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'

type Bindings = {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware to check auth would be good, but RLS handles data access.
// However, we need the user's JWT to pass to Supabase or we use service role and manually check?
// The requirement says: "Important security rule: never ship Supabase service-role key to the browser; keep it only in Worker env."
// And "Enforce access with RLS so each user can only read/write their own documents".
// If we use service role key here, we bypass RLS unless we set `auth.uid()` or similar.
// Better approach:
// 1. Frontend sends Supabase JWT in Authorization header.
// 2. Worker initializes Supabase client with that JWT (using anon key? or just forwarding it?).
// Actually, if we want RLS to work automatically, we should usually initialize the client with the user's token.
// But the user prompt says "use Supabase service-role key only in Worker".
// So we can use the service role key to CREATE a client, but we must act as the user.
// Supabase Admin Client has `auth.admin.getUser(token)` to verify.
// Then we can use `supabase.auth.setSession()` or similar, BUT `createClient` allows passing specific headers.
// 
// STANDARD WORKER PATTERN:
// Client -> sends Authorization: Bearer <JWT>
// Worker -> createClient(url, anon_key, { global: { headers: { Authorization: <JWT> } } })
// This way RLS works as expected because Supabase sees the user's JWT.
// Wait, do we need the service role key then?
// "never ship Supabase service-role key to the browser" implies we MIGHT need it in the worker for admin tasks,
// or simply that we shouldn't use the anon key for everything if we need privileged access?
// Actually, for RLS to work, we SHOULD use the ANON key + User JWT.
// The prompt says "keep it only in Worker env" about the SERVICE ROLE key.
// Maybe we need it for something specific, or maybe I should just use Anon Key + JWT for standard user actions.
// createSupabaseClient implementation in lib/supabase.ts took url and key.
// I'll update this to extract the JWT from the request header and use it.

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
        .from('defined_documents') // Table name was defined_documents in SQL
        .select('*')
        .order('updated_at', { ascending: false })

    if (error) return c.json({ error: error.message }, 500)
    return c.json(data)
})

app.get('/:id', async (c) => {
    const id = c.req.param('id')
    const jwt = c.req.header('Authorization')!
    // Initialize Supabase client with the USER'S token so RLS applies
    // We can use the ANON key here safely if we pass the JWT.
    // But the prompt implied using the backend to hide keys? 
    // Actually, if we proxy, we can hide the Supabase URL/Anon Key entirely if we want, 
    // by using the Service Role Key but "spoofing" the user? 
    // Standard RLS pattern with Service Role:
    // const supabase = createClient(url, service_role, { auth: { autoRefreshToken: false, persistSession: false } })
    // With RLS, service role bypasses RLS by default!
    // So we MUST NOT use service role for fetching user documents if we rely on RLS.
    // UNLESS we use `db.auth.uids` or similar pg hacks, which Supabase JS doesn't easily expose.
    // 
    // CORRECT APPROACH for "Proxy through Worker":
    // 1. Worker receives request with User JWT.
    // 2. Worker creates client using ANON key (public safe, but we can keep it secret in worker if we want) + User JWT.
    // 3. RLS policies on Postgres enforce access.

    // However, I need the ANON KEY. I'll assume it's in vars or I can simply use the Service Role key and be CAREFUL?
    // No, Service Role bypasses RLS. Bypasing RLS is bad here.
    // I will use `SUPABASE_ANON_KEY` for these requests.
    // I'll assume `SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided.

    // WAIT. The prompt demands: "Enforce access with RLS so each user can only read/write their own documents".
    // If I use Service Role, I bypass RLS.
    // So I MUST use Anon Key + User Token.
    // Why did the prompt mention Service Role? "Important security rule: never ship Supabase service-role key to the browser".
    // This is general advice. It implies we *might* have it in the worker for other things (like admin), but we shouldn't expose it.

    // I will use SUPABASE_ANON_KEY + JWT for these routes.

    // But wait, if we are proxying, the user doesn't need the Anon Key in the browser either?
    // Yes, that's the benefit.

    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, jwt)

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
    const jwt = c.req.header('Authorization')!
    const body = await c.req.json()
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, jwt)

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
    const jwt = c.req.header('Authorization')!
    const { annotations, shapes, ...docUpdates } = await c.req.json()
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, jwt)

    // Update document metadata
    // Upsert annotations
    // Upsert shapes
    // This should ideally be a transaction or batched.

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
