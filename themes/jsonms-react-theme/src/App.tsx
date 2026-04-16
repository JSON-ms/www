/**
 * App.tsx — Root application component
 *
 * Wires up the two providers:
 *  1. JSONMSProvider  — fetches & distributes profile data
 *  2. ThemeProvider   — applies CSS variables + theme context
 *
 * To use a real JSON.ms endpoint, either:
 *  - Set VITE_JSONMS_ENDPOINT in your .env file, or
 *  - Pass the `endpoint` prop directly to <JSONMSProvider>
 *
 * @example
 * <JSONMSProvider endpoint="https://api.json.ms/v1/data/my-project">
 */
import { JSONMSProvider } from './core/JSONMSProvider';
import { ThemeProvider } from './theme/ThemeProvider';
import { useTheme } from './hooks/useTheme';
import { AboutMePage } from './pages/AboutMePage';

/**
 * Inner shell that reads `useTheme()` and passes it down to `ThemeProvider`.
 * Separated from `App` so that `useTheme` runs inside the React tree.
 */
function Shell() {
  const { mode, toggle, setMode } = useTheme();

  return (
    <ThemeProvider mode={mode} toggle={toggle} setMode={setMode}>
      <AboutMePage />
    </ThemeProvider>
  );
}

/**
 * Root component — compose providers here.
 * Swap the `endpoint` prop (or .env variable) to point at your JSON.ms instance.
 */
export default function App() {
  return (
    <JSONMSProvider>
      <Shell />
    </JSONMSProvider>
  );
}
