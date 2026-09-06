import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGroupBalances, removeMember } from "./balancesApi";

export function useBalances(groupId: string) {
  return useQuery({ queryKey: ["balances", groupId], queryFn: () => getGroupBalances(groupId) });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, idempotencyKey }: { memberId: string; idempotencyKey: string }) =>
      removeMember(groupId, memberId, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
