'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
    
    // ✅ Call onError callback
    this.props.onError?.(error, errorInfo);
    
    // ✅ Log to error tracking service
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Send to Sentry, LogRocket, etc.
      // if (window.Sentry) {
      //   window.Sentry.captureException(error, { extra: errorInfo });
      // }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-100 p-8 text-center">
          <div className="bg-red-50 dark:bg-red-950/20 rounded-full p-4 mb-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
            <Button
              variant="outline"
              onClick={this.handleReset}
              className="gap-2"
            >
              Try Again
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/" className="gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-6 text-left w-full max-w-2xl">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                Error Details
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-60 whitespace-pre-wrap break-all">
                {this.state.error?.stack}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}