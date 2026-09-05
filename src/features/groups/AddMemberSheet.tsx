import { useState, type FormEvent } from "react";
import { Sheet } from "../../shared/components/Sheet";
import { Field, PrimaryButton, Notice } from "../../shared/components/formControls";
import { inputStyle } from "../../shared/theme/inputStyle";
import { newIdempotencyKey } from "../../lib/api/idempotency";
import { useAddGhostMember } from "./useMembers";

export function AddMemberSheet({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);
  const addMember = useAddGhostMember(groupId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    try {
      await addMember.mutateAsync({ name: name.trim(), idempotencyKey });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that person.");
    }
  }

  return (
    <Sheet title="Add a person" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Name">
          <input
            style={inputStyle}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya"
          />
        </Field>
        <p style={{ fontSize: 12, color: "#3D4654", margin: "0 0 4px" }}>
          They don't need an account - you can track and settle up with them either way.
        </p>
        <PrimaryButton busy={addMember.isPending}>{addMember.isPending ? "Adding…" : "Add person"}</PrimaryButton>
      </form>
    </Sheet>
  );
}
