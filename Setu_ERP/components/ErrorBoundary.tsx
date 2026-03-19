import React from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log error to console for now — can be replaced with a telemetry call
    // eslint-disable-next-line no-console
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-white">
          <div className="max-w-xl text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Something went wrong</h2>
            <p className="text-slate-500 text-sm mb-6">An unexpected error occurred while loading the application. Open the developer console for details.</p>
            <pre className="text-xs text-left bg-slate-50 p-4 rounded overflow-auto text-red-600">{this.state.error?.message}</pre>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
