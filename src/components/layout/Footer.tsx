// src/components/layout/Footer.tsx

export default function Footer() {
    return (
        <footer className="app-footer">
            <a
                href="https://crusty-it.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
                aria-label="Strona wykonana przez Crusty IT"
            >
                <span className="footer-text">Stworzone przez</span>
                <img
                    src="https://raw.githubusercontent.com/shellupski/Moja-strona/main/images/logo_horizontaly.svg"
                    alt="Crusty IT Logo"
                    className="footer-logo"
                />
            </a>
        </footer>
    );
}