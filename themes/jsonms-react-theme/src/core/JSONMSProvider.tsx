import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { JSONMSData } from '../types';

interface JSONMSContextType {
  data: JSONMSData | null;
  loading: boolean;
  error: Error | null;
}

export const JSONMSContext = createContext<JSONMSContextType | undefined>(undefined);

interface JSONMSProviderProps {
  endpoint: string;
  children: ReactNode;
}

export const JSONMSProvider: React.FC<JSONMSProviderProps> = ({ endpoint, children }) => {
  const [data, setData] = useState<JSONMSData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const json = await response.json();
        // Here you might add a normalization layer if the YAML structure is slightly different
        setData(json as JSONMSData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  const value = { data, loading, error };

  return <JSONMSContext.Provider value={value}>{children}</JSONMSContext.Provider>;
};
