import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listGroupExpenses, addExpense, getExpenseDetail, updateExpense, deleteExpense } from "./expensesApi";

export function useExpenses(groupId: string) {
  return useQuery({ queryKey: ["expenses", groupId], queryFn: () => listGroupExpenses(groupId) });
}

export function useExpenseDetail(expenseId: string | null) {
  return useQuery({
    queryKey: ["expense-detail", expenseId],
    queryFn: () => getExpenseDetail(expenseId!),
    enabled: expenseId !== null,
  });
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
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
    },
  });
}

interface UpdateExpenseInput extends AddExpenseInput {
  expenseId: string;
}

export function useUpdateExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateExpenseInput) =>
      updateExpense(
        input.expenseId,
        input.description,
        input.amountPaise,
        input.paidByMemberId,
        input.splitMemberIds,
        input.idempotencyKey,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["expense-detail", variables.expenseId] });
    },
  });
}

export function useDeleteExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, idempotencyKey }: { expenseId: string; idempotencyKey: string }) =>
      deleteExpense(expenseId, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
    },
  });
}
