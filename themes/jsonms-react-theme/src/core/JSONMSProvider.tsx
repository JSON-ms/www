import { useEffect, useRef, useState, type ReactNode } from 'react';
import { JSONMSContext } from './JSONMSContext';
import { fetchJSONMSData } from './fetcher';
import type { JSONMSConfig } from '../types';

interface JSONMSProviderProps {
  /**
   * The API endpoint to fetch data from.
   * Falls back to `VITE_JSONMS_ENDPOINT` env var, then `/mock-data.json`.
   */
  endpoint?: string;
  children: ReactNode;
}

/**
 * `JSONMSProvider` is the single source of truth for JSON.ms data.
 *
 * Wrap your app (or a subtree) with this provider to make profile data
 * available everywhere via `useJSONMS()`.
 *
 * @example
 * <JSONMSProvider endpoint="https://api.json.ms/v1/data/my-project">
 *   <App />
 * </JSONMSProvider>
 */
export function JSONMSProvider({ endpoint, children }: JSONMSProviderProps) {
  const resolvedEndpoint =
    endpoint ??
    (import.meta.env.VITE_JSONMS_ENDPOINT as string | undefined) ??
    '/mock-data.json';

  const [data, setData] = useState<JSONMSConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to avoid stale closure issues on re-renders
  const endpointRef = useRef(resolvedEndpoint);
  endpointRef.current = resolvedEndpoint;

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchJSONMSData(endpointRef.current)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedEndpoint]);

  return (
    <JSONMSContext.Provider value={{ data, loading, error }}>
      {children}
    </JSONMSContext.Provider>
  );
}
