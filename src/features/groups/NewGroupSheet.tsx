import { useState, type FormEvent } from "react";
import { Sheet } from "../../shared/components/Sheet";
import { Field, PrimaryButton, Notice } from "../../shared/components/formControls";
import { inputStyle } from "../../shared/theme/inputStyle";
import { newIdempotencyKey } from "../../lib/api/idempotency";
import { useCreateGroup } from "./useGroups";

export function NewGroupSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  // One key for the whole lifetime of this open sheet: a retry after a
  // network blip reuses it, so the group is never created twice.
  const [idempotencyKey] = useState(newIdempotencyKey);
  const createGroup = useCreateGroup();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter a group name.");
      return;
    }
    try {
      await createGroup.mutateAsync({ name: name.trim(), idempotencyKey });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the group.");
    }
  }

  return (
    <Sheet title="New group" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <Notice kind="error">{error}</Notice>}
        <Field label="Group name">
          <input
            style={inputStyle}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa trip, Flat 4B"
          />
        </Field>
        <PrimaryButton busy={createGroup.isPending}>
          {createGroup.isPending ? "Creating…" : "Create group"}
        </PrimaryButton>
      </form>
    </Sheet>
  );
}
