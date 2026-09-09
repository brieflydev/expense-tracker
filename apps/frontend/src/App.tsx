import { useEffect, useState } from 'react';
import './App.css';

type ApiInfo = {
  name: string;
  version: string;
};

function App() {
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`API responded with ${res.status}`);
        }
        return res.json() as Promise<ApiInfo>;
      })
      .then(setApiInfo)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to reach API');
      });
  }, []);

  return (
    <main className="app">
      <h1>Expense Tracker</h1>
      <p className="subtitle">Track spending, filter history, and see trends.</p>

      <section className="status">
        <h2>API status</h2>
        {apiInfo && (
          <p className="ok">
            Connected to <code>{apiInfo.name}</code> (v{apiInfo.version})
          </p>
        )}
        {error && (
          <p className="err">
            Backend not reachable yet. Start it with{' '}
            <code>npm run dev:backend</code>.
            <br />
            <span className="detail">{error}</span>
          </p>
        )}
        {!apiInfo && !error && <p>Checking API…</p>}
      </section>
    </main>
  );
}

export default App;
