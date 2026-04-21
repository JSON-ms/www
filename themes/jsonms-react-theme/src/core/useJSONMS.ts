import { useState, useEffect } from 'react';
import { parseData } from './parser';
import { JSONMSData } from '../types';

export const useJSONMS = (endpoint: string) => {
  const [data, setData] = useState<JSONMSData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        
        // Read response as text to determine if it's JSON or YAML
        const text = await response.text();
        
        // Parse and normalize the data
        const parsedAndNormalizedData = parseData(text);
        
        if (isMounted) {
          setData(parsedAndNormalizedData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [endpoint]);

  return { data, loading, error };
};
