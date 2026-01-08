// src/views/start/StartView.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './StartView.css';

export default function StartView() {
    const navigate = useNavigate();
    const { login, isLoading, error: authError, isAuthenticated } = useAuth();

    const [nip, setNip] = useState('');
    const [ksefToken, setKsefToken] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nipDigits = nip.replace(/\D/g, '').slice(0, 10);
    const nipValid = /^\d{10}$/.test(nipDigits);
    const tokenValid = ksefToken.includes('|') && ksefToken.length > 20;

    // Jeśli już zalogowany, przekieruj - W useEffect!
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleLogin = async () => {
        if (!nipValid) {
            setLocalError('Wprowadź poprawny 10-cyfrowy NIP');
            return;
        }
        if (!tokenValid) {
            setLocalError('Wprowadź poprawny token KSeF');
            return;
        }

        setLocalError(null);
        setIsSubmitting(true);

        try {
            const success = await login(nipDigits, ksefToken.trim());
            if (success) {
                navigate('/dashboard');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayError = localError || authError;

    // Jeśli zalogowany, nie renderuj formularza (useEffect przekieruje)
    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="start-root">
            <main className="login-wrap" role="main">
                <header className="login-header">
                    <h1 className="app-title">Zaloguj się do KSeF Master</h1>
                    <p className="app-subtitle">Środowisko testowe KSeF</p>
                </header>

                <section className="login-module" aria-labelledby="login-options">
                    <h2 id="login-options" className="sr-only">Logowanie tokenem KSeF</h2>

                    {/* Komunikat o błędzie */}
                    {displayError && (
                        <div className="error-banner" style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '16px',
                            color: '#fca5a5',
                            fontSize: '14px'
                        }}>
                            ⚠️ {displayError}
                        </div>
                    )}

                    {/* Krok 1: NIP */}
                    <form className="nip-form" aria-label="Identyfikacja podmiotu" onSubmit={(e) => e.preventDefault()}>
                        <label htmlFor="nip" className="nip-label">
                            NIP Podatnika
                            <span className="hint" title="NIP jest wymagany do uwierzytelnienia w KSeF">ⓘ</span>
                        </label>
                        <input
                            id="nip"
                            name="nip"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="np. 5252161248"
                            className="nip-input"
                            value={nip}
                            onChange={(e) => setNip(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            aria-describedby="nip-help"
                            aria-invalid={!nipValid && nip.length > 0}
                            disabled={isSubmitting || isLoading}
                        />
                        <p id="nip-help" className="nip-help">
                            {nipValid ? '✓ NIP poprawny' : 'Wprowadź 10-cyfrowy NIP'}
                        </p>
                    </form>

                    {/* Krok 2: Token KSeF */}
                    <form className="token-form" aria-label="Logowanie tokenem" onSubmit={(e) => {
                        e.preventDefault();
                        handleLogin();
                    }}>
                        <label htmlFor="ksef-token" className="token-label">
                            Token KSeF
                        </label>
                        <div className="token-input-row">
                            <input
                                id="ksef-token"
                                name="ksef-token"
                                type="text"
                                placeholder="Wklej token z aplikacji KSeF MF"
                                className="token-input"
                                value={ksefToken}
                                onChange={(e) => setKsefToken(e.target.value)}
                                aria-describedby="token-help"
                                disabled={isSubmitting || isLoading}
                                style={{ flex: 1 }}
                            />
                        </div>
                        <p id="token-help" className="token-help">
                            Token wygenerowany w oficjalnej aplikacji KSeF Ministerstwa Finansów.
                            <br />
                            Format: XXXXXXXX-XX-XXXXXXXXXX-XXXXXXXXXX-XX|nip-XXXXXXXXXX|hash
                        </p>

                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={!nipValid || !tokenValid || isSubmitting || isLoading}
                            style={{ width: '100%', marginTop: '16px' }}
                        >
                            {isSubmitting || isLoading ? (
                                <>
                                    <span className="btn-icon" aria-hidden="true">⏳</span>
                                    <span>Logowanie...</span>
                                </>
                            ) : (
                                <>
                                    <span className="btn-icon" aria-hidden="true">🔐</span>
                                    <span>Zaloguj się do KSeF</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Instrukcja */}
                    <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#93c5fd'
                    }}>
                        <strong>Jak uzyskać token?</strong>
                        <ol style={{ margin: '8px 0 0 16px', padding: 0 }}>
                            <li>Wejdź na <a href="https://web2te-ksef.mf.gov.pl/web" target="_blank" rel="noopener" style={{ color: '#60a5fa' }}>https://web2te-ksef.mf.gov.pl/web</a></li>
                            <li>Zaloguj się podając NIP (na środowisku testowym to wystarcza)</li>
                            <li>Przejdź do ustawień → Tokeny</li>
                            <li>Wygeneruj nowy token i skopiuj go tutaj</li>
                        </ol>
                    </div>
                </section>

                <div className="demo-link-wrap">
                    <a className="demo-link" href="#/dashboard">
                        Przejdź do trybu demonstracyjnego (bez logowania)
                    </a>
                </div>
            </main>

            <footer className="site-footer">
                <div className="footer-inner">
                    <span>© 2025 KSeF Master — Środowisko testowe</span>
                </div>
            </footer>
        </div>
    );
}