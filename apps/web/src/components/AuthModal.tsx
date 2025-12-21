import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    if (!isOpen) return null

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) throw error
                onClose()
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                })
                if (error) throw error
                setMessage('Check your email for a confirmation link!')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleAuth = async () => {
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            })
            if (error) throw error
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={e => e.stopPropagation()}>
                <button className="auth-close" onClick={onClose}>×</button>

                <h2>{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</h2>

                {/* Google OAuth Button */}
                <button
                    className="auth-google-btn"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="auth-input"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="auth-input"
                    />

                    {error && <p className="auth-error">{error}</p>}
                    {message && <p className="auth-message">{message}</p>}

                    <button
                        type="submit"
                        className="auth-submit-btn"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                <p className="auth-toggle">
                    {mode === 'signin' ? (
                        <>Don't have an account? <button onClick={() => setMode('signup')}>Sign Up</button></>
                    ) : (
                        <>Already have an account? <button onClick={() => setMode('signin')}>Sign In</button></>
                    )}
                </p>

                <style>{`
                    .auth-modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        backdrop-filter: blur(4px);
                    }
                    .auth-modal {
                        background: white;
                        padding: 2.5rem;
                        border-radius: 16px;
                        width: 100%;
                        max-width: 400px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                        position: relative;
                    }
                    .auth-close {
                        position: absolute;
                        top: 1rem;
                        right: 1rem;
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        cursor: pointer;
                        color: #64748b;
                    }
                    .auth-modal h2 {
                        margin: 0 0 1.5rem;
                        text-align: center;
                        color: #1e293b;
                    }
                    .auth-google-btn {
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        background: white;
                        font-size: 1rem;
                        font-weight: 500;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        transition: background 0.2s;
                    }
                    .auth-google-btn:hover {
                        background: #f8fafc;
                    }
                    .auth-google-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                    .auth-divider {
                        display: flex;
                        align-items: center;
                        margin: 1.5rem 0;
                    }
                    .auth-divider::before,
                    .auth-divider::after {
                        content: '';
                        flex: 1;
                        height: 1px;
                        background: #e2e8f0;
                    }
                    .auth-divider span {
                        padding: 0 1rem;
                        color: #94a3b8;
                        font-size: 0.875rem;
                    }
                    .auth-input {
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        font-size: 1rem;
                        margin-bottom: 12px;
                        outline: none;
                        box-sizing: border-box;
                    }
                    .auth-input:focus {
                        border-color: #3b82f6;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    }
                    .auth-submit-btn {
                        width: 100%;
                        padding: 12px;
                        background: #1e293b;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    .auth-submit-btn:hover {
                        background: #334155;
                    }
                    .auth-submit-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                    .auth-error {
                        color: #dc2626;
                        font-size: 0.875rem;
                        margin: 0 0 12px;
                    }
                    .auth-message {
                        color: #16a34a;
                        font-size: 0.875rem;
                        margin: 0 0 12px;
                    }
                    .auth-toggle {
                        text-align: center;
                        margin-top: 1.5rem;
                        color: #64748b;
                        font-size: 0.875rem;
                    }
                    .auth-toggle button {
                        background: none;
                        border: none;
                        color: #3b82f6;
                        font-weight: 600;
                        cursor: pointer;
                    }
                `}</style>
            </div>
        </div>
    )
}
