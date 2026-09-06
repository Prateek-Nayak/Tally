import { useState, type FormEvent } from "react";
import { Sheet } from "../../shared/components/Sheet";
import { Field, PrimaryButton, Notice } from "../../shared/components/formControls";
import { inputStyle } from "../../shared/theme/inputStyle";
import { COLORS_LIGHT as COLORS } from "../../shared/theme/colors";
import { newIdempotencyKey } from "../../lib/api/idempotency";
import { getErrorMessage } from "../../shared/lib/errors";
import { rupeesToPaise } from "../../shared/lib/money";
import type { Member } from "../groups/memberTypes";
import { useRecordSettlement } from "./useSettlements";

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

export function SettleUpSheet({
  groupId,
  members,
  defaultFrom,
  defaultTo,
  onClose,
}: {
  groupId: string;
  members: Member[];
  defaultFrom?: string;
  defaultTo?: string;
  onClose: () => void;
}) {
  const [fromId, setFromId] = useState(defaultFrom ?? members[0]?.id ?? "");
  const [toId, setToId] = useState(defaultTo ?? members[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);
  const recordSettlement = useRecordSettlement(groupId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const amountNum = Number(amount);
    if (!fromId || !toId) return setError("Choose who paid and who received it.");
    if (fromId === toId) return setError("Payer and receiver can't be the same person.");
    if (!amountNum || amountNum <= 0) return setError("Enter an amount greater than ₹0.");

    try {
      await recordSettlement.mutateAsync({
        fromMemberId: fromId,
        toMemberId: toId,
        amountPaise: rupeesToPaise(amountNum),
        note,
        idempotencyKey,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not record the payment."));
    }
  }

  return (
    <Sheet title="Settle up" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Who paid">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {members.map((m) => (
              <ChipToggle key={m.id} label={m.name} active={fromId === m.id} onClick={() => setFromId(m.id)} />
            ))}
          </div>
        </Field>
        <Field label="Who received it">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {members.map((m) => (
              <ChipToggle key={m.id} label={m.name} active={toId === m.id} onClick={() => setToId(m.id)} />
            ))}
          </div>
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
        <Field label="Note (optional)">
          <input
            style={inputStyle}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Cash, UPI"
          />
        </Field>
        <PrimaryButton busy={recordSettlement.isPending}>
          {recordSettlement.isPending ? "Saving…" : "Record payment"}
        </PrimaryButton>
      </form>
    </Sheet>
  );
}
