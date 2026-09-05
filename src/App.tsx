import { AuthScreen } from "./features/auth/AuthScreen";
import { GroupsHome } from "./features/groups/GroupsHome";
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
    <ErrorBoundary boundaryName="groups">
      <GroupsHome />
    </ErrorBoundary>
  );
}

export default App;
