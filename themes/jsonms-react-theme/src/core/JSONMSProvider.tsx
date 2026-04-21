import React, { createContext, useContext, ReactNode } from 'react';
import { JSONMSData } from '../types';
import { useJSONMS } from './useJSONMS';

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
  const { data, loading, error } = useJSONMS(endpoint);

  const value = { data, loading, error };

  return <JSONMSContext.Provider value={value}>{children}</JSONMSContext.Provider>;
};

export const useJSONMSContext = () => {
  const context = useContext(JSONMSContext);
  if (context === undefined) {
    throw new Error('useJSONMSContext must be used within a JSONMSProvider');
  }
  return context;
};
