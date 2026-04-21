import { useContext } from 'react';
import { JSONMSContext } from './JSONMSProvider';

export const useJSONMS = () => {
  const context = useContext(JSONMSContext);
  if (context === undefined) {
    throw new Error('useJSONMS must be used within a JSONMSProvider');
  }
  return context;
};
