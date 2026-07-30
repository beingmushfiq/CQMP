export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  type: 'API_ERROR' | 'UNCAUGHT_EXCEPTION' | 'UNHANDLED_REJECTION' | 'REACT_ERROR_BOUNDARY';
  title: string;
  message: string;
  status?: number;
  statusText?: string;
  url?: string;
  method?: string;
  requestData?: unknown;
  responseData?: unknown;
  stack?: string | null;
  componentStack?: string | null;
}

type ErrorListener = (logs: ErrorLogEntry[]) => void;

class ErrorLoggerStore {
  private logs: ErrorLogEntry[] = [];
  private listeners: Set<ErrorListener> = new Set();
  private maxLogs = 50;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initGlobalListeners();
    }
  }

  private initGlobalListeners() {
    window.addEventListener('error', (event) => {
      this.addError({
        id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        type: 'UNCAUGHT_EXCEPTION',
        title: 'Uncaught Exception',
        message: event.message || 'An unexpected JavaScript error occurred',
        stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason || 'Unhandled Promise Rejection');
      const stack = reason instanceof Error ? reason.stack : undefined;

      this.addError({
        id: `rej-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        type: 'UNHANDLED_REJECTION',
        title: 'Unhandled Promise Rejection',
        message,
        stack,
      });
    });
  }

  public addError(entry: Omit<ErrorLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): ErrorLogEntry {
    const fullEntry: ErrorLogEntry = {
      id: entry.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      ...entry,
    };

    // Avoid duplicate log flood if identical error arrives within 500ms
    const recentDuplicate = this.logs[0];
    if (
      recentDuplicate &&
      recentDuplicate.message === fullEntry.message &&
      recentDuplicate.url === fullEntry.url &&
      Date.now() - new Date(recentDuplicate.timestamp).getTime() < 500
    ) {
      return recentDuplicate;
    }

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.notify();
    return fullEntry;
  }

  public getErrors(): ErrorLogEntry[] {
    return [...this.logs];
  }

  public clearErrors(): void {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: ErrorListener): () => void {
    this.listeners.add(listener);
    listener(this.getErrors());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentLogs = this.getErrors();
    this.listeners.forEach((listener) => listener(currentLogs));
  }

  public exportAsFormattedJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const errorLogger = new ErrorLoggerStore();
