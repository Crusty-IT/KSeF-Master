// src/components/startup/ServerStartup.tsx
import './ServerStartup.css';

interface ServerStartupProps {
    retryCount: number;
    maxRetries: number;
    status: 'checking' | 'offline' | 'error';
}

export default function ServerStartup({ retryCount, maxRetries, status }: ServerStartupProps) {
    const isOffline = status === 'offline' || status === 'error';

    return (
        <div className="server-startup-overlay">
            <div className="server-startup-content">
                <div className="server-startup-icon">
                    {isOffline ? '⚠️' : <div className="spinner" />}
                </div>

                <h2 className="server-startup-title">
                    {isOffline ? 'Nie można połączyć z serwerem' : 'Uruchamianie serwera...'}
                </h2>

                <p className="server-startup-message">
                    {isOffline
                        ? 'Serwer nie odpowiada. Sprawdź połączenie internetowe lub spróbuj później.'
                        : 'Serwer jest uruchamiany. To może potrwać kilka sekund.'}
                </p>

                {!isOffline && (
                    <div className="server-startup-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${(retryCount / maxRetries) * 100}%` }}
                            />
                        </div>
                        <span className="progress-text">
                            Próba {retryCount} z {maxRetries}
                        </span>
                    </div>
                )}

                {isOffline && (
                    <button
                        className="server-startup-retry-btn"
                        onClick={() => window.location.reload()}
                    >
                        Spróbuj ponownie
                    </button>
                )}
            </div>
        </div>
    );
}