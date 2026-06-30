import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            gap: "12px",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          <span style={{ fontSize: 32 }}>⚠️</span>
          <p>페이지를 불러오는 중 문제가 발생했습니다</p>
          <pre
            style={{
              fontSize: 12,
              maxWidth: 480,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "var(--danger)",
            }}
          >
            {this.state.error?.message}
          </pre>
          <button
            onClick={this.handleReset}
            style={{
              padding: "6px 16px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
