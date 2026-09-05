import { useState } from "react";
import { AuthScreen } from "./features/auth/AuthScreen";
import { GroupsHome } from "./features/groups/GroupsHome";
import { GroupDetail } from "./features/groups/GroupDetail";
import { ErrorBoundary } from "./shared/components/ErrorBoundary";
import { useSession } from "./features/auth/useSession";
import { COLORS_LIGHT as COLORS } from "./shared/theme/colors";

function App() {
  const { session, loading, isRecovery } = useSession();
  // No router yet - deliberate for now, one level of navigation doesn't
  // need one. Revisit once bottom-tab nav (Friends/Activity/Account) lands.
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);

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

  if (selectedGroup) {
    return (
      <ErrorBoundary boundaryName="group-detail">
        <GroupDetail
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          onBack={() => setSelectedGroup(null)}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary boundaryName="groups">
      <GroupsHome onSelectGroup={(id, name) => setSelectedGroup({ id, name })} />
    </ErrorBoundary>
  );
}

export default App;
