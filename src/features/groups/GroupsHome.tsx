import { useState } from "react";
import { COLORS_LIGHT as COLORS } from "../../shared/theme/colors";
import { useGroups } from "./useGroups";
import { NewGroupSheet } from "./NewGroupSheet";
import { signOut } from "../auth/authApi";

export function GroupsHome() {
  const { data: groups, isLoading, error } = useGroups();
  const [showNewGroup, setShowNewGroup] = useState(false);

  return (
    <div style={{ minHeight: "100dvh", background: COLORS.bg, fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: COLORS.navy, padding: "18px 20px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: "#fff" }}>Tally</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: COLORS.gold, marginTop: 2, letterSpacing: 0.5 }}>
            SHARED EXPENSES
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.35)",
            color: "#fff",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15, color: COLORS.heading }}>
            Groups
          </div>
          <button
            type="button"
            onClick={() => setShowNewGroup(true)}
            style={{
              background: COLORS.action,
              color: COLORS.onAction,
              border: "none",
              borderRadius: 999,
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: "Inter, sans-serif",
              cursor: "pointer",
            }}
          >
            + New group
          </button>
        </div>

        {isLoading && <p style={{ color: COLORS.inkSoft, fontSize: 13 }}>Loading your groups…</p>}
        {error && <p style={{ color: COLORS.red, fontSize: 13 }}>Couldn't load your groups. Pull to refresh.</p>}

        {!isLoading && !error && groups?.length === 0 && (
          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "24px 16px",
              textAlign: "center",
            }}
          >
            <p style={{ color: COLORS.inkSoft, fontSize: 13, margin: 0 }}>
              No groups yet. Start one for a trip, a flat, or anything you split with others.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {groups?.map((group) => (
            <div
              key={group.id}
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{group.name}</div>
                <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                  {group.member_count} {group.member_count === 1 ? "person" : "people"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNewGroup && <NewGroupSheet onClose={() => setShowNewGroup(false)} />}
    </div>
  );
}
