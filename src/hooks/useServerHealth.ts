// src/hooks/useServerHealth.ts
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const HEALTH_ENDPOINT = `${API_BASE_URL}/health`;
const MAX_RETRIES = 15;
const RETRY_INTERVAL_MS = 2000;

export type ServerStatus = 'checking' | 'online' | 'offline' | 'error';

interface UseServerHealthResult {
    status: ServerStatus;
    retryCount: number;
    maxRetries: number;
    checkHealth: () => Promise<boolean>;
}

export function useServerHealth(autoCheck: boolean = true): UseServerHealthResult {
    const [status, setStatus] = useState<ServerStatus>('checking');
    const [retryCount, setRetryCount] = useState(0);

    const checkHealth = useCallback(async (): Promise<boolean> => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(HEALTH_ENDPOINT, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                setStatus('online');
                return true;
            } else {
                setStatus('error');
                return false;
            }
        } catch {
            return false;
        }
    }, []);

    useEffect(() => {
        if (!autoCheck) return;

        let isMounted = true;
        let timeoutId: ReturnType<typeof setTimeout>;

        const attemptConnection = async (attempt: number) => {
            if (!isMounted) return;

            setRetryCount(attempt);
            const isOnline = await checkHealth();

            if (isOnline) {
                return;
            }

            if (attempt >= MAX_RETRIES) {
                if (isMounted) {
                    setStatus('offline');
                }
                return;
            }

            timeoutId = setTimeout(() => {
                attemptConnection(attempt + 1);
            }, RETRY_INTERVAL_MS);
        };

        attemptConnection(1);

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [autoCheck, checkHealth]);

    return {
        status,
        retryCount,
        maxRetries: MAX_RETRIES,
        checkHealth,
    };
}