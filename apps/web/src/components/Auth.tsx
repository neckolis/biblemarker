import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault()
        setLoading(true)
        const { error } = await supabase.auth.signInWithOtp({ email })
        if (error) {
            alert(error.message)
        } else {
            setSent(true)
        }
        setLoading(false)
    }

    return (
        <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="card" style={{ padding: '2rem', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px', width: '100%' }}>
                <h1 className="header">Inductive Bible AI</h1>
                <p className="description">Sign in via magic link to access your studies.</p>

                {sent ? (
                    <div style={{ color: 'green', marginTop: '1rem' }}>
                        Check your email for the login link!
                    </div>
                ) : (
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '1rem' }}>
                            <input
                                className="inputField"
                                type="email"
                                placeholder="Your email"
                                value={email}
                                required={true}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
                            />
                        </div>
                        <div>
                            <button className={'button block'} disabled={loading} style={{ width: '100%', padding: '0.5rem', cursor: 'pointer' }}>
                                {loading ? <span>Loading</span> : <span>Send magic link</span>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
