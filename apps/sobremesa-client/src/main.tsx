import { t, LocaleProvider } from './i18n';
import React, { Component, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './styles.css';
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; chunk: boolean }
> {
  state = { failed: false, chunk: false };
  static getDerivedStateFromError(error: unknown) {
    return {
      failed: true,
      chunk:
        error instanceof Error &&
        /dynamically imported|module script|ChunkLoadError|Loading chunk|Importing a module script/i.test(
          error.message,
        ),
    };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error">
          <h1 tabIndex={-1} ref={(node) => node?.focus()}>
            {t(
              this.state.chunk
                ? 'No se ha podido cargar una parte de Sobremesa.'
                : 'No hemos podido preparar la mesa.',
            )}
          </h1>
          <p>
            {t(
              this.state.chunk
                ? 'Puede haber una actualización o un problema de conexión. Recarga cuando quieras; tu sesión se conserva.'
                : 'Recarga la página para volver a intentarlo. Si tu sala sigue activa, recuperaremos tu sitio.',
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
