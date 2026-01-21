import { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiTrash2 } from 'react-icons/fi';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearSession = () => {
    // Clear session storage
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-gray-900 border border-gray-800 rounded-lg p-6 sm:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Something went wrong
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">
                  We encountered an unexpected error. You can try reloading the page or clearing your session to start fresh.
                </p>
              </div>
            </div>

            {/* Error details (only in development) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 bg-black/50 border border-gray-800 rounded-lg p-4 overflow-auto">
                <p className="text-red-400 font-mono text-xs sm:text-sm mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-gray-500 font-mono text-xs overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                <FiRefreshCw className="w-5 h-5" />
                Reload Page
              </button>
              
              <button
                onClick={this.handleClearSession}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 border border-gray-700 min-h-[44px]"
              >
                <FiTrash2 className="w-5 h-5" />
                Clear Session
              </button>
            </div>

            {/* Help text */}
            <p className="mt-6 text-center text-gray-500 text-xs sm:text-sm">
              If the problem persists, try uploading a different dataset or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
