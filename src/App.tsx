import { AuthScreen } from "./features/auth/AuthScreen";
import { ErrorBoundary } from "./shared/components/ErrorBoundary";
import { useSession } from "./features/auth/useSession";
import { COLORS_LIGHT as COLORS } from "./shared/theme/colors";

function App() {
  const { session, loading, isRecovery } = useSession();

  if (loading) {
    return <div style={{ minHeight: "100dvh", background: COLORS.bg }} />;
  }

  if (!session || isRecovery) {
    return (
      <ErrorBoundary boundaryName="auth">
        <AuthScreen isRecovery={isRecovery} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary boundaryName="app">
      <main style={{ padding: 24, fontFamily: "Inter, sans-serif", background: COLORS.bg, minHeight: "100dvh" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.heading }}>Signed in</h1>
        <p>Groups, expenses, and the rest of the app go here next.</p>
      </main>
    </ErrorBoundary>
  );
}

export default App;
