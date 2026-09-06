import { useState, type FormEvent } from "react";
import { Sheet } from "../../shared/components/Sheet";
import { Field, PrimaryButton, Notice } from "../../shared/components/formControls";
import { inputStyle } from "../../shared/theme/inputStyle";
import { COLORS_LIGHT as COLORS } from "../../shared/theme/colors";
import { newIdempotencyKey } from "../../lib/api/idempotency";
import { rupeesToPaise } from "../../shared/lib/money";
import type { Member } from "../groups/memberTypes";
import { useAddExpense } from "./useExpenses";
import { getErrorMessage } from "../../shared/lib/errors";

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

export function AddExpenseSheet({
  groupId,
  members,
  onClose,
}: {
  groupId: string;
  members: Member[];
  onClose: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(members[0]?.id ?? "");
  const [splitWith, setSplitWith] = useState<string[]>(members.map((m) => m.id));
  const [error, setError] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);
  const addExpense = useAddExpense(groupId);

  function toggleSplit(memberId: string) {
    setSplitWith((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const amountNum = Number(amount);
    if (!description.trim()) return setError("Enter a description.");
    if (!amountNum || amountNum <= 0) return setError("Enter an amount greater than ₹0.");
    if (!paidBy) return setError("Choose who paid.");
    if (splitWith.length === 0) return setError("Pick at least one person to split with.");

    try {
      await addExpense.mutateAsync({
        description: description.trim(),
        amountPaise: rupeesToPaise(amountNum),
        paidByMemberId: paidBy,
        splitMemberIds: splitWith,
        idempotencyKey,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not add the expense."));
    }
  }

  return (
    <Sheet title="Add expense" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Description">
          <input
            style={inputStyle}
            autoFocus
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
        <PrimaryButton busy={addExpense.isPending}>
          {addExpense.isPending ? "Saving…" : "Save expense"}
        </PrimaryButton>
      </form>
    </Sheet>
  );
}
