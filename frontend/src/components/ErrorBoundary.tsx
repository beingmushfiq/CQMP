import { Component, type ErrorInfo, type ReactNode } from 'react';
import { errorLogger } from '../utils/errorLogger';
import { ErrorLogModal } from './ErrorLogModal';
import { AlertOctagon, RefreshCw, Bug, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  showInspector: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    showInspector: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Push caught error into global errorLogger store
    errorLogger.addError({
      type: 'REACT_ERROR_BOUNDARY',
      title: `React Component Error: ${error.name || 'Error'}`,
      message: error.message || 'An unexpected rendering error occurred',
      stack: error.stack,
      componentStack: errorInfo.componentStack ?? undefined,
    });

    console.error('[CQMP Error Boundary] Caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const details = [
      `CQMP Error Diagnostics Report`,
      `=============================`,
      `Timestamp: ${new Date().toISOString()}`,
      `Error: ${error?.name}: ${error?.message}`,
      `URL: ${window.location.href}`,
      `Stack Trace:`,
      error?.stack || 'N/A',
      `Component Stack:`,
      errorInfo?.componentStack || 'N/A',
    ].join('\n\n');

    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails, showInspector, copied } = this.state;

      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-2xl bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            {/* Header */}
            <div className="flex items-start space-x-4 mb-6">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20 shrink-0">
                <AlertOctagon className="w-8 h-8" />
              </div>

              <div>
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">
                  Application Error Boundary Caught
                </span>
                <h1 className="text-xl font-bold text-white mt-1.5">
                  Something went wrong in the interface
                </h1>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                  An unexpected error occurred while rendering this component. The error details have been logged for inspection.
                </p>
              </div>
            </div>

            {/* Concise Message Box */}
            <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-xl mb-6 font-mono text-xs text-rose-300 break-words">
              <span className="font-bold text-slate-400 block mb-1">Error Summary:</span>
              {error?.name}: {error?.message || 'Unknown Error'}
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button
                onClick={this.handleReset}
                className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Resetting State</span>
              </button>

              <button
                onClick={this.handleReload}
                className="flex items-center space-x-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs rounded-xl transition-all"
              >
                <span>Reload Page</span>
              </button>

              <button
                onClick={() => this.setState({ showInspector: true })}
                className="flex items-center space-x-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-medium text-xs rounded-xl transition-all"
              >
                <Bug className="w-4 h-4" />
                <span>View Error Log Inspector</span>
              </button>

              <button
                onClick={this.handleCopyDetails}
                className="flex items-center space-x-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-medium text-xs rounded-xl transition-all ml-auto"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Diagnostics'}</span>
              </button>
            </div>

            {/* Collapsible Detailed Stack Trace */}
            <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-900/60">
              <button
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-800/50 transition-colors"
              >
                <span>Technical Stack Trace & Details</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDetails && (
                <div className="p-4 border-t border-slate-700/80 font-mono text-[11px] text-slate-400 space-y-4">
                  {error?.stack && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                        JavaScript Call Stack:
                      </div>
                      <pre className="p-3 bg-slate-950 rounded-lg overflow-x-auto text-slate-300 leading-relaxed max-h-48 whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {errorInfo?.componentStack && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                        React Component Stack:
                      </div>
                      <pre className="p-3 bg-slate-950 rounded-lg overflow-x-auto text-purple-300 leading-relaxed max-h-48 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detailed Error Log Modal */}
          <ErrorLogModal
            isOpen={showInspector}
            onClose={() => this.setState({ showInspector: false })}
          />
        </div>
      );
    }

    return (
      <>
        {this.props.children}
        <ErrorLogModal
          isOpen={this.state.showInspector}
          onClose={() => this.setState({ showInspector: false })}
        />
      </>
    );
  }
}
