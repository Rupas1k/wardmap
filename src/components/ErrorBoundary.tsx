import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Wardmap render failed", error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-300">
        <div className="max-w-md border border-rose-400/20 bg-slate-900 p-5">
          <h1 className="text-base font-semibold text-slate-100">Wardmap could not continue</h1>
          <p className="mt-2 text-sm leading-5 text-slate-400">
            A client error interrupted this view. Reloading restores the last saved workspace when
            possible.
          </p>
          <p className="mt-2 break-words font-mono text-[11px] text-rose-300">
            {this.state.error.message}
          </p>
          <button
            className="mt-4 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-white"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload Wardmap
          </button>
        </div>
      </main>
    );
  }
}
