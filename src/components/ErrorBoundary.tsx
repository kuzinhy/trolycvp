import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 m-4">
          <div className="p-4 bg-rose-100 rounded-full text-rose-600">
            <AlertTriangle size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Đã có lỗi xảy ra</h2>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              Hệ thống gặp sự cố khi tải nội dung này. Vui lòng thử tải lại trang hoặc liên hệ quản trị viên.
            </p>
            {this.state.error && (
              <pre className="mt-4 p-4 bg-slate-900 text-slate-100 text-[10px] font-mono rounded-xl overflow-auto max-w-full text-left">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <RefreshCw size={18} />
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
