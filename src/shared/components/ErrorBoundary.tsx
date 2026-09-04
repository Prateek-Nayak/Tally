import { Component, type ErrorInfo, type ReactNode } from "react";

/*
 * Ground rule #2: every route/screen is wrapped in one of these.
 * A crash in one feature must show a recoverable error screen,
 * never blank the whole app. See GROUND_RULES.md.
 */

interface Props {
  children: ReactNode;
  /** Short label for which part of the app this boundary guards, shown in the fallback and logs. */
  boundaryName: string;
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[${this.props.boundaryName}] crashed:`, error, info.componentStack);
    // TODO: send to error tracking (Sentry) once configured, per GROUND_RULES.md
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback(this.reset);
      return (
        <div role="alert" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ marginBottom: 12 }}>Something went wrong in {this.props.boundaryName}.</p>
          <button onClick={this.reset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
