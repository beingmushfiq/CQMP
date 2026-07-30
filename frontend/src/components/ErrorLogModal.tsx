import React, { useState, useEffect } from 'react';
import { errorLogger, type ErrorLogEntry } from '../utils/errorLogger';
import { AlertTriangle, Copy, Download, Trash2, X, ChevronDown, ChevronRight, Terminal, Check, Bug } from 'lucide-react';

interface ErrorLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ErrorLogModal: React.FC<ErrorLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'API_ERROR' | 'RUNTIME'>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLogs(errorLogger.getErrors());
    const unsubscribe = errorLogger.subscribe((updated) => setLogs(updated));
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filter === 'API_ERROR') return log.type === 'API_ERROR';
    if (filter === 'RUNTIME') return log.type !== 'API_ERROR';
    return true;
  });

  const handleCopyLogs = () => {
    const json = errorLogger.exportAsFormattedJson();
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const json = errorLogger.exportAsFormattedJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cqmp-error-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadgeColor = (status?: number) => {
    if (!status) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    if (status >= 500) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    if (status >= 400) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                System Error Log Inspector
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {logs.length} {logs.length === 1 ? 'Entry' : 'Entries'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed diagnostics, stack traces, and API failure boundaries
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          {/* Filters */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('API_ERROR')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'API_ERROR'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
              }`}
            >
              API Errors ({logs.filter((l) => l.type === 'API_ERROR').length})
            </button>
            <button
              onClick={() => setFilter('RUNTIME')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'RUNTIME'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
              }`}
            >
              Runtime & JS ({logs.filter((l) => l.type !== 'API_ERROR').length})
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Logs'}</span>
            </button>

            <button
              onClick={handleDownloadLogs}
              disabled={logs.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => errorLogger.clearErrors()}
              disabled={logs.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full mb-3">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white">No Errors Recorded</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                System operations and API requests are functioning normally.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-850 transition-all shadow-sm hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Log Header Row */}
                  <button
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="w-full text-left p-4 flex items-start justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className="mt-0.5 text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-md border ${getStatusBadgeColor(
                              log.status
                            )}`}
                          >
                            {log.status ? `${log.status} ${log.statusText || ''}` : log.type}
                          </span>

                          {log.method && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                              {log.method}
                            </span>
                          )}

                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {log.title}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 font-mono break-all line-clamp-2">
                          {log.message}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </button>

                  {/* Log Details Accordion */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 font-mono text-xs space-y-4">
                      {/* Meta info grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pb-3 border-b border-slate-800">
                        <div>
                          <span className="text-slate-500">Timestamp:</span> {log.timestamp}
                        </div>
                        {log.url && (
                          <div className="truncate">
                            <span className="text-slate-500">Endpoint:</span> {log.url}
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">Log ID:</span> {log.id}
                        </div>
                        <div>
                          <span className="text-slate-500">Error Type:</span> {log.type}
                        </div>
                      </div>

                      {/* Response Body JSON */}
                      {log.responseData !== undefined && (
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5" />
                            Response Data Payload
                          </div>
                          <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-[11px] text-slate-300">
                            {typeof log.responseData === 'object'
                              ? JSON.stringify(log.responseData, null, 2)
                              : String(log.responseData)}
                          </pre>
                        </div>
                      )}

                      {/* Request Data JSON */}
                      {log.requestData !== undefined && (
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5" />
                            Request Data Payload
                          </div>
                          <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-[11px] text-slate-300">
                            {typeof log.requestData === 'object'
                              ? JSON.stringify(log.requestData, null, 2)
                              : String(log.requestData)}
                          </pre>
                        </div>
                      )}

                      {/* Stack Trace */}
                      {log.stack && (
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Stack Trace
                          </div>
                          <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-[10px] text-slate-400 leading-relaxed max-h-48 whitespace-pre-wrap">
                            {log.stack}
                          </pre>
                        </div>
                      )}

                      {/* Component Stack */}
                      {log.componentStack && (
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-1">
                            React Component Hierarchy
                          </div>
                          <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-[10px] text-slate-400 leading-relaxed max-h-48 whitespace-pre-wrap">
                            {log.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center text-xs text-slate-500">
          <span>Click any error entry to expand formatted details & payloads</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
