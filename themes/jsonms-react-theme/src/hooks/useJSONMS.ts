import { useContext } from 'react';
import { JSONMSContext } from '../core/JSONMSContext';

/**
 * Primary hook to consume JSON.ms data anywhere in the component tree.
 *
 * Must be used inside a `<JSONMSProvider>`.
 *
 * @returns `{ data, loading, error }`
 *
 * @example
 * const { data, loading, error } = useJSONMS();
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage message={error} />;
 * return <h1>{data.profile.name}</h1>;
 */
export function useJSONMS() {
  return useContext(JSONMSContext);
}
