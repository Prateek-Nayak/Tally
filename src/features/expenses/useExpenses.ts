import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listGroupExpenses, addExpense } from "./expensesApi";

export function useExpenses(groupId: string) {
  return useQuery({ queryKey: ["expenses", groupId], queryFn: () => listGroupExpenses(groupId) });
}

interface AddExpenseInput {
  description: string;
  amountPaise: number;
  paidByMemberId: string;
  splitMemberIds: string[];
  idempotencyKey: string;
}

export function useAddExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddExpenseInput) =>
      addExpense(
        groupId,
        input.description,
        input.amountPaise,
        input.paidByMemberId,
        input.splitMemberIds,
        input.idempotencyKey,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
    },
  });
}
