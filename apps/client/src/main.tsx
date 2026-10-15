import { t, LocaleProvider } from './i18n';
import React, { Component, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './styles.css';
class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error">
          <h1>{t('No hemos podido preparar la mesa.')}</h1>
          <p>
            {t(
              'Recarga la página para volver a intentarlo. Si tu sala sigue activa, recuperaremos tu sitio.',
            )}{' '}
          </p>
          <button className="button primary" onClick={() => location.reload()}>
            {t('Recargar la página')}{' '}
          </button>
        </main>
      );
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
