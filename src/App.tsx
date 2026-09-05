import { useEffect, useState } from "react";
import { AuthScreen } from "./features/auth/AuthScreen";
import { GroupsHome } from "./features/groups/GroupsHome";
import { GroupDetail } from "./features/groups/GroupDetail";
import { JoinViaLink } from "./features/invites/JoinViaLink";
import { ErrorBoundary } from "./shared/components/ErrorBoundary";
import { useSession } from "./features/auth/useSession";
import { COLORS_LIGHT as COLORS } from "./shared/theme/colors";

const INVITE_STORAGE_KEY = "tally_pending_invite_code";

function readInviteCodeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("invite");
}

function App() {
  const { session, loading, isRecovery } = useSession();
  // No router yet - deliberate for now, one level of navigation doesn't
  // need one. Revisit once bottom-tab nav (Friends/Activity/Account) lands.
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(() => {
    return readInviteCodeFromUrl() ?? sessionStorage.getItem(INVITE_STORAGE_KEY);
  });

  useEffect(() => {
    // Side effects only: persist the code past this render (so it survives
    // the detour through AuthScreen and a possible reload via the email-
    // confirmation link) and clean the URL. The state itself is already
    // set from the lazy initializer above, not from here.
    const fromUrl = readInviteCodeFromUrl();
    if (fromUrl) {
      sessionStorage.setItem(INVITE_STORAGE_KEY, fromUrl);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function clearInvite() {
    sessionStorage.removeItem(INVITE_STORAGE_KEY);
    setInviteCode(null);
  }

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

  if (inviteCode) {
    return (
      <ErrorBoundary boundaryName="join-via-link">
        <JoinViaLink
          code={inviteCode}
          onJoined={(groupId, groupName) => {
            clearInvite();
            setSelectedGroup({ id: groupId, name: groupName });
          }}
          onCancel={clearInvite}
        />
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
