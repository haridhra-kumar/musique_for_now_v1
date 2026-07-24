import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the real error instead of a blank white screen.
    console.error("[ErrorBoundary]", error, info.componentStack);
    this.setState({ info: info.componentStack || "" });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-bg-primary">
          <div className="max-w-lg w-full card">
            <p className="card-title" style={{ color: "#e06040" }}>Something went wrong</p>
            <p className="text-[13px] text-text-secondary mb-3">
              {this.state.error.message || String(this.state.error)}
            </p>
            <pre className="text-[11px] text-text-faint whitespace-pre-wrap max-h-56 overflow-auto mb-4">
              {this.state.info.slice(0, 800)}
            </pre>
            <button className="btn-secondary" onClick={() => location.assign("/")}>
              Back to dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
