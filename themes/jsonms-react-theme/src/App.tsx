import React from 'react';
import { JSONMSProvider } from './core/JSONMSProvider';
import { ThemeProvider } from './theme/ThemeProvider';
import { AboutMePage } from './pages/AboutMePage';
import './index.css';
import './theme/theme.css';

const App: React.FC = () => {
  return (
    <JSONMSProvider endpoint="/mock.yaml">
      <ThemeProvider>
        <AboutMePage />
      </ThemeProvider>
    </JSONMSProvider>
  );
};

export default App;
