// src/components/layout/Footer.tsx
import './Footer.css';

export default function Footer() {
    return (
        <footer className="app-footer">
            <a
                href="https://crusty-it.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="app-footer-logo-link"
                aria-label="Strona wykonana przez Crusty IT"
            >
                <img
                    src="https://raw.githubusercontent.com/shellupski/Moja-strona/main/images/logo_horizontaly.svg"
                    alt="Crusty IT Logo"
                    className="app-footer-logo"
                />
            </a>
            <div className="app-footer-copyright">
                © 2025 KSeF Master. Wszystkie prawa zastrzeżone.
            </div>
        </footer>
    );
}