import { useState } from 'react';
import './StartView.css';

export default function StartView() {
  const [nip, setNip] = useState('');
  const nipDigits = nip.replace(/\D/g, '').slice(0, 10);
  const nipValid = /^\d{10}$/.test(nipDigits);
  const disableReason = 'Wprowadź poprawny 10-cyfrowy NIP, aby kontynuować.';

  return (
    <div className="start-root">
      <main className="login-wrap" role="main">
        <header className="login-header">
          <h1 className="app-title">Zaloguj się do KSeF Master</h1>
        </header>

        <section className="login-module" aria-labelledby="login-options">
          <h2 id="login-options" className="sr-only">Opcje logowania</h2>

          {/* Krok 1: NIP */}
          <form className="nip-form" aria-label="Identyfikacja podmiotu">
            <label htmlFor="nip" className="nip-label">
              Wprowadź NIP Podatnika
              <span className="hint" title="NIP jest wymagany do określenia kontekstu uwierzytelniania w KSeF.">ⓘ</span>
            </label>
            <input
              id="nip"
              name="nip"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="10 cyfr NIP"
              className="nip-input"
              value={nip}
              onChange={(e) => setNip(e.target.value.replace(/\D/g, ''))}
              aria-describedby="nip-help"
              aria-invalid={!nipValid && nip.length > 0}
            />
            <p id="nip-help" className="nip-help">NIP jest wymagany do określenia kontekstu uwierzytelniania w KSeF.</p>
          </form>

          {/* Krok 2: Metoda uwierzytelnienia */}
          <div className="primary-actions">
            <button
              className="btn btn-primary"
              type="button"
              aria-label="Zaloguj się przez Profil Zaufany"
              disabled={!nipValid}
              title={!nipValid ? disableReason : undefined}
            >
              <span className="btn-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 11H7a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <span>Profil Zaufany</span>
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              aria-label="Zaloguj się przy użyciu Certyfikatu Kwalifikowanego lub Pieczęci"
              disabled={!nipValid}
              title={!nipValid ? disableReason : undefined}
            >
              <span className="btn-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="3" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <span>Certyfikat Kwalifikowany / Pieczęć</span>
            </button>
          </div>

          <form className="token-form" aria-label="Logowanie tokenem">
            <label htmlFor="ksef-token" className="token-label">Wprowadź Token KSeF</label>
            <div className="token-input-row">
              <input
                id="ksef-token"
                name="ksef-token"
                type="text"
                inputMode="text"
                placeholder="Wklej token dostępu"
                className="token-input"
                aria-describedby="token-help"
              />
              <button className="btn btn-outline" type="button">Zaloguj Tokenem</button>
            </div>
            <p id="token-help" className="token-help">Użyj tokena tylko do integracji systemowych (API).</p>
          </form>
        </section>

        <div className="demo-link-wrap">
          <a className="demo-link" href="#/dashboard" role="link">Przejdź do trybu demonstracyjnego (Bez Logowania / Test)</a>
        </div>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span>© 2025 KSeF Master — Wszelkie prawa zastrzeżone.</span>
          <nav aria-label="Linki prawne">
            <a href="#" className="footer-link">Polityka prywatności</a>
            <span className="dot" aria-hidden="true">|</span>
            <a href="#" className="footer-link">Regulamin</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
