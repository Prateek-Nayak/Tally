import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getActiveInviteLink,
  createInviteLink,
  revokeInviteLink,
  inviteByEmail,
  listMyPendingInvites,
  respondToInvite,
} from "./invitesApi";

export function useActiveInviteLink(groupId: string) {
  return useQuery({ queryKey: ["invite-link", groupId], queryFn: () => getActiveInviteLink(groupId) });
}

export function useCreateInviteLink(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idempotencyKey: string) => createInviteLink(groupId, idempotencyKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invite-link", groupId] }),
  });
}

export function useRevokeInviteLink(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idempotencyKey: string) => revokeInviteLink(groupId, idempotencyKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invite-link", groupId] }),
  });
}

export function useInviteByEmail(groupId: string) {
  return useMutation({
    mutationFn: ({ email, idempotencyKey }: { email: string; idempotencyKey: string }) =>
      inviteByEmail(groupId, email, idempotencyKey),
  });
}

export function usePendingInvites() {
  return useQuery({ queryKey: ["pending-invites"], queryFn: listMyPendingInvites });
}

export function useRespondToInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId, accept, idempotencyKey }: { inviteId: string; accept: boolean; idempotencyKey: string }) =>
      respondToInvite(inviteId, accept, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
