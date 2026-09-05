import { useState } from "react";
import { COLORS_LIGHT as COLORS } from "../../shared/theme/colors";
import { formatPaise } from "../../shared/lib/money";
import { useSession } from "../auth/useSession";
import { useMembers } from "./useMembers";
import { AddMemberSheet } from "./AddMemberSheet";
import { useExpenses } from "../expenses/useExpenses";
import { AddExpenseSheet } from "../expenses/AddExpenseSheet";
import { InviteSheet } from "../invites/InviteSheet";

export function GroupDetail({ groupId, groupName, onBack }: { groupId: string; groupName: string; onBack: () => void }) {
  const { session } = useSession();
  const { data: members, isLoading: membersLoading } = useMembers(groupId);
  const { data: expenses, isLoading: expensesLoading, error: expensesError } = useExpenses(groupId);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const me = members?.find((m) => m.user_id === session?.user.id);
  const isAdmin = me?.role === "admin";

  return (
    <div style={{ minHeight: "100dvh", background: COLORS.bg, fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: COLORS.navy, padding: "16px 20px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to groups"
          style={{ background: "transparent", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}
        >
          ←
        </button>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18, color: "#fff" }}>
          {groupName}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 14, color: COLORS.heading }}>
            People
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              style={{
                background: "transparent",
                border: `1px solid ${COLORS.navy}`,
                color: COLORS.navy,
                borderRadius: 999,
                padding: "5px 11px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                cursor: "pointer",
              }}
            >
              Invite
            </button>
            <button
              type="button"
              onClick={() => setShowAddMember(true)}
              style={{
                background: "transparent",
                border: `1px solid ${COLORS.gold}`,
                color: COLORS.gold,
                borderRadius: 999,
                padding: "5px 11px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                cursor: "pointer",
              }}
            >
              + Add person
            </button>
          </div>
        </div>

        {membersLoading && <p style={{ color: COLORS.inkSoft, fontSize: 13 }}>Loading…</p>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {members?.map((m) => (
            <span
              key={m.id}
              style={{
                background: m.is_ghost ? COLORS.goldSoft : COLORS.chip,
                color: COLORS.ink,
                borderRadius: 999,
                padding: "5px 11px",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {m.name}
              {m.is_ghost && <span style={{ color: COLORS.gold, fontWeight: 400 }}> · no account</span>}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 14, color: COLORS.heading }}>
            Expenses
          </div>
          <button
            type="button"
            onClick={() => setShowAddExpense(true)}
            disabled={!members || members.length === 0}
            style={{
              background: COLORS.action,
              color: COLORS.onAction,
              border: "none",
              borderRadius: 999,
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: "Inter, sans-serif",
              cursor: members && members.length > 0 ? "pointer" : "default",
              opacity: members && members.length > 0 ? 1 : 0.5,
            }}
          >
            + Add expense
          </button>
        </div>

        {expensesLoading && <p style={{ color: COLORS.inkSoft, fontSize: 13 }}>Loading…</p>}
        {expensesError && <p style={{ color: COLORS.red, fontSize: 13 }}>Couldn't load expenses.</p>}

        {!expensesLoading && !expensesError && expenses?.length === 0 && (
          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "20px 16px",
              textAlign: "center",
            }}
          >
            <p style={{ color: COLORS.inkSoft, fontSize: 13, margin: 0 }}>
              No expenses yet. Add the first one for this group.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {expenses?.map((exp) => (
            <div
              key={exp.id}
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "11px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{exp.description}</div>
                <div style={{ fontSize: 11.5, color: COLORS.inkSoft }}>
                  {exp.paid_by_name} paid · split {exp.split_count} ways
                </div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: COLORS.ink }}>
                {formatPaise(exp.amount_paise)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddMember && <AddMemberSheet groupId={groupId} onClose={() => setShowAddMember(false)} />}
      {showInvite && <InviteSheet groupId={groupId} isAdmin={isAdmin} onClose={() => setShowInvite(false)} />}
      {showAddExpense && members && (
        <AddExpenseSheet groupId={groupId} members={members} onClose={() => setShowAddExpense(false)} />
      )}
    </div>
  );
}
