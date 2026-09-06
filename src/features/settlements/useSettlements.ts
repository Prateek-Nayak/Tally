import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordSettlement } from "./settlementsApi";

interface RecordSettlementInput {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
  note: string;
  idempotencyKey: string;
}

export function useRecordSettlement(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordSettlementInput) =>
      recordSettlement(groupId, input.fromMemberId, input.toMemberId, input.amountPaise, input.note, input.idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
    },
  });
}
