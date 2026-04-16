import { createContext } from 'react';
import type { JSONMSState } from '../types';

/**
 * The raw context — consumed only via `useJSONMS()`.
 * Exported for advanced use cases (e.g. testing with a custom provider).
 */
export const JSONMSContext = createContext<JSONMSState>({
  data: null,
  loading: true,
  error: null,
});
