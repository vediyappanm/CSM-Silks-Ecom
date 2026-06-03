import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CSM Silks render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="error-boundary-page">
        <div className="error-boundary-card">
          <div className="error-boundary-mark">CSM</div>
          <h1>Something went wrong</h1>
          <p>The storefront could not render this screen. Go home and try again.</p>
          <a className="btn btn-gold" href="/">Go home</a>
        </div>
      </main>
    );
  }
}
