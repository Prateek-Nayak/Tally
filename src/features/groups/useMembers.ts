import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listGroupMembers, addGhostMember } from "./membersApi";

export function useMembers(groupId: string) {
  return useQuery({ queryKey: ["members", groupId], queryFn: () => listGroupMembers(groupId) });
}

export function useAddGhostMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, idempotencyKey }: { name: string; idempotencyKey: string }) =>
      addGhostMember(groupId, name, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] }); // member_count changed
    },
  });
}
