import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyGroups, createGroup } from "./groupsApi";

export function useGroups() {
  return useQuery({ queryKey: ["groups"], queryFn: listMyGroups });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, idempotencyKey }: { name: string; idempotencyKey: string }) =>
      createGroup(name, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
