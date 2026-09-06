import { useState, type FormEvent } from "react";
import { Sheet } from "../../shared/components/Sheet";
import { Field, PrimaryButton, Notice } from "../../shared/components/formControls";
import { inputStyle } from "../../shared/theme/inputStyle";
import { COLORS_LIGHT as COLORS } from "../../shared/theme/colors";
import { formatPaise, rupeesToPaise } from "../../shared/lib/money";
import { newIdempotencyKey } from "../../lib/api/idempotency";
import { getErrorMessage } from "../../shared/lib/errors";
import type { Member } from "../groups/memberTypes";
import { useExpenseDetail, useUpdateExpense, useDeleteExpense } from "./useExpenses";

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? COLORS.action : COLORS.chip,
        color: active ? COLORS.onAction : COLORS.ink,
        border: "none",
        borderRadius: 999,
        padding: "6px 12px",
        fontSize: 12.5,
        fontWeight: 600,
        fontFamily: "Inter, sans-serif",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function ExpenseDetailSheet({
  groupId,
  expenseId,
  members,
  currentUserId,
  isAdmin,
  onClose,
}: {
  groupId: string;
  expenseId: string;
  members: Member[];
  currentUserId: string | undefined;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const { data: expense, isLoading, error: loadError } = useExpenseDetail(expenseId);
  const updateExpense = useUpdateExpense(groupId);
  const deleteExpense = useDeleteExpense(groupId);

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);

  const canEdit = !!expense && (expense.created_by === currentUserId || isAdmin);

  function startEditing() {
    if (!expense) return;
    setDescription(expense.description);
    setAmount((expense.amount_paise / 100).toString());
    setPaidBy(expense.paid_by);
    setSplitWith(expense.splits.map((s) => s.member_id));
    setError("");
    setEditing(true);
  }

  function toggleSplit(memberId: string) {
    setSplitWith((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    const amountNum = Number(amount);
    if (!description.trim()) return setError("Enter a description.");
    if (!amountNum || amountNum <= 0) return setError("Enter an amount greater than ₹0.");
    if (!paidBy) return setError("Choose who paid.");
    if (splitWith.length === 0) return setError("Pick at least one person to split with.");

    try {
      await updateExpense.mutateAsync({
        expenseId,
        description: description.trim(),
        amountPaise: rupeesToPaise(amountNum),
        paidByMemberId: paidBy,
        splitMemberIds: splitWith,
        idempotencyKey,
      });
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save the changes."));
    }
  }

  async function handleDelete() {
    setError("");
    try {
      await deleteExpense.mutateAsync({ expenseId, idempotencyKey: newIdempotencyKey() });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete the expense."));
      setConfirmingDelete(false);
    }
  }

  return (
    <Sheet title={editing ? "Edit expense" : "Expense"} onClose={onClose}>
      {isLoading && <p style={{ color: COLORS.inkSoft, fontSize: 13 }}>Loading…</p>}
      {loadError && <Notice kind="error">Couldn't load this expense.</Notice>}

      {expense && !editing && (
        <div>
          {error && <Notice kind="error">{error}</Notice>}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: COLORS.heading }}>
              {expense.description}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: COLORS.ink, marginTop: 4 }}>
              {formatPaise(expense.amount_paise)}
            </div>
          </div>

          <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 6 }}>Split</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {expense.splits.map((s) => (
              <div key={s.member_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: COLORS.ink }}>{s.member_name}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: COLORS.inkSoft }}>
                  {formatPaise(s.share_paise)}
                </span>
              </div>
            ))}
          </div>

          {canEdit && !confirmingDelete && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={startEditing}
                style={{
                  flex: 1,
                  background: COLORS.action,
                  color: COLORS.onAction,
                  border: "none",
                  borderRadius: 10,
                  padding: "11px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                style={{
                  flex: 1,
                  background: "transparent",
                  color: COLORS.red,
                  border: `1px solid ${COLORS.red}`,
                  borderRadius: 10,
                  padding: "11px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          )}

          {confirmingDelete && (
            <div>
              <p style={{ fontSize: 13, color: COLORS.ink, marginBottom: 10 }}>Delete this expense? It can be restored from Trash for 30 days.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleteExpense.isPending}
                  style={{
                    flex: 1,
                    background: COLORS.red,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "11px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {deleteExpense.isPending ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    padding: "11px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {expense && editing && (
        <form onSubmit={handleSave}>
          {error && <Notice kind="error">{error}</Notice>}
          <Field label="Description">
            <input
              style={inputStyle}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner, Hotel booking"
            />
          </Field>
          <Field label="Amount (₹)">
            <input
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Paid by">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {members.map((m) => (
                <ChipToggle key={m.id} label={m.name} active={paidBy === m.id} onClick={() => setPaidBy(m.id)} />
              ))}
            </div>
          </Field>
          <Field label="Split equally with">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {members.map((m) => (
                <ChipToggle
                  key={m.id}
                  label={m.name}
                  active={splitWith.includes(m.id)}
                  onClick={() => toggleSplit(m.id)}
                />
              ))}
            </div>
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryButton busy={updateExpense.isPending}>
              {updateExpense.isPending ? "Saving…" : "Save changes"}
            </PrimaryButton>
          </div>
          <button
            type="button"
            onClick={() => setEditing(false)}
            style={{
              display: "block",
              margin: "10px auto 0",
              background: "transparent",
              border: "none",
              color: COLORS.inkSoft,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </form>
      )}
    </Sheet>
  );
}
